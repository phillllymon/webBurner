console.log("initiating beatburner");

import { Animator } from "./helpers/animator.js";
import { BackgroundAnimator } from "./helpers/backgroundAnimator.js";
import { Connector } from "./helpers/connector.js";
import { ControlsManager } from "./helpers/controlsManager.js";
import { MenuManager } from "./helpers/menuManager.js";
import { NoteWriter } from "./helpers/noteWriter.js";
import { Player } from "./helpers/player.js";
import { StationManager } from "./helpers/stationManager.js";
import { StreamPlayer } from "./helpers/streamPlayer.js";
import { FileConverter } from "./helpers/fileConverter.js";
import { Tutorial } from "./helpers/tutorial.js";
import { Calibrator } from "./helpers/calibrator.js";
import { StatsManager } from "./helpers/statsManager.js";
import { lightUp, flyAway } from "./helpers/animations.js";
import {
    setElementText,
    removeElementClass,
    detectMobile,
    showSongControlButton,
    getUserProfile,
    setUserProfile,
    resetUserProfile
} from "./helpers/util.js";
import { gameDataConst, songAuthors, songStages } from "./data.js";
// import { Haptics, ImpactStyle } from "@capacitor/haptics";

const whoosh = new Audio();
const electric = new Audio();
const guitar = new Audio();

const twang1 = new Audio();
const twang2 = new Audio();

const twangs = [];
twangs.push(twang1);
twangs.push(twang2);

[
    [whoosh, "whoosh"],
    [electric, "static"],
    [guitar, "guitar"],
    [twang1, "twang1"],
    [twang2, "twang2"]
].forEach((ele) => {
    fetch(`./effects/${ele[1]}.txt`).then((res) => {
        res.text().then((str) => {
            ele[0].setAttribute("src", `data:audio/x-wav;base64,${str}`);
        });
    });
})

// resetUserProfile();

// temp for video
// document.activateTapper = (tapperId, slideId) => {
//     activateTapper(tapperId, slideId);
// };
// document.getElementById("song-label").style.opacity = 0;
// end temp for video




setTimeout(() => {
    document.getElementById("start-curtain").remove();
}, 1100);
setTimeout(() => {
    initialAnimate();
}, 1000);
// ^animation above

const {
    allSlides,
    targetBoundSizes,
    minNoteGap,
    maxTailLength
} = gameDataConst; // from data.js

let songDelay = gameDataConst.songDelay;
// console.log(songDelay);

// let viewWidth = document.getElementById("game-container").clientWidth;
// let viewHeight = document.getElementById("game-container").clientHeight;
// console.log(viewWidth);
// console.log(viewHeight);
let viewWidth = document.body.clientWidth;
let viewHeight = document.body.clientHeight;
let vMin = Math.min(viewWidth, viewHeight);

let slideLength = 1.5 * vMin;
let travelLength = 1.365 * vMin;

const noteSpeed = 1.0 * travelLength / (songDelay - 2000);

const targetTime = 100; // ms either side
const targetDist = 1.0 * noteSpeed * targetTime;
const targetBounds = {
    top: travelLength - targetDist,
    bottom: travelLength + targetDist
}

handleMobile();

const notes = new Set();

const mostRecentNotesOrTails = {
    "slide-right": null,
    "slide-left": null,
    "slide-a": null,
    "slide-b": null
};

const targets = {
    "slide-right": new Set(),
    "slide-left": new Set(),
    "slide-a": new Set(),
    "slide-b": new Set()
};

const targetTails = {
    "slide-right": null,
    "slide-left": null,
    "slide-a": null,
    "slide-b": null
};

const tapperKeys = [
    "KeyS",
    "KeyC",
    "KeyB",
    "KeyJ"
];

const activeTappers = {
    "tapper-left": false,
    "tapper-a": false,
    "tapper-b": false,
    "tapper-right": false
}

let algorithm = "A";
let autoCalibrating = true;
let sustainedNotes = true;
let animatedBackground = true;
let streaming = false;
let useShortSteps = true;
let manualDelay = 0;

let autoAdjustment = 0;
// let autoAdjustment = -0.05 * travelLength;

let streak = 0;

let currentSong = "";
// document.getElementById("song-label").innerText = currentSong;
let waitingForKey = false;
let songAtStart = true;

let songNotesHit = 0;
let songNotesMissed = 0;
let songStreak = 0;
let longestStreak = 0;

let radioCode = "mvn925";
// let songMode = "demo";
let sliderPos = 0;

let audioLoaded = false;

let sendStat = true;
let hapticsOnHit = true;
let animations = true;
let effects = true;
let double = true;
let sustainedNotesFrequency = "few";
let doubleFrequency = "few";
let canEnterCode = true;
let onFire = false;
let puttingOutFire = false;
let extendedTutorial = false;
let songActive = false;
let animationStyle = "lightUp";

let promptedCalibration = false;

const masterInfo = {
    algorithm,
    allSlides,
    animatedBackground,
    animations,
    animationStyle,
    audioLoaded,
    autoAdjustment,
    autoCalibrating,
    canEnterCode,
    currentSong,
    double,
    doubleFrequency,
    effects,
    extendedTutorial,
    hapticsOnHit,
    manualDelay,
    maxTailLength,
    minNoteGap,
    mostRecentNotesOrTails,
    notes,
    noteSpeed,
    onFire,
    promptedCalibration,
    puttingOutFire,
    radioCode,
    sendStat,
    slideLength,
    sliderPos,
    songActive,
    songAtStart,
    songDelay,
    // songMode,
    songNotesHit,
    songNotesMissed,
    songStreak,
    // speedAdjust,
    streak,
    streaming,
    sustainedNotes,
    sustainedNotesFrequency,
    tapperKeys,
    targetBounds,
    targets,
    targetTails,
    targetTime,
    travelLength,
    useShortSteps,
    vMin,
    waitingForKey

    // TEMP
    // numNotes: 0
};

