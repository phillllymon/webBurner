import {
    setButtonClick,
    setElementText,
    addElementClass,
    removeElementClass,
    detectMobile,
    showSongControlButton,
    showModal,
    hideModal,
    setLoading,
    stopLoading,
    killAllNotes,
    getUserProfile,
    setUserProfile
} from "./util.js";
import {
    gameDataConst,
    songStages,
    songData
} from "../data.js";
// import { App } from "@capacitor/app";

export class ControlsManager {
    constructor(masterInfo, player, streamPlayer, animator, fileConverter, noteWriter, calibrator, statsManager) {
        this.player = player;
        this.animator = animator;
        this.fileConverter = fileConverter;
        this.noteWriter = noteWriter;
        this.calibrator = calibrator;
        this.statsManager = statsManager;
        this.masterInfo = masterInfo;
        this.streamPlayer = streamPlayer;
        this.activateSongSelect();
        this.activateSettings();
        this.activateLevelSelector();
        this.activateSlidesSelector((newVal) => {this.animator.setNumSlides(newVal)});
        this.activateSongControls();
        this.activateSongUpload();

        // App.addListener("pause", () => {
        //     this.pauseFunction();
        // });
    }



    activateSongSelect(chooseDefault = true) {
        document.getElementById("stages").innerText = "";
        const levelNames = {
            1: "Super easy",
            2: "Easy",
            3: "Medium",
            4: "Hard",
            5: "Crazy hard"
        }
        const passingScores = {
            1: 75,
            2: 80,
            3: 85,
            4: 90,
            5: 95
        };
        getUserProfile().then((profile) => {
            const levelCode = `l${profile.level}s${profile.slides}`;
            const passingScore = passingScores[profile.level];
            document.getElementById("level-sub-title").innerText = `${levelNames[profile.level]} / ${profile.slides} slides`;
            const scores = profile.progress[levelCode];
            const songCodes = Object.keys(scores);
            let stageActive = true;
            let defaultSong = null;
            songStages.forEach((stage, i) => {
                const stageElement = document.createElement("div");
                stageElement.classList.add("stage");
                const titleElement = document.createElement("div");
                titleElement.classList.add("stage-title");
                titleElement.innerText = i === songStages.length - 1 ? "Bonus songs" : `Stage ${i + 1}`;
                stageElement.appendChild(titleElement);
                document.getElementById("stages").appendChild(stageElement);
                let allPassed = true;
                stage.forEach((songCode) => {
                    const songContainer = document.createElement("div");
                    songContainer.classList.add("song-title-container");
                    songContainer.id = songCode;
                    const markEle = document.createElement("div");
                    markEle.classList.add("song-mark");
                    const songTitle = document.createElement("div");
                    songTitle.classList.add("song-title");
                    const songScore = document.createElement("div");
                    songScore.classList.add("song-score");
                    songTitle.innerText = songData[songCode];
                    if (songCodes.includes(songCode)) {
                        songScore.innerText = `${scores[songCode]}%`;
                        if (scores[songCode] < passingScore) {
                            if (!defaultSong) {
                                defaultSong = songCode;
                            }
                            songScore.classList.add("song-score-fail");
                            const xA = document.createElement("div");
                            xA.classList.add("red-x-a");
                            const xB = document.createElement("div");
                            xB.classList.add("red-x-b");
                            markEle.appendChild(xA);
                            markEle.appendChild(xB);
                            allPassed = false;
                        } else {
                            const checkMark = document.createElement("div");
                            checkMark.classList.add("green-check");
                            markEle.appendChild(checkMark);
                        }
                    } else {
                        allPassed = false;
                        if (!defaultSong) {
                            defaultSong = songCode;
                        }
                    }
                    songContainer.appendChild(markEle);
                    songContainer.appendChild(songTitle);
                    songContainer.appendChild(songScore);
                    stageElement.appendChild(songContainer);
                    
                    if (stageActive) {
                        songContainer.addEventListener("click", () => {
                        // setButtonClick(songCode, () => {
                            this.masterInfo.audioLoaded = false;
                            document.getElementById("close-and-play").classList.add("hidden");
                            document.getElementById("close-and-play-ghost").classList.remove("hidden");
                            this.player.setPlayerReady(() => {
                                document.getElementById("close-and-play").classList.remove("hidden");
                                document.getElementById("close-and-play-ghost").classList.add("hidden");
                                this.masterInfo.audioLoaded = true;
                                this.player.setPlayerReady(() => {});
                            });
                            document.getElementById("choose-song-menu").classList.add("hidden");
                            document.getElementById("main-menu").classList.remove("hidden");
                            document.getElementById("song-to-play").innerText = songData[songCode];
    
                            // fetch(`./songStrings/ann.txt`).then((res) => {
                            fetch(`./songStrings/${songCode}.txt`).then((res) => {
                                res.text().then((str) => {
                                    this.masterInfo.currentSong = songData[songCode];
                                    this.masterInfo.songCode = songCode;
                                    this.animator.stopAnimation();
                                    this.player.pause();
                                    this.player.setSource(`data:audio/x-wav;base64,${str}`);
                                    showSongControlButton("button-play");
                                    document.getElementById("song-label").innerText = this.masterInfo.currentSong;
                                    killAllNotes(this.masterInfo, this.noteWriter);
    
                                });
                            });
                        });
                    }
                    
                });
                if (!stageActive) {
                    stageElement.classList.add("stage-locked");
                }
                if (!allPassed) {
                    stageActive = false;
                }
            });
            this.masterInfo.defaultSong = defaultSong;
            if (chooseDefault && defaultSong) {
                this.masterInfo.songCode = defaultSong;
                document.getElementById("song-to-play").innerText = songData[defaultSong];
                this.masterInfo.currentSong = songData[defaultSong];
            }
        });
    }

