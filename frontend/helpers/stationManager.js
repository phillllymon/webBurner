import { getUserProfile } from "./util.js";

export class StationManager {
    constructor(masterInfo, streamPlayer) {
        this.masterInfo = masterInfo;
        this.streamPlayer = streamPlayer;
        this.radioAudio = new Audio();
        this.radioAudio.crossOrigin = "anonymous";
        this.listening = false;
        this.canceled = false;
        
        this.chunksA = [];
        this.chunksB = [];
        this.times = {
            A: 0,
            B: 0
        }
        this.timestamp = performance.now();

        this.startTime = 0;
        this.endTime = 0;

        this.recorderA = null;
        this.recorderB = null;

        getUserProfile().then((profile) => {
            this.stations = profile.stations;
            this.activateStationSelection();
        });
        
        // this.stations = {
        //     "kingFM": {
        //         name: "classical king FM",
        //         stream: "https://classicalking.streamguys1.com/king-fm-aac-128k"
        //     },
        //     "mvn925": {
        //         name: "movin' 92.5",
        //         stream: "https://23093.live.streamtheworld.com/KQMVFM.mp3?dist=hubbard&source=hubbard-web&ttag=web&gdpr=0"
        //     },
        //     "unsung80s": {
        //         name: "Unsung 80s",
        //         stream: "https://unsung80s.out.airtime.pro/unsung80s_a"
        //     },
        //     "beat90s": {
        //         name: "The beat 90s",
        //         stream: "https://ice10.securenetsystems.net/AM1380?playSessionID=1C5D8230-00FD-2EFE-2AEE4302B829B5F3"
        //     },
        //     "100hitz": {
        //         name: "100 hitz",
        //         stream: "https://pureplay.cdnstream1.com/6045_128.mp3"
        //     },
        //     "mlelive": {
        //         name: "MLE live",
        //         stream: "https://listen.radioking.com/radio/114610/stream/462118"
        //     },
        //     "chetFM": {
        //         name: "93.5 Chet FM",
        //         stream: "https://ice23.securenetsystems.net/KDJF?playSessionID=1CE4C155-F05D-ADFF-15CD1D9351B467C0"
        //     },
        //     "scooter": {
        //         name: "Scooterist radio",
        //         stream: "https://listen.radioking.com/radio/214267/stream/257398?1709875088135"
        //     },
        //     "1234gr": {
        //         name: "1234 GR",
        //         stream: "https://radio1234gr.radioca.st/live"
        //     },
        //     "hawk": {
        //         name: "Hawk classic rock",
        //         stream: "https://ice6.securenetsystems.net/KRSE?playSessionID=1D6EEF83-C785-2F70-5A76B4CD63C85056"
        //     }
        // };
    }

    updateStationInfo(stations) {
        this.stations = stations;
        const stationSelector = document.getElementById("select-station");
        stationSelector.innerHTML = "";

        const keys = Object.keys(this.stations);
        for (let i = 0; i < keys.length; i++) {
            const stationKey = keys[i];
            const newOption = document.createElement("option");
            newOption.value = stationKey;
            newOption.innerText = this.stations[stationKey].name;
            if (i === keys.length - 1) { // always select last on on list by default
                this.stationInfo = this.stations[stationKey];
                newOption.selected = "selected";
            }
            stationSelector.appendChild(newOption);
        };
    }

    activateStationSelection() {
        document.getElementById("cancel-radio-connect").addEventListener("click", () => {
            this.canceled = true;
            this.listening = false;
            document.getElementById("radio-status-title").style.color = "blue";
            document.getElementById("radio-status-title").innerText = "Connecting...";
            document.getElementById("connecting-radio").classList.add("hidden");
            document.getElementById("main-menu").classList.remove("hidden");
        });

        const stationSelector = document.getElementById("select-station");

        // const keys = Object.keys(this.stations);
        // for (let i = 0; i < keys.length; i++) {
        //     const stationKey = keys[i];
        //     const newOption = document.createElement("option");
        //     newOption.value = stationKey;
        //     newOption.innerText = this.stations[stationKey].name;
        //     if (i === keys.length - 1) { // always select last on on list by default
        //         this.stationInfo = this.stations[stationKey];
        //         newOption.selected = "selected";
        //     }
        //     stationSelector.appendChild(newOption);
        // };

        stationSelector.addEventListener("change", () => {
            const newCode = stationSelector.value;
            this.masterInfo.radioCode = newCode;
            this.stationInfo = this.stations[newCode];
            this.radioAudio.setAttribute("src", this.stationInfo.stream);
            document.getElementById("song-label").innerText = this.stationInfo.name;
            this.masterInfo.currentSong = this.stationInfo.name;
            this.stopListening();
            this.streamPlayer.stop();
        });
    }

