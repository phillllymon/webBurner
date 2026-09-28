import { songStages } from "../data.js";

// songCode -> Promise<string> (base64 text, not yet wrapped in a data: URI)
const cache = new Map();

const flatSongOrder = songStages.flat();

export function getSongData(songCode) {
    if (!cache.has(songCode)) {
        const request = fetch(`./songStrings/${songCode}.txt`)
            .then((res) => res.text())
            .catch((e) => {
                cache.delete(songCode); // let a later call retry instead of caching the failure
                throw e;
            });
        cache.set(songCode, request);
    }
    return cache.get(songCode);
}

// fire-and-forget: warms the cache so a later getSongData() call resolves instantly.
// errors are swallowed here and will surface on whatever call eventually awaits the song for real.
export function prefetchSongData(songCode) {
    if (!songCode) {
        return;
    }
    getSongData(songCode).catch(() => {});
}

export function getNextSongCode(songCode) {
    const idx = flatSongOrder.indexOf(songCode);
    if (idx === -1 || idx === flatSongOrder.length - 1) {
        return null;
    }
    return flatSongOrder[idx + 1];
}
