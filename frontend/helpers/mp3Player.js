import { 
    setLoading,
    setLoadingPercent,
    stopLoading,
    showSongControlButton
} from "./util.js";

export class Mp3Player {
    constructor(masterInfo, src, onEnd) {
        this.masterInfo = masterInfo;
        setLoading();
        setTimeout(() => {
            setLoadingPercent(10);
        }, 1000);
        this.silentPlayer = new Audio(src);
        this.loudPlayer = new Audio(src);
        this.loudPlayer.addEventListener("ended", () => {
            showSongControlButton("button-play");
            onEnd();
            this.restart();
        });
        this.silentPlayer.addEventListener("ended", () => {
            if (this.currentRecorder === "A") {
                this.recorderA.stop();
            } else {
                this.recorderB.stop();
            }
            this.ended = true;
        });
        this.currentRecorder = "A";
        this.startTimes = {
            A: 0,
            B: 0
        }
        this.queue = [];
        this.chunks = [];
        this.paused = false;
        this.ended = false;
        this.timeToPlayLoud = this.masterInfo.songDelay;
        let canPlay = false;
        this.silentPlayer.oncanplaythrough = () => {
            if (!canPlay) {
                canPlay = true;
                const recordCtx = new AudioContext();
                const dest = recordCtx.createMediaStreamDestination();
                const stream = recordCtx.createMediaElementSource(this.silentPlayer);
                stream.connect(dest);
                this.recorderInitial = new MediaRecorder(dest.stream);
                this.recorderA = new MediaRecorder(dest.stream);
                this.recorderB = new MediaRecorder(dest.stream);
                this.recorderA.ondataavailable = (e) => {
                    this.chunks.push(e.data);
                };
                this.recorderB.ondataavailable = (e) => {
                    this.chunks.push(e.data);
                };
                this.recorderInitial.ondataavailable = (e) => {
                    this.chunks.push(e.data);
                };
                this.recorderA.onstop = () => {
                    const blob = new Blob(this.chunks, { type: "audio/ogg; codecs=opus" });
                    while (this.chunks.length > 0) {
                        this.chunks.shift();
                    }
                    const reader = new FileReader();
                    reader.onload = (readerE) => {
                        const resStr = btoa(readerE.target.result);
                        const audio = new Audio(`data:audio/x-wav;base64,${resStr}`);
                        audio.addEventListener("ended", () => {
                            this.playNextPiece();
                        });
                        const ctx = new AudioContext();
                        const src = ctx.createMediaElementSource(audio);
                        const analyser = ctx.createAnalyser();
                        src.connect(analyser);
                        ctx.setSinkId({ type: "none" });
                        analyser.connect(ctx.destination);
                        analyser.fftSize = 4096;
                        const dataArray = new Uint8Array(analyser.frequencyBinCount);
                        this.queue.push({
                            audio: audio,
                            startTime: this.startTimes.A,
                            endTime: this.silentPlayer.currentTime,
                            analyser: analyser,
                            dataArray: dataArray,
                            initial: false
                        });
                    };
                    reader.readAsBinaryString(blob);
                };
                this.recorderB.onstop = () => {
                    const blob = new Blob(this.chunks, { type: "audio/ogg; codecs=opus" });
                    while (this.chunks.length > 0) {
                        this.chunks.shift();
                    }
                    const reader = new FileReader();
                    reader.onload = (readerE) => {
                        const resStr = btoa(readerE.target.result);
                        const audio = new Audio(`data:audio/x-wav;base64,${resStr}`);
                        audio.addEventListener("ended", () => {
                            this.playNextPiece();
                        });
                        const ctx = new AudioContext();
                        const src = ctx.createMediaElementSource(audio);
                        const analyser = ctx.createAnalyser();
                        src.connect(analyser);
                        ctx.setSinkId({ type: "none" });
                        analyser.connect(ctx.destination);
                        analyser.fftSize = 4096;
                        const dataArray = new Uint8Array(analyser.frequencyBinCount);
                        this.queue.push({
                            audio: audio,
                            startTime: this.startTimes.B,
                            endTime: this.silentPlayer.currentTime,
                            analyser: analyser,
                            dataArray: dataArray,
                            initial: false
                        });
                    };
                    reader.readAsBinaryString(blob);
                };
                this.recorderInitial.onstop = () => {
                    const blob = new Blob(this.chunks, { type: "audio/ogg; codecs=opus" });
                    while (this.chunks.length > 0) {
                        this.chunks.shift();
                    }
                    const reader = new FileReader();
                    reader.onload = (readerE) => {
                        const resStr = btoa(readerE.target.result);
                        const audio = new Audio(`data:audio/x-wav;base64,${resStr}`);
                        audio.addEventListener("ended", () => {
                            // console.log("ENDED");
                            this.playNextPiece();
                        });
                        const ctx = new AudioContext();
                        const src = ctx.createMediaElementSource(audio);
                        const analyser = ctx.createAnalyser();
                        src.connect(analyser);
                        ctx.setSinkId({ type: "none" });
                        analyser.connect(ctx.destination);
                        analyser.fftSize = 4096;
                        const dataArray = new Uint8Array(analyser.frequencyBinCount);
                        this.initialObj = {
                            audio: audio,
                            startTime: 0,
                            endTime: this.silentPlayer.currentTime,
                            analyser: analyser,
                            dataArray: dataArray,
                            initial: true
                        };
                        this.queue.push(this.initialObj);
                        // setTimeout(() => {
                        //     console.log(this.silentPlayer.currentTime);
                        // }, 2000);
                        // audio.play();
                    };
                    reader.readAsBinaryString(blob);
                };

                this.makeInitialRecording();
            }
        };

        // setInterval(() => {
        //     console.log(this.queue);
        // }, 3000);
    }

