import {
    getUserProfile,
    setUserProfile,
    killAllNotes,
    promptCalibration,
    setLoading,
    stopLoading
} from "./util.js";
import {
    songData
} from "../data.js";

// // TEMP for local testing
// import { rockIt } from "./rockItTonight.js";
import { tone } from "./tone.js";
// // END TEMP

export class Tutorial {
    constructor(masterInfo, controlsManager, animator, player, noteWriter, menuManager, addNote) {
        this.masterInfo = masterInfo;
        this.controlsManager = controlsManager;
        this.animator = animator;
        this.player = player;
        this.noteWriter = noteWriter;
        this.menuManager = menuManager;
        this.addNote = addNote;
        this.playing = false;
        this.playingSong = false;
        this.nextNoteIdx = 0;
        this.releaseTime = 0;
        this.notesHit = 0;
        this.notesMissed = 0;

        this.activateTutorial();

        this.songNotes = [
            [2.46194, "slide-left"],
            [2.93213, "slide-left"],
            [3.261772, "slide-left"],
            [4.071073, "slide-left"],
            [4.888844, "slide-left"],
            [5.451498, "slide-left"],
            [6.268138, "slide-a"],
            [6.987352, "slide-a"],
            [8.352035, "slide-right"],
            [8.825848, "slide-right"],
            [9.208735, "slide-right"],
            [9.891026, "slide-right"],
            [10.621651, "slide-a"],
            [11.383086, "slide-left"],
            [12.181558, "slide-left"],
            [12.771304, "slide-left"],
            [13.58432, "slide-a"],
            [14.199451, "slide-a"],
            [14.686029, "slide-a"],
            [15.077, "slide-right"],
            [15.675686, "slide-right"],
            [16.119929, "slide-left"],
            [16.508924, "slide-left"],
            [17.253228, "slide-left"],
            [17.677042, "slide-right"],
            [18.665896, "slide-a"],
            [19.041213, "slide-right"],
            [19.408597, "slide-left"],
            [20.096563, "slide-right"],
            [20.551235, "slide-left"],
            [20.879712, "slide-right"],
            [21.570719, "slide-left"],
            [22.017696, "slide-a"],
            [22.403017, "slide-left"],
            [23.010386, "slide-a"],
            [23.477792, "slide-a"],
            [23.80235, "slide-left"],
            [24.520093, "slide-a"],
            [24.961103, "slide-a"],
            [25.335092, "slide-left"],
            [25.880481, "slide-right"],
            [26.416421, "slide-right"],
            [26.818142, "slide-a"],
            [27.329045, "slide-left"],
            [27.839089, "slide-left"],
            [28.193594, "slide-left"],
            [28.977664, "slide-left"],
            [29.383244, "slide-right"],
            [29.722685, "slide-a"],
            [30.819628, "slide-a"],
            [31.119825, "slide-left"],
            [31.876483, "slide-right"],
            [32.269131, "slide-right"],
            [32.636287, "slide-left"],
            [33.258386, "slide-a"],
            [33.687021, "slide-right"],
            [34.102092, "slide-right"],
            [34.637631, "slide-a"],
            [35.202356, "slide-right"],
            [35.543482, "slide-right"],
            [36.229869, "slide-a"],
            [36.702039, "slide-a"],
            [37.002433, "slide-a"],
            [37.59896, "slide-left"],
            [38.152062, "slide-a"],
            [38.480706, "slide-a"],
            [39.166, "slide-left"],
            [39.60085, "slide-right"],
            [39.903795, "slide-left"],
            [40.711821, "slide-left"],
            [41.138345, "slide-left"],
            [42.049796, "slide-left"],
            [42.477504, "slide-left"],
            [43.436948, "slide-right"],
            [43.977588, "slide-a"],
            [44.30976, "slide-right"],
            [45.458284, "slide-left"],
            [46.470486, "slide-right"],
            [46.898406, "slide-left"],
            [47.236151, "slide-a"],
            [47.911318, "slide-left"],
            [48.355652, "slide-a"],
            [48.711462, "slide-left"],
            [49.265738, "slide-a"],
            [49.816343, "slide-left"],
            [50.205555, "slide-right"],
            [50.83423, "slide-right"],
            [51.633747, "slide-left"],
            [52.34084, "slide-a"],
            [52.785104, "slide-left"],
            [54.200097, "slide-left"],
            [54.569704, "slide-left"],
            [55.23889, "slide-left"],
            [55.723891, "slide-left"],
            [56.055633, "slide-left"],
            [56.578485, "slide-left"],
            [57.156046, "slide-right"],
            [58.092507, "slide-a"],
            [58.647402, "slide-right"],
            [58.963944, "slide-left"],
            [59.704233, "slide-left"],
            [60.130858, "slide-left"],
            [61.056442, "slide-left"],
            [61.528066, "slide-right"],
            [61.891473, "slide-left"],
            [62.454313, "slide-left"],
            [62.966183, "slide-left"],
            [63.365505, "slide-left"],
            [64.106267, "slide-left"],
            [64.489571, "slide-left"],
            [64.829666, "slide-left"],
            [65.956729, "slide-left"],
            [66.322777, "slide-left"],
            [67.370048, "slide-right"],
            [67.733991, "slide-a"],
            [68.460176, "slide-right"],
            [68.869097, "slide-right"],
            [69.224845, "slide-right"],
            [69.890504, "slide-a"],
            [70.331709, "slide-a"],
            [70.683683, "slide-right"],
            [71.376449, "slide-a"],
            [71.751753, "slide-left"],
            [72.123742, "slide-a"],
            [73.220055, "slide-right"],
            [73.581908, "slide-a"],
            [74.236397, "slide-left"],
            [74.777472, "slide-right"],
            [75.711161, "slide-a"],
            [76.198607, "slide-a"],
            [76.527807, "slide-left"],
            [77.123927, "slide-left"],
            [77.593554, "slide-a"],
            [77.925786, "slide-left"],
            [78.625694, "slide-left"],
            [79.083081, "slide-right"],
            [79.448487, "slide-right"],
            [80.062396, "slide-right"],
            [80.539922, "slide-right"],
            [80.865434, "slide-left"],
            [81.477818, "slide-right"],
            [81.971707, "slide-left"],
            [82.390223, "slide-left"],
            [83.086038, "slide-left"],
            [83.469737, "slide-left"],
            [83.819914, "slide-a"],
            [84.5346, "slide-left"],
            [84.934407, "slide-right"],
            [85.837949, "slide-right"],
            [86.452148, "slide-left"],
            [87.06509, "slide-left"],
            [87.391524, "slide-right"],
            [87.88303, "slide-a"],
            [88.293713, "slide-left"],
            [88.8714, "slide-a"],
            [89.316545, "slide-left"],
            [89.715283, "slide-left"],
            [90.211734, "slide-left"],
            [90.820264, "slide-right"],
            [91.190637, "slide-right"],
            [91.76351, "slide-right"],
            [92.254535, "slide-a"],
            [92.651679, "slide-a"],
            [93.21941, "slide-right"],
            [93.735028, "slide-a"],
            [94.053814, "slide-left"],
            [94.759652, "slide-right"],
            [95.243925, "slide-a"],
            [95.576649, "slide-left"],
            [96.202458, "slide-left"],
            [96.640634, "slide-a"],
            [97.023522, "slide-left"],
            [97.714649, "slide-left"],
            [99.62146, "slide-left"],
            [99.938512, "slide-a"],
            [100.508893, "slide-left"],
            [100.999325, "slide-left"],
            [101.302508, "slide-left"],
            [101.984086, "slide-right"],
            [102.821043, "slide-left"],
            [103.535615, "slide-left"],
            [104.015683, "slide-left"],
            [104.353905, "slide-left"],
            [105.022819, "slide-left"],
            [105.423756, "slide-left"],
            [105.785448, "slide-a"],
            [106.523045, "slide-a"],
            [106.899581, "slide-right"],
            [107.237517, "slide-left"],
            [107.901745, "slide-left"],
            [108.323757, "slide-left"],
            [108.703916, "slide-right"],
            [109.361246, "slide-left"],
            [109.800983, "slide-a"],
            [110.244485, "slide-left"],
            [110.869287, "slide-right"],
            [111.310829, "slide-left"],
            [111.63546, "slide-left"],
            [112.326915, "slide-left"],
            [112.691335, "slide-left"],
            [113.091933, "slide-a"],
            [113.810393, "slide-a"],
            [114.208271, "slide-left"],
        ];
        this.discoNotes = [
            [1.19, 'slide-right'],
            // [1.522368, 'slide-right'],
            [1.922975, 'slide-right'],
            // [2.248374, 'slide-right'],
            [2.64964, 'slide-right'],
            // [2.99454, 'slide-right'],
            [3.377775, 'slide-right'],
            // [3.722417, 'slide-left'],
            [4.146296, 'slide-a'],
            // [4.507114, 'slide-right'],
            [4.872564, 'slide-right'],
            // [5.2182, 'slide-left'],
            [5.634179, 'slide-a'],
            // [5.994276, 'slide-right'],
            [6.408622, 'slide-right'],
            // [6.737059, 'slide-left'],
            [7.138499, 'slide-a'],
            // [7.49739, 'slide-right'],
            [7.874535, 'slide-right'],
            [8.258339, 'slide-a'],
            [8.63395, 'slide-left'],
            [8.977888, 'slide-a'],
            [9.371591, 'slide-right'],
            [9.746593, 'slide-a'],
            [10.138783, 'slide-left'],
            [10.498193, 'slide-right'],
            [10.842692, 'slide-a'],
            [11.218358, 'slide-left'],
            [11.609946, 'slide-right'],
            [12.010881, 'slide-a'],
            [12.392757, 'slide-left'],
            [13.170044, 'slide-right'],
            [13.174042, 'slide-left'],
            [13.531695, 'slide-right'],
            [13.534294, 'slide-left'],
            [13.912671, 'slide-a'],
            [14.249677, 'slide-right'],
            [14.254705, 'slide-left'],
            [14.650833, 'slide-left'],
            [14.654185, 'slide-right'],
            [15.017858, 'slide-right'],
            [15.030018, 'slide-left'],
            [15.387001, 'slide-left'],
            [15.390133, 'slide-right'],
            [15.738058, 'slide-a'],
            [16.146802, 'slide-right'],
            [16.147137, 'slide-left'],
            [16.489328, 'slide-right'],
            [16.494338, 'slide-left'],
            [16.857548, 'slide-right'],
            [16.862264, 'slide-left'],
            [17.193792, 'slide-a'],
            [17.5948, 'slide-a'],
            [17.986405, 'slide-a'],
            [18.329925, 'slide-right'],
            [18.738044, 'slide-left'],
            [19.12176, 'slide-a'],
            [19.483749, 'slide-right'],
            [19.874464, 'slide-left'],
            [20.232436, 'slide-a'],
            [20.610403, 'slide-right'],
            [20.970376, 'slide-left'],
            [21.361784, 'slide-a'],
            [21.722043, 'slide-right'],
            [22.121884, 'slide-left'],
            [22.499471, 'slide-a'],
            [22.842589, 'slide-right'],
            [23.218096, 'slide-left'],
            [23.602082, 'slide-a'],
            [23.784487, 'slide-right'],
            [23.951953, 'slide-left'],
            [24.193287, 'slide-a'],
            [24.369036, 'slide-right'],
            [24.551924, 'slide-left'],
            [24.768837, 'slide-a'],
            [25.146323, 'slide-right'],
            [25.150288, 'slide-left'],
            [25.511269, 'slide-left'],
            [25.517514, 'slide-right'],
            [25.87464, 'slide-left'],
            [25.878253, 'slide-right'],
            [26.234565, 'slide-a'],
            [26.610134, 'slide-right'],
            [26.610444, 'slide-left'],
            [27.010181, 'slide-right'],
            [27.014541, 'slide-left'],
            [27.361866, 'slide-a'],
            [28.154237, 'slide-right'],
            [28.497921, 'slide-a'],
            [28.891411, 'slide-left'],
            [29.25036, 'slide-a'],
            [29.634488, 'slide-right'],
            [30.009608, 'slide-a'],
            [30.362295, 'slide-left'],
            [31.136506, 'slide-a'],
            [31.52254, 'slide-right'],
            [31.897354, 'slide-left'],
            [32.264439, 'slide-a'],
            [32.648243, 'slide-right'],
            [32.993442, 'slide-left'],
            [33.345854, 'slide-a'],
            [34.13925, 'slide-right'],
            [34.519922, 'slide-a'],
            [34.907673, 'slide-left'],
            [35.257546, 'slide-a'],
            [35.611168, 'slide-right'],
            [35.986129, 'slide-left'],
            [36.200561, 'slide-a'],
            [36.400863, 'slide-right'],
            [37.178502, 'slide-a'],
            [37.530883, 'slide-a'],
            [37.906575, 'slide-a'],
            [38.225291, 'slide-right'],
            [38.247843, 'slide-left'],
            [38.626289, 'slide-a'],
            [39.002181, 'slide-a'],
            [39.346522, 'slide-right'],
            [39.350585, 'slide-left'],
            [40.122632, 'slide-right'],
            [40.520381, 'slide-a'],
            [40.882019, 'slide-left'],
            [41.234331, 'slide-a'],
            [41.602364, 'slide-right'],
            [42.018461, 'slide-left'],
            [42.376155, 'slide-a'],
            [43.122075, 'slide-left'],
            [43.536439, 'slide-right'],
            [43.906681, 'slide-a'],
            [44.241316, 'slide-left'],
            [44.62633, 'slide-right'],
            [45.01045, 'slide-a'],
            [45.361377, 'slide-left'],
            [46.152597, 'slide-right'],
            [46.506386, 'slide-a'],
            [46.858254, 'slide-left'],
            [47.225891, 'slide-a'],
            [47.624301, 'slide-right'],
            [47.977508, 'slide-left'],
            [48.178056, 'slide-a'],
            [48.352211, 'slide-right'],
            [49.146588, 'slide-a'],
            [49.505543, 'slide-a'],
            [49.906918, 'slide-a'],
            [50.275103, 'slide-a'],
            [50.651123, 'slide-a'],
            [51.010337, 'slide-a'],
            [51.346576, 'slide-right'],
            [51.364152, 'slide-left'],
            [52.114427, 'slide-a'],
            [52.508613, 'slide-a'],
            [52.866701, 'slide-a'],
            [53.266569, 'slide-a'],
            [53.593583, 'slide-a'],
            [53.976023, 'slide-a'],
            [54.313979, 'slide-right'],
            [54.334786, 'slide-left'],
            // [55.138713, 'slide-right'],
            // [55.496983, 'slide-a'],
            // [55.890504, 'slide-left'],
            // [56.234734, 'slide-a'],
            // [56.618557, 'slide-right'],
            // [56.968715, 'slide-a'],
            // [57.338836, 'slide-left'],
            // [57.681657, 'slide-a'],
            // [58.155289, 'slide-a'],
            // [58.506264, 'slide-right'],
            // [58.887861, 'slide-a'],
            // [59.25881, 'slide-left'],
            // [59.602363, 'slide-a'],
            // [59.999908, 'slide-right'],
            // [60.354776, 'slide-left'],
            // [60.358968, 'slide-right'],
            // [61.171443, 'slide-a'],
            // [61.506532, 'slide-a'],
            // [61.876315, 'slide-a'],
            // [62.23589, 'slide-a'],
            // [62.633463, 'slide-a'],
            // [63.003892, 'slide-a'],
            // [63.232, 'slide-a']
        ];
    }