    activateSongUpload() {

        let playerOutfitted = false;

        document.getElementById("file-input").addEventListener("change", (e) => {
            this.player.pause();
            this.animator.stopAnimation();


            setLoading();
            document.getElementById("close-and-play").classList.add("hidden");
            // document.getElementById("close-and-play-ghost").classList.remove("hidden");

            const file = e.target.files[0];

            if (!file) {
                stopLoading();
            }

            const reader = new FileReader();
            reader.onload = (readerE) => {
                const str = btoa(readerE.target.result);
                const fileNameArr = e.target.files[0].name.split("");

                // console.log(str);
                
                // if (true) {
                if (fileNameArr.slice(fileNameArr.length - 4, fileNameArr.length).join("") === ".m4a") {
                    const newSongData = `data:audio/x-wav;base64,${str}`;
                    
                    if (!playerOutfitted) {
                        const ctx = new AudioContext();
                        const src = ctx.createMediaElementSource(this.player.song1);
                        src.connect(ctx.destination);
                        const analyzer = ctx.createAnalyser();
                        ctx.setSinkId({ type: "none" });
                        src.connect(analyzer);
                        analyzer.connect(ctx.destination);
                        analyzer.fftSize = 4096;
                        const arr = new Uint8Array(analyzer.frequencyBinCount);
                        this.player.detailedAnalyser = analyzer;
                        this.player.detailedDataArray = arr;

                        playerOutfitted = true;
                    }


                    this.animator.stopAnimation();
                    this.player.pause();
                    this.player.setSource(newSongData);
                    showSongControlButton("button-play");
                    killAllNotes(this.masterInfo, this.noteWriter);
                    this.masterInfo.currentSong = e.target.files[0].name;
                    document.getElementById("song-label").innerText = this.masterInfo.currentSong;
                    stopLoading();
                    document.getElementById("close-and-play").classList.remove("hidden");

                } else {
                    this.player.setSource(`data:audio/x-wav;base64,${str}`, false, false, true);
                    // stopLoading();
                    this.masterInfo.currentSong = e.target.files[0].name;
                    document.getElementById("song-label").innerText = this.masterInfo.currentSong;

                    // this.player.setSource(`data:audio/x-wav;base64,${str}`, true, false); // make player forget previous song
                    // this.fileConverter.convertToM4a(str).then((piecesArr) => {
                    //     const newSongData = `data:audio/x-wav;base64,${str}`;
                        
                    //     this.animator.stopAnimation();
                    //     this.player.pause();
                    //     // this.player.setSource(newSongData);
                    //     this.player.setSource(newSongData, true, piecesArr);
    
                    //     showSongControlButton("button-play");
                    //     killAllNotes(this.masterInfo, this.noteWriter);
                        
                    //     this.masterInfo.currentSong = e.target.files[0].name;
                    //     document.getElementById("song-label").innerText = this.masterInfo.currentSong;
    
                    //     stopLoading();
                    //     document.getElementById("close-and-play").classList.remove("hidden");
                    //     // document.getElementById("close-and-play-ghost").classList.add("hidden");
                    //     this.masterInfo.audioLoaded = true;
                    // });
                }
            };
            reader.readAsBinaryString(file);
        });
    }

