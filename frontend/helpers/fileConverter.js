import {
    setLoadingMessage,
    setLoadingPercent
} from "./util.js";

export class FileConverter {
    constructor() {
        this.barPos = 0;
    }

    startBarAnimate(endPos, time) {
        const distToGo = endPos - this.barPos;
        const endTime = performance.now() + time;
        const numSteps = time / 500;
        const distPerStep = distToGo / Math.ceil(numSteps);
        const animateInterval = setInterval(() => {
            setLoadingPercent(this.barPos + distPerStep);
            this.barPos += distPerStep;
            if (performance.now() > endTime || this.barPos > endPos) {
                clearInterval(animateInterval);
            }
        }, 500);
    }

    animateBar() {
        const now = performance.now();
        if (now > this.endTime) {
            this.animating = false;
        }
        const elapsed = now - this.lastTime;
        
        const fractionElapsed = this.endTime > now ? elapsed / (this.endTime - now) : 0;
        console.log("this: " + fractionElapsed);
        const distToFinish = this.endPos - this.barPos;
        const targetPos = 100.0 * (this.barPos + (fractionElapsed * distToFinish));
        setLoadingPercent(targetPos);
        this.barPos = targetPos;

        this.lastTime = now;
        if (this.animating) {
            requestAnimationFrame(() => {
                this.animateBar();
            });
        }
    }

    // returns promise that resolves to info as string
    convertToM4a(str) {
        return new Promise((resolve) => {
            this.startBarAnimate(25, 2000);

            const songData = `data:audio/x-wav;base64,${str}`;
            const player = new Audio(songData);

            let canPlayThrough = false;
            player.oncanplaythrough = () => {
                if (!canPlayThrough) {
                    canPlayThrough = true;
                    const totalSeconds = player.duration;

                    
                    const pieceSize = Math.ceil(totalSeconds / 8); // chunk length in seconds
                    // const pieceSize = Math.ceil(totalSeconds);

                    this.startBarAnimate(100, 5000 + (1000 * pieceSize));
                    setTimeout(() => {
                        setLoadingMessage("Keep your shirt on");
                    }, 15000);
                    setTimeout(() => {
                        setLoadingMessage("m4a loads faster...");
                    }, 4000);
                    

                    const numPieces = Math.ceil(totalSeconds / pieceSize);
                    // const numPieces = 1;
                    const pieces = [];
                    for (let i = 0; i < numPieces; i++) {
                        pieces.push(null);
                    }
                    let piecesMade = 0;
                    
                    // for (let i = numPieces - 1; i > -1; i--) {
                    for (let i = 0; i < numPieces; i++) {
                        const startPos = i * pieceSize;
                        const pieceSongData = `data:audio/x-wav;base64,${str}`;
                        const piecePlayer = new Audio(pieceSongData);
                        let canPlay = false;
                        piecePlayer.oncanplaythrough = () => {
                            if (!canPlay) {
                                
                                canPlay = true;
                                piecePlayer.currentTime = startPos;
                                const pieceCtx = new AudioContext();
                                const dest = pieceCtx.createMediaStreamDestination();
                                const recorder = new MediaRecorder(dest.stream);
                                const stream = pieceCtx.createMediaElementSource(piecePlayer);
                                const chunks = [];
                                stream.connect(dest);
                                piecePlayer.play();
                                const startTime = piecePlayer.currentTime;
                                recorder.start();

                                setTimeout(() => {
                                    recorder.stop();
                                    piecePlayer.pause();
                                    
                                }, 1000 * pieceSize);
                                
                                recorder.ondataavailable = (e) => {
                                    chunks.push(e.data);
                                };
        
                                recorder.onstop = () => {
                                    
                                    const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
                                    const reader = new FileReader();
                                    reader.onload = (readerE) => {
                                    

                                        const resStr = btoa(readerE.target.result);
                                        const audio = new Audio(`data:audio/x-wav;base64,${resStr}`);
                                        const newCtx = new AudioContext();
                                        const newSource = newCtx.createMediaElementSource(audio);
                                        const newAnalyser = newCtx.createAnalyser();
                                        newSource.connect(newAnalyser);
                                        newCtx.setSinkId({ type: "none" });
                                        newAnalyser.connect(newCtx.destination);
                                        newAnalyser.fftSize = 4096;
                                        const newArray = new Uint8Array(newAnalyser.frequencyBinCount);
                                        let canOnce = false;
                                        audio.oncanplaythrough = () => {
                                            if (!canOnce) {
                                                
                                                pieceCtx.close();
                                                canOnce = true;
                                                pieces[i] = {
                                                    audio: audio,
                                                    startTime: startTime,
                                                    analyser: newAnalyser,
                                                    array: newArray,
                                                    ctx: newCtx
                                                };
                                                
                                                piecesMade += 1;
                                                if (piecesMade === numPieces) {
                                                    setTimeout(() => {
                                                        setLoadingPercent(0);
                                                        this.barPos = 0;
                                                    }, 500);
                                                    
                                                    resolve(pieces);
                                                }
                                            }
                                        }
                                    };
                                    reader.readAsBinaryString(blob);
                                };
                            }
                        };
                    }
                    
                    
                }
            }

            

        });
    }
}