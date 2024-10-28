import { 
    averageOf,
    getUserProfile,
    killAllNotes
} from "./util.js";

export class Animator {
    constructor(
        masterInfo,
        noteWriter,
        backgroundAnimator,
        addNote,
        makeTail,
        triggerMissedNote,
        numArrays = 4
        // numArrays = 1
    ) {
        this.masterInfo = masterInfo;
        this.recents = masterInfo.mostRecentNotesOrTails;
        this.notes = masterInfo.notes;
        this.allSlides = masterInfo.allSlides;
        this.slides = [this.allSlides[0], this.allSlides[1], this.allSlides[3]];
        this.notesPerSecond = 2; // starting level note per second
        getUserProfile().then((profile) => {
            this.notesPerSecond = profile.level;
            this.setNumSlides(profile.slides);
            this.labelFeedbackModal();
        });
        this.targetTails = masterInfo.targetTails;
        this.targets = masterInfo.targets;
        this.targetBounds = masterInfo.targetBounds;
        this.addNote = addNote;
        this.makeTail = makeTail;
        this.triggerMissedNote = triggerMissedNote;
        this.noteWriter = noteWriter;
        this.backgroundAnimator = backgroundAnimator;
        this.time = 0;
        this.animating = false;
        this.arrays = [];
        for (let i = 0; i < numArrays; i++) {
            this.arrays.push([]);
        }

        this.times = [];
        this.timeStep = 5; // ms
        this.lastTime = 0;
        

        this.noteResults = [];
        this.notesHit = 0;
        this.notesMissed = 0;
        this.arrayNow = [1, 1, 1, 1];

        this.currentSlider = "a-slider";
        this.oldSliderPos = 0;
        this.movingBothSliders = false;
    }

    setNotesPerSecond(val) {
        this.notesPerSecond = val;
        this.labelFeedbackModal();
    }

    setNumSlides(val) {
        if (val === 2) {
            this.slides = [this.allSlides[0], this.allSlides[3]];
        } else if (val === 3) {
            this.slides = [this.allSlides[0], this.allSlides[1], this.allSlides[3]];
        } else {
            this.slides = [this.allSlides[0], this.allSlides[1], this.allSlides[2], this.allSlides[3]];
        }
        this.labelFeedbackModal();
    }

    labelFeedbackModal() {
        const level = {
            1: "Super easy",
            2: "Easy",
            3: "Medium",
            4: "Hard",
            5: "Crazy hard"
        }[this.notesPerSecond];
        document.getElementById("song-difficulty").innerText = `${level} / ${this.slides.length} slides`;
    }

    recordNoteHit() {
        this.notesHit += 1;
        this.noteResults.push(true);
        while (this.noteResults.length > 75) {
            if (this.noteResults.shift()) {
                this.notesHit -= 1;
            } else {
                this.notesMissed -= 1;
            }
        }
        updateMeter(this.notesHit, this.notesMissed, this.masterInfo);
    }

    recordNoteMissed() {
        this.notesMissed += 2;
        this.noteResults.push(false);
        this.noteResults.push(false);
        while (this.noteResults.length > 75) {
            if (this.noteResults.shift()) {
                this.notesHit -= 1;
            } else {
                this.notesMissed -= 1;
            }
        }
        updateMeter(this.notesHit, this.notesMissed, this.masterInfo);
    }

    runAnimation(params) {
        this.time = performance.now();
        this.animating = true;
        this.animate(params);

        // exp
        this.slideStartTime = performance.now();
    }

    stopAnimation(keepNotes = false) {
        if (!keepNotes) {
            killAllNotes(this.masterInfo, this.noteWriter);
        }
        this.animating = false;
    }