    activateSongControls() {
        document.getElementById("button-play").addEventListener("click", () => {
            this.playFunction();
            document.getElementById("button-play").classList.remove("pulse");
            document.getElementById("button-play-beacon").classList.add("hidden");
        });
        document.getElementById("button-pause").addEventListener("click", () => {
            if (!this.masterInfo.pauseDisabled) {
                this.pauseFunction();
            }
        });
        document.getElementById("button-restart").addEventListener("click", () => {
            this.restartFunction()
        });
        this.masterInfo.spaceFunction = () => {
            this.playFunction();
        };
    }
    
    playFunction() {
        if (this.masterInfo.songMode === "stream" || this.masterInfo.songMode === "radio") {
            this.streamPlayer.start();
            this.animator.runAnimation({ player: this.streamPlayer, algorithm: this.masterInfo.algorithm });
        } else {
            if (this.masterInfo.songMode === "demo" && this.masterInfo.songCode) {
                this.masterInfo.currentSong = songData[this.masterInfo.songCode];
                document.getElementById("song-label").innerHTML = this.masterInfo.currentSong;
            }
            this.player.start();
            this.animator.runAnimation({ player: this.player, algorithm: this.masterInfo.algorithm });
        }
        // this.animator.lastTime = performance.now();
        showSongControlButton("button-pause");
        this.masterInfo.spaceFunction = () => {
            this.pauseFunction();
        };
    }
    pauseFunction() {
        this.statsManager.updateInfo();
        if (this.masterInfo.songMode === "stream" || this.masterInfo.songMode === "radio") {
            this.streamPlayer.stop();
            killAllNotes(this.masterInfo, this.noteWriter);
        } else {
            this.player.pause();
        }
        this.animator.stopAnimation();
        showSongControlButton("button-play");
        this.masterInfo.spaceFunction = () => {
            this.playFunction();
        };
    }
    restartFunction() {
        this.player.restart();
        this.masterInfo.songNotesHit = 0;
        this.masterInfo.songNotesMissed = 0;
        this.masterInfo.songStreak = 0;
        this.animator.stopAnimation();
        showSongControlButton("button-play");
        killAllNotes(this.masterInfo, this.noteWriter);
        this.masterInfo.spaceFunction = () => {
            this.playFunction();
        }
    }

    activateSlidesSelector(setNumSlides) {
        [
            ["slides-2", 2],
            ["slides-3", 3],
            ["slides-4", 4]
        ].forEach((slideSet) => {
            const slidesButton = document.getElementById(slideSet[0]);
            slidesButton.addEventListener("click", () => {
                this.deselectSlides();
                this.selectSlides(slideSet[1], setNumSlides);
                slidesButton.classList.add("level-selected");
            })
        });
        getUserProfile().then((profile) => {
            document.getElementById(`slides-${profile.slides}`).classList.add("level-selected");
            this.selectSlides(profile.slides, setNumSlides);
        });


    }

