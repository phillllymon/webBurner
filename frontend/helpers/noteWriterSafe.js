export class NoteWriter {
    constructor(masterInfo) {
        this.masterInfo = masterInfo;

        this.lastLeft = performance.now();
        this.lastMid = performance.now();
        this.lastRight = performance.now();
        this.leftSlides = ["slide-left", "slide-a"];
        this.rightSlides = ["slide-b", "slide-right"];
        this.rightId = "slide-right";
        this.leftId = "slide-left";
        this.lastAll = {
            "slide-left": performance.now(),
            "slide-a": performance.now(),
            "slide-b": performance.now(),
            "slide-right": performance.now()
        };
        this.mostRecentNotes = masterInfo.mostRecentNotesOrTails;
        this.recentToneVals = [0, 0, 0];

        this.sideWithNotes = null // remember which side can have new notes when sustained note in middle of 3 slides
    
        this.last = performance.now();

        // EXPERIMENTAL
        this.order = "0123";
        this.gap = 200;
    }

    writeTails(noteVals, slideIds, makeTail) {
        
        if (noteVals) {
            const valsBySlideId = {
                "slide-left": noteVals[0],
                "slide-a": noteVals[1],
                "slide-b": noteVals[2],
                "slide-right": noteVals[3]
            };

            const slidesWithMakeNote = noteVals[noteVals.length - 1];
    
            slideIds.forEach((slideId) => {
                const thisNoteVal = valsBySlideId[slideId];
                if (!thisNoteVal) {
                    return;
                }

                const triggerSlideIdx = thisNoteVal.triggerSlideIdx;

                const triggerSlide = {
                    0: "slide-left",
                    1: "slide-a",
                    2: "slide-b",
                    3: "slide-right"
                }[triggerSlideIdx];
                
                const lastTriggerNote = this.mostRecentNotes[triggerSlide];
                if (!lastTriggerNote) {
                    return;
                }
                
                const makeNotePass = !slidesWithMakeNote[triggerSlide];

                const lastNote = this.mostRecentNotes[slideId];
                if (lastNote) {

                    let thresholdPass = false;
                    let adjust = {
                        "slide-left": 1.8,
                        "slide-a": 1.6,
                        "slide-b": 1.5,
                        "slide-right": 1.2
                    }[slideId];

                    if (lastNote.isTail) {
                        adjust *= (1 + (lastNote.totalHeight / this.masterInfo.travelLength));
                    }

                    // if (lastNote.isTail && thisNoteVal.val < adjust * lastTriggerNote.val) {
                    // if (lastNote.isTail && lastNote.totalHeight < 0.1 * this.masterInfo.travelLength && thisNoteVal.val < adjust * lastTriggerNote.val) {
                        thresholdPass = thisNoteVal.val > adjust * lastTriggerNote.val;
                    // }

                    if (makeNotePass && thresholdPass) {
                        makeTail(slideId, lastNote);
                        const now = performance.now();
                        if (slideIds.length === 4) {
                            if (this.leftSlides.includes(slideId)) {
                                this.lastLeft = now;
                                this.lastAll[slideId] = now;
                            } else {
                                this.lastRight = now;
                                this.lastAll[slideId] = now;
                            }
                        } else if (slideIds.length === 3) {
                            if (slideId === this.rightId) {
                                this.lastRight = now;
                                this.lastAll[slideId] = now;                               
                            } else if (slideId === this.leftId) {                                
                                this.lastLeft = now;
                                this.lastAll[slideId] = now;                                
                            } else {                                
                                this.lastMid = now;
                                this.lastAll[slideId] = now;                                
                            }
                        } else {
                            this.lastAll[slideId] = now;
                        }
                    } else {
                        // check for tail too short - delete tail entirely
                        if (lastNote.isTail && lastNote.totalHeight < 0.05 * this.masterInfo.travelLength) {
                            lastNote.cloud.remove();
                            lastNote.note.remove();
                            lastNote.parentNote.tail = null;
                        }
                        this.mostRecentNotes[slideId] = null;
                    }
                }
            });
        }
    }

    // data is array of arrays same length as slideIds
    // addNote takes a slideId
    // mobile only allows 2 notes at once
    writeNotes(slideIds, notesPerSecond, addNote, mobile, masterData) {

        const vals = [];

        let amt = 0;
        const dataArrays = masterData.arrays;
        for (let i = 0; i < dataArrays.length; i++) {
            const arr = dataArrays[i];
            const midIdx = Math.floor(arr.length / 2);
            const thisVal = arr[midIdx];
            vals.push(thisVal);
            amt += thisVal;
        }

        amt = Math.max(...vals);

        const maxToneVal = Math.max(...vals);
        
        let thisToneVal = (vals[0] / maxToneVal) 
            + (2 * (vals[1] / maxToneVal))
            + (3 * (vals[2] / maxToneVal))
            + (4 * (vals[3] / maxToneVal));

        // FREQUENCY ORDER EXPERIMENT
        const wholeArray = masterData.dataFreqArray;

        // console.log(wholeArray);

        const valPairings = [];
        wholeArray.forEach((val, i) => {
            valPairings.push([i, val]);
        });

        const newOrder = valPairings.sort((a, b) => {
            return a[1] > b[1] ? -1 : 1;
        }).map((pair) => {
            return pair[0];
        }).join("");

        const newRanks = {};
        newOrder.split("").forEach((char, i) => {
            newRanks[char] = i;
        });

        let diffScore = 0;
        
        this.order.split("").forEach((char, i) => {
            const newRank = newRanks[char];
            let diff = newRank - i;
            if (diff < 0) {
                diff *= -1;
            }
            diffScore += diff;
        });

        const diffThreshold = {
            5: 122,
            4: 125,
            3: 128,
            2: 131,
            1: 135
        }[notesPerSecond];
        this.order = newOrder;

        const thisAmt = Math.max(...wholeArray);
        if (diffScore > diffThreshold && amt > 140) {

            const noteWriteParams = {
                slideToUse: this.getSlideToUse(thisToneVal, masterData.numSlides),
                slideIds,
                noteVal: thisToneVal, // just make it hard to create tail from this note
                toneVal: thisToneVal,
                addNote,
                marked: false,
                mobile,
                notesPerSecond
            };
            this.attemptNoteWrite(noteWriteParams);
        }

        
        // END FREQUENCY ORDER EXPERIMENT
        
        
        

        
        // NEW START -------------
        const arrays = masterData.arrays;
        const times = masterData.times;
        const startTime = times[0];
        const endTime = times[times.length - 1];
        const timeGiven = endTime - startTime;
        
        if (timeGiven < 3500) {
            return; // see noteVals below
        }

        let midIdx = 0;
        while (endTime - times[midIdx] > 2000) {
            midIdx += 1;
        }

        const milsPerNode = (1.0 * timeGiven) / times.length;
        const twoSecondLeg = 2000.0 / milsPerNode;

        // const leg = Math.floor(twoSecondLeg / notesPerSecond);
        const leg = Math.floor(twoSecondLeg / 4);

        // returned from this function to be used for writeTails
        const tailLeg = Math.floor(1.0 * twoSecondLeg / 5);

        const noteVals = [];
        const slidesWithMakeNote = {};

        

        for (let i = 0; i < arrays.length; i++) { // OLD
        // for (let i = 0; i < 1; i++) {   // JANKY TEMP ***************** just for trying all arrays together
            const arr = arrays[i];

            const noteVal = arr[midIdx];

            // const midVal = (noteVal - arr[midIdx - 1]) - (arr[midIdx - 1] - arr[midIdx - 2]);
            const midVal = noteVal - arr[midIdx - 1];
            // const midVal = noteVal;

            const legToUse = Math.max(leg, tailLeg);
            
            const beforeIdx = midIdx - legToUse;
            const afterIdx = midIdx + legToUse;

            let overallBeforeMax = 0;
            let overallBeforeMin = 255;

            let overallAfterMax = 0;
            let overallAfterMin = 255;

            // each array individually below and multiple biggests
            const combineArr = arr.slice(beforeIdx, afterIdx);
            let current = combineArr[1];
            let dir = 1; // 1 for up -1 for down
            let lowTimeIdx = times[0];
            let low = combineArr[0];

            // for tails only
            const tailRatioTime = 300;

            // each item is [height, idx] of an increase note
            const biggests = [];
            const level = {
                1: 1,
                2: 4,
                3: 8,
                4: 12,
                5: 16
            }[notesPerSecond];
            for (let k = 0; k < level; k++) {
                biggests.push([0, 0]);
            }

            for (let j = 1; j < combineArr.length; j++) {

                current = combineArr[j];

                // for tails
                const smallMidIdx = Math.floor(combineArr.length / 2);
                if (j > smallMidIdx && times[j] < times[midIdx] + tailRatioTime) {
                    if (current < overallAfterMin) {
                        overallAfterMin = current;
                    }
                    if (current > overallAfterMax) {
                        overallAfterMax = current;
                    }
                }
                // end for tails

                const prev = combineArr[j - 1];
                if (current > prev) { // means we're on our way up
                    dir = 1;

                } else {
                    if (dir === 1) { // means we just reached a peak
                        // see if we found new tallest note
                        if (prev - low > biggests[0][0]) {
                            const newNoteHeight = prev - low;
                            const newNoteIdx = Math.floor(((j - 1) + lowTimeIdx) / 2);
                            biggests.shift();
                            // biggests.push([newNoteHeight, newNoteIdx]);
                            biggests.push([newNoteHeight, lowTimeIdx]); // use beginning of uphill
                            biggests.sort((a, b) => {
                                return a[0] < b[0] ? -1 : 1;
                            });
                        }
                    }

                    dir = -1
                    low = current;
                    lowTimeIdx = j;

                }
            }

            
            
            const makeNote = biggests.map((noteArr) => {
                return noteArr[1];
            }).includes(Math.floor(combineArr.length / 2));

            slidesWithMakeNote[slideIds[i]] = makeNote;

            

            noteVals.push({
                beforeRatio: (1.0 * overallBeforeMin) / overallBeforeMax,
                afterRatio: (1.0 * overallAfterMin * overallAfterMin) / (overallAfterMax * overallAfterMax),
                val: noteVal,
                val2: noteVal * noteVal,
                triggerSlideIdx: i,
                makeNote: makeNote,
                firstTime: true
            });

            // if (false) {
            if (makeNote) {
                let marked = false;
                if (amt < 140) {
                    marked = true;
                    return noteVals;
                }    

                let slideToUse;
                if (algorithm === "A") {
                    
                    slideToUse = this.getSlideToUse(thisToneVal, masterData.numSlides);

                } else if (algorithm === "B") {
                    slideToUse = slideIds[i];
                }

                // write notes - same for both algorithms once slideToUse is established
                const noteWriteParams = {
                    slideToUse,
                    // slideToUse: diffSlide,
                    slideIds,
                    noteVal,
                    toneVal: thisToneVal,
                    addNote,
                    marked,
                    mobile,
                    notesPerSecond
                };
                this.attemptNoteWrite(noteWriteParams);
            }
        }
        noteVals.push(slidesWithMakeNote);
        return noteVals;
    }

    getSlideToUse(toneVal, numSlides) {
        const sortedTones = this.recentToneVals.map((val) => {
            return val;
        }).sort();

        let slideToUse = "slide-left";
        if (numSlides === 4) {
            if (toneVal > sortedTones[0]) {
                slideToUse = "slide-a";
                if (toneVal > sortedTones[1]) {
                    slideToUse = "slide-b"
                    if (toneVal > sortedTones[2]){
                        slideToUse = "slide-right";
                    }
                }
            }
        } else if (numSlides === 3) {
            if (toneVal > sortedTones[0]) {
                slideToUse = "slide-a";
                if (toneVal > sortedTones[2]) {
                    slideToUse = "slide-right";
                }
            }
        } else {
            if (toneVal > sortedTones[1]) {
                slideToUse = "slide-right";
            }
        }
        
        return slideToUse;
    }

    attemptNoteWrite(params) {
        const {
            slideToUse,
            slideIds,
            noteVal,
            toneVal,
            addNote,
            marked,
            mobile,
            notesPerSecond
        } = params;
        let noteMade = false;

        let gap = this.gap;
        if (notesPerSecond > 4) {
            gap *= 0.75;
        }
        if (notesPerSecond === 2) {
            gap *= 1.5;
        }
        if (notesPerSecond === 1) {
            gap *= 2;
        }

        if (slideToUse) { // make sure note wasn't triggered in slide we're not currently using
            const now = performance.now();
            if (now - this.lastAll[slideToUse] > this.masterInfo.minNoteGap) {
                if (mobile && slideIds.length > 2) {
                    // const gap = (1.0 / notesPerSecond) * 1000;
                    if (slideIds.length === 3) {
                        // check if note is on wrong side of middle sustained note
                        if (this.mostRecentNotes["slide-a"] && this.mostRecentNotes["slide-a"].isTail) {
                            if (slideToUse !== this.sideWithNotes) {
                                return;
                            }
                        }
                        const leftTime = now - this.lastLeft;
                        const midTime = now - this.lastMid;
                        const rightTime = now - this.lastRight;
                        if (slideToUse === this.rightId) {
                            if (leftTime > gap || midTime > gap) {
                                addNote(slideToUse, noteVal, marked);
                                noteMade = true;
                                this.sideWithNotes = slideToUse;
                                this.lastRight = now;
                                this.lastAll[slideToUse] = now;
                            }
                        } else if (slideToUse === this.leftId) {
                            if (midTime > gap || rightTime > gap) {
                                addNote(slideToUse, noteVal, marked);
                                noteMade = true;
                                this.sideWithNotes = slideToUse;
                                this.lastLeft = now;
                                this.lastAll[slideToUse] = now;
                            }
                        } else {
                            if (leftTime > gap || rightTime > gap) {
                                addNote(slideToUse, noteVal, marked);
                                noteMade = true;
                                this.lastMid = now;
                                this.lastAll[slideToUse] = now;
                            }
                        }
                    } else { // we have 4 slides
                        const leftTime = now - this.lastLeft;
                        const rightTime = now - this.lastRight;
                        if (this.leftSlides.includes(slideToUse)) {
                            if (leftTime > gap) {
                                addNote(slideToUse, noteVal, marked);
                                noteMade = true;
                                this.lastLeft = now;
                                this.lastAll[slideToUse] = now;
                            }
                        } else { // we're on the right side
                            if (rightTime > gap) {
                                addNote(slideToUse, noteVal, marked);
                                noteMade = true;
                                this.lastRight = now;
                                this.lastAll[slideToUse] = now;
                            }
                        }
                    }
                } else {
                    if (notesPerSecond < 3) {
                        const leftTime = now - this.lastLeft;
                        const rightTime = now - this.lastRight;
                        if (this.leftSlides.includes(slideToUse)) {
                            if (leftTime > gap) {
                                addNote(slideToUse, noteVal, marked);
                                noteMade = true;
                                this.lastLeft = now;
                                this.lastAll[slideToUse] = now;
                            }
                        } else { // we're on the right side
                            if (rightTime > gap) {
                                addNote(slideToUse, noteVal, marked);
                                noteMade = true;
                                this.lastRight = now;
                                this.lastAll[slideToUse] = now;
                            }
                        }
                    } else {
                        addNote(slideToUse, noteVal, marked);
                        noteMade = true;
                        this.lastAll[slideToUse] = now;
                    }
                }
            }
        }

        if (noteMade) {
            if (!this.lastValTime || performance.now() - this.lastValTime > (gap - 1)) {
                this.recentToneVals.push(toneVal);
                this.lastValTime = performance.now();
                this.recentToneVals.shift();
            }
        }

    }
}

function getNumInfoArr(arr) {
    if (arr.length === 0) {
        return {
            min: 0,
            max: 0,
            average: 0
        }
    }
    let min = arr[0];
    let max = arr[0];
    let sum = 0;
    arr.forEach((val) => {
        if (val > max) {
            max = val;
        }
        if (val < min) {
            min = val;
        }
        sum += val;
    });
    return {
        min: min,
        max: max,
        average: Math.floor(sum / arr.length)
    };

}