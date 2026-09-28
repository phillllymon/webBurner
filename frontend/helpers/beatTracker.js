// Streaming onset + beat tracker ("algorithm C").
//
// Works on live analyser frames (getByteFrequencyData, smoothing 0), so it behaves the same
// for bundled songs, mp3 uploads and radio streams. No DOM access - it takes frames in and
// hands note events out, which keeps it testable offline.
//
// Timeline: the analysed audio runs `spawnLeadMs` (2 s) ahead of the sound a note represents
// (songDelay - travel time). So when a note has to spawn, we have already seen ~2 s of audio
// *after* the sound it belongs to. That lookahead is what lets us make decisions with context
// (peak picking, tempo, ranking) instead of reacting to the current frame only.
//
// Pipeline, per frame:
//   1. onset strength: log-spectral flux (SuperFlux-style max filter) in 4 frequency bands
//   2. peak picking with an adaptive median/MAD threshold -> onset candidates
//   3. tempo (autocorrelation) + beat phase (comb filter) over the last few seconds
//   4. when a candidate's spawn time arrives: score it (strength x beat-grid position), keep it
//      if it ranks high enough for the difficulty, snap it slightly toward the grid,
//      and pick its lane from whichever frequency band stood out

const DEFAULTS = {
    sampleRate: 44100,
    // low (kick / bass), low-mid (snare body, guitars), mid-high (vocals, snare crack), high (hats)
    bandEdgesHz: [30, 160, 800, 4000, 14000],

    // frame handling
    minFrameMs: 4,          // frames closer than this are duplicates (animator sub-steps)
    gapMs: 250,             // a longer gap between frames means pause -> freeze the internal clock
    nominalFrameMs: 16.7,
    historyMs: 10000,

    // onset detection
    peakLookaheadMs: 60,    // wait this long after a frame before deciding it's a peak
    peakWindowMs: 40,       // must be the max within +/- this
    minOnsetGapMs: 50,
    refractoryMs: 250,      // ...see tryOnset: weak same-band onsets this soon after a strong one are tails
    refractoryRatio: 0.25,
    thresholdBackMs: 700,   // adaptive threshold window
    thresholdForwardMs: 150,
    zThreshold: 2.5,        // robust z-score (median/MAD) an onset must clear
    minFluxAboveMedian: 4,  // absolute floor so near-silence doesn't trigger
    analysisLagMs: 25,      // flux peaks this long after the true attack (analyser window)

    // tempo / beat
    tempoWindowMs: 6000,
    tempoIntervalMs: 300,
    minTempoHistoryMs: 3000,
    minBpm: 60,
    maxBpm: 200,
    preferredBpm: 115,
    tempoPriorOctaves: 0.5, // width of the tempo prior, in octaves
    minTempoConfidence: 0.3,
    gridTolMs: 40,
    snapStrength: 0.6,      // 0 = never move notes, 1 = snap fully onto the grid

    // selection
    spawnLeadMs: 2000,      // songDelay - (songDelay - 2000): analysed audio is this far ahead of the note
    rankWindowMs: 500,      // a note must rank well among candidates within +/- this
    gridWeights: [1.4, 1.0, 0.7, 0.6], // beat, eighth, sixteenth, off-grid
    noTempoWeight: 1.0,
    // per difficulty (notesPerSecond 1-5): roughly how many notes per second are kept
    notesPerRankWindow: { 1: 1, 2: 2, 3: 3, 4: 5, 5: 7 },
    minNoteGapMs: { 1: 400, 2: 280, 3: 200, 4: 160, 5: 130 },
    laneBalanceRate: 0.03,  // how fast the per-band "typical level" adapts (per onset)
    laneBalanceFloor: 2,
    laneBalanceExponent: 0.5, // 0 = raw band strength, 1 = fully relative to each band's typical level
    doubleRatio: 0.75,      // second band must be this strong (vs the top band) to make a double
    doubleMinLevel: 3
};

export class BeatTracker {
    constructor(options = {}) {
        this.opts = Object.assign({}, DEFAULTS, options);
        this.reset();
    }