    deselectSlides() {
        ["slides-2", "slides-3", "slides-4"].forEach((num) => {
            document.getElementById(num).classList.remove("level-selected");
        });
    }

    setWordsPos(n) {
        const streakContainer = document.getElementById("streak-container");
        const perfectContainer = document.getElementById("perfect-container");
        streakContainer.classList.remove("streak-container-2");
        streakContainer.classList.remove("streak-container-3");
        streakContainer.classList.remove("streak-container-4");
        perfectContainer.classList.remove("perfect-container-2");
        perfectContainer.classList.remove("perfect-container-3");
        perfectContainer.classList.remove("perfect-container-4");
        streakContainer.classList.add(`streak-container-${n}`);
        perfectContainer.classList.add(`perfect-container-${n}`);

    }

    selectSlides(n, setNumSlides) {
        this.setWordsPos(n);
        const slideA = document.getElementById("slide-a");
        const slideB = document.getElementById("slide-b");
        const aSlideA = document.getElementById("a-slide-a");
        const aSlideB = document.getElementById("a-slide-b");
        const bSlideA = document.getElementById("b-slide-a");
        const bSlideB = document.getElementById("b-slide-b");
        const clearSlideA = document.getElementById("clear-slide-a");
        const clearSlideB = document.getElementById("clear-slide-b");
        const dummyA = document.getElementById("dummy-a");
        const dummyB = document.getElementById("dummy-b");
        const dummyTapperA = document.getElementById("dummy-tapper-a-container");
        const dummyTapperB = document.getElementById("dummy-tapper-b-container");
        const slidesContainer = document.getElementById("slides-container");
        
        if (n === 2) {
            
            setNumSlides(2);
            if (slideA) {
                slideA.classList.add("hidden");
                slideB.classList.add("hidden");
            }
            if (aSlideA) {
                aSlideA.classList.add("hidden");
                aSlideB.classList.add("hidden");
            }
            if (bSlideA) {
                bSlideA.classList.add("hidden");
                bSlideB.classList.add("hidden");
            }
            clearSlideA.classList.add("hidden");
            clearSlideB.classList.add("hidden");
            dummyA.classList.add("hidden");
            dummyB.classList.add("hidden");
            dummyTapperA.classList.add("hidden");
            dummyTapperB.classList.add("hidden");
    
            slidesContainer.classList.remove("three-wide-slides-container");
            slidesContainer.classList.remove("four-wide-slides-container");
        }
        if (n === 3) {
            setNumSlides(3);
            document.getElementById("slides-container").classList.add("three-wide-slides-container");
            if (slideA) {
                slideA.classList.remove("hidden");
                slideB.classList.add("hidden");
            }
            if (aSlideA) {
                aSlideA.classList.remove("hidden");
                aSlideB.classList.add("hidden");
            }
            if (bSlideA) {
                bSlideA.classList.remove("hidden");
                bSlideB.classList.add("hidden");
            }
            clearSlideA.classList.remove("hidden");
            clearSlideB.classList.add("hidden");
            dummyA.classList.remove("hidden");
            dummyB.classList.add("hidden");
            dummyTapperA.classList.remove("hidden");
            dummyTapperB.classList.add("hidden");
    
            slidesContainer.classList.add("three-wide-slides-container");
            slidesContainer.classList.remove("four-wide-slides-container");
        }
        if (n === 4) {
            setNumSlides(4);
            if (slideA) {
                slideA.classList.remove("hidden");
                slideB.classList.remove("hidden");
            }
            if (aSlideA) {
                aSlideA.classList.remove("hidden");
                aSlideB.classList.remove("hidden");
            }
            if (bSlideA) {
                bSlideA.classList.remove("hidden");
                bSlideB.classList.remove("hidden");
            }
            clearSlideA.classList.remove("hidden");
            clearSlideB.classList.remove("hidden");
            dummyA.classList.remove("hidden");
            dummyB.classList.remove("hidden");
            dummyTapperA.classList.remove("hidden");
            dummyTapperB.classList.remove("hidden");
    
            slidesContainer.classList.remove("three-wide-slides-container");
            slidesContainer.classList.add("four-wide-slides-container");
        }

        const levelNames = {
            1: "Super easy",
            2: "Easy",
            3: "Medium",
            4: "Hard",
            5: "Crazy hard"
        };

        getUserProfile().then((profile) => {
            profile.slides = n;

            const levelName = levelNames[profile.level];
            document.getElementById("current-difficulty").innerText = `${levelName} / ${profile.slides} slides`;

            setUserProfile(profile).then(() => {
                this.activateSongSelect(false);
            });
        });
    }