    stopListening() {
        if (this.listening) {
            this.streamPlayer.stopStream();
            this.listening = false;
        }
    }

    startListening() {
        if (this.listening) {
            return;
        }
        this.listening = true;
        this.canceled = false;

        document.getElementById("acquiring").style.color = "transparent";
        document.getElementById("initial-received").style.color = "transparent";
        document.getElementById("now-streaming").style.color = "transparent";
        document.getElementById("connecting-radio").classList.remove("hidden");
        document.getElementById("connecting-radio").classList.add("menu");

        document.getElementById("acquiring").style.color = "gray";

        let canPlay = false;
        setTimeout(() => {
            if (!canPlay) {
                this.canceled = true;
                document.getElementById("radio-status-title").style.color = "red";
                document.getElementById("radio-status-title").innerText = "Connection failed";
                // setTimeout(() => {
                //     document.getElementById("radio-status-title").innerText = "Connecting...";
                //     document.getElementById("connecting-radio").classList.add("hidden");
                //     document.getElementById("connecting-radio").classList.remove("menu");
                //     document.getElementById("main-menu").classList.remove("hidden");
                //     document.getElementById("main-menu").classList.add("menu");
                // }, 1500);
            }
        }, 15000);

        const radioPlayer = new Audio(this.stationInfo.stream);
        radioPlayer.crossOrigin = "anonymous";

        radioPlayer.addEventListener("canplaythrough", () => {
            if (!canPlay && !this.canceled) {
                canPlay = true;
                const audioCtx = new AudioContext();
                const radioSourceDelay = audioCtx.createMediaElementSource(radioPlayer);
    
                const radioDelay = audioCtx.createDelay(1.0 * this.masterInfo.songDelay / 1000);
                radioDelay.delayTime.setValueAtTime(1.0 * this.masterInfo.songDelay / 1000, radioPlayer.currentTime);
                radioSourceDelay.connect(radioDelay);
                radioDelay.connect(audioCtx.destination);
                
                // const gain = audioCtx.createGain();
                // radioSourceDelay.connect(gain);
                // gain.connect(audioCtx.destination);
    
                
                const nowCtx = new AudioContext();
                const radioSource = nowCtx.createMediaStreamSource(radioPlayer.captureStream());
                const analyser = nowCtx.createAnalyser();
                radioSource.connect(analyser);
                nowCtx.setSinkId({ type: "none" });
                analyser.connect(nowCtx.destination);
                analyser.fftSize = 4096;
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                // const nowGain = nowCtx.createGain();
                // radioSource.connect(nowGain);
                // nowGain.connect(nowCtx.destination);
                
        
        
                
        
                this.streamPlayer.setData({
                    liveStream: true,
                    player: radioPlayer,
                    analyser: analyser,
                    dataArray: dataArray,
                    // gain: gain,
                    ctx: audioCtx,
                    nowCtx: nowCtx,
                    // nowGain: nowGain
                });
            }
        });

        return;
        // END LIVE STREAM VERSION

        // document.getElementById("acquiring").style.color = "transparent";
        // document.getElementById("initial-received").style.color = "transparent";
        // document.getElementById("now-streaming").style.color = "transparent";
        // document.getElementById("connecting-radio").classList.remove("hidden");
        // document.getElementById("connecting-radio").classList.add("menu");
        // setTimeout(() => {
        //     document.getElementById("song-label").innerText = "Keep your shirt on";
        // }, 9000);

        // // this.player = new Audio();
        // // this.player.src = this.stationInfo.stream;
        // // this.player.crossOrigin = "anonymous";
        // this.radioAudio.src = this.stationInfo.stream;

        // const audioCtx = new AudioContext();
        // const audioSource = audioCtx.createMediaElementSource(this.radioAudio);
        // const analyser = audioCtx.createAnalyser();
        // audioSource.connect(analyser);
        // audioCtx.setSinkId({ type: "none" });

        // let dest;
        
        // let stream;

        // // setTimeout(() => {
        // this.radioAudio.addEventListener("canplaythrough", () => {
        //     document.getElementById("acquiring").style.color = "gray";
        //     this.radioAudio.play();
        
        //     // audioCtx = new AudioContext();
        //     dest = audioCtx.createMediaStreamDestination();
        //     this.recorderA = new MediaRecorder(dest.stream);
        //     this.recorderB = new MediaRecorder(dest.stream);
        //     stream = audioCtx.createMediaStreamSource(this.radioAudio.captureStream());
        //     stream.connect(dest);


        //     const startNextRecording = (prevStartTime) => {
        //         const recorder = new MediaRecorder(dest.stream);
        //         const startTimeArr = [0];
        //         recorder.onstart = () => {
        //             startTimeArr[0] = performance.now();
        //         };
        //         recorder.ondataavailable = (e) => {
        //             const blob = new Blob([e.data], { type: "audio/ogg; codecs=opus" });
        //             const reader = new FileReader();
        //             reader.onload = (readerE) => {
        //                 const str = btoa(readerE.target.result);
        //                 this.streamPlayer.setData({
        //                     str: str,
        //                     timeDelay: prevStartTime ? startTimeArr[0] - prevStartTime : true
        //                 });
        //             };
        //             reader.readAsBinaryString(blob);
        //         };
        //         setTimeout(() => {
        //             startNextRecording(startTimeArr[0]);
        //         }, 10000);
        //         setTimeout(() => {
        //             recorder.stop();
        //         }, 15000);
        //         recorder.start();
        //     };
        //     startNextRecording();

        
        //     this.recorderA.ondataavailable = (e) => {
        //         this.streamPlayer.setData(e.data, true);


        //         // this.chunksA.push(e.data);
        //         // const now = performance.now();
        //         // this.times.A = now - this.timestamp;
        //         // this.timestamp = now;
        //     };
        //     this.recorderB.ondataavailable = (e) => {
        //         this.chunksB.push(e.data);
        //         const now = performance.now();
        //         this.times.B = now - this.timestamp;
        //         this.timestamp = now;
        //     };
        //     this.recorderA.onstop = () => {

        //         const timeToUse = this.times.A;

        //         const blob = new Blob(this.chunksA, { type: "audio/ogg; codecs=opus" });
        //         while (this.chunksA.length > 0) {
        //             this.chunksA.shift();
        //         }
        //         const reader = new FileReader();
        //         reader.onload = (readerE) => {
        //             const str = btoa(readerE.target.result);
        //             this.streamPlayer.setData(JSON.stringify({
        //                 str: str,
        //                 time: timeToUse
        //             }));
        //         };
        //         reader.readAsBinaryString(blob);
        //     };
        //     this.recorderB.onstop = () => {

        //         const timeToUse = this.times.B;
                
        //         const blob = new Blob(this.chunksB, { type: "audio/ogg; codecs=opus" });
        //         while (this.chunksB.length > 0) {
        //             this.chunksB.shift();
        //         }
        //         const reader = new FileReader();
        //         reader.onload = (readerE) => {
        //             const str = btoa(readerE.target.result);
        //             this.streamPlayer.setData(JSON.stringify({
        //                 str: str,
        //                 time: timeToUse
        //             }));
        //         };
        //         reader.readAsBinaryString(blob);
        //     };


            

        
            // this.recorderA.start(10000);
            // this.timestamp = performance.now();

            

            // TEMP 
            // const wait = setInterval(() => {
                
            //     this.recorderA.requestData();
                
            //     console.log(this.recorderA.state);
            //     setTimeout(() => {
            //         console.log(this.recorderA.state);
            //     }, 2000);
            //     if (!this.listening) {
            //         clearInterval(wait);
            //     }
            // }, 10000);
            // END TEMP

            // this.recorderA.onstart = () => {
            //     // const now = performance.now();
            //     // this.times.B = now - this.timestamp;
            //     // this.timestamp = now;
            //     this.recorderB.stop();
            //     if (this.listening) {
            //         setTimeout(() => {
            //             this.switchToB();
            //         }, 10000);
            //     }
            // };

            // this.recorderB.onstart = () => {
            //     // const now = performance.now();
            //     // this.times.A = now - this.timestamp;
            //     // this.timestamp = now;
            //     this.recorderA.stop();
            //     if (this.listening) {
            //         setTimeout(() => {
            //             this.switchToA();
            //         }, 10000);
            //     }
            // };

            // setTimeout(() => {
            //     this.switchToB();
            // }, 10000);
            // this.listening = true;
        // });
    }

    switchToB() {
        this.times.B = performance.now();
        this.recorderB.start();
    }
    switchToA() {
        this.times.A = performance.now();
        this.recorderA.start();
    }

    
}