// ----------------------------------------- HELPERS
const backgroundAnimator = new BackgroundAnimator(
    masterInfo
);
const noteWriter = new NoteWriter(
    masterInfo,
    addNote,
    makeTail,
    backgroundAnimator
);
const animator = new Animator(
    masterInfo,
    noteWriter,
    backgroundAnimator,
    addNote,
    makeTail,
    triggerMissedNote
);
const statsManager = new StatsManager(
    masterInfo
);
const player = new Player(
    masterInfo,
    `aintOverYou`,
    32,
    () => {
        // console.log(notesRecord);
        // console.log(noteAttempts);
        // console.log(notesMade);
        statsManager.updateInfo();
        animator.stopAnimation();
        if (masterInfo.songStreak > longestStreak) {
            longestStreak = masterInfo.songStreak;
        }
        document.getElementById("feedback").classList.remove("hidden");
        const fraction = 1.0 * masterInfo.songNotesHit / (masterInfo.songNotesHit + masterInfo.songNotesMissed);
        document.getElementById("percent-bar-inner-container").style.width = `${100.0 * fraction}%`;
        const accuracy = Math.round(fraction * 1000) / 10.0;
        if (masterInfo.songMode === "demo") {
            reportNewScore(accuracy, masterInfo.currentSong);
        }
        const passingScore = {
            1: 75,
            2: 80,
            3: 85,
            4: 90,
            5: 95
        }[animator.notesPerSecond];
        if (accuracy < passingScore) {
            document.getElementById("song-fail").classList.remove("hidden");
            document.getElementById("song-pass").classList.add("hidden");
            document.getElementById("feedback-percent").style.color = "red";
        } else {
            document.getElementById("song-fail").classList.add("hidden");
            document.getElementById("song-pass").classList.remove("hidden");
            document.getElementById("feedback-percent").style.color = "green";
        }
        document.getElementById("feedback-title").innerText = masterInfo.currentSong;
        if (masterInfo.songMode === "demo" && songAuthors[masterInfo.songCode]) {
            document.getElementById("song-information-bar").innerHTML = songAuthors[masterInfo.songCode];
            document.getElementById("song-information-bar").classList.remove("hidden");
        } else {
            document.getElementById("song-information-bar").innerHTML = "";
            document.getElementById("song-information-bar").classList.add("hidden");
        }
        document.getElementById("feedback-title").innerText = masterInfo.currentSong;
        document.getElementById("feedback-percent").innerText = `Tap accuracy: ${accuracy}%`;
        document.getElementById("feedback-streak").innerText = `Longest streak: ${longestStreak}`;
        document.getElementById("feedback-streak-overall").innerText = `Current streak: ${masterInfo.streak}`;
        animateStats("percent-bar", ["feedback-percent-title", "feedback-streak", "feedback-streak-overall"]);
        masterInfo.songNotesMissed = 0;
        masterInfo.songNotesHit = 0;
        masterInfo.songStreak = 0;
        if (masterInfo.extendedTutorial) {
            const step10 = document.getElementById("tutorial-step-10");
            step10.style.top = "5vh";
            step10.style.left = "6vh";
            step10.style.zIndex = 1000;
            step10.classList.remove("hidden");
        }
        // alert(notesMade);
    }
);
const streamPlayer = new StreamPlayer(
    masterInfo,
    masterInfo.songDelay
);
const stationManager = new StationManager(
    masterInfo,
    streamPlayer
);
const fileConverter = new FileConverter();
const calibrator = new Calibrator(
    masterInfo,
    animator,
    noteWriter,
    addNote
);
const controlsManager = new ControlsManager(
    masterInfo,
    player,
    streamPlayer,
    animator,
    fileConverter,
    noteWriter,
    calibrator,
    statsManager
);
let connector = new Connector(
    masterInfo,
    streamPlayer,
    replaceConnector
);
const menuManager = new MenuManager(
    masterInfo,
    controlsManager,
    player,
    stationManager,
    streamPlayer,
    noteWriter,
    connector
);
const tutorial = new Tutorial(
    masterInfo,
    controlsManager,
    animator,
    player,
    noteWriter,
    menuManager,
    addNote
);

masterInfo.startTutorial = () => {
    tutorial.startTutorial();
};

masterInfo.hideAllMenus = () => {
    menuManager.hideMenus();
};

function replaceConnector() {
    connector = new Connector(
        masterInfo,
        streamPlayer,
        replaceConnector
    );
    menuManager.connector = connector;
}

// getUserProfile().then((profile) => {
//     if (!profile.animatedBackground) {
//         masterInfo.animatedBackground = false;
//         document.getElementById("toggle-background-ball").classList.add("toggle-ball-off");
//         document.getElementById("background-title").style.opacity = "0.5";
//     }
//     if (!profile.sustainedNotes) {
//         masterInfo.sustainedNotes = false;
//         document.getElementById("toggle-sustained-ball").classList.add("toggle-ball-off");
//         document.getElementById("sustained-title").style.opacity = "0.5";
//     }
//     if (!profile.autoCalibrating) {
//         masterInfo.autoCalibrating = false;
//         document.getElementById("toggle-calibration-ball").classList.add("toggle-ball-off");
//         document.getElementById("calibration-title").style.opacity = "0.5";
//     }
// });


document.isFullscreen = false;
document.wantFullscreenReturn = false;

// main
// const calibratePopup = document.getElementById("calibrate-popup");
// calibratePopup.style.top = "25%";
// calibratePopup.style.left = "15%";
// calibratePopup.style.width = "60%";
// calibratePopup.style.zIndex = 10;
// setTimeout(() => {
//     if (!masterInfo.songMode) {
//         calibratePopup.classList.remove("hidden");
//     }
// }, 5000);
showSongControlButton("button-play");