    activateLevelSelector() {
        const levelNames = {
            1: "Super easy",
            2: "Easy",
            3: "Medium",
            4: "Hard",
            5: "Crazy hard"
        };
        [
            // ["level-1", 2],
            // ["level-2", 4],
            // ["level-3", 6],
            // ["level-4", 8],
            // ["level-5", 10]
            ["level-1", 1],
            ["level-2", 2],
            ["level-3", 3],
            ["level-4", 4],
            ["level-5", 5]
        ].forEach((levelSet) => {
            setButtonClick(levelSet[0], () => {
                ["level-1", "level-2", "level-3", "level-4", "level-5"].forEach((level) => {
                    removeElementClass(level, "level-selected");
                });
                this.animator.setNotesPerSecond(levelSet[1]);
                addElementClass(levelSet[0], "level-selected");
                getUserProfile().then((profile) => {
                    profile.level = levelSet[1];
                    
                    const levelName = levelNames[profile.level];
                    document.getElementById("current-difficulty").innerText = `${levelName} / ${profile.slides} slides`;

                    setUserProfile(profile).then(() => {
                        this.activateSongSelect(false);
                    });
                });
            });
        });
        getUserProfile().then((profile) => {
            this.animator.setNotesPerSecond(profile.level);
            addElementClass(`level-${profile.level}`, "level-selected");

            const levelName = levelNames[profile.level];
            document.getElementById("current-difficulty").innerText = `${levelName} / ${profile.slides} slides`;
        });
    }

