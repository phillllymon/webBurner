import { 
    setButtonClick,
    showModal,
    hideModal,
    showSongControlButton,
    killAllNotes,
    getUserProfile,
    setUserProfile,
    promptCalibration
} from "./util.js";
import { songData } from "../data.js";

export class MenuManager {
    constructor(masterInfo, controlsManager, player, stationManager, streamPlayer, noteWriter, connector) {
        this.masterInfo = masterInfo;
        this.controlsManager = controlsManager;
        this.stationManager = stationManager;
        this.player = player;
        this.streamPlayer = streamPlayer;
        this.noteWriter = noteWriter;
        this.connector = connector;
        this.menus = [
            "source-menu",
            "main-menu",
            "feedback",
            "choose-song-menu",
            "first-time-menu",
            "stream-modal"
        ];
        this.mainMenuOptions = [
            "choose-song-button",
            "upload-song-button",
            "select-station-button",
            "show-stream-modal-button"
        ];

        this.activateMenuShowButtons();
        this.activateSourceMenuButtons();

        this.activateMainMenu();
        this.activateDifficultyMenu();
        this.activateFeedbackMenu();
        this.activateGiveFeedbackMenu();

        this.activateControlsDrag();
        this.activateOtherControlsDrag();

        this.hideMenus();
        // this.showMenu("choose-song-menu");
    }

    activateControlsDrag() {
        const controlsMenu = document.getElementById("controls-bottom");
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;
        const totalWidth = window.innerWidth;
        const totalHeight = window.innerHeight;
        let dragTimeout;
        controlsMenu.addEventListener("touchstart", (e) => {
            dragTimeout = setTimeout(() => {
                dragging = true;
                const rect = controlsMenu.getBoundingClientRect();
                offsetX = e.targetTouches[0].clientX - rect.left;
                offsetY = e.targetTouches[0].clientY - rect.top;
                controlsMenu.style.opacity = "1";
            }, 500);
        });
        controlsMenu.addEventListener("touchend", () => {
            dragging = false;
            clearTimeout(dragTimeout);
            controlsMenu.style.opacity = "0.5";
        });
        document.addEventListener("touchmove", (e) => {
            if (dragging) {
                controlsMenu.classList.remove("stuck-to-bottom");
                let newX = e.changedTouches[0].clientX - offsetX;
                let newY = e.changedTouches[0].clientY - offsetY;
                const newRect = controlsMenu.getBoundingClientRect();
                if (newX < 0) {
                    newX = 0;
                }
                if (newX > totalWidth - (newRect.right - newRect.left)) {
                    newX = totalWidth - (newRect.right - newRect.left);
                }
                if (newY < 0) {
                    newY = 0;
                }
                if (newY > totalHeight - (newRect.bottom - newRect.top)) {
                    newY = totalHeight - (newRect.bottom - newRect.top);
                }
                controlsMenu.style.top = `${newY}px`;
                controlsMenu.style.left = `${newX}px`;
                if (e.changedTouches[0].clientX < 0.15 * totalWidth || e.changedTouches[0].clientX > 0.85 * totalWidth) {
                    controlsMenu.classList.add("controls-vertical");
                }
                if (e.changedTouches[0].clientY > 0.85 * totalHeight) {
                    controlsMenu.classList.remove("controls-vertical");
                }
            }
        });
    }
    activateOtherControlsDrag() {
        const controlsMenu = document.getElementById("controls-top-left");
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;
        const totalWidth = window.innerWidth;
        const totalHeight = window.innerHeight;
        let dragTimeout;
        controlsMenu.addEventListener("touchstart", (e) => {
            dragTimeout = setTimeout(() => {
                dragging = true;
                const rect = controlsMenu.getBoundingClientRect();
                offsetX = e.targetTouches[0].clientX - rect.left;
                offsetY = e.targetTouches[0].clientY - rect.top;
                controlsMenu.style.opacity = "1";
            }, 500);
        });
        controlsMenu.addEventListener("touchend", () => {
            dragging = false;
            clearTimeout(dragTimeout);
            controlsMenu.style.opacity = "0.5";
        });
        document.addEventListener("touchmove", (e) => {
            if (dragging) {
                controlsMenu.style.transform = "translate(0%, 0%)";
                let newX = e.changedTouches[0].clientX - offsetX;
                let newY = e.changedTouches[0].clientY - offsetY;
                const newRect = controlsMenu.getBoundingClientRect();
                if (newX < 0) {
                    newX = 0;
                }
                if (newX > totalWidth - (newRect.right - newRect.left)) {
                    newX = totalWidth - (newRect.right - newRect.left);
                }
                if (newY < 0) {
                    newY = 0;
                }
                if (newY > totalHeight - (newRect.bottom - newRect.top)) {
                    newY = totalHeight - (newRect.bottom - newRect.top);
                }
                controlsMenu.style.top = `${newY}px`;
                controlsMenu.style.left = `${newX}px`;
            }
        });
    }