    reset() {
        this.shift = 0;         // internal clock = wall clock - shift (frozen across pauses)
        this.lastWall = null;
        this.prevBytes = null;
        this.bandRanges = null;

        this.t = [];            // frame times (internal clock)
        this.flux = [];         // per frame: flux per band
        this.O = [];            // per frame: onset strength (sum of band flux)
        this.scanIdx = 0;       // next frame to test as a peak

        this.bandTypical = null; // running average of each band's z-score at onsets (for lane balance)
        this.cands = [];        // onset candidates, chronological
        this.nextDue = 0;       // index of first candidate not yet decided
        this.lastKeptT = -Infinity;

        this.tempo = null;      // { periodMs, refMs, confidence }
        this.lastTempoAt = -Infinity;
    }

    // Feed one frame; returns note events that should spawn now.
    // ctx: { level: 1-5, numLanes: 2-4, manualDelayMs, allowDouble }
    update(bytes, wallNow, ctx) {
        if (!this.ingest(bytes, wallNow)) {
            return [];
        }
        const tNow = wallNow - this.shift;
        this.detectOnsets();
        if (tNow - this.lastTempoAt >= this.opts.tempoIntervalMs) {
            this.lastTempoAt = tNow;
            this.updateTempo(tNow);
        }
        return this.emitDue(tNow, ctx);
    }

    // ------------------------------------------------------------------ 1. onset strength
    ingest(bytes, wallNow) {
        const o = this.opts;
        if (this.lastWall !== null) {
            const dt = wallNow - this.lastWall;
            if (dt < o.minFrameMs) {
                return false;
            }
            if (dt > o.gapMs) {
                this.shift += dt - o.nominalFrameMs; // pause: keep the timeline continuous
            }
        }
        const dt = this.lastWall === null ? o.nominalFrameMs : wallNow - this.lastWall;
        this.lastWall = wallNow;

        if (!this.bandRanges || this.bandRanges.len !== bytes.length) {
            this.setupBands(bytes.length);
        }
        const prev = this.prevBytes;
        this.prevBytes = Uint8Array.from(bytes);
        if (!prev) {
            return false;
        }

        // normalise to a per-16.7ms rate so irregular frame spacing doesn't skew the envelope
        const rate = o.nominalFrameMs / Math.min(40, Math.max(8, dt));
        const flux = [];
        let total = 0;
        for (const [lo, hi] of this.bandRanges.ranges) {
            let sum = 0;
            for (let k = lo; k < hi; k++) {
                const ref = Math.max(prev[k - 1], prev[k], prev[k + 1]);
                const d = bytes[k] - ref;
                if (d > 0) {
                    sum += d;
                }
            }
            const f = rate * sum / (hi - lo);
            flux.push(f);
            total += f;
        }

        const t = wallNow - this.shift;
        this.t.push(t);
        this.flux.push(flux);
        this.O.push(total);
        this.trim(t);
        return true;
    }

    setupBands(len) {
        const binHz = this.opts.sampleRate / 2 / len;
        const edges = this.opts.bandEdgesHz.map(hz => Math.min(len - 2, Math.max(2, Math.round(hz / binHz))));
        const ranges = [];
        for (let b = 0; b < edges.length - 1; b++) {
            ranges.push([edges[b], Math.max(edges[b] + 1, edges[b + 1])]);
        }
        this.bandRanges = { len, ranges };
    }

    trim(tNow) {
        let n = 0;
        while (n < this.t.length && this.t[n] < tNow - this.opts.historyMs) {
            n++;
        }
        if (n > 0) {
            this.t.splice(0, n);
            this.flux.splice(0, n);
            this.O.splice(0, n);
            this.scanIdx = Math.max(0, this.scanIdx - n);
        }
        // candidates are only needed until decided + a little for ranking neighbours
        const keepFrom = tNow - this.opts.historyMs;
        let c = 0;
        while (c < this.nextDue && this.cands[c].t < keepFrom) {
            c++;
        }
        if (c > 0) {
            this.cands.splice(0, c);
            this.nextDue -= c;
        }
    }

    // ------------------------------------------------------------------ 2. peak picking
    detectOnsets() {
        const o = this.opts;
        const n = this.t.length;
        if (n === 0) {
            return;
        }
        const tLatest = this.t[n - 1];
        while (this.scanIdx < n && this.t[this.scanIdx] <= tLatest - o.peakLookaheadMs) {
            const i = this.scanIdx++;
            this.tryOnset(i);
        }
    }