// setup for items handled on this page
document.userFeedbackOpen = false;
document.addEventListener("keypress", (e) => {
    if (document.userFeedbackOpen) {
        return;
    }
    // e.preventDefault();
    e.stopPropagation();
    if (masterInfo.waitingForKey) {
        e.preventDefault();
        tapperKeys[masterInfo.waitingForKey[1]] = e.code;
        document.getElementById(masterInfo.waitingForKey[0]).innerText = e.code;
        const bulbId = `bulb-${masterInfo.waitingForKey[0].split("").slice(0, masterInfo.waitingForKey[0].length - 4).join("")}`;
        document.getElementById(bulbId).innerText = e.code;
        const insetId = `inset-${masterInfo.waitingForKey[0].split("").slice(0, masterInfo.waitingForKey[0].length - 4).join("")}`;
        document.getElementById(insetId).innerText = e.code;
        document.getElementById("save-settings").style.opacity = "1";
        masterInfo.waitingForKey = false;
        document.getElementById("change-key-message").innerText = "";
    }
    if (e.code === "Space") {
        masterInfo.spaceFunction();
    }
});

document.addEventListener("keydown", (e) => {
    if (document.userFeedbackOpen) {
        return;
    }
    if(e.code === tapperKeys[0]) {
        e.preventDefault();
        if (!targetTails["slide-left"] && !activeTappers["tapper-left"]) {
            activateTapper("tapper-left", "slide-left", "note-leaving-left");
        }
    }
    if(e.code === tapperKeys[1]) {
        e.preventDefault();
        if (!targetTails["slide-a"] && !activeTappers["tapper-a"]) {
            if (animator.slides.length === 3) {
                activateTapper("tapper-a", "slide-a", Math.random() > 0.5 ? "note-leaving-right" : "note-leaving-left");
            } else {
                activateTapper("tapper-a", "slide-a", "note-leaving-left");
            }
        }
    }
    if(e.code === tapperKeys[2]) {
        e.preventDefault();
        if (!targetTails["slide-b"] && !activeTappers["tapper-b"]) {
            activateTapper("tapper-b", "slide-b", "note-leaving-right");
        }
    }
    if(e.code === tapperKeys[3]) {
        e.preventDefault();
        if (!targetTails["slide-right"] && !activeTappers["tapper-right"]) {
            activateTapper("tapper-right", "slide-right", "note-leaving-right");
        }
    }
});

document.addEventListener("keyup", (e) => {
    if (document.userFeedbackOpen) {
        return;
    }
    if(e.code === tapperKeys[0]) {
        deactivateTapper("tapper-left");
    }
    if(e.code === tapperKeys[1]) {
        deactivateTapper("tapper-a");
    }
    if(e.code === tapperKeys[2]) {
        deactivateTapper("tapper-b");
    }
    if(e.code === tapperKeys[3]) {
        deactivateTapper("tapper-right");
    }
});

function deactivateTapper(tapperId) {
    // document.getElementById(tapperId).classList.remove("active-tapper");
    document.getElementById(tapperId).style.backgroundColor = "rgba(168,0,93,0.2)";
    activeTappers[tapperId] = false;
    const slideIds = {
        "tapper-left": "slide-left",
        "tapper-a": "slide-a",
        "tapper-b": "slide-b",
        "tapper-right": "slide-right"
    };
    const tail = targetTails[slideIds[tapperId]];
    if (tail) {
        targetTails[slideIds[tapperId]] = null;
        if (tail.height > 0.1 * maxTailLength) {
            player.setVolume(0.3);
        }
        
        tail.note.remove();
        mostRecentNotesOrTails[slideIds[tapperId]] = null;

        
        // try again in a bit
        // setTimeout(() => {
        //     const stuck = document.getElementById(`${slideIds[tapperId]}-flash-sustain`);
        //     if (stuck) {
        //         // sustain.classList.remove("flash-sustain");
        //         stuck.remove();
        //     }
        // }, 100);
    }
    const sustain = document.getElementById(`${slideIds[tapperId]}-flash-sustain`);
    if (sustain) {
        // sustain.classList.remove("flash-sustain");
        sustain.remove();
    }
}

// record note attempts
const noteAttempts = [];
// end record note attempts
// document.addEventListener("touchstart", (e) => {
//     console.log(e.target);
// });
function activateTapper(tapperId, slideId, leavingClass) {

    // console.log(slideId);
    if (masterInfo.canEnterCode) {
        triggerCode(slideId);
    }
    if (!masterInfo.songActive && masterInfo.songMode !== "tutorial") {
        return;
    }

    // record note attempts
    // noteAttempts.push(player.song2.currentTime);
    // end record note attempts

    activeTappers[tapperId] = true;
    let closest = 5000;
    let numNotes = 0;
    let target = null;
    notes.forEach((note) => {
        if (slideId === note.slideId) {
            const thisOffset = note.position - masterInfo.travelLength;
            if (Math.abs(thisOffset) < closest) {
                target = note;
                closest = thisOffset;
                if (thisOffset < 80) {
                    numNotes += 1;
                }
            }
        }
    });
    
    if (masterInfo.autoCalibrating) {
        const proximity = 0.1 * masterInfo.travelLength;
        const maxAdjust = 0.1 * masterInfo.travelLength;
        if (numNotes === 1) {
            if (Math.abs(closest) < proximity) {
                masterInfo.autoAdjustment += 1.0 * (closest / (10 * notes.size));
                masterInfo.autoAdjustment = Math.max(masterInfo.autoAdjustment, -1 * maxAdjust);
                masterInfo.autoAdjustment = Math.min(masterInfo.autoAdjustment, 1.0 * maxAdjust);
            }
        }
    }

    // document.getElementById(tapperId).classList.add("active-tapper");
    // document.getElementById(tapperId).style.backgroundColor = "rgba(255, 166, 0, 0.2)";
    const tapperTargets = targets[slideId];
    if (tapperTargets.size === 0) {
        
        // document.getElementById("button-pause").style.backgroundColor = "red";
        // setTimeout(() => {
        //     document.getElementById("button-pause").style.backgroundColor = "gray";
        // }, 1000);
        
        triggerMissedNote();
    } else {
        // console.log("----");
        // console.log(masterInfo.targets);
    }
    if (tapperTargets.has(target)) {
        notes.delete(target);
        target.note.remove();
        target.note.classList.add(leavingClass);
        targets[slideId].delete(target);

        let hasTail = false;

        if (target.tail) {
            hasTail = true;
            targetTails[slideId] = target.tail;
            target.tail.note.classList.add("tail-active");

            target.tail.cloud.classList.remove("hidden");

            const lighted = document.createElement("div");
            lighted.classList.add("note-lighted");
            const middleLighted = document.createElement("div");
            middleLighted.classList.add("note-middle-lighted");
            const light = document.createElement("div");
            light.appendChild(lighted);
            light.appendChild(middleLighted);
            document.getElementById(`dummy-${tapperId}`).appendChild(light);
            light.classList.add("flash-sustain");
            light.id = `${slideId}-flash-sustain`;
            

            // make it look like you got the note spot on
            const perfectHeight = masterInfo.travelLength - target.tail.position;
            target.tail.note.style.height = `${perfectHeight}px`;
            target.tail.height = perfectHeight;
        }
        triggerHitNote(slideId, tapperId, hasTail);
        if (masterInfo.songMode === "tutorial") {
            tutorial.triggerNoteAttempt(true);
        }
    } else {
        if (masterInfo.songMode === "tutorial") {
            tutorial.triggerNoteAttempt(false);
        }
    }
}

