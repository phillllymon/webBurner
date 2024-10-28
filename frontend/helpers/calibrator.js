import { tone } from "./tone.js"; // TEMP
import { hideModal, killAllNotes } from "./util.js";

export class Calibrator {
    constructor(masterInfo, animator, noteWriter, addNote) {
        this.masterInfo = masterInfo;
        this.animator = animator;
        this.noteWriter = noteWriter;
        this.addNote = addNote;
        this.runner = document.getElementById("flashy-stick-middle");
        this.top = document.getElementById("flashy-stick-upper");
        this.bottom = document.getElementById("flashy-stick-lower");
        this.menus = [
            "source-menu",
            "main-menu",
            "feedback",
            "choose-song-menu"
        ];
        document.getElementById("close-calibrator-button").addEventListener("click", () => {
            this.endCalibration();
            if (this.masterInfo.tutorialAfterCalibrate) {
                this.masterInfo.songMode = "tutorial";
                this.masterInfo.tutorialAfterCalibrate = false;
                this.masterInfo.startTutorial();
            }
        });
        document.getElementById("faster-button").addEventListener("click", () => {
            this.masterInfo.manualDelay += 1;
            if (this.masterInfo.manualDelay > -1) {
                document.getElementById("manual-delay-display").innerText = `+ ${this.masterInfo.manualDelay} ms`;
            } else {
                document.getElementById("manual-delay-display").innerText = `- ${-1 * this.masterInfo.manualDelay} ms`;
            }
        });
        document.getElementById("slower-button").addEventListener("click", () => {
            this.masterInfo.manualDelay -= 1;
            if (this.masterInfo.manualDelay > -1) {
                document.getElementById("manual-delay-display").innerText = `+ ${this.masterInfo.manualDelay} ms`;
            } else {
                document.getElementById("manual-delay-display").innerText = `- ${-1 * this.masterInfo.manualDelay} ms`;
            }
        });
        document.getElementById("way-faster-button").addEventListener("click", () => {
            this.masterInfo.manualDelay += 25;
            if (this.masterInfo.manualDelay > -1) {
                document.getElementById("manual-delay-display").innerText = `+ ${this.masterInfo.manualDelay} ms`;
            } else {
                document.getElementById("manual-delay-display").innerText = `- ${-1 * this.masterInfo.manualDelay} ms`;
            }
        });
        document.getElementById("way-slower-button").addEventListener("click", () => {
            this.masterInfo.manualDelay -= 25;
            if (this.masterInfo.manualDelay > -1) {
                document.getElementById("manual-delay-display").innerText = `+ ${this.masterInfo.manualDelay} ms`;
            } else {
                document.getElementById("manual-delay-display").innerText = `- ${-1 * this.masterInfo.manualDelay} ms`;
            }
        });

        // popup
        document.getElementById("calibrate-now").addEventListener("click", () => {
            document.getElementById("calibrate-popup").classList.add("hidden");
            document.getElementById("calibrate-curtain").classList.add("hidden");
            this.openCalibration(this.masterInfo.songMode);
        });
        document.getElementById("skip-calibrate").addEventListener("click", () => {
            document.getElementById("calibrate-popup").classList.add("hidden");
            document.getElementById("calibrate-curtain").classList.add("hidden");
            if (this.masterInfo.tutorialAfterCalibrate) {
                this.masterInfo.songMode = "tutorial";
                this.masterInfo.tutorialAfterCalibrate = false;
                this.masterInfo.startTutorial();
            }
        });
        document.getElementById("ok-big-calibrate").addEventListener("click", () => {
            document.getElementById("big-calibrate-popup").classList.add("hidden");
        });

        this.toneAudio = new Audio();
        // fetch("./effects/tone.txt").then((res) => {
        //     res.text().then((str) => {
        //         this.toneAudio.setAttribute("src", `data:audio/x-wav;base64,${str}`);
        //     });
        // });

        // TEMP
        this.toneAudio.setAttribute("src", `data:audio/x-wav;base64,${tone}`);
    }

