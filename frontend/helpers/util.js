// import { Preferences } from "@capacitor/preferences";

export function averageOf(arr) {
    let sum = 0;
    arr.forEach((val) => {
        sum += val;
    });
    return sum / arr.length;
}

export function setButtonClick(buttonId, callback) {
    // if (detectMobile()) {
    //     document.getElementById(buttonId).addEventListener("touchstart", callback);
    // } else {
        document.getElementById(buttonId).addEventListener("click", callback);
    // }
}

export function setElementText(elementId, text) {
    document.getElementById(elementId).innerText = text;
}

export function addElementClass(elementId, newClass) {
    document.getElementById(elementId).classList.add(newClass);
}

export function removeElementClass(elementId, newClass) {
    document.getElementById(elementId).classList.remove(newClass);
}

export function detectMobile() {
    if (navigator.userAgentData) {
        return navigator.userAgentData.mobile;
    } else {
        // got this from https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
        const toMatch = [
            /Android/i,
            /webOS/i,
            /iPhone/i,
            /iPad/i,
            /iPod/i,
            /BlackBerry/i,
            /Windows Phone/i
        ];
        
        return toMatch.some((toMatchItem) => {
            return navigator.userAgent.match(toMatchItem);
        }); 
    }
}

export function showSongControlButton(buttonId) {
    // ["button-play", "button-pause"].forEach((id) => {
    //     addElementClass(id, "hidden");
    // });
    // removeElementClass(buttonId, "hidden");

    // new
    if (buttonId === "button-play") {
        addElementClass("button-pause", "hidden");
        ["button-play", "button-restart", "show-settings", "show-menu", "show-stats"].forEach((buttonId) => {
            removeElementClass(buttonId, "hidden");
        });
    }
    if (buttonId === "button-pause") {
        removeElementClass("button-pause", "hidden");
        ["button-play", "button-restart", "show-settings", "show-menu", "show-stats"].forEach((buttonId) => {
            addElementClass(buttonId, "hidden");
        });
    }
}

export function showModal(modal) {
    const modalId = `${modal}-modal`;
    document.getElementById(modalId).classList.remove("hidden");
    document.getElementById("modal-background").classList.remove("hidden");
}
export function hideModal(modal) {
    const modalId = `${modal}-modal`;
    document.getElementById(modalId).classList.add("hidden");
    document.getElementById("modal-background").classList.add("hidden");
}

export function setLoading(message = "loading...") {
    document.getElementById("loading-text").innerHTML = message;
    document.getElementById("loading").classList.remove("hidden");
    setLoadingPercent(0);
}

export function stopLoading() {
    document.getElementById("loading").classList.add("hidden");
}

export function setLoadingPercent(percent) {
    document.getElementById("loading-bar-inner").style.width = `${percent}%`;
}

export function setLoadingMessage(message) {
    document.getElementById("loading-text").innerHTML = message;
}

export function killAllNotes(masterInfo, noteWriter) {
    masterInfo.notes.forEach((note) => {
        if (note.tail) {
            note.tail.note.remove();
        }
        note.killed = true;
        note.note.remove();
        masterInfo.notes.delete(note);
    });
    noteWriter.resetData();
    ["smudge-left", "smudge-a", "smudge-b", "smudge-right"].forEach((id) => {
        document.getElementById(id).classList.remove("smudge-active");
    })
}

export function makeAudioByRepeat(src, numTries = 10) {
    return new Promise((resolve) => {
        let resolved = false;
        for (let i = 0; i < numTries; i++) {
            setTimeout(() => {
                const thisAudio = new Audio(src);
                thisAudio.oncanplaythrough = () => {
                    if (!resolved) {
                        resolved = true;
                        resolve(thisAudio);
                    }
                };
            }, 1000 * Math.random());
        }
        setTimeout(() => {
            if (!resolved) {
                resolve(false);
            }
        }, 5000);
    });
}

export function promptCalibration() {
    const calibratePopup = document.getElementById("calibrate-popup");
    calibratePopup.style.top = "5%";
    calibratePopup.style.left = "15%";
    calibratePopup.style.width = "60%";
    calibratePopup.style.zIndex = 10;
    calibratePopup.style.opacity = 1;
    calibratePopup.classList.remove("hidden");
    document.getElementById("calibrate-curtain").classList.remove("hidden");
}

export function setUserProfile(profile) {
    return new Promise((resolve) => {
        // Preferences.set({
        //     key: "userProfile",
        //     value: JSON.stringify(profile)
        // }).then(() => {
            resolve();
        // });
    });
}

export function getUserProfile() {
    return new Promise((resolve) => {
        // Preferences.get({ key: "userProfile" }).then((res) => {
        //     const profile = res.value;
        //     // if (false) {
        //     if (profile) {
        //         resolve(JSON.parse(profile));
        //     } else {
                resolve(defaultUserProfile);

               
            // }
    //     });
    });
}

export function resetUserProfile() {
    setUserProfile(defaultUserProfile);
}

const defaultUserProfile = {
    level: 1,
    slides: 3,
    // animatedBackground: true,
    // sustainedNotes: true,
    // autoCalibrating: true,
    // animations: true,
    // effects: true,
    algorithm: "A",
    lastMessage: 0,
    queryStats: true,
    queryInitial: true,
    progress: {
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
    },
    stations: {
        "kingFM": {
            name: "classical king FM",
            stream: "https://classicalking.streamguys1.com/king-fm-aac-128k"
        },
        "mvn925": {
            name: "movin' 92.5",
            stream: "https://23093.live.streamtheworld.com/KQMVFM.mp3?dist=hubbard&source=hubbard-web&ttag=web&gdpr=0"
        },
        "unsung80s": {
            name: "Unsung 80s",
            stream: "https://unsung80s.out.airtime.pro/unsung80s_a"
        },
        "beat90s": {
            name: "The beat",
            stream: "https://ice10.securenetsystems.net/AM1380?playSessionID=1C5D8230-00FD-2EFE-2AEE4302B829B5F3"
        },
        "100hitz": {
            name: "100 hitz",
            stream: "https://pureplay.cdnstream1.com/6045_128.mp3"
        },
        "mlelive": {
            name: "MLE live",
            stream: "https://listen.radioking.com/radio/114610/stream/462118"
        },
        "chetFM": {
            name: "93.5 Chet FM",
            stream: "https://ice23.securenetsystems.net/KDJF?playSessionID=1CE4C155-F05D-ADFF-15CD1D9351B467C0"
        },
        "scooter": {
            name: "Scooterist radio",
            stream: "https://listen.radioking.com/radio/214267/stream/257398?1709875088135"
        },
        "1234gr": {
            name: "1234 GR",
            stream: "https://radio1234gr.radioca.st/live"
        },
        "hawk": {
            name: "Hawk classic rock",
            stream: "https://ice6.securenetsystems.net/KRSE?playSessionID=1D6EEF83-C785-2F70-5A76B4CD63C85056"
        }
    }
};