function makeTail(slideId, parentNote) {
    if (parentNote.isTail) { // stretch instead of making new
        const startPos = (-1.0 * autoAdjustment);
        const additionalHeight = parentNote.position - startPos;
        parentNote.totalHeight = parentNote.totalHeight + additionalHeight;
        const newHeight = parentNote.height + additionalHeight;
        parentNote.note.style.height = `${newHeight}px`;
        parentNote.note.style.top = `${startPos - masterInfo.sliderPos}px`;
        parentNote.height = newHeight;
        parentNote.position = startPos;
        return parentNote;
    } else {
        const newTail = document.createElement("div");
        newTail.classList.add("note-tail");
        const startPos = -1.0 * autoAdjustment;
        // const startPos = -1.0 * autoAdjustment - 300;
        newTail.style.top = `${(-1.0 * masterInfo.sliderPos) + startPos}px`;
        const heightNeeded = parentNote.position - startPos;
        newTail.style.height = `${heightNeeded}px`;
        // newTail.style.height = `${300}px`;
        const newTailCloud = document.createElement("div");
        const tailInfo = {
            note: newTail,
            position: startPos,
            height: heightNeeded,
            totalHeight: heightNeeded, // running total of all height it's ever had
            slideId: slideId,
            target: false,
            val: parentNote.val,
            isTail: true,
            cloud: newTailCloud,
            parentNote: parentNote,
            tail: null
        }
        
        parentNote.tail = tailInfo;
        newTailCloud.classList.add("cloud-tail");
        newTailCloud.classList.add("hidden");
        newTail.appendChild(newTailCloud);
        document.getElementById(slideId).appendChild(newTail);
    
        mostRecentNotesOrTails[slideId] = tailInfo;
        return tailInfo;
    }

}

let lastNote = null;
// let notesMade = 0;

// // TEMP
// const notesRecord = [];
// document.addEventListener("click", () => {
//     console.log(notesRecord);
// });

// document.notesRecord = {
//     "slide-left": 0,
//     "slide-a": 0,
//     "slide-b": 0,
//     "slide-right": 0
// };

// for recording notes
// const notesRecord = [];

function addNote(slideId, val, marked = false, timeOffset = 0, canDouble = false) {
    // notesRecord.push([slideId, player.song2.currentTime]);

    const newNote = document.createElement("div");
    newNote.classList.add("note");
    if (marked === true) {
        newNote.classList.add("note-marked");
        newNote.style.backgroundColor = "yellow";
    }
    if (marked && marked !== true) {
        newNote.style.backgroundColor = marked;
    }

    // TEMP
    // if (document.noteVal !== undefined) {
        // newNote.style.fontSize = "30px";
        // newNote.innerText = document.noteVal;
        // newNote.innerText = animator.currentSlider;
        
    // }
    // end TEMP
    
    let startPos = -1.0 * autoAdjustment; // should be zero initially
    if (timeOffset > 0) {
        const travelTime = masterInfo.songDelay - 2000;
        const fraction = 1.0 * timeOffset / travelTime;
        const distOffset = fraction * masterInfo.travelLength;

        // const travelTime = masterInfo.travelLength / 2.0;
        // const fraction = 1.0 * timeOffset / travelTime;
        // const distOffset = fraction * masterInfo.travelLength;
        startPos += distOffset;
    }
    
    let newNoteAligned = false;
    // match previous note if super close    
    if (lastNote && !lastNote.killed && !lastNote.isTail && Math.abs(lastNote.position - startPos) < 0.05 * (2000.0 / (masterInfo.songDelay - 2000)) * (masterInfo.travelLength + autoAdjustment)) {
        if (masterInfo.double && canDouble && !lastNote.aligned && animator.notesPerSecond > 1) {
            startPos = lastNote.position;
            newNoteAligned = true;
        } else {
            return false;
        }
    }
    
    newNote.style.top = `${(-1.0 * masterInfo.sliderPos) + startPos}px`; // FOR SLIDER
    // newNote.style.top = `${startPos}px`;
    const noteInfo = {
        note: newNote,
        position: startPos,
        slideId: slideId,
        target: false,
        val: val,   // val in the array that triggered the note to be created
        isTail: false,
        tail: null,
        seen: false,
        aligned: newNoteAligned,

        // temp
        // timing: player.song1.currentTime - 2.1,
        // printed: false,
        // launched: performance.now()
        // end temp
    };

    notes.add(noteInfo);
    
    document.getElementById(slideId).appendChild(newNote);

    // TEMP
    // console.log(player.song1.currentTime, player.song2.currentTime);
    // notesMade += 1;
    // masterInfo.numNotes += 1;
    // notesRecord.push(player.song2.currentTime);
    // END TEMP

    lastNote = noteInfo;
    if (masterInfo.songMode !== "tutorial") {
        mostRecentNotesOrTails[slideId] = noteInfo;
        // notesMade += 1;
        return noteInfo;
    }
}

