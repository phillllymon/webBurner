import { averageOf } from "./util.js";

const TAU = Math.PI * 2;

export class BackgroundAnimator {
    constructor(masterInfo) {
        this.masterInfo = masterInfo;
        this.valsQueue = []; // contains objects in form [valsArr, timestamp]
        this.initializeColors();
        this.initializeBackground();

        // ---- desktop canvas renderer state ----
        this.canvas = null;
        this.ctx = null;
        this.lastFrameTime = null;
        this.lastFogUpdate = 0;

        this.baseHue = Math.random() * 360;
        this.spinAngle = Math.random() * TAU;
        this.spinDirection = 1;
        this.flowClock = 0;
        this.tunnelClock = 0;
        this.wobbleStartTime = -Infinity;

        // "journey": alternates between a stripes look (0) and a spiral look (1), holding at
        // each extreme rather than drifting to random in-between blends
        this.modeT = 1;
        this.modeTarget = 1;
        this.modeChangeAt = performance.now() + 9000 + Math.random() * 12000;

        this.pulseEnvelope = 0;
        this.bandFractionsSmoothed = [0.25, 0.25, 0.25, 0.25];
        this.targetBandFractions = [0.25, 0.25, 0.25, 0.25];
        this.prevBandVals = null;
        this.fluxMean = 0;
        this.fluxVariance = 25;

        if (!document.mobile) {
            this.setupCanvas();
        }
    }

    addValsArrayToQueue(vals) {
        this.valsQueue.push([vals, performance.now()]);
    }

    // newVals is CURRENT vals - we'll store it for later and use the older one
    animateBackground(newVals) {

        if (!this.masterInfo.animatedBackground) {
            return;
        }

        this.addValsArrayToQueue(newVals);
        const targetTime = performance.now() - this.masterInfo.songDelay;
        let valsToUse = null;
        let numObselete = 0;

        for (let i = 0; i < this.valsQueue.length; i++) {
            const thisVal = this.valsQueue[i];
            if (thisVal[1] < targetTime) {
                numObselete += 1;
            } else {
                valsToUse = thisVal[0];
                break;
            }
        }

        for (let i = 0; i < numObselete; i++) {
            this.valsQueue.shift();
        }
        if (document.mobile) {
            this.changeColors();

            const colsToUse = this.colors.map((row) => {
                return row.map((col) => {
                    return col[0];
                }).join(",");
            });
            document.getElementById("play-area").style.backgroundColor = `rgb(${colsToUse[2]})`;
            const left = document.getElementById("background-left");
            const right = document.getElementById("background-right");

            const leftRightColor = this.masterInfo.onFire ? "255, 0, 0" : colsToUse[0];

            left.style.background = `linear-gradient(
                to left,
                rgba(${colsToUse[0]}, 0) 0%,
                rgba(${colsToUse[0]}, 1) 100%)`;
            right.style.background = `linear-gradient(
                to right,
                rgba(${colsToUse[0]}, 0) 0%,
                rgba(${colsToUse[0]}, 1) 100%)`;
            document.getElementById("fog-mobile-top").style.backgroundColor = `rgb(${colsToUse[0]})`;
            document.getElementById("fog-mobile-gradient").style.background = `linear-gradient(
                to top,
                rgba(${colsToUse[0]}, 0) 0%,
                rgba(${colsToUse[0]}, 1) 100%)`;

            let total = 0;

            // determine new widths for colors
            valsToUse.forEach((val) => {
                total += val;
            });

            const thisVal = valsToUse[4];

            if (this.distVals) {
                this.distVals.push(thisVal);
                if (this.distVals.length > 80) {
                    while (this.distVals.length > 80) {
                        this.distVals.shift();
                    }
                }
            } else {
                this.distVals = [thisVal];
            }
            const distMin = Math.min(...this.distVals);
            const distMax = Math.max(...this.distVals);

            const percent = 100.0 - (100.0 * (thisVal - distMin) / (distMax - distMin));

            if (this.percents) {
                this.percents.push(percent);
                if (this.percents.length > 5) {
                    while (this.percents.length > 5) {
                        this.percents.shift();
                    }
                }
            } else {
                this.percents = [percent];
            }

            const percentToUse = averageOf(this.percents);

            const adjustedPercent = Math.pow(0.4 * percentToUse, 0.75);

            left.style.width = `${5 + adjustedPercent}%`;
            right.style.width = `${5 + adjustedPercent}%`;

        } else {
            if (valsToUse) {
                this.feedDesktopSignal(valsToUse);
            }
        }

    }