    animate(params) {
        const now = performance.now();
        if (this.masterInfo.songMode === "tutorial" || this.masterInfo.songMode === "calibrate") {
            const dt = now - this.time;
            this.time = now;
            moveNotes(
                this.masterInfo.notes,
                this.masterInfo.noteSpeed,
                this.slides,
                this.targetTails,
                this.targets,
                this.masterInfo.targetBounds,
                this.triggerMissedNote,
                this.recents,
                this.masterInfo.slideLength,
                dt,
                this,
                this.masterInfo.songMode,
                this.masterInfo.travelLength
            );
    
            if (this.animating) {
                requestAnimationFrame(() => this.animate(params));
            }
            return;
        }
        const {
            player,
            algorithm,
        } = params;

        const timesToUse = [];

        if (now - this.lastTime > 35 || !this.masterInfo.useShortSteps) {
            // console.log("SLOW" + Math.random());
            timesToUse.push(now);
            this.lastTime = now;
        } else {
            let nextTimeToUse = this.lastTime + this.timeStep;
            while (nextTimeToUse < now) {
                timesToUse.push(nextTimeToUse);
                nextTimeToUse += this.timeStep;
                this.lastTime = nextTimeToUse;
            }
        }
        
        // console.log(timesToUse.map(ele => ele));
        timesToUse.forEach((timeToUse) => {
            const timeOffset = now - timeToUse;
            const delayToUse = this.masterInfo.songDelay + timeOffset;
            player.calibrateLag(delayToUse);
            const dataArray = player.getDetailedFreqArray();
            const timeArray = player.getDetailedTimeArray();
            if (this.masterInfo.songMode === "demo") {
                this.noteWriter.writeNotes(dataArray, timeArray, this.slides, this.notesPerSecond, player.song2.currentTime, timeOffset);
            } else {
                this.noteWriter.writeNotes(dataArray, timeArray, this.slides, this.notesPerSecond, 0, timeOffset);
            }
        });
        
        const dt = now - this.time;
        this.time = now;
        // console.log("dt: " + dt);
        moveNotes(
            this.masterInfo.notes,
            this.masterInfo.noteSpeed,
            this.slides,
            this.targetTails,
            this.targets,
            this.masterInfo.targetBounds,
            this.triggerMissedNote,
            this.recents,
            this.masterInfo.slideLength,
            dt,
            this,
            this.masterInfo.songMode,
            this.masterInfo.travelLength,
            player
        );

        if (this.animating) {
            requestAnimationFrame(() => this.animate(params));
        }
    }
}

const words = [
    "NICE!",
    "YEAH!",
    "OH<br>YEAH!",
    "YOU<br>ROCK!",
    "ROCK<br>STAR!",
    "BEAT<br>BURNER",
    "SUPER<br>hexagon",
    "SHRED!",
    "WOO!",
    "NICE<br>ONE!",
    "YOU<br>GO!",
    "BURNIN'<br>UP!",
    "AWESOME!",
    "SKILZ!"
];
function getWord() {
    return words[Math.floor(words.length * Math.random())];
}

const skilzChannel = document.getElementById("skilz-channel");
const skilzMeter = document.getElementById("skilz-meter");
const perfect = document.getElementById("perfect");
const perfectContainer = document.getElementById("perfect-container");
const skilzBall = document.getElementById("skilz-ball");
function updateMeter(notesHit, notesMissed, masterInfo) {
    let fraction = 1.0 * notesHit / (notesHit + notesMissed);

    let percent = Math.floor(100 * fraction);
    if (percent < 2) {
        percent = 2;
    }
    if (percent > 98 && notesHit > 10) {
        percent = 100;
        skilzChannel.classList.add("skilz-channel-lit");
        skilzMeter.classList.add("skilz-meter-lit");
        if (masterInfo.animations) {
            perfect.classList.remove("hidden");
            if (masterInfo.streak < 226) {
                perfectContainer.classList.add("perfect-slide-left");
            }
            // setTimeout(() => {
            //     perfect.classList.add("hidden");
            //     perfectContainer.classList.remove("perfect-slide-left");
            // }, 12000);
            if (masterInfo.streak === 150) {
                perfect.classList.add("hidden");
                perfectContainer.classList.remove("perfect-slide-left");
                setTimeout(() => {
                    perfect.innerHTML = getWord();
                    perfect.classList.remove("hidden");
                    perfectContainer.classList.add("perfect-slide-left");
                }, 50);
                
            }
            if (masterInfo.streak === 225) {
                perfect.classList.add("hidden");
                perfectContainer.classList.remove("perfect-slide-left");
                setTimeout(() => {
                    perfect.innerHTML = "ON<br>FIRE";
                    perfect.classList.remove("perfect");
                    perfect.classList.add("perfect-stay");
                    perfect.classList.remove("hidden");
                    perfectContainer.classList.add("perfect-slide-only");
                }, 0);
                
            }
        }
    } else {
        skilzChannel.classList.remove("skilz-channel-lit");
        skilzMeter.classList.remove("skilz-meter-lit");
        perfect.innerHTML = "perfect";
        perfect.classList.add("hidden");
        perfect.classList.add("perfect");
        perfectContainer.classList.remove("perfect-slide-left");
        perfectContainer.classList.remove("perfect-slide-only");
    }
    skilzBall.style.top = `${100 - percent}%`;


    // const cutoff = fraction * 6;

    // for (let i = 1; i < 7; i++) { // forgive me....
    //     const lightA = document.getElementById(`light-${2 * i}`);
    //     const lightB = document.getElementById(`light-${(2 * i) - 1}`);
    //     if (i > cutoff) {
    //         lightA.classList.remove(litClasses[2 * i]);
    //         lightB.classList.remove(litClasses[(2 * i) - 1]);
    //     } else {
    //         lightA.classList.add(litClasses[2 * i]);
    //         lightB.classList.add(litClasses[(2 * i) - 1]);

    //     }
    // }


    // if (percent > 98) {
    //     percent = 100;
    //     document.getElementById("skilz-label").classList.add("skilz-label-lit");
    // } else {
    //     document.getElementById("skilz-label").classList.remove("skilz-label-lit");
    // }
    // if (percent < 2) {
    //     percent = 0;
    //     document.getElementById("skilz-light-top").classList.remove("skilz-light-top-lit");
    // } else {
    //     document.getElementById("skilz-light-top").classList.add("skilz-light-top-lit");
    // }
    // document.getElementById("skilz-beam").style.height = `${percent}%`;

    
}