const streakLengths = {
    1: 5,
    2: 20,
    3: 50,
    4: 100,
    5: 100
}
const hitClasses = {
    1: "hit1",
    2: "hit2",
    3: "hit3",
    4: "hit4",
    5: "hit4"
}

function getStreakUpToSpeed() {
    const streakThreshold = streakLengths[animator.notesPerSecond];
    const hitClass = hitClasses[animator.notesPerSecond];
    
    for (let i = 0; i < masterInfo.streak; i++) {
        const newHit = document.createElement("div");
        newHit.classList.add(hitClass);
        document.getElementById("streak-channel").appendChild(newHit);
    }

    
    const rockLabel = document.getElementById("rock-label");

    if (masterInfo.streak > streakThreshold - 1) {
        document.getElementById("streak-number").innerHTML = masterInfo.streak;
        document.getElementById("streak-container").classList.remove("hidden");
        if (masterInfo.animations) {
            document.getElementById("streak-container").classList.add("bulge");
        }
        document.getElementById("streak-number").innerHTML = masterInfo.streak;
        document.getElementById("streak-channel").classList.add("streak-channel-lit");
        document.getElementById("streak-meter").classList.add("streak-meter-lit");
    }
    
    if (masterInfo.streak > 199) {
        document.getElementById("slides").classList.add("on-fire");
        rockLabel.innerHTML = "ON FIRE!";
        rockLabel.classList.add("rock-label");
        masterInfo.onFire = true;
        
        labelInUse = true;
        setTimeout(() => {
            rockLabel.classList.remove("rock-label");
            rockLabel.innerHTML = "";
            labelInUse = false;
        }, 1300);
    
        if (!labelInUse) {
            rockLabel.classList.add("static-rock");
            rockLabel.innerText = masterInfo.streak;
        }
    }
}

let labelInUse = false;
function triggerHitNote(slideId, tapperId, hasTail) {
    if (masterInfo.songMode !== "tutorial") {
        statsManager.recordNoteHit(animator.notesPerSecond, masterInfo.onFire);
    }

    const streakThreshold = streakLengths[animator.notesPerSecond];
    const hitClass = hitClasses[animator.notesPerSecond];
    if (masterInfo.hapticsOnHit) {
        // Haptics.impact({ style: ImpactStyle.Light });
    }
    if (masterInfo.streaming) {
        streamPlayer.setVolume(1);
    } else if (masterInfo.songMode !== "radio") {
        player.setVolume(1);
    }

    const smudgeId = {
        "slide-left": "smudge-left",
        "slide-a": "smudge-a",
        "slide-b": "smudge-b",
        "slide-right": "smudge-right"
    }[slideId];
    document.getElementById(smudgeId).classList.remove("smudge-active");

    if (!hasTail) {

        if (masterInfo.animationStyle === "flyAway") {
            flyAway(slideId, tapperId, animator.slides.length);
        } else if (masterInfo.animationStyle === "lightUp") {
            lightUp(slideId, tapperId);
        } else {
            flyAway(slideId, tapperId, animator.slides.length);
            lightUp(slideId, tapperId);
        }
    }
    
    animator.recordNoteHit();
    masterInfo.streak += 1;
    masterInfo.songStreak += 1;
    
    if (masterInfo.streak < streakThreshold + 1) {
        const newHit = document.createElement("div");
        newHit.classList.add(hitClass);
        document.getElementById("streak-channel").appendChild(newHit);
    }
    
    masterInfo.songNotesHit += 1;
    
    if (masterInfo.songMode !== "tutorial") {
        const rockLabel = document.getElementById("rock-label");
        // if (masterInfo.streak === 100) {
        //     rockLabel.innerHTML = "100 NOTE <br> STREAK!";
        //     rockLabel.classList.add("rock-label");
        //     labelInUse = true;
        //     setTimeout(() => {
        //         rockLabel.classList.remove("rock-label");
        //         rockLabel.innerHTML = "";
        //         labelInUse = false;
        //     }, 1300);
        // }

        if (masterInfo.streak > streakThreshold) {
            document.getElementById("streak-number").innerHTML = masterInfo.streak;
        }
        if (masterInfo.streak === streakThreshold) {
            document.getElementById("streak-container").classList.remove("hidden");
            if (masterInfo.animations) {
                document.getElementById("streak-container").classList.add("bulge");
            }
            document.getElementById("streak-number").innerHTML = masterInfo.streak;
            document.getElementById("streak-channel").classList.add("streak-channel-lit");
            document.getElementById("streak-meter").classList.add("streak-meter-lit");
            // whoosh.currentTime = 0.5;
            // whoosh.volume = 0.5;
            // whoosh.play();
        }

        // if (streak === 20) {
        if (masterInfo.streak === 200) {
            document.getElementById("slides").classList.add("on-fire");
            // document.getElementById("song-label").classList.add("on-fire");
            rockLabel.innerHTML = "ON FIRE!";
            rockLabel.classList.add("rock-label");
            masterInfo.onFire = true;
            
            labelInUse = true;
            setTimeout(() => {
                rockLabel.classList.remove("rock-label");
                rockLabel.innerHTML = "";
                labelInUse = false;
            }, 1300);
        }
        if (masterInfo.streak > 200) {
        // if (masterInfo.streak > 20) {
            if (!labelInUse) {
                rockLabel.classList.add("static-rock");
                rockLabel.innerText = masterInfo.streak;
            }
        }
        if (masterInfo.streak === 1000) {
            rockLabel.innerHTML = "HOLY<br>SHIT!";
            // rockLabel.classList.add("rock-label");
            // rockLabel.classList.add("static-rock");
            
            labelInUse = true;
            // setTimeout(() => {
            //     rockLabel.innerHTML = "SHIT!";
            // }, 1500);
            setTimeout(() => {
                // rockLabel.classList.remove("rock-label");
                // rockLabel.innerHTML = "";
                labelInUse = false;
            }, 2000);
        }
    }
}