    tryOnset(i) {
        const o = this.opts;
        const t = this.t;
        const O = this.O;

        // must be the local maximum (earliest wins ties)
        for (let j = i - 1; j >= 0 && t[i] - t[j] <= o.peakWindowMs; j--) {
            if (O[j] >= O[i]) {
                return;
            }
        }
        for (let j = i + 1; j < t.length && t[j] - t[i] <= o.peakWindowMs; j++) {
            if (O[j] > O[i]) {
                return;
            }
        }

        // adaptive threshold from the surrounding frames
        let lo = i;
        while (lo > 0 && t[i] - t[lo - 1] <= o.thresholdBackMs) {
            lo--;
        }
        let hi = i;
        while (hi < t.length - 1 && t[hi + 1] - t[i] <= o.thresholdForwardMs) {
            hi++;
        }
        const stats = robustStats(O, lo, hi);
        if (O[i] < stats.median + o.minFluxAboveMedian || O[i] < stats.median + o.zThreshold * stats.sigma) {
            return;
        }
        const strength = (O[i] - stats.median) / (stats.sigma + 1);

        // which bands stood out at the peak (robust z per band)
        const bandZ = [];
        for (let b = 0; b < this.bandRanges.ranges.length; b++) {
            const bs = robustStats(this.flux, lo, hi, b);
            let peak = 0;
            for (let j = Math.max(lo, i - 2); j <= Math.min(hi, i + 2); j++) {
                peak = Math.max(peak, this.flux[j][b]);
            }
            bandZ.push(Math.max(0, (peak - bs.median) / (bs.sigma + 1)));
        }

        const cand = {
            t: t[i] - o.analysisLagMs,
            strength: strength,
            bandZ: bandZ,
            band: bandZ.indexOf(Math.max(...bandZ)),
            bandRel: this.relativeToTypical(bandZ),
            decided: false
        };

        // a much weaker onset in the same band right after a strong one is that hit's decaying
        // tail (bass wobble, ringing), not a new note
        for (let k = this.cands.length - 1; k >= 0 && cand.t - this.cands[k].t < o.refractoryMs; k--) {
            const prior = this.cands[k];
            if (prior.band === cand.band && cand.strength < o.refractoryRatio * prior.strength) {
                return;
            }
        }

        const last = this.cands[this.cands.length - 1];
        if (last && cand.t - last.t < o.minOnsetGapMs) {
            if (!last.decided && cand.strength > last.strength) {
                this.cands[this.cands.length - 1] = cand; // stronger neighbour replaces it
            }
            return;
        }
        this.cands.push(cand);
    }