    activateTutorial() {
        // extended steps
        [10, 11, 12, 13].forEach((n) => {
            if (n === 10) {
                document.getElementById(`close-tutorial-${n}`).addEventListener("click", () => {
                    document.getElementById(`tutorial-step-${n}`).classList.add("hidden");
                    const step11 = document.getElementById("tutorial-step-11");
                    step11.style.top = "5vh";
                    step11.style.left = "6vh";
                    step11.style.zIndex = 2000;
                    step11.classList.remove("hidden");
                });
            } else if (n === 13) {
                document.getElementById(`close-tutorial-${n}`).addEventListener("click", () => {
                    document.getElementById(`tutorial-step-${n}`).classList.add("hidden");
                    document.getElementById("tutorial-arrow").classList.add("hidden");
                    this.masterInfo.extendedTutorial = false;
                });
            } else {
                document.getElementById(`close-tutorial-${n}`).addEventListener("click", () => {
                    document.getElementById(`tutorial-step-${n}`).classList.add("hidden");
                });
            }
        });

        document.getElementById("source-tutorial").addEventListener("click", () => {
            document.getElementById("source-menu").classList.add("hidden");
            document.getElementById("close-tutorial").classList.remove("hidden");
            this.startTutorial();
        });
        document.getElementById("start-tutorial-button").addEventListener("click", () => {
            document.getElementById("first-time-menu").classList.add("hidden");
            document.getElementById("close-tutorial").classList.remove("hidden");
            this.startTutorial();
        });
        document.getElementById("close-tutorial").addEventListener("click", () => {
            this.exitTutorial();
        });
        // [3, 4, 6, 8, 9, 10, 11, 12].forEach((stepNum) => {
        [3, 4, 6, 8, 9].forEach((stepNum) => {
            document.getElementById(`tutorial-${stepNum}-button`).addEventListener("click", () => {
                this.triggerTutorialStep(stepNum);
            });
        });
        document.getElementById("repeat-tutorial-song-button").addEventListener("click", () => {
            document.getElementById("tutorial-step-7").classList.add("hidden");
            this.triggerTutorialStep(6);
        });
        document.getElementById("tap-smudge").addEventListener("click", () => {
            this.triggerTutorialStep(4);
        });
    }