    activateSettings() {
        document.getElementById("show-settings").addEventListener("click", () => {
            showModal("settings");
        });
        setButtonClick("save-settings", () => {
            if (!this.masterInfo.waitingForKey) {
                hideModal("settings");
            }
        });
        const keyInfo = [
            ["change-left", "left-key"],
            ["change-a", "a-key"],
            ["change-b", "b-key"],
            ["change-right", "right-key"]
        ];
        for (let i = 0; i < keyInfo.length; i++) {
            setElementText(keyInfo[i][1], this.masterInfo.tapperKeys[i]);
            setButtonClick(keyInfo[i][0], () => {
                setElementText(keyInfo[i][1], "-");
                document.getElementById("change-key-message").innerText = "press a key";
                document.getElementById("save-settings").style.opacity = "0.5";
                this.masterInfo.waitingForKey = ([keyInfo[i][1], i]);
            });
        }
        [
            ["toggle-background", "animatedBackground", "background-title"],
            ["toggle-sustained", "sustainedNotes", "sustained-title"],
            ["toggle-calibration", "autoCalibrating", "calibration-title"],
            ["toggle-haptics", "hapticsOnHit", "haptics-title"],
            ["toggle-animations", "animations", "animations-title"],
            ["toggle-effects", "effects", "effects-title"],
            ["toggle-double", "double", "double-title"]
        ].forEach((settingSet) => {
            document.getElementById(settingSet[0]).addEventListener("click", () => {
            // setButtonClick(settingSet[0], () => {
                if (this.masterInfo[settingSet[1]]) {
                    this.masterInfo[settingSet[1]] = false;
                    document.getElementById(`${settingSet[0]}-ball`).classList.add("toggle-ball-off");
                    document.getElementById(settingSet[2]).style.opacity = "0.5";
                    if (settingSet[0] === "toggle-calibration") {
                        this.masterInfo.autoAdjustment = 0;
                    }
                } else {
                    this.masterInfo[settingSet[1]] = true;
                    document.getElementById(`${settingSet[0]}-ball`).classList.remove("toggle-ball-off");
                    document.getElementById(settingSet[2]).style.opacity = "1";
                }
                getUserProfile().then((profile) => {
                    profile[settingSet[1]] = this.masterInfo[settingSet[1]];
                    setUserProfile(profile);
                });
            });
        });
        const calibrateButton = document.getElementById("open-calibration");
        calibrateButton.addEventListener("click", () => {
            this.calibrator.openCalibration();
        });
        const resetButton = document.getElementById("reset-button");
        const resetCheckbox = document.getElementById("reset-checkbox");
        resetCheckbox.addEventListener("change", () => {
            if (resetCheckbox.checked) {
                resetButton.disabled = false;
            } else {
                resetButton.disabled = true;
            }
        });
        const freqSelector = document.getElementById("select-sustained-frequency");
        freqSelector.addEventListener("change", () => {
            this.masterInfo.sustainedNotesFrequency = freqSelector.value;
            getUserProfile().then((profile) => {
                profile.sustainedNotesFrequency = this.masterInfo.sustainedNotesFrequency;
                setUserProfile(profile);
            });
        });
        const doubleFreqSelector = document.getElementById("select-double-frequency");
        doubleFreqSelector.addEventListener("change", () => {
            this.masterInfo.doubleFrequency = doubleFreqSelector.value;
            getUserProfile().then((profile) => {
                profile.doubleFrequency = this.masterInfo.doubleFrequency;
                setUserProfile(profile);
            });
        });
        const algorithmSelector = document.getElementById("algorithm-selector");
        algorithmSelector.addEventListener("change", () => {
            this.masterInfo.algorithm = algorithmSelector.value;
            getUserProfile().then((profile) => {
                profile.algorithm = this.masterInfo.algorithm;
                setUserProfile(profile);
            });
            document.getElementById("toggle-algorithm").innerHTML = this.masterInfo.algorithm;
        });
        const animationStyleSelector = document.getElementById("animation-style-selector");
        animationStyleSelector.addEventListener("change", () => {
            this.masterInfo.animationStyle = animationStyleSelector.value;
            getUserProfile().then((profile) => {
                profile.animationStyle = this.masterInfo.animationStyle;
                setUserProfile(profile);
            });
            document.getElementById("toggle-animation-style").innerHTML = {
                "lightUp": "Light up",
                "flyAway": "Fly away",
                "both": "Both"
            }[this.masterInfo.animationStyle];
            if (this.masterInfo.animationStyle === "flyAway" || this.masterInfo.animationStyle === "both") {
                ["bulb-left", "bulb-a", "bulb-b", "bulb-right"].forEach((id) => {
                    document.getElementById(id).classList.add("hidden");
                });
                // ["inset-left", "inset-a", "inset-b", "inset-right"].forEach((id) => {
                //     document.getElementById(id).classList.remove("hidden");
                // });
            } else {
                ["bulb-left", "bulb-a", "bulb-b", "bulb-right"].forEach((id) => {
                    document.getElementById(id).classList.remove("hidden");
                });
                // ["inset-left", "inset-a", "inset-b", "inset-right"].forEach((id) => {
                //     document.getElementById(id).classList.add("hidden");
                // });
            }
        });
        const speedSelector = document.getElementById("speed-selector");
        speedSelector.addEventListener("change", () => {
            
            this.masterInfo.songDelay = parseInt(speedSelector.value);
            const noteSpeed = 1.0 * this.masterInfo.travelLength / (this.masterInfo.songDelay - 2000);
            const targetDist = noteSpeed * this.masterInfo.targetTime;


            this.masterInfo.targetBounds.top = this.masterInfo.travelLength - targetDist;
            this.masterInfo.targetBounds.bottom = this.masterInfo.travelLength + targetDist;
            // console.log(this.masterInfo.songDelay);
            getUserProfile().then((profile) => {
                profile.songDelay = this.masterInfo.songDelay;
                setUserProfile(profile);
            });
            const speedName = {
                "6500": "super slow",
                "5500": "slow",
                "4700": "medium",
                "4000": "fast",
                "3500": "crazy fast"
            }[speedSelector.value];
            document.getElementById("toggle-speed").innerHTML = speedName;
            this.restartFunction();
        });
        resetButton.addEventListener("click", () => {
            getUserProfile().then((profile) => {
                profile.progress = {
                    l1s2: {},
                    l1s3: {},
                    l1s4: {},
                    l2s2: {},
                    l2s3: {},
                    l2s4: {},
                    l3s2: {},
                    l3s3: {},
                    l3s4: {},
                    l4s2: {},
                    l4s3: {},
                    l4s4: {},
                    l5s2: {},
                    l5s3: {},
                    l5s4: {}
                };
                profile.stats = {
                    currentStreak: 0,
                    streakLevel: 6,
                    notesHitOnFire: 0,
                    rank: "groupie",
                    streaks: {
                        l1: 0,
                        l2: 0,
                        l3: 0,
                        l4: 0,
                        l5: 0
                    },
                    accuracy: { // stored as percent
                        l1: 100,
                        l2: 100,
                        l3: 100,
                        l4: 100,
                        l5: 100
                    },
                    notesHit: {
                        l1: 0,
                        l2: 0,
                        l3: 0,
                        l4: 0,
                        l5: 0
                    }
                }
                setUserProfile(profile);
                resetButton.disabled = "disabled";
                resetCheckbox.checked = false;
                this.activateSongSelect();
            });
        });
    }