    activateGiveFeedbackMenu() {
        setButtonClick("open-feedback-link", () => {
            document.userFeedbackOpen = true;
            document.getElementById("give-feedback-modal").classList.remove("hidden");
            document.getElementById("give-feedback-modal").classList.add("menu");
            document.getElementById("modal-background").classList.remove("hidden");
            document.getElementById("settings-modal").classList.add("hidden");
        });
        setButtonClick("cancel-give-feedback", () => {
            document.getElementById("give-feedback-modal").classList.add("hidden");
            document.getElementById("give-feedback-modal").classList.remove("menu");
            document.getElementById("modal-background").classList.add("hidden");
            document.getElementById("settings-modal").classList.remove("hidden");

            document.userFeedbackOpen = false;
        });
        setButtonClick("submit-give-feedback", () => {
            const message = document.getElementById("feedback-message").value;
            if (message.length < 3) {
                alert("Cannot submit empty message!");
            } else {
                document.getElementById("cancel-give-feedback").disabled = "disabled";
                document.getElementById("submit-give-feedback").disabled = "disabled";
                let email = document.getElementById("feedback-email").value;
                if (email.length < 1) {
                    email = "none";
                }
                fetch("https://beatburner.com/api/feedback.php", {
                    method: "POST",
                    body: JSON.stringify({
                        message: message,
                        email: email
                    })
                }).then(() => {
                    document.getElementById("give-feedback-modal").innerHTML = "Thanks!";
                    setTimeout(() => {
                        document.getElementById("give-feedback-modal").classList.add("hidden");
                        document.getElementById("give-feedback-modal").classList.remove("menu");
                        document.getElementById("settings-modal").classList.remove("hidden");
                        document.userFeedbackOpen = false;
                    }, 1000);


                });
            }
        });
    }

    activateFeedbackMenu() {
        setButtonClick("replay", () => {
            document.getElementById("tutorial-step-10").classList.add("hidden");
            document.getElementById("tutorial-step-11").classList.add("hidden");
            this.player.restart();
            this.controlsManager.playFunction();
            this.hideMenus();
        });
        document.getElementById("no-replay").addEventListener("click", () => {
            document.getElementById("tutorial-step-10").classList.add("hidden");
            document.getElementById("tutorial-step-11").classList.add("hidden");
            if (this.masterInfo.songMode === "demo") {
                this.showMenu("choose-song-menu");
            } else {
                this.showMenu("main-menu");
            }
        });
    }

    activateDifficultyMenu() {
        document.getElementById("close-difficulty").addEventListener("click", () => {
            document.getElementById("difficulty-menu").classList.add("hidden");
            document.getElementById("main-menu").classList.remove("hidden");
        });
    }

    activateMainMenu() {
        document.getElementById("choose-song-button").addEventListener("click", () => {
        // setButtonClick("choose-song-button", () => {
            document.getElementById("choose-song-menu").classList.remove("hidden");
            document.getElementById("main-menu").classList.add("hidden");
        });
        document.getElementById("change-difficulty-button").addEventListener("click", () => {
            document.getElementById("difficulty-menu").classList.remove("hidden");
            document.getElementById("main-menu").classList.add("hidden");
        });
        setButtonClick("close-and-play", () => {
            this.hideMenus();
            if (this.masterInfo.songMode === "radio") {
                this.stationManager.startListening();
            } else {
                this.controlsManager.playFunction();
            }
        });
    }