    makeInitialRecording() {
        this.silentPlayer.currentTime = 0;
        this.silentPlayer.play();
        this.recorderInitial.start();
        setTimeout(() => {
            this.recorderInitial.stop();
            this.silentPlayer.pause();
            stopLoading();
            this.currentRecorder = "A";
            this.startTimes.A = this.silentPlayer.currentTime;
            document.getElementById("close-and-play").classList.remove("hidden");
            document.getElementById("close-and-play-ghost").classList.add("hidden");
        }, 10000);
        [20, 40, 60, 80, 95].forEach((n) => {
            setTimeout(() => {
                setLoadingPercent(n);
            }, n * 100);
        });
    }

    switchRecorder() {
        // console.log("SWITCH ------- SWITCH");
        let oldRecorder = this.recorderA;
        let newRecorder = this.recorderB;
        if (this.currentRecorder === "B") {
            oldRecorder = this.recorderB;
            newRecorder = this.recorderA;
            this.currentRecorder = "A";
            this.startTimes.A = this.silentPlayer.currentTime;
        } else {
            this.currentRecorder = "B";
            this.startTimes.B = this.silentPlayer.currentTime;
        }
        newRecorder.start();
        oldRecorder.stop();
        setTimeout(() => {
            if (!this.paused && !this.ended && !this.restarted) {
                this.switchRecorder();
            }
        }, 4000);
    }

    startRecording(paused = false) {
        // console.log("STARTING RECORDING");
        if (this.ended) {
            return;
        }
        let recorder = this.recorderA;
        let startTime = this.startTimes.A;
        if (this.currentRecorder === "B") {
            recorder = this.recorderB;
            startTime = this.startTimes.B;
        }
        if (paused && !this.ended) {
            this.startTimes.A = this.silentPlayer.currentTime;
            this.startTimes.B = this.silentPlayer.currentTime;
        } else {
            this.silentPlayer.currentTime = startTime;
        }
        this.silentPlayer.play();
        recorder.start();
        setTimeout(() => {
            if (!this.paused && !this.ended && !this.restarted) {
                this.switchRecorder();
            }
        }, 4000);
    }

    playNextPiece() {
        this.queue.shift();
        if (this.queue.length > 0 && !this.queue[0].initial) {
            this.analyser = this.queue[0].analyser;
            this.dataArray = this.queue[0].dataArray;
            this.queue[0].audio.play();
        }
    }

