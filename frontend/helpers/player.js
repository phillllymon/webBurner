import { showSongControlButton } from "./util.js";
import { setLoading, setLoadingPercent, stopLoading } from "./util.js";
import { Mp3Player } from "./mp3Player.js";

export class Player {
    // delay in ms
    constructor(masterInfo, sourceName, fftSize, onEnd) {
        this.masterInfo = masterInfo;
        this.song1 = new Audio();
        this.song2 = new Audio();
        this.onEnd = onEnd;

        this.playing1 = false;
        this.playing2 = false;
        this.paused = false;
        this.arrayPlay = false;
        this.delayPlay = false;

        // this.song1.oncanplaythrough = () => {};

        this.timeStarted = false;
        this.song2Timeout = false;

        this.timeToStart2 = masterInfo.songDelay;

        this.song1.addEventListener("ended", () => {
            this.playing1 = false;
        });
        this.song2.addEventListener("ended", () => {

            // temp
            // console.log("-------------");
            // console.log("num notes: " + masterInfo.numNotes);
            // console.log("song duration: " + this.song2.duration);
            // masterInfo.numNotes = 0;
            // console.log("-------------");

            this.masterInfo.songActive = false;
            this.playing2 = false;
            this.timeToStart2 = this.masterInfo.songDelay;
            this.restart();
            showSongControlButton("button-play");
            onEnd();
        });
        
        this.waiting = false;
        this.countdownCanceled = false;

        // NOTE - this stuff is set either in controlsManager or mp3Player
        // const detailedAudioCtx = new AudioContext();

        // const detailedAudioSource = detailedAudioCtx.createMediaElementSource(this.song1); // **** UNDO!!!!!
        // detailedAudioSource.connect(detailedAudioCtx.destination); // temp?
        // this.detailedAnalyser = detailedAudioCtx.createAnalyser();
        // detailedAudioSource.connect(this.detailedAnalyser);
        // // detailedAudioCtx.setSinkId({ type: "none" });
        // this.detailedAnalyser.connect(detailedAudioCtx.destination);
        // // this.detailedAnalyser.smoothingTimeConstant = 0;
        // this.detailedAnalyser.fftSize = 4096;
        // this.detailedDataArray = new Uint8Array(this.detailedAnalyser.frequencyBinCount);



        // For delayed frequency array requests
        this.freqArrays = [];
        this.times = [];
    }

