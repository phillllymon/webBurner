import {
    hideModal
} from "./util.js";

export class StreamPlayer {
    constructor(masterInfo, songDelay) {
        this.masterInfo = masterInfo;
        this.queue = [];
        this.started = false;
        this.current = null;
        this.muted = false;

        this.freqArrays = [];
        this.times = [];

        this.blobStreaming = false;
        this.blobs = [];
    }

    calibrateLag(delay = this.masterInfo.songDelay) {
        const delayInSeconds = 1.0 * delay / 1000;
        if (this.player && this.silentPlayer.currentTime > delayInSeconds) {
            this.silentPlayer.currentTime = this.player.currentTime + delayInSeconds;
        }
        if (this.current && this.current.silentSong.currentTime > delayInSeconds) {
            this.current.silentSong.currentTime = this.current.song.currentTime + delayInSeconds;
        }
    }

    playOnDelay(songObj) {
        songObj.silentSong.play();
        const thisObj = this;
        setTimeout(() => {
            thisObj.currentAudio = songObj.song;
            songObj.song.play();
        }, this.masterInfo.songDelay);
    }

    getDetailedFreqArray() {
        if (this.liveStream) {
            this.liveAnalyser.smoothingTimeConstant = 0.0;
            this.liveAnalyser.getByteFrequencyData(this.liveDataArray);
            return this.liveDataArray.map(ele => ele);
        }
        if (this.silentPlayer) {
            this.analyser.smoothingTimeConstant = 0.0;
            this.analyser.getByteFrequencyData(this.dataArray);
            return this.dataArray.map(ele => ele);
        }
        else {
            this.current.analyser.smoothingTimeConstant = 0.0;
            this.current.analyser.getByteFrequencyData(this.current.dataArray);
            return this.current.dataArray.map(ele => ele);
        }
    }

    getDetailedTimeArray() {
        if (this.liveStream) {
            this.liveAnalyser.smoothingTimeConstant = 0.0;
            this.liveAnalyser.getByteTimeDomainData(this.liveDataArray);
            return this.liveDataArray.map(ele => ele);
        }
        if (this.silentPlayer) {
            this.analyser.smoothingTimeConstant = 0.0;
            this.analyser.getByteTimeDomainData(this.dataArray);
            return this.dataArray.map(ele => ele);
        }
        else {
            this.current.analyser.smoothingTimeConstant = 0.0;
            this.current.analyser.getByteTimeDomainData(this.current.dataArray);
            return this.current.dataArray.map(ele => ele);
        }
    }