    playSoundOnDelay() {
        this.wait = setTimeout(() => {
            this.loudPlayer.play();
            this.playingLoud = true;
        }, this.timeToPlayLoud);
    }

    play() {
        this.restarted = false;
        if (this.queue.length < 1) {
            console.log("queue empty");
            return;
        }
        if (this.paused) {
            this.startRecording(true);
            if (this.playingLoud) {
                this.loudPlayer.play();
            } else {
                this.playSoundOnDelay();
            }
            this.playTime = performance.now();
            this.analyser = this.queue[0].analyser;
            this.dataArray = this.queue[0].dataArray;
            this.queue[0].audio.play();
            this.paused = false;
        } else {
            this.playTime = performance.now();
            this.playSoundOnDelay();
            this.analyser = this.queue[0].analyser;
            this.dataArray = this.queue[0].dataArray;
            this.startRecording();
            this.queue[0].audio.play();
            this.countdown();
        }
    }

    pause() {
        if (this.currentRecorder === "A") {
            this.recorderA.stop();
            this.currentRecorder = "B";
        } else {
            this.recorderB.stop();
            this.currentRecorder = "A";
        }
        this.silentPlayer.pause();
        if (this.queue.length > 0) {
            this.queue[0].audio.pause();
        }
        if (this.playingLoud) {
            this.loudPlayer.pause();
        } else {
            this.timeToPlayLoud = this.masterInfo.songDelay - (performance.now() - this.playTime);
            clearTimeout(this.wait);
        }
        this.paused = true;
        this.countdownCanceled = true;
    }

    restart() {
        this.restarted = true;
        this.recorderA.stop();
        this.recorderB.stop();
        while (this.queue.length > 0) {
            this.queue.shift();
        }
        this.queue.push(this.initialObj);
        this.initialObj.audio.currentTime = 0;
        this.silentPlayer.currentTime = this.initialObj.endTime;
        this.currentRecorder = "A";
        this.startTimes.A = this.initialObj.endTime;
        this.loudPlayer.currentTime = 0;
        this.ended = false;
        this.playingLoud = false;
        this.paused = false;
        this.timeToPlayLoud = this.masterInfo.songDelay;
        while (this.chunks.length > 0) {
            this.chunks.shift();
        }
        this.countdownCanceled = false;
    }

    getDetailedFreqArray() {
        this.analyser.smoothingTimeConstant = 0.0;
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray.map(ele => ele);
    }

    getDetailedTimeArray() {
        this.analyser.smoothingTimeConstant = 0.0;
        this.analyser.getByteTimeDomainData(this.dataArray);
        return this.dataArray.map(ele => ele);
    }

    setVolume(val) {

    }

    countdown() {
        const rockLabel = document.getElementById("rock-label");
        rockLabel.classList.add("countdown-label");
        rockLabel.innerText = "Ready";
        this.countdownCanceled = false;
        setTimeout(() => {
            if (!this.countdownCanceled) {
                rockLabel.innerText = "3";
            } else {
                rockLabel.classList.remove("countdown-label");
            }
        }, 1000);
        setTimeout(() => {
            if (!this.countdownCanceled) {
                rockLabel.innerText = "2";
            } else {
                rockLabel.classList.remove("countdown-label");
            }
        }, 2000);
        setTimeout(() => {
            if (!this.countdownCanceled) {
                rockLabel.innerText = "1";
            } else {
                rockLabel.classList.remove("countdown-label");
            }
        }, 3000);
        setTimeout(() => {
            if (!this.countdownCanceled) {
                rockLabel.innerText = "";
            }
            rockLabel.classList.remove("countdown-label");
        }, 4000);
    }

    calibrateLag() {
        if (this.playingLoud && this.queue.length > 0) {
            const clipLength = this.queue[0].endTime - this.queue[0].startTime;
            if (clipLength > 3) { // don't screw with real short segments
                if (this.queue[0].audio.currentTime < 0.9 * clipLength) { // need clip to be able to end
                    this.queue[0].audio.currentTime = this.loudPlayer.currentTime + (1.0 * this.masterInfo.songDelay / 1000) - this.queue[0].startTime;
                }
            }
        }
    }
}