    activateSourceMenuButtons() {
        setButtonClick("source-demo-songs", () => {
            if (!this.masterInfo.promptedCalibration) {
                promptCalibration();
                this.masterInfo.promptedCalibration = true;
            }
            if (this.masterInfo.songMode === "radio") {
                this.stationManager.stopListening();
            }
            
            let newMode = true;
            if (this.masterInfo.songMode === "demo") {
                newMode = false;
            }
            
            this.masterInfo.canEnterCode = false;
            this.masterInfo.songMode = "demo";
            this.setMainMenuOption("choose-song-button");
            if (newMode || !this.masterInfo.audioLoaded) {
                document.getElementById("close-and-play").classList.add("hidden");
                document.getElementById("close-and-play-ghost").classList.remove("hidden");
                this.player.setPlayerReady(() => {
                    document.getElementById("close-and-play").classList.remove("hidden");
                    document.getElementById("close-and-play-ghost").classList.add("hidden");
                    this.masterInfo.audioLoaded = true;
                    this.player.setPlayerReady(() => {});
                });

                let songToLoad = this.masterInfo.songCode;
                if (!songToLoad) {
                    songToLoad = this.masterInfo.defaultSong;
                }
                if (!songToLoad) {
                    songToLoad = "blahBlahBlah";
                    document.getElementById("song-to-play").innerText = songData["blahBlahBlah"];
                }

                // if (this.masterInfo.defaultSong) {
                    // fetch(`./songStrings/${this.masterInfo.defaultSong}.txt`).then((res) => {
                    fetch(`./songStrings/${songToLoad}.txt`).then((res) => {
                        res.text().then((str) => {
                            this.masterInfo.currentSong = songData[songToLoad];
                            this.masterInfo.songCode = songToLoad;
                            this.player.pause();
                            this.player.setSource(`data:audio/x-wav;base64,${str}`);
                            showSongControlButton("button-play");
                            document.getElementById("song-label").innerText = this.masterInfo.currentSong;
                            killAllNotes(this.masterInfo, this.noteWriter);
                            // this.masterInfo.defaultSong = null;

                            // document.getElementById("song-label").innerText = "SWITCHED BY DEFAULT";
                        });
                    });
                // } else {
                //     if (this.masterInfo.currentSong) {
                //         this.masterInfo.currentSong = songData[this.masterInfo.songCode];
                //     }
                // }
            } else {
                document.getElementById("close-and-play").classList.remove("hidden");
                document.getElementById("close-and-play-ghost").classList.add("hidden");
            }
            this.showMenu("main-menu");
        });
        setButtonClick("source-upload", () => {
            if (!this.masterInfo.promptedCalibration) {
                promptCalibration();
                this.masterInfo.promptedCalibration = true;
            }
            let newMode = true;
            if (this.masterInfo.songMode === "upload") {
                newMode = false;
            }
            this.masterInfo.canEnterCode = false;
            this.masterInfo.songMode = "upload";
            this.setMainMenuOption("upload-song-button");

            if (newMode || !this.masterInfo.audioLoaded) {
                document.getElementById("close-and-play").classList.add("hidden");
                document.getElementById("close-and-play-ghost").classList.add("hidden");
                this.player.setPlayerReady(() => {
                    document.getElementById("close-and-play").classList.remove("hidden");
                    document.getElementById("close-and-play-ghost").classList.add("hidden");
                    this.masterInfo.audioLoaded = true;
                    this.player.setPlayerReady(() => {});
                });
            } else {
                document.getElementById("close-and-play").classList.remove("hidden");
                document.getElementById("close-and-play-ghost").classList.add("hidden");
            }

            this.showMenu("main-menu");
            if (this.masterInfo.songMode === "radio") {
                this.stationManager.stopListening();
            }
        });
        setButtonClick("source-radio", () => {
            if (!this.masterInfo.promptedCalibration) {
                promptCalibration();
                this.masterInfo.promptedCalibration = true;
            }
            this.masterInfo.canEnterCode = false;
            document.getElementById("close-and-play-ghost").classList.add("hidden");
            this.masterInfo.songMode = "radio";
            this.setMainMenuOption("select-station-button");
            this.showMenu("main-menu");
            this.masterInfo.currentSong = "Hawk classic rock";
            document.getElementById("close-and-play").classList.remove("hidden");
        });
        document.getElementById("source-streaming").addEventListener("click", () => {
            if (!this.masterInfo.promptedCalibration) {
                promptCalibration();
                this.masterInfo.promptedCalibration = true;
            }
            this.masterInfo.canEnterCode = false;
            document.getElementById("close-and-play-ghost").classList.add("hidden");
            this.masterInfo.songMode = "stream";
            this.setMainMenuOption("show-stream-modal-button");
            // this.showMenu("main-menu");
            // showModal("stream");
            document.getElementById("source-menu").classList.add("hidden");
            document.getElementById("stream-modal").classList.remove("hidden");
            if (this.masterInfo.songMode === "radio") {
                this.stationManager.stopListening();
            }
        });

        // putting this here just because
        // setButtonClick("show-stream-modal-button", () => {
        document.getElementById("show-stream-modal-button").addEventListener("click", () => {
            // showModal("stream");
            document.getElementById("main-menu").classList.add("hidden");
            document.getElementById("stream-modal").classList.remove("hidden");
        });
    }