    // ------------------------------------------------------------------ 3. tempo + beat phase
    updateTempo(tNow) {
        const o = this.opts;
        const n = this.t.length;
        if (n < 2 || this.t[n - 1] - this.t[0] < o.minTempoHistoryMs) {
            return;
        }

        // resample the onset envelope to a 10 ms grid
        const step = 10;
        const start = Math.max(this.t[0], tNow - o.tempoWindowMs);
        const count = Math.floor((tNow - start) / step);
        if (count < 200) {
            return;
        }
        const x = new Float32Array(count);
        let j = 0;
        for (let k = 0; k < count; k++) {
            const tk = start + k * step;
            while (j < n - 2 && this.t[j + 1] < tk) {
                j++;
            }
            const span = this.t[j + 1] - this.t[j];
            const f = span > 0 ? Math.min(1, Math.max(0, (tk - this.t[j]) / span)) : 0;
            x[k] = this.O[j] + f * (this.O[j + 1] - this.O[j]);
        }
        // remove the slow-moving mean so only the rhythmic part remains
        const half = 25;
        let run = 0;
        const avg = new Float32Array(count);
        for (let k = 0; k < count + half; k++) {
            if (k < count) {
                run += x[k];
            }
            if (k - 2 * half - 1 >= 0) {
                run -= x[k - 2 * half - 1];
            }
            const c = k - half;
            if (c >= 0 && c < count) {
                const a = Math.max(0, c - half);
                const b = Math.min(count - 1, c + half);
                avg[c] = run / (b - a + 1);
            }
        }
        for (let k = 0; k < count; k++) {
            x[k] = Math.max(0, x[k] - avg[k]);
        }

        // autocorrelation over the tempo range (with a tempo prior and a 2x-lag boost)
        const minLag = Math.round(60000 / o.maxBpm / step);
        const maxLag = Math.round(60000 / o.minBpm / step);
        const r = new Float32Array(2 * maxLag + 2);
        for (let lag = minLag; lag < r.length && lag < count - 50; lag++) {
            let sum = 0;
            for (let k = 0; k + lag < count; k++) {
                sum += x[k] * x[k + lag];
            }
            r[lag] = sum / (count - lag);
        }
        const score = new Float32Array(maxLag + 2);
        let best = -1;
        let bestScore = 0;
        let total = 0;
        for (let lag = minLag; lag <= maxLag; lag++) {
            const bpm = 60000 / (lag * step);
            const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / o.preferredBpm) / o.tempoPriorOctaves, 2));
            score[lag] = (r[lag] + 0.5 * r[2 * lag]) * prior;
            total += score[lag];
            if (score[lag] > bestScore) {
                bestScore = score[lag];
                best = lag;
            }
        }
        if (best < 0 || bestScore <= 0) {
            return;
        }
        const meanScore = total / (maxLag - minLag + 1);
        const confidence = (bestScore - meanScore) / bestScore;

        // parabolic refinement of the lag
        let lagF = best;
        if (best > minLag && best < maxLag) {
            const a = score[best - 1];
            const b = score[best];
            const c = score[best + 1];
            const denom = a - 2 * b + c;
            if (denom !== 0) {
                lagF = best + 0.5 * (a - c) / denom;
            }
        }
        const period = lagF * step;

        // beat phase: comb filter, newer beats count more
        const phaseStep = 10;
        let bestPhase = 0;
        let bestComb = -1;
        for (let phase = 0; phase < period; phase += phaseStep) {
            let sum = 0;
            for (let tb = start + phase; tb < tNow; tb += period) {
                const idx = Math.min(count - 1, Math.round((tb - start) / step));
                const w = 0.5 + (tb - start) / (tNow - start);
                const v = Math.max(x[idx], idx > 0 ? x[idx - 1] : 0, idx < count - 1 ? x[idx + 1] : 0);
                sum += w * v;
            }
            if (sum > bestComb) {
                bestComb = sum;
                bestPhase = phase;
            }
        }
        const newRef = start + bestPhase;

        const old = this.tempo;
        if (!old) {
            this.tempo = { periodMs: period, refMs: newRef, confidence: confidence };
            return;
        }
        const ratio = period / old.periodMs;
        if (Math.abs(ratio - 1) < 0.04) {
            // same tempo: smooth period, nudge the phase
            const p = 0.7 * old.periodMs + 0.3 * period;
            const beats = (newRef - old.refMs) / p;
            const delta = (beats - Math.round(beats)) * p; // phase error, wrapped to +/- p/2
            this.tempo = {
                periodMs: p,
                refMs: old.refMs + Math.round(beats) * p + 0.3 * delta,
                confidence: 0.7 * old.confidence + 0.3 * confidence
            };
        } else if (confidence > old.confidence * 0.9 || old.confidence < o.minTempoConfidence) {
            this.tempo = { periodMs: period, refMs: newRef, confidence: confidence };
        } else {
            old.confidence *= 0.95; // a competing tempo is only adopted if it gains confidence
        }
    }

    // where does time t sit relative to the beat grid?
    gridInfo(t) {
        const tempo = this.tempo;
        if (!tempo || tempo.confidence < this.opts.minTempoConfidence) {
            return null;
        }
        const sixteenth = tempo.periodMs / 4;
        const pos = (t - tempo.refMs) / sixteenth;
        const n = Math.round(pos);
        const errMs = (pos - n) * sixteenth;
        const tol = Math.min(this.opts.gridTolMs, 0.3 * sixteenth);
        if (Math.abs(errMs) > tol) {
            return { level: 3, snapped: t };
        }
        const mod = ((n % 4) + 4) % 4;
        const level = mod === 0 ? 0 : (mod === 2 ? 1 : 2);
        return { level: level, snapped: tempo.refMs + n * sixteenth };
    }

    // ------------------------------------------------------------------ 4. selection + lanes
    scoreCandidate(c) {
        const o = this.opts;
        const grid = this.gridInfo(c.t);
        c.grid = grid;
        const weight = grid ? o.gridWeights[grid.level] : o.noTempoWeight;
        return c.strength * weight;
    }

    emitDue(tNow, ctx) {
        const o = this.opts;
        const level = Math.min(5, Math.max(1, ctx.level || 3));
        const numLanes = Math.min(4, Math.max(2, ctx.numLanes || 4));
        const manualDelay = ctx.manualDelayMs || 0;
        const events = [];

        // decide a little after the raw onset time so snapping can never push a note into the past
        const margin = o.gridTolMs;
        while (this.nextDue < this.cands.length) {
            const c = this.cands[this.nextDue];
            if (c.t + o.spawnLeadMs + manualDelay + margin > tNow) {
                break;
            }
            this.nextDue++;
            c.decided = true;
            c.score = this.scoreCandidate(c);

            // rank among neighbours (already-decided ones are re-scored with the current tempo)
            let better = 0;
            for (let k = 0; k < this.cands.length; k++) {
                const other = this.cands[k];
                if (other === c || Math.abs(other.t - c.t) > o.rankWindowMs) {
                    continue;
                }
                const s = other.decided ? other.score : this.scoreCandidate(other);
                if (s > c.score || (s === c.score && other.t < c.t)) {
                    better++;
                }
            }
            c.kept = false;
            if (better >= o.notesPerRankWindow[level]) {
                continue;
            }

            // snap toward the grid to remove analysis jitter
            let t = c.t;
            if (c.grid && c.grid.level < 3) {
                t += o.snapStrength * (c.grid.snapped - c.t);
            }
            if (t - this.lastKeptT < o.minNoteGapMs[level]) {
                continue;
            }
            this.lastKeptT = t;
            c.kept = true;

            const lanes = this.laneScores(c.bandRel, numLanes);
            const order = lanes.map((z, lane) => ({ z, lane })).sort((a, b) => b.z - a.z);
            const dueT = t + o.spawnLeadMs + manualDelay;
            const ev = {
                soundTimeMs: t,
                strength: c.strength,
                gridLevel: c.grid ? c.grid.level : null,
                lane: order[0].lane,
                timeOffsetMs: Math.max(0, tNow - dueT),
                double: null
            };
            if (ctx.allowDouble && level >= o.doubleMinLevel && order[1].z > 0 && order[1].z >= o.doubleRatio * order[0].z) {
                ev.double = order[1].lane;
            }
            events.push(ev);
        }
        return events;
    }

    // Score each band against its own typical onset level, so the (naturally louder) low and high
    // bands don't take every lane; the band that stands out most *for itself* wins.
    relativeToTypical(bandZ) {
        if (!this.bandTypical) {
            this.bandTypical = bandZ.map(z => Math.max(1, z));
        }
        const rel = bandZ.map((z, b) => z / Math.pow(this.bandTypical[b] + this.opts.laneBalanceFloor, this.opts.laneBalanceExponent));
        this.bandTypical = this.bandTypical.map((m, b) => (1 - this.opts.laneBalanceRate) * m + this.opts.laneBalanceRate * bandZ[b]);
        return rel;
    }

    // collapse the 4 bands onto however many lanes the game is using
    laneScores(bandZ, numLanes) {
        const [b0, b1, b2, b3] = bandZ;
        if (numLanes >= 4) {
            return [b0, b1, b2, b3];
        }
        if (numLanes === 3) {
            return [b0, Math.max(b1, b2), b3];
        }
        return [Math.max(b0, b1), Math.max(b2, b3)];
    }
}

// median and MAD-based sigma of arr[lo..hi] (or arr[i][band] if a band is given)
function robustStats(arr, lo, hi, band) {
    const vals = [];
    for (let i = lo; i <= hi; i++) {
        vals.push(band === undefined ? arr[i] : arr[i][band]);
    }
    const median = medianOf(vals);
    const devs = vals.map(v => Math.abs(v - median));
    return { median: median, sigma: 1.4826 * medianOf(devs) };
}

function medianOf(vals) {
    if (vals.length === 0) {
        return 0;
    }
    const s = vals.slice().sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
}