    triggerTutorialStep(n) {
        const arrow = document.getElementById("tutorial-arrow");
        if (n === 1) {
            this.exited = false;
            const stepOne = document.getElementById("tutorial-step-1");
            stepOne.style.top = "20vh";
            stepOne.style.left = "2vh";
            stepOne.classList.remove("hidden");
            this.animator.runAnimation();
            this.addNote("slide-left", 50);         
            setTimeout(() => {
                if (!this.exited) {
                    this.addNote("slide-right", 50);
                }
            }, 800);
            setTimeout(() => {
                if (!this.exited) {
                    this.addNote("slide-a", 50);
                    setTimeout(() => {
                        if (!this.exited) {
                            this.animator.stopAnimation(true);
                            this.triggerTutorialStep(2);
                        }
                    }, this.masterInfo.songDelay - 2010);
                }
            }, 1500);
        }
        if (n === 2) {
            const stepTwo = document.getElementById("tutorial-step-2");
            stepTwo.style.top = "45vh";
            stepTwo.style.left = "2vh";
            stepTwo.classList.remove("hidden");
            arrow.style.top = "65vh";
            arrow.style.left = "65vw";
            arrow.style.transform = "rotate(270deg)";
            arrow.classList.remove("hidden");
        }
        if (n === 3) {
            arrow.style.top = "74vh";
            arrow.style.left = "62vw";
            arrow.style.transform = "rotate(225deg)";
            arrow.classList.remove("hidden");
            document.getElementById("tap-smudge").classList.remove("hidden");
            document.getElementById("tutorial-step-1").classList.add("hidden");
            document.getElementById("tutorial-step-2").classList.add("hidden");
            const stepThree = document.getElementById("tutorial-step-3");
            stepThree.style.top = "50vh";
            stepThree.style.left = "2vh";
            stepThree.style.width = "75vw";
            stepThree.classList.remove("hidden");
        }
        if (n === 4) {
            document.getElementById("tap-smudge").classList.add("hidden");
            document.getElementById("tutorial-step-3").classList.add("hidden");
            arrow.classList.add("hidden");

            this.discoAudio = new Audio();

            // fake for testing
            // this.discoAudio.setAttribute("src", "./effects/Buddha Kid - Share Love.m4a");

            // real
            fetch("./songStrings/discoBeat.txt").then((res) => {
                res.text().then((str) => {
                    this.discoAudio.setAttribute("src", `data:audio/x-wav;base64,${str}`);
                });
            });
            
            this.discoAudio.addEventListener("ended", () => {
                this.playing = false;
                if (this.masterInfo.streak < 10) {
                    this.discoAudio.currentTime = 0;
                    this.nextNoteIdx = 0;
                    this.discoAudio.play();
                    // this.playing = true;
                    this.animateDisco(this.discoAudio, this.discoNotes);
                    // this.animateDisco(this.discoAudio, this.songNotes);
                }
            });
            this.masterInfo.streak = 0;
            this.animator.runAnimation();
            this.playing = true;
            this.beatInterval = setInterval(() => {
                const slideToUse = ["slide-left", "slide-a", "slide-right"][Math.floor(3 * Math.random())];
                this.addNote(slideToUse);
                this.releaseTime = performance.now();
                if (this.masterInfo.streak > 6 && !this.exited) {
                    clearInterval(this.beatInterval);
                    this.playing = false;
                    setTimeout(() => {
                        document.getElementById("rock-label").innerHTML = "Match <br> the <br> beat";
                    }, 2500);
                    setTimeout(() => {
                        document.getElementById("rock-label").innerHTML = "";
                        // this.player.countdown();
                    }, 5000);
                    this.masterInfo.streak = 0;
                    this.playingSong = true;
                    this.discoAudio.currentTime = 1;
                    this.discoAudio.volume = 0;
                    this.discoAudio.play();
                    this.animateDisco(this.discoAudio, this.discoNotes);
                }
            }, 1000);

        }
        if (n === 5) {
            document.getElementById("rock-label").innerHTML = "";
            const stepFive = document.getElementById("tutorial-step-5");
            stepFive.style.top = "2vh";
            stepFive.style.left = "40vw";
            stepFive.style.width = "50vw";
            stepFive.classList.remove("hidden");
        }
        if (n === 6) {
            if (this.discoAudio) {
                this.discoAudio.pause();
                this.discoAudio.currentTime = 0;
            }
            killAllNotes(this.masterInfo, this.noteWriter);
            this.playingSong = false;
            document.getElementById("tutorial-step-5").classList.add("hidden");
            this.songAudio = new Audio();
            this.animator.runAnimation();
            let played = false;
            this.songAudio.oncanplaythrough = () => {
                if (!played) {
                    played = true;
                    this.notesHit = 0;
                    this.notesMissed = 0;
                    this.nextNoteIdx = 0;
                    this.player.countdown();
                    setTimeout(() => {
                        if (!this.exited) {
                            this.playingRealSong = true;
                            this.playing = false;
                            this.songAudio.play();
                            this.animateNotes(this.songAudio, this.songNotes);
                        }
                    }, 3000);
                }
            };
            this.songAudio.addEventListener("ended", () => {
                this.playingSong = false;
                this.animator.stopAnimation();
                const percent = Math.floor(100.0 * this.notesHit / (this.songNotes.length + this.notesMissed));

                // document.getElementById("song-label").innerText = `${this.notesHit} ${this.songNotes.length} ${this.notesMissed}`;

                let text = `Nice job! You had an accuracy of ${percent}%`;
                if (percent < 90) {
                    text = `Hey, not bad. Your accuracy was ${percent}%. Want to retry and go for ${Math.min(90, percent + 20)}%?`;
                    if (percent < 60) {
                        text = `Your accuracy was ${percent}%. I bet you can do better.`;
                    }
                } else {
                    document.getElementById("repeat-tutorial-song-button").classList.add("hidden");
                }
                document.getElementById("step-7-text").innerHTML = text;
                const stepSeven = document.getElementById("tutorial-step-7");
                stepSeven.style.top = "20vh";
                stepSeven.style.left = "2vh";
                stepSeven.style.width = "60vw";
                stepSeven.classList.remove("hidden");
            });
            // fake for local testing
            // this.songAudio.setAttribute("src", "./effects/Buddha Kid - Share Love.m4a");

            // real
            fetch("./songStrings/shareLove.txt").then((res) => {
                res.text().then((str) => {
                    this.songAudio.setAttribute("src", `data:audio/x-wav;base64,${str}`);
                });
            });
        }
        if (n === 8) {
            document.getElementById("tutorial-step-7").classList.add("hidden");
            const stepEight = document.getElementById("tutorial-step-8");
            stepEight.style.top = "20vh";
            stepEight.style.left = "30vw";
            stepEight.style.width = "55vw";
            stepEight.classList.remove("hidden");
            // arrow.style.top = "45vh";
            // arrow.style.left = "18vw";
            // arrow.style.transform = "rotate(0deg)";
            // arrow.classList.remove("hidden");
            // document.getElementById("controls-bottom").classList.remove("hidden");
            // document.getElementById("source-menu").classList.remove("hidden");
        }
        if (n === 9) {
            document.getElementById("tutorial-step-8").classList.add("hidden");
            this.exitTutorial();
            this.startExtendedTutorial();
        }
    }