    setMainMenuOption(optionId) {
        this.mainMenuOptions.forEach((optId) => {
            document.getElementById(optId).classList.add("hidden");
        });
        document.getElementById(optionId).classList.remove("hidden");
    }

    activateMenuShowButtons() {
        document.getElementById("show-menu").addEventListener("click", () => {
            if (this.masterInfo.songMode && this.masterInfo.songMode !== "tutorial") {
                this.showMenu("main-menu");
                this.player.pause();
                this.streamPlayer.stop();
                this.player.countdownCanceled = true;
            }
        });
        document.getElementById("show-source-menu").addEventListener("click", () => {
            this.masterInfo.canEnterCode = true;
            killAllNotes(this.masterInfo, this.noteWriter);
            document.getElementById("song-label").innerHTML = "";
            this.masterInfo.currentSong = "";
            this.showMenu("source-menu");
            this.player.pause();
            this.streamPlayer.stopStream();
            this.stationManager.stopListening();
            this.connector.closeConnection();
        });
        document.getElementById("back-to-main-menu").addEventListener("click", () => {
            this.setMainMenuOption("choose-song-button");
            this.showMenu("main-menu");
        });
        document.getElementById("skip-tutorial-button").addEventListener("click", () => {
            this.showMenu("source-menu");
            getUserProfile().then((profile) => {
                profile.oldUser = true;
                setUserProfile(profile);
            });
        });
    }

    showMenu(menuId) {
        this.hideMenus();
        document.getElementById(menuId).classList.remove("hidden");
        if (menuId === "choose-song-menu" && this.masterInfo.extendedTutorial) {
            const step12 = document.getElementById("tutorial-step-12");
            step12.style.top = "10vh";
            step12.style.left = "6vh";
            step12.style.zIndex = 2000;
            step12.style.opacity = 1;
            step12.classList.remove("hidden");
        }
        if (menuId === "main-menu" && this.masterInfo.extendedTutorial) {
            const step13 = document.getElementById("tutorial-step-13");
            step13.style.top = "30vh";
            step13.style.left = "6vh";
            step13.style.zIndex = 2000;
            step13.style.opacity = 1;
            step13.classList.remove("hidden");
            const rectBottom = document.getElementById("change-difficulty-button").getBoundingClientRect().bottom;
            // const rectBottom = rect.getBoundingClientRect
            const arrow = document.getElementById("tutorial-arrow");
            arrow.style.top = `${rectBottom}px`;
            arrow.style.left = "46vw";
            arrow.style.transform = "rotate(0deg) translate(0vh, 3vh)";
            arrow.classList.remove("hidden");
            document.getElementById("close-and-play-ghost").classList.add("hidden");
        }
    }

    hideMenus() {
        this.menus.forEach((menuId) => {
            document.getElementById(menuId).classList.add("hidden");
        });
    }


    
}