    toggleFullscreen() {
        return new Promise((resolve) => {
            if (document.isFullscreen) {
                document.exitFullscreen().then(() => {
                    resolve();
                });
            } else {
                document.getElementById("game-container").requestFullscreen().then(() => {
                    resolve();
                });
            }
        });
    }

    recalculateLengths() {
        setTimeout(() => {

            if (detectMobile()) {
                const viewHeight = document.getElementById("game-container").clientHeight;
                this.masterInfo.travelLength = gameDataConst.mobile.travelLength * viewHeight;
    
                const newNoteSpeed = Math.floor(this.masterInfo.travelLength / ( (this.masterInfo.songDelay / 1000) / 2 ));
                this.masterInfo.targetBounds.top = gameDataConst.mobile.targetBounds.top * this.masterInfo.travelLength;
                this.masterInfo.targetBounds.bottom = gameDataConst.mobile.targetBounds.bottom * this.masterInfo.travelLength;
                this.masterInfo.noteSpeed = newNoteSpeed;
                this.masterInfo.maxTailLength = 1.0 * gameDataConst.mobile.maxTailLength * this.masterInfo.travelLength;
                this.masterInfo.slideLength = this.masterInfo.travelLength * 1.3;
            } else {
    
                const viewH = document.getElementById("game-container").clientHeight;
                const viewW = document.getElementById("game-container").clientWidth;
                let min = Math.min(viewW, viewH);
    
                this.masterInfo.vMin = min;
    
                this.masterInfo.slideLength = 1.5 * min;
                this.masterInfo.travelLength = 1.365 * min;
                const newNoteSpeed = 1.0 * this.masterInfo.travelLength / ( (this.masterInfo.songDelay / 1000) / 2 );
                this.masterInfo.targetBounds.top = gameDataConst.mobile.targetBounds.top * this.masterInfo.travelLength;
                this.masterInfo.targetBounds.bottom = gameDataConst.mobile.targetBounds.bottom * this.masterInfo.travelLength;
                this.masterInfo.noteSpeed = newNoteSpeed;
                this.masterInfo.maxTailLength = 1.0 * gameDataConst.mobile.maxTailLength * this.masterInfo.travelLength;
                this.masterInfo.slideLength = this.masterInfo.travelLength * 1.3;
            }
        }, 500)
    }
}