    animateNotes(audio, notes) {
        const adjustOffset = (1.0 * this.masterInfo.songDelay - 4000) / 1000.0;
        if (this.playingRealSong) {
            const nowInSong = audio.currentTime + 2.0;
            let nextNoteArr = notes[this.nextNoteIdx];
            if (nextNoteArr !== undefined) {
                while (nextNoteArr[0] < nowInSong + adjustOffset) {
                    this.addNote(nextNoteArr[1], 50, false, this.masterInfo.manualDelay);
                    this.nextNoteIdx += 1;
                    if (this.nextNoteIdx > notes.length - 1) {
                        return;
                    }
                    nextNoteArr = notes[this.nextNoteIdx];
                }
                requestAnimationFrame(() => this.animateNotes(audio, notes));
            }
        }
    }
    animateDisco(audio, notes) {
        const adjustOffset = (1.0 * this.masterInfo.songDelay - 4000) / 1000.0;
        if (this.playingSong) {
            if (this.masterInfo.streak > 10) {
                this.triggerTutorialStep(5);
            }
            if (audio.volume < 1) {
                const newVolume = (audio.currentTime - 1) / 6;
                audio.volume = Math.min(newVolume, 1);
            }
            // const nowInSong = audio.currentTime + 1.83;
            const nowInSong = audio.currentTime - 3.83;
            // const nowInSong = audio.currentTime + 2.0;
            let nextNoteArr = notes[this.nextNoteIdx];
            if (nextNoteArr !== undefined) {
                while (nextNoteArr[0] < nowInSong + adjustOffset) {
                    this.addNote(nextNoteArr[1], 50, false, this.masterInfo.manualDelay);
                    this.releaseTime = performance.now();
                    this.nextNoteIdx += 1;
                    if (this.nextNoteIdx > notes.length - 1) {
                        return;
                    }
                    nextNoteArr = notes[this.nextNoteIdx];
                }
                requestAnimationFrame(() => this.animateDisco(audio, notes));
            }
        }
    }