    openCalibration(songMode) {
        console.log(songMode);
        this.closed = false;
        // this.wasSongMode = songMode;
        if (this.masterInfo.manualDelay > -1) {
            document.getElementById("manual-delay-display").innerText = `+ ${this.masterInfo.manualDelay} ms`;
        } else {
            document.getElementById("manual-delay-display").innerText = `- ${-1 * this.masterInfo.manualDelay} ms`;
        }
        hideModal("settings");
        // this.menus.forEach((menuId) => {
        //     document.getElementById(menuId).classList.add("hidden");
        // });
        this.makeMenusInvisible();
        const calibrator = document.getElementById("calibrator");
        calibrator.style.top = "20%";
        calibrator.style.left = "5%";
        calibrator.style.width = "83vw";
        calibrator.style.fontSize = "5vw";
        calibrator.style.overflow = "hidden";
        calibrator.classList.remove("hidden");

        this.startCalibration();
    }

    animatePing(audio) {
        const fractionTime = 1.0 * audio.currentTime / audio.duration;
        const speed = 0.1 / audio.duration; // %/ms
        const posOffset = (speed * this.masterInfo.manualDelay) / 2;
        const newPos = (100.0 * fractionTime) + posOffset;
        this.runner.style.left = `${newPos}%`;

        if (newPos > 47 && newPos < 53) {
            this.runner.classList.add("flashy-stick-active");
            this.top.classList.add("flashy-stick-active");
            this.bottom.classList.add("flashy-stick-active");
        } else {
            this.runner.classList.remove("flashy-stick-active");
            this.top.classList.remove("flashy-stick-active");
            this.bottom.classList.remove("flashy-stick-active");
        }
        // if (audio.currentTime < audio.duration && audio.currentTime > 0) {
        if (newPos < 99) {
            setTimeout(() => {
                this.animatePing(audio);
            }, 1);
        }
    }

    runPing() {
        this.toneAudio.play();
        this.animating = true;
        this.animatePing(this.toneAudio);
    }

    startCalibration() {
        // this.masterInfo.songMode = "calibrate";

        this.calibrationInterval = setInterval(() => {
            this.runPing();
        }, 1000);

        // this.animator.runAnimation();

        // this.addNote("slide-right", 50);
        // setTimeout(() => {
        //     this.toneAudio.play();
        // }, 2000 + this.masterInfo.manualDelay);

        // this.calibrationInterval = setInterval(() => {
        //     this.addNote("slide-right", 50);
        //     setTimeout(() => {
        //         if (this.masterInfo.songMode === "calibrate") {
        //             this.toneAudio.play();
        //         }
        //     }, 2000 + this.masterInfo.manualDelay);

        // }, 2500);

    }

    endCalibration() {
        this.closed = true;
        this.toneAudio.pause();
        // this.animator.stopAnimation();
        clearInterval(this.calibrationInterval);
        document.getElementById("calibrator").classList.add("hidden");
        // document.getElementById("source-menu").classList.remove("hidden");
        this.makeMenusVisible();
        // killAllNotes(this.masterInfo, this.noteWriter);
        // setTimeout(() => {
        //     if (this.wasSongMode && this.masterInfo.songMode !== "tutorial") {
        //         // this.masterInfo.songMode = this.wasSongMode;
        //     }
        // }, 20);
        if (Math.abs(this.masterInfo.manualDelay) > 150) {
            const bigPopup = document.getElementById("big-calibrate-popup");
            bigPopup.style.top = "20%";
            bigPopup.style.left = "10vw";
            bigPopup.style.width = "70vw";
            bigPopup.style.zIndex = "20";
            bigPopup.classList.remove("hidden");

            this.masterInfo.effects = false;
            document.getElementById("toggle-effects-ball").classList.add("toggle-ball-off");
            document.getElementById("effects-title").style.opacity = "0.5";
        }
        this.masterInfo.promptedCalibration = true;
    }

    makeMenusInvisible() {
        this.menus.forEach((menuId) => {
            document.getElementById(menuId).style.zIndex = "-20";
        });
    }

    makeMenusVisible() {
        this.menus.forEach((menuId) => {
            document.getElementById(menuId).style.zIndex = "5";
        });
    }
}