function triggerMissedNote() {

    if (masterInfo.songMode !== "tutorial") {
        statsManager.recordNoteMissed(animator.notesPerSecond);
    }

    // if (masterInfo.songMode !== "tutorial" && masterInfo.effects && animator.notesPerSecond > 1) {
    if (masterInfo.songMode !== "tutorial" && masterInfo.effects) {
        twangs[Math.floor(twangs.length * Math.random())].play();
        if (masterInfo.streaming) {
            // streamPlayer.setVolume(0.3); // people don't like the volume shit
        } else if (masterInfo.songMode !== "radio") {
            // player.setVolume(0.3);   // people don't like the volume shit
        }
    }
    animator.recordNoteMissed();
    removeElementClass("song-label", "font-bigA");
    if (masterInfo.songMode !== "tutorial") {
        setElementText("song-label", masterInfo.currentSong);
    }
    document.getElementById("slides").classList.remove("on-fire");
    document.getElementById("song-label").classList.remove("on-fire");
    if (masterInfo.onFire) {
        masterInfo.puttingOutFire = true;
        setTimeout(() => {
            masterInfo.puttingOutFire = false;
        }, 6000);
    }
    masterInfo.onFire = false;

    document.getElementById("streak-channel").classList.remove("streak-channel-lit");
    document.getElementById("streak-meter").classList.remove("streak-meter-lit");
    document.getElementById("streak-channel").innerHTML = "";
    
    
    const rockLabel = document.getElementById("rock-label");
    if (!labelInUse && masterInfo.songMode !== "tutorial") {
        rockLabel.classList.remove("on-fire");
        rockLabel.classList.remove("rock-label");
    }
    if (masterInfo.songMode !== "tutorial") {
        rockLabel.classList.remove("static-rock");
    }
    
    document.getElementById("streak-container").classList.add("hidden");
    document.getElementById("streak-container").classList.remove("bulge");
    const theStreak = masterInfo.streak;
    if (theStreak > 25) {
        labelInUse = true;
        if (masterInfo.songMode !== "tutorial") {
            rockLabel.innerHTML = `${theStreak} NOTE <br> STREAK!`;
            rockLabel.classList.add("rock-label");
            setTimeout(() => {
                rockLabel.classList.remove("rock-label");
                if (theStreak > 50) {
                    rockLabel.innerHTML = "YOU<br>ROCK!";
                    rockLabel.classList.add("rock-label");
                    setTimeout(() => {
                        rockLabel.classList.remove("rock-label");
                        rockLabel.innerHTML = "";
                        labelInUse = false;
                    }, 1300);
                } else {
                    labelInUse = false;
                }
            }, 1300);
        }
    }
    if (masterInfo.songStreak > longestStreak) {
        longestStreak = masterInfo.songStreak;
    }
    masterInfo.streak = 0;
    masterInfo.songStreak = 0;
    masterInfo.songNotesMissed += 1;
}

function handleMobile() {
    if (detectMobile()) {
        console.log("mobile woo!");
        setupMobile();
    } else {
        const link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = "./style/desktop.css";
        document.head.appendChild(link);
    }
}

function setupMobile() {
    document.mobile = true;
    // add mobile style
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = "./style/styleMobile.css";
    document.head.appendChild(link);
    const colorLink = document.createElement("link");
    colorLink.type = "text/css";
    colorLink.rel = "stylesheet";
    colorLink.href = "./style/noteColorsMobile.css";
    document.head.appendChild(colorLink);

    [
        "fog-top-left",
        "fog-top-right",
        "fog-gradient-left",
        "fog-gradient-right"
    ].forEach((eleId) => {
        document.getElementById(eleId).remove();
    });
    
    setTimeout(() => {
        backgroundAnimator.initializeMobileBackground();
        document.getElementById("background-css").remove();

        const viewHeight = document.getElementById("game-container").clientHeight;
        masterInfo.travelLength = gameDataConst.mobile.travelLength * viewHeight;
        masterInfo.autoAdjustment = 0.05 * masterInfo.travelLength;

        const noteSpeed = 1.0 * masterInfo.travelLength / (masterInfo.songDelay - 2000);
        const targetDist = noteSpeed * masterInfo.targetTime;

        masterInfo.targetBounds.top = masterInfo.travelLength - targetDist;
        masterInfo.targetBounds.bottom = masterInfo.travelLength + targetDist;
        
        
        masterInfo.maxTailLength = 1.0 * gameDataConst.mobile.maxTailLength * masterInfo.travelLength;
        masterInfo.slideLength = masterInfo.travelLength * 1.3;
        
    }, 1000); // without small delay this was getting missed

    [
        ["tapper-left", "slide-left", "note-leaving-left", "dummy-tapper-left", "dummy-left", "slide-left", "b-slide-left"],
        ["tapper-right", "slide-right", "note-leaving-right", "dummy-tapper-right", "dummy-right", "slide-right", "b-slide-right"],
        ["tapper-a", "slide-a", "note-leaving-left", "dummy-tapper-a", "dummy-a", "slide-a", "b-slide-a"],
        ["tapper-b", "slide-b", "note-leaving-right", "dummy-tapper-b", "dummy-b", "slide-b", "b-slide-b"]
    ].forEach((idSet) => {
        document.getElementById(idSet[0]).addEventListener("touchstart", (e) => {
            activateTapper(...idSet);
        });
        document.getElementById(idSet[3]).addEventListener("touchstart", (e) => {
            activateTapper(...idSet);
        });
        document.getElementById(idSet[4]).addEventListener("touchstart", (e) => {
            activateTapper(...idSet);
        });
        document.getElementById(idSet[5]).addEventListener("touchstart", (e) => {
            activateTapper(...idSet);
        });
        document.getElementById(idSet[6]).addEventListener("touchstart", (e) => {
            activateTapper(...idSet);
        });
    });

    document.addEventListener("touchend", (e) => {
        if (e.target.id === "dummy-left" || e.target.id === "dummy-tapper-left" || e.target.id === "a-slide-left" || e.target.id === "b-slide-left" || e.target.id === "slide-left-flash" || e.target.id === "slide-left-flash-sustain" || e.target.id === "slide-left-note-lighted") {
            deactivateTapper("tapper-left");
        }
        if (e.target.id === "dummy-a" || e.target.id === "dummy-tapper-a" || e.target.id === "a-slide-a" || e.target.id === "b-slide-a" || e.target.id === "slide-a-flash" || e.target.id === "slide-a-flash-sustain" || e.target.id === "slide-a-note-lighted") {
            deactivateTapper("tapper-a");
        }
        if (e.target.id === "dummy-b" || e.target.id === "dummy-tapper-b" || e.target.id === "a-slide-b" || e.target.id === "b-slide-b" || e.target.id === "slide-b-flash" || e.target.id === "slide-b-flash-sustain" || e.target.id === "slide-b-note-lighted") {
            deactivateTapper("tapper-b");
        }
        if (e.target.id === "dummy-right" || e.target.id === "dummy-tapper-right" || e.target.id === "a-slide-right" || e.target.id === "b-slide-right" || e.target.id === "slide-right-flash" || e.target.id === "slide-right-flash-sustain" || e.target.id === "slide-right-note-lighted") {
            deactivateTapper("tapper-right");
        }
    });

    document.getElementById("change-tapper-keys-item").classList.add("hidden");
    

}