    triggerNoteAttempt(hit) {
        const rockLabel = document.getElementById("rock-label");
        rockLabel.classList.add("static-rock");
        if (this.playingSong || this.playingRealSong) {
            if (hit) {
                this.notesHit += 1;
            } else {
                this.notesMissed += 1;
            }
        }
        if (this.playing) {
            const now = performance.now();
            const diff = now - this.releaseTime;
            if (hit) {
                rockLabel.innerHTML = "NICE!";
                setTimeout(() => {
                    rockLabel.innerHTML = "";
                }, 500);
            } else {
                if (diff < 1000 && diff > 750) {
                    rockLabel.innerHTML = "bit <br> early";
                    setTimeout(() => {
                        rockLabel.innerHTML = "";
                    }, 500);
                }
                if (diff > 0 && diff < 250) {
                    rockLabel.innerHTML = "bit <br> late";
                    setTimeout(() => {
                        rockLabel.innerHTML = "";
                    }, 500);
                }
            }
        }
    }

    startTutorial() {
        const levelNames = {
            1: "Super easy",
            2: "Easy",
            3: "Medium",
            4: "Hard",
            5: "Crazy hard"
        };
        this.exited = false;
        if (!this.masterInfo.promptedCalibration) {
            promptCalibration();
            this.masterInfo.promptedCalibration = true;
            this.masterInfo.tutorialAfterCalibrate = true;
        } else {
            this.masterInfo.songMode = "tutorial";
            document.getElementById("controls-bottom").classList.add("hidden");
            this.controlsManager.deselectSlides();
            this.controlsManager.selectSlides(3, (n) => {
                this.animator.setNumSlides(n);
            });
            document.getElementById("slides-3").classList.add("level-selected");
            this.animator.setNumSlides(3);
            getUserProfile().then((profile) => {
                profile.level = 1;
                const levelName = levelNames[profile.level];
                profile.slides = 3;
                const difficultyText = `${levelName} / ${profile.slides} slides`;
                document.getElementById("current-difficulty").innerText = difficultyText;
                document.getElementById("level-sub-title").innerText = difficultyText;
                setUserProfile(profile);
            });
            // this.triggerTutorialStep(8);
            this.triggerTutorialStep(1);
            this.masterInfo.autoCalibrating = false;
        }

    }