    setPlayerReady(callback) {
        this.song1.oncanplaythrough = callback;
        this.readyCallback = callback;
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

    

    start() {

        this.masterInfo.songActive = true;
        if (this.delayPlay) {
            this.mp3.play();
            return;

        }
        if (this.masterInfo.songAtStart) {
            this.countdown();
        }
        this.masterInfo.songAtStart = false;
        if (this.arrayPlay) {
            this.songPiece.audio.play();
        } else {
            this.song1.play();
        }
        this.playing1 = true;
        this.timeStarted = performance.now();
        if (this.timeToStart2) {
            setTimeout(() => {this.startSong2()}, this.timeToStart2);
            this.waiting = true;

        } else {
            this.song2.play();
            this.playing2 = true;
        }
        this.paused = false;
    }

    startSong2() {
        if (!this.paused) {
            this.song2.play();
            this.playing2 = true;
            this.timeToStart2 = false;
            this.waiting = false;
            // console.log("-----");
            // console.log(this.song1.currentTime);
            // console.log("-----");
            // document.getElementById("song-label").innerText = this.song1.currentTime;
        }
    }

    pause() {
        this.masterInfo.songActive = false;
        if (this.delayPlay) {
            this.mp3.pause();
            return;

            
        } else if (this.playing2) {
            this.song2.pause();
            this.playing2 = false;
            if (this.arrayPlay) {
                this.songPiece.audio.pause();
            } else {
                this.song1.pause();  // no harm if it's already ended
            }
            this.playing1 = false;
        } else {
            if (this.song1.playing) {
                if (this.arrayPlay) {
                    this.songPiece.audio.pause();
                } else {
                    this.song1.pause();
                }
                this.song1.playing = false;
                this.song1.pause();
                clearTimeout(this.song2Timeout);
                this.timeToStart2 = performance.now() - timeStarted;
            }
        }
        this.countdownCanceled = true;
        this.paused = true;
    }

    restart() {
        if (this.delayPlay) {
            this.mp3.restart();
            return;

            
        } else if (this.arrayPlay) {
            this.songPiece.audio.pause();
            this.arrayPos = 0;
            this.songPiece = this.piecesArray[this.arrayPos];
            this.song2.pause();
            this.playing1 = false;
            this.playing2 = false;
            if (this.waiting) {
                clearTimeout(this.song2Timeout);
                this.waiting = false;
            }
            this.timeToStart2 = this.masterInfo.songDelay;
            this.song2.currentTime = 0;
            this.masterInfo.songAtStart = true;
            this.countdownCanceled = true;
        } else {
            this.song1.pause();
            this.song2.pause();
            this.playing1 = false;
            this.playing2 = false;
            if (this.waiting) {
                clearTimeout(this.song2Timeout);
                this.waiting = false;
            }
            this.timeToStart2 = this.masterInfo.songDelay;
            this.song1.currentTime = 0;
            this.song2.currentTime = 0;
            this.masterInfo.songAtStart = true;
            this.countdownCanceled = true;
        }
    }

    setSource(songData, arrayPlay = false, arrayData = false, delayPlay = false) {
        if (delayPlay) { // for mp3 uploads - it plays the mp3 silently, records it in segments, uses the segments for analyser, & plays mp3 outloud on delay
            this.mp3 = new Mp3Player(this.masterInfo, songData, this.onEnd);

            this.delayPlay = true;
            return;
            
            
        } else if (arrayPlay) {
            this.delayPlay = false;
            if (arrayData) {
                this.arrayPlay = true;
                this.arrayPos = 0; // current piece in the array

                let arrLength = 0;
                arrayData.forEach((piece) => {
                    if (piece.startTime !== null) {
                        arrLength += 1;
                    }
                });

                this.piecesArray = arrayData.slice(0, arrLength);
                this.songPiece = this.piecesArray[this.arrayPos];
                this.piecesArray.forEach((pieceObj) => {
                    pieceObj.audio.addEventListener("ended", () => {
                        this.startNextPiece();
                    });
                });
                this.song2.setAttribute("src", songData);
                if (arrayData.length > 0) {
                    this.restart();
                    this.masterInfo.songAtStart = true;
                }
            } else {
                if (this.piecesArray) {
                    this.piecesArray.forEach((piece) => {
                        if (piece.ctx) {
                            piece.ctx.close();
                        }
                    });
                }
                this.piecesArray = null;
                this.songPiece = null;
            }
        } else {
            this.delayPlay = false;
            this.arrayPlay = false;
            this.restart();
            this.song1.setAttribute("src", songData);
            this.song2.setAttribute("src", songData);
            this.masterInfo.songAtStart = true;
        }
    }

    startNextPiece() {
        this.arrayPos += 1;
        if (this.piecesArray[this.arrayPos]) {
            this.songPiece = this.piecesArray[this.arrayPos];
            this.songPiece.audio.play();
        } else {
            // Do we have to do anything here?
        }
    }

    // for DETAILED EXPERIMENT
    getDetailedFreqArray() {
        if (this.arrayPlay) {
            // this.songPiece.analyser.smoothingTimeConstant = 0;
            this.songPiece.analyser.smoothingTimeConstant = 0.0;
            this.songPiece.analyser.getByteFrequencyData(this.songPiece.array);
            return this.songPiece.array.map(ele => ele);
        } else if (this.delayPlay) {
            return this.mp3.getDetailedFreqArray();
        } else {
            // this.detailedAnalyser.smoothingTimeConstant = 0;
            this.detailedAnalyser.smoothingTimeConstant = 0.0;
            this.detailedAnalyser.getByteFrequencyData(this.detailedDataArray);
            return this.detailedDataArray.map(ele => ele);
        }
    }
    getDetailedTimeArray() {
        if (this.arrayPlay) {
            this.songPiece.analyser.smoothingTimeConstant = 0;
            this.songPiece.analyser.getByteTimeDomainData(this.songPiece.array);
            return this.songPiece.array.map(ele => ele);
        } else if (this.delayPlay) {
            return this.mp3.getDetailedTimeArray();
        } else {
            this.detailedAnalyser.smoothingTimeConstant = 0;
            this.detailedAnalyser.getByteTimeDomainData(this.detailedDataArray);
            return this.detailedDataArray.map(ele => ele);
        }
    }
    // END DETAILED EXPERIMENT

    getDataFreqArray() {
        this.analyser.getByteFrequencyData(this.dataArray);

        this.freqArrays.push(this.dataArray.map(val => val));
        const now = performance.now();
        this.times.push(now);
        while (this.times[0] < now - this.masterInfo.songDelay) {
            this.times.shift();
            this.freqArrays.shift();
        }

        return this.dataArray;
    }

    getDataFreqArrayDelayed(delay = 2000) {

        let i = 0;
        while (performance.now() - delay > this.times[i]){
            i += 1;
            if (!this.times[i]) {
                break;
            }
        }
        if (this.times[i]) {
            return this.freqArrays[i];
        } else {
            return [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        }
    }

    setVolume(val) {
        if (this.delayPlay) {
            this.mp3.setVolume(val);
            // this.uploadLoud.volume = val;
        } else {
            this.song2.volume = val;
        }
    }

    calibrateLag(delay = this.masterInfo.songDelay) {
        const delayInSeconds = 1.0 * delay / 1000;
        
        if (this.delayPlay) {
            if (this.mp3) {
                this.mp3.calibrateLag();
            }
            return;
        }

        if (this.arrayPlay) {
            if (this.playing2 && this.songPiece.audio.currentTime < 0.5 * this.songPiece.audio.duration) {
                this.songPiece.audio.currentTime = this.song2.currentTime + delayInSeconds - this.songPiece.startTime;
            }
        } else {
            if (this.song1.currentTime > delayInSeconds + 0.1) {  // just check to make sure we're playing song2 yet
                this.song1.currentTime = this.song2.currentTime + delayInSeconds;
            }
        }
    }
}