    // Feeds the canvas renderer's target state from the latest (latency-aligned) audio summary.
    // This never draws anything directly - it only updates smoothly-consumed targets, so the
    // actual render loop (running on its own clock) can interpolate instead of jumping every call.
    feedDesktopSignal(valsToUse) {
        const bands = valsToUse.slice(0, 4);
        const total = bands.reduce((sum, v) => sum + v, 0);
        if (total > 0) {
            this.targetBandFractions = bands.map((v) => v / total);
        }

        // spectral-flux-style onset strength: sum of positive frame-to-frame increases per band
        // (same idea as the onset detector in beatTracker.js, simplified for a live visual pulse
        // rather than beatTracker's own lookahead-and-rank pipeline, which is tuned for spawning
        // notes ~2s ahead rather than reacting immediately)
        let flux = 0;
        if (this.prevBandVals) {
            for (let i = 0; i < bands.length; i++) {
                const d = bands[i] - this.prevBandVals[i];
                if (d > 0) {
                    flux += d;
                }
            }
        }
        this.prevBandVals = bands;

        // adaptive baseline (running mean/variance) so quiet and loud songs both still pulse
        const alpha = 0.05;
        this.fluxMean = (1 - alpha) * this.fluxMean + alpha * flux;
        const dev = flux - this.fluxMean;
        this.fluxVariance = (1 - alpha) * this.fluxVariance + alpha * dev * dev;
        const fluxStd = Math.sqrt(Math.max(1, this.fluxVariance));

        const z = (flux - this.fluxMean) / fluxStd;
        if (z > 2.4) {
            const strength = Math.min(1, (z - 2.4) / 3);
            this.pulseEnvelope = Math.min(1, this.pulseEnvelope + strength);
        }
    }

    setupCanvas() {
        this.canvas = document.getElementById("background-canvas");
        if (!this.canvas) {
            return;
        }
        this.ctx = this.canvas.getContext("2d");
        this.resizeCanvas();
        window.addEventListener("resize", () => this.resizeCanvas());
        requestAnimationFrame((t) => this.renderLoop(t));
    }

    resizeCanvas() {
        if (!this.canvas) {
            return;
        }
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this.viewW = w;
        this.viewH = h;
        this.dpr = dpr;
    }

    renderLoop(now) {
        requestAnimationFrame((t) => this.renderLoop(t));
        if (document.mobile || !this.ctx) {
            return;
        }
        if (this.lastFrameTime === null) {
            this.lastFrameTime = now;
        }
        const dt = Math.min(64, now - this.lastFrameTime); // clamp big gaps (tab was backgrounded)
        this.lastFrameTime = now;

        // pulse always decays, even while paused, so it doesn't jump on resume
        this.pulseEnvelope *= Math.exp(-dt / 220);
        const pulse = this.pulseEnvelope;

        // hue drift - noticeably alive, not a multi-minute crawl
        this.baseHue = (this.baseHue + dt * 0.012) % 360;

        // spiral spin ("round and round") - speeds up further on a pulse, like it's reacting
        this.spinAngle += this.spinDirection * dt * (0.0008 + pulse * 0.0025);

        // outward "flying through it" flow, used by both the tunnel and the stripe travel-wave;
        // speeds up on a pulse too, like accelerating on a beat
        this.tunnelClock += dt * (1 + pulse * 1.1);
        this.flowClock += dt * (1 + pulse * 1.4);

        // the "journey": alternates fully-stripes <-> fully-spiral, holding at each end rather
        // than wandering to random half-blends
        if (now > this.modeChangeAt) {
            const goingToStripes = this.modeTarget > 0.5;
            this.modeTarget = goingToStripes ? 0 : 1;
            if (goingToStripes) {
                // just arrived at stripes: one single wobble, not a continuous sway
                this.wobbleStartTime = now;
            } else {
                // heading back to the spiral: it comes back spinning the other way
                this.spinDirection *= -1;
            }
            this.modeChangeAt = now + (goingToStripes ? 6000 + Math.random() * 5000 : 9000 + Math.random() * 12000);
        }
        this.modeT += (this.modeTarget - this.modeT) * Math.min(1, dt / 1800);

        // the one-shot wobble: a single full back-and-forth swing that settles back to 0
        const wobbleDuration = 1000;
        const wobbleElapsed = now - this.wobbleStartTime;
        const swing = wobbleElapsed >= 0 && wobbleElapsed < wobbleDuration
            ? Math.sin((wobbleElapsed / wobbleDuration) * TAU) * 0.4
            : 0;

        // smoothly chase the latest audio-derived band balance instead of snapping to it
        this.bandFractionsSmoothed = this.bandFractionsSmoothed.map((v, i) => {
            return v + (this.targetBandFractions[i] - v) * Math.min(1, dt / 350);
        });

        if (!this.masterInfo.animatedBackground) {
            return; // freeze on the last drawn frame rather than redrawing for nothing
        }

        this.draw(swing, now);
    }