    exitTutorial() {
        this.exited = true;
        this.nextNoteIdx = 0;
        if (this.discoAudio) {
            this.discoAudio.pause();
            this.discoAudio.currentTime = 0;
        }
        if (this.songAudio) {
            this.songAudio.pause();
            this.songAudio.currentTime = 0;
        }
        document.getElementById("tap-smudge").classList.add("hidden");
        document.getElementById("source-menu").classList.remove("hidden");
        document.getElementById("controls-bottom").classList.remove("hidden");
        [
            "close-tutorial",
            "tutorial-arrow",
            "tutorial-step-1",
            "tutorial-step-2",
            "tutorial-step-3",
            "tutorial-step-5",
            "tutorial-step-7",
            "tutorial-step-8"
        ].forEach((eleId) => {
            document.getElementById(eleId).classList.add("hidden");
        });

        this.animator.stopAnimation();
        setTimeout(() => {
            document.getElementById("rock-label").classList.remove("static-rock");
            clearInterval(this.beatInterval);
            this.playingSong = false;
            this.playing = false;
            killAllNotes(this.masterInfo, this.noteWriter);
            if (!this.masterInfo.extendedTutorial) {
                this.masterInfo.songMode = undefined;
            }
            getUserProfile().then((profile) => {
                this.masterInfo.autoCalibrating = profile.autoCalibrating;
            });
        }, 300);
        getUserProfile().then((profile) => {
            profile.level = 1;
            this.animator.setNotesPerSecond(profile.level);
            ["level-1", "level-2", "level-3", "level-4", "level-5"].forEach((level) => {
                document.getElementById(level).classList.remove("level-selected");
            });
            document.getElementById("level-1").classList.add("level-selected");
            this.controlsManager.activateSongSelect();
            setUserProfile(profile);
        });

        getUserProfile().then((profile) => {
            profile.oldUser = true;
            setUserProfile(profile);
        });
    }

    startExtendedTutorial() {
        setLoading();
        this.menuManager.setMainMenuOption("choose-song-button");
        this.masterInfo.extendedTutorial = true;
        this.masterInfo.hideAllMenus();
        this.masterInfo.songMode = "demo";
        const songCode = "blahBlahBlah";
        fetch(`./songStrings/${songCode}.txt`).then((res) => {
            res.text().then((str) => {
                this.masterInfo.currentSong = songData[songCode];
                this.masterInfo.songCode = songCode;
                this.animator.stopAnimation();
                this.player.pause();
                this.player.setSource(`data:audio/x-wav;base64,${str}`);
                // this.player.setSource(`data:audio/x-wav;base64,${tone}`);
                document.getElementById("song-label").innerText = this.masterInfo.currentSong;
                killAllNotes(this.masterInfo, this.noteWriter);
                setTimeout(() => {
                    this.controlsManager.playFunction();
                    stopLoading();
                }, 100);
            });
        });
    }
}