    getDataFreqArray() {
        if (this.liveStream) {
            this.liveAnalyser.getByteFrequencyData(this.liveDataArray);
            this.freqArrays.push(this.liveDataArray.map(val => val));
            const now = performance.now();
            this.times.push(now);
            while (this.times[0] < now - this.masterInfo.songDelay) {
                this.times.shift();
                this.freqArrays.shift();
            }

            return this.liveDataArray;
        }
        if (this.silentPlayer) {
            this.analyser.getByteFrequencyData(this.dataArray);

            this.freqArrays.push(this.dataArray.map(val => val));
            const now = performance.now();
            this.times.push(now);
            while (this.times[0] < now - this.masterInfo.songDelay) {
                this.times.shift();
                this.freqArrays.shift();
            }

            return this.dataArray;
        } else {
            if (this.current && !this.muted) {
                this.current.analyser.getByteFrequencyData(this.current.dataArray);
                
                this.freqArrays.push(this.current.dataArray.map(val => val));
                const now = performance.now();
                this.times.push(now);
                while (this.times[0] < now - this.masterInfo.songDelay) {
                    this.times.shift();
                    this.freqArrays.shift();
                }

                return this.current.dataArray;
            } else {
                return [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
            }
        }
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

    startNextRecording() {
        // const now = performance.now();
        // if (this.timestamp) {
        //     const diff = now - this.timestamp;
        //     console.log("time: " + diff);
        // }
        // this.timestamp = now;
        // console.log(this.nextDelay);
        this.nextSilentPlayer.volume = 0;
        this.nextSilentPlayer.play();
        this.nextSilentPlayer.currentTime = this.silentPlayer.currentTime - ((1.0 * this.nextDelay) / 1000);
        this.correction = 2.0 - this.nextSilentPlayer.currentTime;
        // console.log("correction " + this.correction);
        // this.nextSilentPlayer.play();
        this.nextSilentPlayer.volume = 1;
        // this.silentPlayer.pause();
        this.silentPlayer.volume = 0;
        this.silentPlayer = this.nextSilentPlayer;
        this.analyser = this.nextAnalyser;
        
        setTimeout(() => {
            // console.log("CHANGE PLAYER " + this.nextDelay);
            this.nextPlayer.volume = 0;
            this.nextPlayer.play();
            this.nextPlayer.currentTime = this.player.currentTime - ((1.0 * this.nextDelay) / 1000);
            // console.log("nextPlayer start time: " + this.nextPlayer.currentTime);
            this.nextPlayer.play();
            this.nextPlayer.volume = this.player.volume;
            this.player.volume = 0;
            this.player = this.nextPlayer;
        }, 4000);
        setTimeout(() => {
            this.startNextRecording();
        }, this.nextDelay + (1000.0 * this.correction));
    }

    setData(data, blobStream = false) {
        if (!this.masterInfo.songMode === "stream") {
            return;
        }
        if (!this.started) {
            document.getElementById("initial-received").style.color = "gray";
        }
        if (data.liveStream) {

            document.getElementById("initial-received").style.color = "gray";

            setTimeout(() => {
                document.getElementById("now-streaming").style.color = "gray";
                setTimeout(() => {
                    document.getElementById("connecting-radio").classList.add("hidden");
                    
                    document.getElementById("button-play").classList.add("pulse");
                    document.getElementById("button-play-beacon").classList.remove("hidden");

                }, 1000);
            }, 2000);

            if (this.livePlayer) {
                this.livePlayer.pause();
            }

            this.liveStream = true;
            this.livePlayer = data.player;
            this.livePlayer.play();
            this.liveAnalyser = data.analyser;
            this.liveDataArray = data.dataArray;
            this.gain = data.gain;
            this.ctx = data.ctx;
            this.nowGain = data.nowGain;
            this.nowCtx = data.nowCtx;

            // document.getElementById("connecting-radio").classList.add("hidden");
            return
        }
        if (data.timeDelay) {
            console.log("timeDelay recognized");
            if (this.player) {
                console.log("already have a player");
                const newPlayer = new Audio(`data:audio/x-wav;base64,${data.str}`);
                const newSilentPlayer = new Audio(`data:audio/x-wav;base64,${data.str}`);

                const audioCtx = new AudioContext();
                const audioSource = audioCtx.createMediaElementSource(newSilentPlayer);
                this.nextAnalyser = audioCtx.createAnalyser();
                audioSource.connect(this.nextAnalyser);
                audioCtx.setSinkId({ type: "none" });
                this.nextAnalyser.connect(audioCtx.destination);
                this.nextAnalyser.fftSize = 4096;
                this.nextDataArray = new Uint8Array(this.nextAnalyser.frequencyBinCount);

                const assignNexts = () => {
                    newSilentPlayer.removeEventListener("canplaythrough", assignNexts);
                    this.nextPlayer = newPlayer;
                    this.nextSilentPlayer = newSilentPlayer;
                    this.nextDelay = data.timeDelay;
                };
                newSilentPlayer.addEventListener("canplaythrough", assignNexts);

            } else {
                // console.log("making new player");
                this.player = new Audio(`data:audio/x-wav;base64,${data.str}`);
                this.silentPlayer = new Audio(`data:audio/x-wav;base64,${data.str}`);

                const audioCtx = new AudioContext();
                const audioSource = audioCtx.createMediaElementSource(this.silentPlayer);
                this.analyser = audioCtx.createAnalyser();
                audioSource.connect(this.analyser);
                audioCtx.setSinkId({ type: "none" });
                this.analyser.connect(audioCtx.destination);
                this.analyser.fftSize = 4096;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

                const startPlaying = () => {
                    this.silentPlayer.removeEventListener("canplaythrough", startPlaying);
                    console.log("should hear music in 9 seconds");
                    document.getElementById("now-streaming").style.color = "gray";
                    setTimeout(() => {
                        this.silentPlayer.play();
                        setTimeout(() => {
                            this.player.play();
                            document.getElementById("connecting-radio").classList.add("hidden");
                        }, 4000);
                        setTimeout(() => {
                            this.startNextRecording();
                        }, 12000);
                    }, 5000);
                };
                this.silentPlayer.addEventListener("canplaythrough", startPlaying);
            }

            
            return;
        }
        if (blobStream) { // accept blobs only the first of which can be the start of a sound file
            let newData = true;
            this.blobs.push(data);

            console.log(this.blobs.length);

            const blobToUse = new Blob(this.blobs, { type: "audio/ogg; codecs=opus" });
            const reader = new FileReader();
            reader.onload = (readerE) => {
                const str = btoa(readerE.target.result);
                const newPlayer = new Audio(`data:audio/x-wav;base64,${str}`);
                const newSilentPlayer = new Audio(`data:audio/x-wav;base64,${str}`);

                const audioCtx = new AudioContext();
                const audioSource = audioCtx.createMediaElementSource(newSilentPlayer);
                this.analyser = audioCtx.createAnalyser();
                audioSource.connect(this.analyser);
                audioCtx.setSinkId({ type: "none" });
                this.analyser.connect(audioCtx.destination);
                this.analyser.fftSize = 4096;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

                newSilentPlayer.addEventListener("canplaythrough", () => {
                    if (newData) {
                        if (this.player) {
                            newPlayer.volume = 0;
                            newSilentPlayer.volume = 0;
                            newPlayer.currentTime = this.player.currentTime;
                            newSilentPlayer.currentTime = this.silentPlayer.currentTime;
                            newPlayer.play();
                            newSilentPlayer.play();
                            newPlayer.volume = this.player.volume;
                            newSilentPlayer.volume = 1;
                            this.player.volume = 0;
                            this.silentPlayer.volume = 0;
                            this.player = newPlayer;
                            this.silentPlayer = newSilentPlayer;
                        } else {
                            this.silentPlayer = newSilentPlayer;
                            this.player = newPlayer;

                            setTimeout(() => {
                                this.silentPlayer.play();
                                setTimeout(() => {
                                    this.player.play();
                                    document.getElementById("connecting-radio").classList.add("hidden");
                                }, 4000);
                                document.getElementById("now-streaming").style.color = "gray";
                            }, 4000);
                        }
                        newData = false;
                    }
                });

            };
            reader.readAsBinaryString(blobToUse);

            this.started = true;
            return;
        } else {
            this.liveStreaming = false;
        }
        // BELOW FOR STREAMING MODE
        const dataObj = JSON.parse(data);

        const audioCtx = new AudioContext();
        const silentSong = new Audio(`data:audio/x-wav;base64,${dataObj.str}`);

        const audioSource = audioCtx.createMediaElementSource(silentSong);
        const analyser = audioCtx.createAnalyser();
        audioSource.connect(analyser);
        audioCtx.setSinkId({ type: "none" });
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 4096;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const newSongObj = {
            song: new Audio(`data:audio/x-wav;base64,${dataObj.str}`),
            notes: dataObj.notes,
            time: dataObj.time,
            silentSong: silentSong,
            analyser: analyser,
            dataArray: dataArray
        };

        this.queue.push(newSongObj);
        console.log("new chunk added to queue");

        if (!this.started && this.queue.length > 1) {
            hideModal("stream");
            console.log("starting music " + this.queue.length);
            this.startNextChunk();
            document.getElementById("now-streaming").style.color = "gray";
            const songLabel = document.getElementById("song-label");
            if (songLabel.innerText === "keep your shirt on") {
                songLabel.innerText = "streaming";
            }
            setTimeout(() => {
                document.getElementById("connecting-radio").classList.add("hidden");
                document.getElementById("button-play").classList.add("pulse");
                document.getElementById("button-play-beacon").classList.remove("hidden");
            }, 2000);
        }
    }

    startNextChunk() {
        if (this.queue.length < 1) {
            if (this.masterInfo.songMode === "stream") {
                // console.log("music queue empty " + this.queue.length);
                document.getElementById("song-label").innerText = "stream ended";
            }
            this.started = false;
        } else {
            this.current = this.queue.shift();
            
            this.playOnDelay(this.current);
            if (this.muted) {
                this.current.song.volume = 0;
            }
            console.log(this.current.time);

            setTimeout(() => {
                this.startNextChunk();
            }, this.current.time);
    
            this.started = true;
        }
    }

    setVolume(val) {
        if (this.currentAudio) {
            this.currentAudio.volume = val;
        }
        if (this.current) {
            this.current.song.volume = val;
        }
        if (this.player) {
            this.player.volume = val;
        }
        if (this.livePlayer) {
            this.livePlayer.volume = val;
            // this.gain.gain.setValueAtTime(val, this.ctx.currentTime);
            // console.log(this.gain.gain);
            // console.log(this.ctx.currentTime);
        }
    }

    start() {
        this.masterInfo.songActive = true;
        if (this.liveStream) {
            this.ctx.resume();
        } else {
            this.setVolume(1);
        }
        this.muted = false;
    }

    stop() {
        this.masterInfo.songActive = false;
        if (this.liveStream) {
            this.ctx.suspend();
        } else {
            this.setVolume(0);
        }
        this.muted = true;
    }

    stopStream() {
        this.liveStream = false;
        if (this.livePlayer) {
            this.livePlayer.pause();
            this.livePlayer = null;
        }
        if (this.current) {
            this.current.song.pause();
            this.current.song = null;
            this.current = null;
            while (this.queue.length > 0) {
                this.queue.shift();
            }
        }
    }
}