// initialQuery
getUserProfile().then((profile) => {
    // profile.queryInitial = true; // use this to recover from situation where no stations show up
    
    // get settings out of profile
    [
        ["toggle-background", "animatedBackground", "background-title"],
        ["toggle-sustained", "sustainedNotes", "sustained-title"],
        ["toggle-calibration", "autoCalibrating", "calibration-title"],
        ["toggle-haptics", "hapticsOnHit", "haptics-title"],
        ["toggle-animations", "animations", "animations-title"],
        ["toggle-effects", "effects", "effects-title"],
        ["toggle-double", "double", "double-title"]
    ].forEach((settingSet) => {
        // must explicitly look for undefined because value could be false
        if (profile[settingSet[1]] !== undefined) {
            if (profile[settingSet[1]]) {
                masterInfo[settingSet[1]] = true;
                document.getElementById(`${settingSet[0]}-ball`).classList.remove("toggle-ball-off");
                document.getElementById(settingSet[2]).style.opacity = "1";
            } else { // value is false
                masterInfo[settingSet[1]] = false;
                document.getElementById(`${settingSet[0]}-ball`).classList.add("toggle-ball-off");
                document.getElementById(settingSet[2]).style.opacity = "0.5";
                if (settingSet[0] === "toggle-calibration") {
                    masterInfo.autoAdjustment = 0;
                }
            }
        } else { // was an old style profile - add setting now
            profile[settingSet[1]] = masterInfo[settingSet[1]];
        }
    });
    // retrieve frequency values for sustained notes and doubles
    [
        ["select-sustained-frequency", "sustainedNotesFrequency"],
        ["select-double-frequency", "doubleFrequency"],
        ["algorithm-selector", "algorithm"],
        ["speed-selector", "songDelay"],
        ["animation-style-selector", "animationStyle"]
    ].forEach((settingSet) => {
        if (profile[settingSet[1]]) {
            masterInfo[settingSet[1]] = profile[settingSet[1]];
            const select = document.getElementById(settingSet[0]);
            select.childNodes.forEach((option) => {
                option.selected = false;
                if (option.value === masterInfo[settingSet[1]] || parseFloat(option.value) === masterInfo[settingSet[1]]) {
                    option.selected = true;
                }
            });
        } else {
            profile[settingSet[1]] = masterInfo[settingSet[1]];
        }
    });
    document.getElementById("toggle-algorithm").innerHTML = masterInfo.algorithm;
    document.getElementById("toggle-speed").innerHTML = {
        6500: "super slow",
        5500: "slow",
        4700: "medium",
        4000: "fast",
        3500: "crazy fast"
    }[masterInfo.songDelay];
    document.getElementById("toggle-animation-style").innerHTML = {
        "lightUp": "Light up",
        "flyAway": "Fly away",
        "both": "Both"
    }[masterInfo.animationStyle];

    
    masterInfo.targetBounds.top = masterInfo.travelLength - (masterInfo.travelLength * gameDataConst.mobile.targetBounds.top);
    masterInfo.targetBounds.bottom = masterInfo.travelLength + (masterInfo.travelLength * gameDataConst.mobile.targetBounds.bottom);

    // console.log(profile);
    if (!profile.player) {
        profile.player = Math.round(1000000 * Math.random());
    }
    if (profile.queryInitial) {
        fetch("https://beatburner.com/api/statusQuery.php", { 
            method: "POST",
            body: JSON.stringify({
                player: profile.player
            })
        }).then((res) => {
            res.json().then((r) => {
                // console.log(r);
                if (r.message === "success") {
                    // console.log(r);
                    masterInfo.sendStat = r.data.queryStats;
                    profile.queryStats = r.data.queryStats;
                    profile.queryInitial = r.data.queryInitial;
                    profile.stations = r.data.stations;

                    if (r.data.messageId > profile.lastMessage) {
                        showMessage(r.data.message);
                        profile.lastMessage = r.data.messageId;
                    }
                    setUserProfile(profile).then(() => {
                        statsManager.setup().then(() => {
                            getStreakUpToSpeed();
                        });
                        stationManager.updateStationInfo(profile.stations);
                    });
                } else {
                    setUserProfile(profile).then(() => {
                        statsManager.setup().then(() => {
                            getStreakUpToSpeed();
                        });
                    });
                }
            }).catch((e) => {
                statsManager.setup().then(() => {
                    getStreakUpToSpeed();
                });
                console.log(e.message);
            });
        }).catch((e) => {
            statsManager.setup().then(() => {
                getStreakUpToSpeed();
            });
            console.log(e.message);
        });
    } else {
        stationManager.updateStationInfo(profile.stations);
        setUserProfile(profile).then(() => {
            statsManager.setup().then(() => {
                getStreakUpToSpeed();
            });
        });
    }
});