    draw(swing, now) {
        const ctx = this.ctx;
        const w = this.viewW;
        const h = this.viewH;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const pulse = this.pulseEnvelope;
        const sat = 60 + pulse * 14;
        const light = 42 + pulse * 16;
        const hueOffsets = [-30, -10, 10, 30]; // analogous spread - stays harmonious, never clashes
        const hues = hueOffsets.map((off) => (this.baseHue + off + 360) % 360);

        const stripeAlpha = 1 - this.modeT;
        const spiralAlpha = this.modeT;

        if (stripeAlpha > 0.01) {
            this.drawStripes(ctx, cx, cy, w, h, swing, hues, sat, light, pulse, stripeAlpha);
        }
        if (spiralAlpha > 0.01) {
            this.drawSpiral(ctx, cx, cy, w, h, swing, sat, light, pulse, spiralAlpha);
        }

        // one shared vignette over the composite so both looks fade at the edges the same way
        ctx.globalCompositeOperation = "destination-in";
        const vign = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.8);
        vign.addColorStop(0, "rgba(0,0,0,1)");
        vign.addColorStop(0.72, "rgba(0,0,0,1)");
        vign.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = vign;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";

        if (now - this.lastFogUpdate > 200) {
            this.lastFogUpdate = now;
            this.updateFog(sat, light);
        }
    }

    // full-width color bands with a single wobble (not a continuous sway) when this mode first
    // takes over, plus a brightness wave continuously flowing outward from the center through
    // each band - the "traveling down the road at speed" illusion, never leaving a gap uncovered
    drawStripes(ctx, cx, cy, w, h, swing, hues, sat, light, pulse, alpha) {
        const size = Math.hypot(w, h) * 1.2;
        const half = size / 2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy);
        ctx.rotate(swing);
        ctx.translate(-half, -half);

        const fracs = this.bandFractionsSmoothed;
        const total = fracs.reduce((sum, v) => sum + v, 0) || 1;
        const repeats = 3;
        const segLen = 30;
        const wavelength = 190;
        const travelSpeed = 0.075;

        let x = 0;
        for (let r = 0; r < repeats; r++) {
            for (let i = 0; i < hues.length; i++) {
                const bandWidth = Math.max(20, (fracs[i] / total) * (size / repeats));
                const segCount = Math.ceil(size / segLen);
                for (let s = 0; s < segCount; s++) {
                    const y = s * segLen;
                    const dist = Math.abs(y - half);
                    // traveling wave sin((x - v*t)*k) moves outward (+x) as t increases
                    const wave = 0.5 + 0.5 * Math.sin(((dist - this.flowClock * travelSpeed) / wavelength) * TAU);
                    const segLight = Math.min(78, light - 12 + wave * 34 + pulse * 10);
                    ctx.fillStyle = `hsl(${hues[i]}, ${sat}%, ${segLight}%)`;
                    ctx.fillRect(x, y, bandWidth + 1, segLen + 1);
                }
                x += bandWidth;
            }
        }
        ctx.restore();
    }

    // a true (Archimedean) multi-arm spiral, drawn as thick overlapping arms so the colors
    // themselves visually blend into a swirl. Several depth "layers" continuously grow outward
    // from the center and loop (like passing tunnel rings), each also untwisting as it
    // approaches - together with the spin, that's what sells "flying through a tunnel" rather
    // than just a flat rotating pattern.
    drawSpiral(ctx, cx, cy, w, h, swing, sat, light, pulse, alpha) {
        const maxRadius = Math.hypot(w, h) * 0.7;
        const minRadius = Math.min(w, h) * 0.07;
        const turns = 2.3;
        const steps = 85;
        const armCount = 8;
        const growth = (maxRadius - minRadius) / (turns * TAU);
        // constant along an Archimedean spiral: the radial gap between interleaved arms
        const armGap = growth * TAU / armCount;
        const rotation = this.spinAngle + swing * 0.4;

        ctx.save();
        ctx.lineCap = "round";

        // big, gradual glow instead of a small hard point at the very center
        const centerHue = this.baseHue % 360;
        const centerLight = Math.max(8, light - 22);
        const centerGlowR = Math.min(maxRadius * 0.45, minRadius * 7.5);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerGlowR);
        grad.addColorStop(0, `hsla(${centerHue}, ${sat}%, ${centerLight}%, 1)`);
        grad.addColorStop(0.3, `hsla(${centerHue}, ${sat}%, ${centerLight}%, 0.85)`);
        grad.addColorStop(0.55, `hsla(${centerHue}, ${sat}%, ${centerLight}%, 0.55)`);
        grad.addColorStop(0.8, `hsla(${centerHue}, ${sat}%, ${centerLight}%, 0.22)`);
        grad.addColorStop(1, `hsla(${centerHue}, ${sat}%, ${centerLight}%, 0)`);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, centerGlowR, 0, TAU);
        ctx.fill();

        const layerCount = 3;
        const cycleMs = 3400;
        for (let layer = 0; layer < layerCount; layer++) {
            const phase = ((this.tunnelClock / cycleMs) + layer / layerCount) % 1;
            const fadeIn = Math.min(1, phase / 0.12);
            const fadeOut = Math.min(1, (1 - phase) / 0.18);
            const layerAlpha = alpha * fadeIn * fadeOut;
            if (layerAlpha <= 0.01) {
                continue;
            }
            // untwists as it "arrives" - more twist deep in the tunnel, none once it's close
            const layerRotation = rotation + (1 - phase) * 1.3;
            const widthScale = Math.max(0.15, phase);

            for (let arm = 0; arm < armCount; arm++) {
                const armPhase = (arm / armCount) * TAU;
                let prevX = null;
                let prevY = null;
                for (let i = 0; i <= steps; i++) {
                    const theta = (i / steps) * turns * TAU;
                    const radius = (minRadius + growth * theta) * phase;
                    const angle = theta + armPhase + layerRotation;
                    const x = cx + radius * Math.cos(angle);
                    const y = cy + radius * Math.sin(angle);
                    if (prevX !== null) {
                        const hue = (this.baseHue + 34 * Math.sin(theta * 0.6 + armPhase) + 360) % 360;
                        const segLight = Math.min(76, light + 4 + pulse * 12);
                        ctx.strokeStyle = `hsl(${hue}, ${sat}%, ${segLight}%)`;
                        ctx.globalAlpha = layerAlpha;
                        ctx.lineWidth = armGap * 1.7 * widthScale;
                        ctx.beginPath();
                        ctx.moveTo(prevX, prevY);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    }
                    prevX = x;
                    prevY = y;
                }
            }
        }
        ctx.restore();
    }

    // keeps the top "fog" veil (where notes spawn) in sync with the same evolving palette,
    // as one smooth color rather than the old striped gradient
    updateFog(sat, light) {
        const fogColor = `hsl(${this.baseHue % 360}, ${sat * 0.7}%, ${Math.max(10, light - 20)}%)`;
        ["fog-top-left", "fog-top-right", "fog-middle-left", "fog-middle-right", "fog-gradient-left", "fog-gradient-right"].forEach((eleId) => {
            const ele = document.getElementById(eleId);
            if (ele) {
                ele.style.background = fogColor;
            }
        });
    }

    changeColors() {
        this.colors.forEach((row, rIdx) => {
            return row.map((color, cIdx) => {
                if (Math.random() > 0.9) {
                    color[1] = color[1] === 1 ? -1 : 1
                }
                const nextIdx = rIdx === this.colors.length - 1 ? rIdx : rIdx + 1;
                const maxVal = rIdx === this.colors.length - 1 ? 250 : this.colors[nextIdx][cIdx][0];
                if (color[0] > maxVal - 5 && color[1] === 1) {
                    color[1] = -1;
                }
                if (color[0] < 40 && color[1] === -1) {
                    color[1] = 1;
                }
                // exp
                if (this.masterInfo.onFire) {
                    if (rIdx === 2) {
                        if (cIdx === 0 && color[0] < 255) {
                            color[1] = 1;
                        } else if (color[0] > 0) {
                            color[1] = -1;
                        }
                    }
                } else {
                    if (rIdx === 2 && this.masterInfo.puttingOutFire) {
                        if (cIdx === 0) {
                            if (color[0] > 150) {
                                color[1] = -1;
                            }
                        } else {
                            if (color[0] < 150) {
                                color[1] = 1;
                            }
                        }
                    }
                }
                // end exp
                if (Math.random() > 0.8) {
                    color[0] += color[1] * Math.floor(3 * Math.random());
                }
            });
        });
    }

    initializeColors() {
        const a1 = Math.floor(100 * Math.random());
        const a2 = Math.floor(100 * Math.random());
        const a3 = Math.floor(100 * Math.random());
        const b1 = Math.floor(a1 + ((255 - a1) * Math.random()));
        const b2 = Math.floor(a2 + ((255 - a2) * Math.random()));
        const b3 = Math.floor(a3 + ((255 - a3) * Math.random()));
        const c1 = Math.floor(b1 + ((255 - b1) * Math.random()));
        const c2 = Math.floor(b2 + ((255 - b2) * Math.random()));
        const c3 = Math.floor(b3 + ((255 - b3) * Math.random()));
        const d1 = Math.floor(c1 + ((255 - c1) * Math.random()));
        const d2 = Math.floor(c2 + ((255 - c2) * Math.random()));
        const d3 = Math.floor(c3 + ((255 - c3) * Math.random()));
        this.colors = [
            [[a1, 1], [a2, -1], [a3, 1]],
            [[b1, -1], [b2, 1], [b3, -1]],
            [[c1, 1], [c2, -1], [c3, 1]],
            [[d1, -1], [d2, 1], [d3, -1]]
        ];
    }

    initializeBackground() {
        // desktop's initial frame is drawn by the canvas render loop itself (setupCanvas());
        // nothing else to set up here now that the old stripe elements are retired.
    }

    initializeMobileBackground() {
        const colsToUse = this.colors.map((row) => {
            return row.map((col) => {
                return col[0];
            }).join(",");
        });
        document.getElementById("play-area").style.backgroundColor = `rgb(${colsToUse[2]})`;
        document.getElementById("background-left").style.background = `linear-gradient(
            to left,
            rgba(${colsToUse[1]}, 0) 0%,
            rgba(${colsToUse[1]}, 1) 100%)`;
        document.getElementById("background-right").style.background = `linear-gradient(
            to right,
            rgba(${colsToUse[1]}, 0) 0%,
            rgba(${colsToUse[1]}, 1) 100%)`;
        document.getElementById("fog-mobile").classList.remove("hidden");
        document.getElementById("fog-mobile-top").style.backgroundColor = `rgb(${colsToUse[0]})`;
        document.getElementById("fog-mobile-gradient").style.background = `linear-gradient(
            to top,
            rgba(${colsToUse[0]}, 0) 0%,
            rgba(${colsToUse[0]}, 1) 100%)`;
    }
}