function moveNotes(
    notes,
    noteSpeed,
    theSlides,
    theTargetTails,
    theTargets,
    theTargetBounds,
    triggerMissedNote,
    theRecents,
    theSlideLength,
    dt,
    obj,
    theSongMode,
    theTravelLength,
    // player
) {
    
    // document.noteVal = dt;

    // const now = performance.now();
    // const elapsedTime = now - obj.slideStartTime;
    // console.log("elapsed: " + elapsedTime);
    // const totalTravelTime = 1.0 * obj.masterInfo.songDelay / 2.0;
    const totalTravelTime = 1.0 * obj.masterInfo.songDelay - 2000;

    // temp
    const speed = 1.0 * theTravelLength / totalTravelTime;
    const movement = speed * dt;

    // console.log("travelTime: " + totalTravelTime);
    // let travelFraction = 0;
    // if (elapsedTime > 1) {
    //     travelFraction = 1.0 * elapsedTime / totalTravelTime; // will quickly go above 1
    // }
    // console.log("fraction: " + travelFraction);
    // const desiredPos = 1.0 * travelFraction * obj.masterInfo.travelLength;
    // console.log("desiredPos: " + desiredPos);
    // const movement = desiredPos - obj.masterInfo.sliderPos; // ************** UNCOMMENT THIS WHEN YOU REMOVE TEMP!!!!!!!
    // console.log("movement: " + movement);
    // console.log("sliderPos: " + obj.masterInfo.sliderPos);


    
    // shorten targetTails
    theSlides.forEach((slideId) => {
        const tail = theTargetTails[slideId];
        if (tail) {
            const newPosition = tail.position + movement;
            // tail.note.style.top = `${newPosition}px`;
            tail.position = newPosition;
            
            const newHeight = tail.height - movement;
            if (newHeight < 0) {
                tail.note.remove();
                theTargetTails[slideId] = null;

                const sustain = document.getElementById(`${slideId}-flash-sustain`);
                if (sustain) {
                    sustain.classList.add("light-off");
                    setTimeout(() => {
                        sustain.remove();
                    }, 500);
                        
                    
                }
            }
            tail.note.style.height = `${newHeight}px`;
            tail.height = newHeight;
        }
    });
    
    // switch sliders
    if (obj.masterInfo.sliderPos > 10000) {
    // if (obj.masterInfo.sliderPos > 100000) {
        
        // console.log("SWITCH");
        // console.log(obj.masterInfo.targets);
        
        let oldPref = "a-";
        let newPref = "b-";
        if (obj.currentSlider === "b-slider") {
            oldPref = "b-";
            newPref = "a-";
        }

        ["slide-left", "slide-a", "slide-b", "slide-right"].forEach((slideId) => {
            document.getElementById(slideId).id = `${oldPref}${slideId}`;
            document.getElementById(`${newPref}${slideId}`).id = slideId;
        });

        const oldSliderId = obj.currentSlider === "a-slider" ? "a-slider" : "b-slider";
        obj.currentSlider = obj.currentSlider === "a-slider" ? "b-slider" : "a-slider";
        obj.movingBothSliders = true;
        obj.oldSliderPos = obj.masterInfo.sliderPos;
        setTimeout(() => {
            obj.movingBothSliders = false;
            obj.oldSliderPos = 0;
            document.getElementById(oldSliderId).style.top = "0px";
        }, 1.5 * totalTravelTime);
        
        obj.masterInfo.sliderPos = 0;

        // exp
        obj.slideStartTime = performance.now();
    }

    // move slider
    obj.masterInfo.sliderPos += movement;
    if (obj.movingBothSliders) {
        const oldSliderId = obj.currentSlider === "a-slider" ? "b-slider" : "a-slider";
        obj.oldSliderPos += movement;
        document.getElementById(oldSliderId).style.top = `${obj.oldSliderPos}px`;
    }
    document.getElementById(obj.currentSlider).style.top = `${obj.masterInfo.sliderPos}px`;

    // move oldSlider if we have one
    if (obj.oldSlider) {
        obj.oldSliderPosition += movement;
        obj.oldSlider.style.top = `${obj.oldSliderPosition}px`;
    }
    

    // move notes
    for (const note of notes) {
        const newTop = note.position + movement;
        // note.note.style.top = `${newTop}px`;
        note.position = newTop;

        // if (newTop > masterInfo.travelLength) {
        //     notes.delete(note);

        // }

        // move tail
        if (note.tail) {
            const newTailTop = note.tail.position + movement;
            // note.tail.note.style.top = `${newTailTop}px`;
            note.tail.position = newTailTop;
        }

        if (!note.target && newTop > theTargetBounds.top && newTop < theTargetBounds.bottom) {
            theTargets[note.slideId].add(note);
            note.target = true;

            const smudgeId = {
                "slide-left": "smudge-left",
                "slide-a": "smudge-a",
                "slide-b": "smudge-b",
                "slide-right": "smudge-right"
            }[note.slideId];
            document.getElementById(smudgeId).classList.add("smudge-active");
            
        }
        if (newTop > theTargetBounds.bottom && note.target === true) {
            
            // note.note.style.backgroundColor = "green";

            note.target = false;
            theTargets[note.slideId].delete(note);
            triggerMissedNote();

            const smudgeId = {
                "slide-left": "smudge-left",
                "slide-a": "smudge-a",
                "slide-b": "smudge-b",
                "slide-right": "smudge-right"
            }[note.slideId];
            document.getElementById(smudgeId).classList.remove("smudge-active");
            
            // delete tail once target is missed
            if (note.tail) {
                note.tail.note.remove();
                theRecents[note.tail.slideId] = null;
            }
        }
        if (newTop > theSlideLength) {
            note.killed = true;  
            note.note.remove();
            notes.delete(note);
        }

        // temp for video
        // if (newTop > theTravelLength) {
        //     document.activateTapper(`tapper-${note.slideId.split("-")[1]}`, note.slideId);
        //     // if (!note.printed) {
        //     //     note.printed = true;
        //     //     // console.log(note.timing, player.livePlayer.currentTime);
        //     //     // console.log(`travel time: ${performance.now() - note.launched}`);
        //     // }
        // }
        // end temp for video

        // if (theSongMode === "calibrate") {
        //     if (newTop > theTravelLength) {
        //         note.killed = true;  
        //         note.note.remove();
        //         notes.delete(note);
        //         lightup("slide-right", "tapper-right");
        //     }
        // }
    }
}

function lightup(slideId, tapperId) {
    const lighted = document.createElement("div");
        lighted.classList.add("note-lighted");
        const middleLighted = document.createElement("div");
        middleLighted.classList.add("note-middle-lighted");
        const light = document.createElement("div");
        light.id = `${slideId}-flash`;
        light.appendChild(lighted);
        light.appendChild(middleLighted);
        document.getElementById(`dummy-${tapperId}`).appendChild(light);
        light.classList.add("flash");
        setTimeout(() => {
            light.remove();
    }, 1000);
}