document.getElementById("dismiss-message-button").addEventListener("click", () => {
    dismissMessage();
});
function dismissMessage() {
    document.getElementById("message-modal").classList.add("hidden");
    calibrator.makeMenusVisible();
}
function showMessage(message) {
    calibrator.makeMenusInvisible();
    document.getElementById("message-content").innerHTML = message;
    document.getElementById("message-modal").classList.remove("hidden");
}

// stats - commented out to assure google we collect no user data
// const session_id = Math.floor((Math.random() * 1000000000000000)).toString();

// setTimeout(sendStatHome, 30000);
// setInterval(() => {
//     sendStatHome();
// }, 180000); // update every 3 minutes


function sendStatHome() {
    if (masterInfo.sendStat) {
        fetch("https://beatburner.com/api/session.php", {
            method: "POST",
            body: JSON.stringify({
                session: session_id,
                mode: masterInfo.songMode
            })
        });
    }
}

// animateStats("percent-bar-inner-container", ["feedback-percent", "feedback-streak", "feedback-streak-overall"]);
function animateStats(percentBar, stats) {
    const timeStep = 800;
    const startTime = performance.now();
    stats.forEach((id) => {
        document.getElementById(id).style.opacity = "0";
    });
    doAnimationStep(percentBar, stats, startTime, timeStep);
}

function doAnimationStep(percentBar, stats, startTime, timeStep) {
    const now = performance.now();
    const overallTime = now - startTime;
    if (overallTime < timeStep) {
        const fractionToUse = 1.0 * overallTime / timeStep;
        document.getElementById(percentBar).style.width = `${Math.ceil(fractionToUse * 100)}%`;
    } else {
        const stepsDone = Math.floor(overallTime / timeStep);
        const statToUse = stats[stepsDone - 1];
        if (statToUse) {
            let fractionToUse = 1.0 * (overallTime - (timeStep * stepsDone)) / timeStep;
            if (fractionToUse > 0.9) {
                fractionToUse = 1;
            }
            document.getElementById(statToUse).style.opacity = `${fractionToUse}`;
        }
    }
    if (overallTime < timeStep * (1 + stats.length)) {
        requestAnimationFrame(() => {
            doAnimationStep(percentBar, stats, startTime, timeStep);
        });
    }
}

function reportNewScore(score) {
    // START HERE !!!!!!!!!!!
    // - get old profile, check score, update if higher or not there, then set profile again
    return new Promise((resolve) => {
        
        getUserProfile().then((profile) => {
            
            const levelCode = `l${animator.notesPerSecond}s${animator.slides.length}`;
            const songCode = masterInfo.songCode;
            const oldScore = profile.progress[levelCode][songCode];
            
            if (!oldScore) {
                profile.progress[levelCode][songCode] = score;
            } else {
                if (score > oldScore) {
                    profile.progress[levelCode][songCode] = score;
                }
            }
            
            setUserProfile(profile).then(() => {
                
                controlsManager.activateSongSelect(false);
                resolve();
            });
        });
    });
}

function initialAnimate() {
    setTimeout(() => {
        whoosh.play();
    }, 400);
    setTimeout(() => {
        electric.play();
    }, 1500);
    setTimeout(() => {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const tapperId = [
                    "tapper-left",
                    "tapper-a",
                    "tapper-b",
                    "tapper-right"
                ][Math.floor(4 * Math.random())];
                lightBuzz(tapperId);
            }, (1500 * Math.random()));
        }
    }, 1800);
    let startMenu = "first-time-menu";
    getUserProfile().then((profile) => {
        if (profile.oldUser) {
            startMenu = "source-menu";
        }
    });
    setTimeout(() => {
        menuManager.showMenu(startMenu);
        if (masterInfo.animationStyle === "flyAway" || masterInfo.animationStyle === "both") {
            ["bulb-left", "bulb-a", "bulb-b", "bulb-right"].forEach((id) => {
                document.getElementById(id).classList.add("hidden");
            });
            // ["inset-left", "inset-a", "inset-b", "inset-right"].forEach((id) => {
            //     document.getElementById(id).classList.remove("hidden");
            // });
        }
    }, 3700);
    setTimeout(() => {
        guitar.play();
    }, 3500);
}

function lightBuzz(tapperId) {
    const lighted = document.createElement("div");
    lighted.classList.add("note-lighted");
    const middleLighted = document.createElement("div");
    middleLighted.classList.add("note-middle-lighted");
    const light = document.createElement("div");
    light.appendChild(lighted);
    light.appendChild(middleLighted);
    document.getElementById(`dummy-${tapperId}`).appendChild(light);
    light.classList.add("flash");
    setTimeout(() => {
        light.remove();
    }, 1000);
}

const code = [
    "slide-left",
    "slide-right",
    "slide-left",
    "slide-right",
    "slide-a",
    "slide-b",
    "slide-left",
    "slide-b",
    "slide-a",
    "slide-right"
];
let codeIdx = 0;
function triggerCode(slideId) {
    if (slideId === code[codeIdx]) {
        codeIdx += 1;
        if (!code[codeIdx]) {
            const progress = {};
            [
                "l1s2",
                "l1s3",
                "l1s4",
                "l2s2",
                "l2s3",
                "l2s4",
                "l3s2",
                "l3s3",
                "l3s4",
                "l4s2",
                "l4s3",
                "l4s4",
                "l5s2",
                "l5s3",
                "l5s4"
            ].forEach((ele) => {
                const songList = {};
                songStages.forEach((stage) => {
                    stage.forEach((song) => {
                        songList[song] = 90;
                    });
                });
                progress[ele] = songList;
            });
            getUserProfile().then((profile) => {
                profile.progress = progress;
                setUserProfile(profile).then(() => {
                    controlsManager.activateSongSelect(false);
                });
            });
        }
    } else {
        codeIdx = 0;
    }
}


// const theNotes = [];
// document.addEventListener("keydown", (e) => {
//     const slide = {
//         KeyJ: "slide-right",
//         KeyS: "slide-left",
//         KeyC: "slide-a"
//     }[e.code];
//     theNotes.push([player.song2.currentTime, slide]);
//     if (e.code === "KeyP") {
//         console.log(theNotes);
//     }
// });