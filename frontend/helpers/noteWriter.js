import { songNotes } from "./songNotes.js";

export class NoteWriter {
    constructor(masterInfo, addNote, makeTail, backgroundAnimator) {
        this.masterInfo = masterInfo;
        this.addNote = addNote;
        this.makeTail = makeTail;
        this.backgroundAnimator = backgroundAnimator;

        this.lastLeft = performance.now();
        this.lastMid = performance.now();
        this.lastRight = performance.now();
        this.lastLeftTail = performance.now();
        this.lastMidTail = performance.now();
        this.lastRightTail = performance.now();
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
        this.lastAlls = [];
        this.mostRecentNotes = masterInfo.mostRecentNotesOrTails;

        this.numToneVals = 3; // min; will shift off only if already above this number
        // this.recentToneVals = [80];
        this.recentToneVals = [20, 50, 80];
        // this.recentToneVals = [20, 20, 20, 50, 50, 80, 80, 80];
        // this.recentToneVals = [20, 20, 20, 50, 50, 80, 80, 80, 20, 20, 20, 50, 50, 80, 80, 80];
        // this.recentToneVals = [
        //     20, 20, 20, 50, 50, 80, 80, 80, 20, 20, 20, 50, 50, 80, 80, 80,
        //     20, 20, 20, 50, 50, 80, 80, 80, 20, 20, 20, 50, 50, 80, 80, 80,
        //     20, 20, 20, 50, 50, 80, 80, 80, 20, 20, 20, 50, 50, 80, 80, 80,
        //     20, 20, 20, 50, 50, 80, 80, 80, 20, 20, 20, 50, 50, 80, 80, 80
        // ];


        this.sideWithNotes = null // remember which side can have new notes when sustained note in middle of 3 slides
    
        this.last = performance.now();
        this.timeSinceLast = 0;
        this.timesSinceLast = [0, 0, 0, 0];

        this.lastArrs = [];

        this.rawArrs = [];
        // this.highestFreqs = []; // [idx, val]

        // EXPERIMENTAL
        this.gap = 200;

        this.resetData();
        // // DETAIL EXPERIMENT
        // this.times = [];
        // this.collectArrays = [];
        // this.collectTimeArrays = [];
        // this.timeArrayVariances = [];
        // this.startTime = performance.now();
        // this.lastTime = performance.now();
        // this.stepTime = 5; // ms to collapse data
        // this.arrLength = 2048;
        

        // // precise - hills in moment get taller
        // this.aveHillHeights = [];
        // this.tallestTowers = [];
        // this.toneVals = [];
        // this.peakOffset = 0;

        // // precise better - same but with running total
        // this.prev = false;
        // this.low = false;
        // this.lowIdx = false;
        // this.dir = 1;

        // which algorithm?
        this.doPreciseBetter = true;


        // TEMP
        this.tallestTowerIndices = [];
    }

    resetData() {
        // DETAIL EXPERIMENT
        this.times = [];
        this.collectArrays = [];
        this.collectTimeArrays = [];
        this.timeArrayVariances = [];
        this.startTime = performance.now();
        this.lastTime = performance.now();
        this.stepTime = 5; // ms to collapse data
        this.arrLength = 2048;
        

        // precise - hills in moment get taller
        this.aveHillHeights = [];
        this.tallestTowers = [];
        this.toneVals = [];
        this.peakOffset = 0;

        // precise better - same but with running total
        this.prev = false;
        this.low = false;
        this.lowIdx = false;
        this.dir = 1;
    }

    writeTails(theseTallestTowers, slideIds, futureTallestTowers, notesPerSecond, timeArrayVariance) {
        if (this.recentToneVals.length < 3 || notesPerSecond < 2) {
            return;
        }

        let reach = {
            "few": 5,
            "medium": 10,
            "many": 15
        } [this.masterInfo.sustainedNotesFrequency];

        if (this.masterInfo.songMode === "radio") {
            reach = Math.floor(reach / 2);
        }

        slideIds.forEach((slideId) => {

            const lastNote = this.mostRecentNotes[slideId];
            if (lastNote) {

                let noteTowerIdx = lastNote.val;
                let currIdx = noteTowerIdx;

                let yesToTail = false;

                let futurePass = true;
                if (lastNote.isTail) {
                    futurePass = true;
                } else {
                    futurePass = true;
                    //check if ANY tallest tower has the note's idx
                    let theDiff = 4000;
                    futureTallestTowers.forEach((towerArr) => {
                        let foundHere = false;
                        let thisIdx = currIdx;
                        towerArr.forEach((tower) => {
                            const thisDiff = Math.abs(tower[1] - thisIdx);
                            if (thisDiff < reach) {
                                foundHere = true;
                                if (thisDiff < theDiff) {
                                    theDiff = thisDiff;
                                    currIdx = tower[1];
                                }
                            }
                        });
                        if (!foundHere) {
                            futurePass = false;
                            
                        }
                    });
                }

                let notTooLong = true;
                if (lastNote.isTail) {
                    if (lastNote.totalHeight > 1.5 * (2000.0 / (this.masterInfo.songDelay - 2000)) * this.masterInfo.travelLength) {
                        notTooLong = false;
                    }
                }

                let dist = 4000;
                theseTallestTowers.forEach((tower) => {
                    const thisDist = Math.abs(noteTowerIdx - tower[1]);
                    if (thisDist < reach) {
                        yesToTail = true;
                        if (thisDist < dist) {
                            dist = thisDist;
                            lastNote.val = tower[1];
                        }
                    }
                });

                if (yesToTail && futurePass && notTooLong) {
                    const now = performance.now();
                    if (slideIds.length === 4) {
                        if (this.leftSlides.includes(slideId)) {
                            this.lastLeft = now;
                            this.lastAll[slideId] = now;
                            this.makeTail(slideId, lastNote);
                        } else {
                            this.lastRight = now;
                            this.lastAll[slideId] = now;
                            this.makeTail(slideId, lastNote);
                        }
                    } else if (slideIds.length === 3) {
                        if (slideId === this.rightId) {
                            this.lastRight = now;
                            this.lastAll[slideId] = now;
                            this.makeTail(slideId, lastNote);                             
                        } else if (slideId === this.leftId) {                                
                            this.lastLeft = now;
                            this.lastAll[slideId] = now;
                            this.makeTail(slideId, lastNote);                                
                        } else {                                
                            this.lastMid = now;
                            this.lastAll[slideId] = now;
                            this.makeTail(slideId, lastNote);                                
                        }
                    } else {
                        this.lastAll[slideId] = now;
                        this.makeTail(slideId, lastNote);
                    }
                } else {
                    // check for tail too short - delete tail entirely
                    if (lastNote.isTail && lastNote.totalHeight < 0.1 * this.masterInfo.travelLength) {
                        lastNote.cloud.remove();
                        lastNote.note.remove();
                        lastNote.parentNote.tail = null;

                        // lastNote.parentNote.note.innerHTML = closest;
                    }
                    this.mostRecentNotes[slideId] = null;
                }

                // OLD OLD OLD OLD OLD
                // let reachDist = 8; // larger number means more sustained notes
                // if (this.masterInfo.songMode === "radio") {
                //     reachDist = 4;
                // }
                // let noteValToUse = lastNote.val;
                // if (noteValToUse.length > 8) {
                //     noteValToUse = noteValToUse.slice(Math.floor(0.25 * noteValToUse.length), Math.floor(0.75 * noteValToUse.length));
                // }

                // let yesToTail = false;

                // const theseTowerLocations = new Set();
                // theseTallestTowers.forEach((tower) => {
                //     theseTowerLocations.add(tower[1]);
                // });
                // let towersFound = 0;
                // // const towersNeeded = Math.ceil(noteValToUse.length / 6);
                // const towersNeeded = Math.ceil(noteValToUse.length / 1);
                // noteValToUse.forEach((tower) => {
                //     const loc = tower[1];
                //     let towerFound = false;
                //     const locArr = [];
                //     for (let i = 0; i < reachDist; i++) {
                //         locArr.push(loc - i);
                //         locArr.push(loc + i);
                //     }
                //     locArr.forEach((closeNum) => {
                //         if (theseTowerLocations.has(closeNum)) {
                //             towerFound = true;
                //             theseTowerLocations.delete(closeNum);
                //             theseTowerLocations.add(loc);
                //         }
                //     });
                //     if (towerFound) {
                //         towersFound += 1;
                //     }
                // });

                // let futurePass = false;
                // if (lastNote.isTail) {
                //     futurePass = true;
                // } else {
                //     futurePass = true;
                //     futureTallestTowers.forEach((tallestTowersArr) => {
                //         const futureTowerLocations = new Set();
                //         tallestTowersArr.forEach((tower) => {
                //             futureTowerLocations.add(tower[1]);
                //         });
                //         let towersFound = 0;
                //         noteValToUse.forEach((tower) => {
                //             const loc = tower[1];
                //             let towerFound = false;
                //             const locArr = [];
                //             for (let i = 0; i < reachDist; i++) {
                //                 locArr.push(loc - i);
                //                 locArr.push(loc + i);
                //             }
                //             locArr.forEach((closeNum) => {
                //                 if (futureTowerLocations.has(closeNum)) {
                //                     towerFound = true;
                //                     futureTowerLocations.delete(closeNum);
                //                     futureTowerLocations.add(loc);
                //                 }
                //             });
                //             if (towerFound) {
                //                 towersFound += 1;
                //             }
                //         });
                //         if (towersFound < towersNeeded) {
                //             futurePass = false;
                //         }
                //     });
                // }

                // let notTooLong = true;
                // if (lastNote.isTail) {
                //     if (lastNote.totalHeight > 1.5 * this.masterInfo.travelLength) {
                //         notTooLong = false;
                //     }
                // }

                // if (towersFound >= towersNeeded && futurePass && notTooLong) {
                //     yesToTail = true;
                // }

                // if (yesToTail) {
                //     const now = performance.now();
                //     if (slideIds.length === 4) {
                //         if (this.leftSlides.includes(slideId)) {
                //             this.lastLeft = now;
                //             this.lastAll[slideId] = now;
                //             this.makeTail(slideId, lastNote);
                //         } else {
                //             this.lastRight = now;
                //             this.lastAll[slideId] = now;
                //             this.makeTail(slideId, lastNote);
                //         }
                //     } else if (slideIds.length === 3) {
                //         if (slideId === this.rightId) {
                //             this.lastRight = now;
                //             this.lastAll[slideId] = now;
                //             this.makeTail(slideId, lastNote);                             
                //         } else if (slideId === this.leftId) {                                
                //             this.lastLeft = now;
                //             this.lastAll[slideId] = now;
                //             this.makeTail(slideId, lastNote);                                
                //         } else {                                
                //             this.lastMid = now;
                //             this.lastAll[slideId] = now;
                //             this.makeTail(slideId, lastNote);                                
                //         }
                //     } else {
                //         this.lastAll[slideId] = now;
                //         this.makeTail(slideId, lastNote);
                //     }
                // } else {
                //     // check for tail too short - delete tail entirely
                //     if (lastNote.isTail && lastNote.totalHeight < 0.1 * this.masterInfo.travelLength) {
                //         lastNote.cloud.remove();
                //         lastNote.note.remove();
                //         lastNote.parentNote.tail = null;

                //         // lastNote.parentNote.note.innerHTML = closest;
                //     }
                //     this.mostRecentNotes[slideId] = null;
                // }
            }
        });
        
    }

    writeNotes(dataArray, timeArray, slideIds, notesPerSecond, songTime, timeOffset = 0) {

        
        
        // show equalizer
        // document.getElementById("equalizer").classList.remove("hidden");
        // document.getElementById("equalizer").classList.add("equalizer");
        // const box = document.getElementById("equalizer-box");
        // const equArr = dataArray;
        // box.innerHTML = "";
        // equArr.forEach((ele) => {
        //     const col = document.createElement("div");
        //     col.classList.add("equ-col");
        //     col.style.height = `${ele}px`;
        //     box.appendChild(col);
        // });
        // return;
        
        const now = performance.now() - timeOffset;
        // if (now - this.lastTime > this.stepTime) {
            this.times.push(now);

            // document.noteVal = now - this.times[0];
            
            
            while (this.times[0] < now - 4000) {
                this.times.shift();
            }
            
            this.lastTime += this.stepTime;

            
            let makeNote = false;
            let marked = false;
            let colVal = false;
            let canDouble = false;
            
            // FOR NO COLLECT ARRAY!!!!
            const arrToUse = dataArray;
            // const arrToUse = timeArray;

            // TEMP 
            // const arrToUse = dataArray.map((ele, i) => {
            //     return ele * timeArray[i];
            // });
            // end TEMP

            const timeArrToUse = timeArray;
            this.timeArrayVariances.push(Math.max(...timeArrToUse) - Math.min(...timeArrToUse));
            
            // precise below
            let toneValToUse;
            let noteValToUse;

            let hardToneValToUse;

            // precise better
            if (this.doPreciseBetter) {
                let prev = arrToUse[0];
                let low = prev;
                let dir = 1;

                // wavelength exp
                let lowIdx = 0;

                const peaks = []; // will be populated with [val, i] ordered by val

                // FOR highestFreqs
                // let maxVal = 0;
                // let maxValIdx = 0;

                arrToUse.forEach((val, i) => {
                    if (val > 0) {

                        // FOR higestFreqs
                        // if (val > maxVal) {
                        //     maxVal = val;
                        //     maxValIdx = 0;
                        // }
        
                        if (val > prev) {   // going up
                            if (dir === -1) {
                                // found a low
                                low = val;
                                lowIdx = i;
                                dir = 1;
                            }
                        } else {    // going down
                            if (dir === 1) {
                                // found a peak
                                const height = prev - low;
                                if (height > 0) {
                                    peaks.push([height, i - 1, i - lowIdx]);
                                }
                                low = val;
                                dir = -1;
                            } else {
                                low = val;
                            }
                        }
                    }
                    prev = val;
                });

                // FOR higestFreqs
                // this.highestFreqs.push([maxValIdx, maxVal]);

                // peaks.sort((a, b) => {
                //     if (a[0] > b[0]) {
                //         return 1;
                //     } else {
                //         return -1;
                //     }
                // });
                
                const cutoffIdx = peaks.length * 0.9;
                const highPeaks = peaks.slice(cutoffIdx, peaks.length);
                
                this.tallestTowers.push(highPeaks);
                
                // get toneVal from average index diff between peaks
                const peakSpots = highPeaks.map((peak) => {
                    return peak[1];
                }).sort((a, b) => {
                    if (a > b) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
                
                let diffSum = 0;
                for (let i = Math.floor(peakSpots.length / 5); i < peakSpots.length; i++) {
                    diffSum += peakSpots[i] - peakSpots[i - 1];
                }
                let aveDiff = 0;
                if (peakSpots.length > 1) {
                    aveDiff = diffSum / (peakSpots.length - 1);
                }

                // AVERAGE (see TALLEST below)
                // this.aveHillHeights.push(arrAverage(highPeaks.map((peak) => {
                //     return peak[0];
                // }))); // put latest average peak height into this.aveHillHeights

                

                // (1) MAX INSTEAD OF AVE hill height
                // this.aveHillHeights.push(Math.max(...highPeaks.map((peak) => {
                //     return peak[0];
                // })));

                // (2) TEMP
                // highPeaks.forEach((peakPair) => {
                //     if (peakPair[0] === this.aveHillHeights[this.aveHillHeights.length - 1]) {
                //         this.tallestTowerIdices.push(peakPair[1]);
                //     }
                // });

                // combine previous 2 things into 1 loop through highPeaks
                let tallestHeight = 0;
                let tallestIdx = 0;
                // let waveLength = 0;
                highPeaks.forEach((peakPair) => {
                    if (peakPair[0] > tallestHeight) {
                        tallestHeight = peakPair[0];
                        tallestIdx = peakPair[1];
                        // waveLength = peakPair[2];
                    }
                });

                // TALLEST (see AVERAGE above)
                this.aveHillHeights.push(tallestHeight);  // COMMENTED TO REVERT TO average tower height instead of tallest

                this.toneVals.push(aveDiff);
                // this.toneVals.push(waveLength); // WAVELENGTH is for when using highest tower from timeArray

                this.tallestTowerIndices.push(tallestIdx);

                // EQUALIZER TEMP!!!!
                // const equals = [
                //     Math.max(...arrToUse.slice(0, 512)),
                //     Math.max(...arrToUse.slice(512, 1024)),
                //     Math.max(...arrToUse.slice(1024, 1536)),
                //     Math.max(...arrToUse.slice(1536, 2048))
                //     // arrAverage(arrToUse.slice(0, 512)),
                //     // arrAverage(arrToUse.slice(512, 1024)),
                //     // arrAverage(arrToUse.slice(1024, 1536)),
                //     // arrAverage(arrToUse.slice(1536, 2048))
                // ];
                // this.lastEquals.push(equals);
                this.rawArrs.push(arrToUse);
                // END TEMP - but see this.lastEquals below
                

                // if (this.aveHillHeights.length > this.times.length) {
                //     this.aveHillHeights.shift();
                //     this.timeArrayVariances.shift();
                //     this.tallestTowers.shift();
                //     this.toneVals.shift();
                //     // this.lastEquals.shift(); /////////// TEMP
                //     this.rawArrs.shift(); /////////// TEMP
                //     // this.highestFreqs.shift();
                //     this.tallestTowerIdices.shift(); // TEMP
                // }

                // replacement for ^above that hopefully gets them all down to the right length
                const arrsToShorten = [
                    this.aveHillHeights,
                    this.timeArrayVariances,
                    this.tallestTowers,
                    this.toneVals,
                    this.rawArrs,
                    this.tallestTowerIndices
                ];
                arrsToShorten.forEach((arr) => {
                    while (arr.length > this.times.length) {
                        arr.shift();
                    }
                });

                // console.log(this.rawArrs.length, this.times.length);

                // FOR highestFreqs
                // let highestPeakVal = 0;
                // let highestPeakIdx = 0;
                // this.highestFreqs.forEach((peakArr) => {
                //     if (peakArr[1] > highestPeakVal) {
                //         highestPeakVal = peakArr[1];
                //         highestPeakIdx = peakArr[0];
                //     }
                // });
                
                let zoomInFactor = 4;
                if (this.masterInfo.algorithm === "B") {
                    zoomInFactor = 2;
                }
                // let zoomInFactor = 6;
                if (this.times[this.times.length - 1] - this.times.length[0] < 3900 || this.times.length < 100) {
                    zoomInFactor = 1;
                }

                // now look for time hills to trigger notes
                const maxHills = 100;
                const hills = [];
                const hillPeakIdxs = {}; // filled with idx: peakIdx
                let timePrev = this.aveHillHeights[0];
                let timeDir = 1;
                let timeLow = timePrev;
                let timeLowIdx = 0;

                let timePerFrame = 0;
                let manualFrameDelay = 0;
                // console.log(this.times[this.times.length - 1], this.times[0]);
                if (this.times.length > 100) {
                    timePerFrame = (1.0 * this.times[this.times.length - 1] - this.times[0]) / this.times.length;
                    if (timePerFrame > 0) {
                        manualFrameDelay = 1.0 * this.masterInfo.manualDelay / timePerFrame;
                    }
                }
                // console.log("timePerFrame: " + timePerFrame);
                // console.log("manualFrameDelay: " + manualFrameDelay);

                const halfway = 1900; // 100ms default offset seems to work well
                let midIdx = 0;

                while (this.times[midIdx] < now - halfway + manualFrameDelay) {
                // while (this.times[midIdx] < now - 2000 + manualFrameDelay) {
                    midIdx += 1;
                    if (!this.times[midIdx]) {
                        break;
                    }
                }

                if (midIdx === 0) {
                    return;
                }

                const legLength = Math.floor(this.aveHillHeights.length / (2 * zoomInFactor));
                // let startIdx = Math.floor(((midIdx) + manualFrameDelay) - legLength);
                // let endIdx = Math.floor(((midIdx) + manualFrameDelay) + legLength);

                let startIdx = Math.floor(((midIdx)) - legLength);
                let endIdx = Math.floor(((midIdx)) + legLength);

                if (startIdx < 0) {
                    // startIdx = 0;
                    return;
                }
                if (startIdx > this.aveHillHeights.length - 1) {
                    // startIdx = this.aveHillHeights.length - 1;
                    return;

                }
                if (endIdx < 0) {
                    // endIdx = 0;
                    return;

                }
                if (endIdx > this.aveHillHeights.length - 1) {
                    // endIdx = this.aveHillHeights.length - 1;
                    return;

                }

                // for (let i = 1; i < this.aveHillHeights.length; i++) {
                for (let i = startIdx; i < endIdx; i++) {
                    const thisVal = this.aveHillHeights[i];
                    if (thisVal > timePrev) {   // going up
                        if (timeDir === -1) {
                            // found a low
                            timeLow = timePrev;
                            timeLowIdx = i - 1;
                            timeDir = 1;
                        }
                    } else {    // going down
                        if (timeDir === 1) {
                            // found a peak
                            const hillHeight = timePrev - timeLow;
                            // if (hills.length === 0 || hillHeight > hills[0][0]) {
                            if (hillHeight > 0) {

                                
                                // const prominance = this.timeArrayVariances[i] - this.timeArrayVariances[timeLowIdx];
                                // hills.push([hillHeight, timeLowIdx, prominance]); // prominance by loudness at top of hill vs bottom

                                hills.push([hillHeight, timeLowIdx, this.timeArrayVariances[i]]); // timeArrayVariances for loudness for prominance
                                // hills.push([hillHeight, timeLowIdx, this.rawArrs[i][highestPeakIdx]]); // prominance by prominance of most prominant frequency
                                // hills.push([hillHeight, timeLowIdx, this.timeArrayVariances[i] * hillHeight]); // loudness * height

                                
                                hillPeakIdxs[timeLowIdx] = i - timeLowIdx;
                            }
                        }
                        timeLow = thisVal;
                        timeLowIdx = i;
                    }
                    timePrev = thisVal;
                }
                // console.log(hills.map(ele => ele.map(el => el)));

                // SORT HILLS JUST ONCE, after they're all gathered
                hills.sort((a, b) => {
                    // if (a[0] > b[0]) {
                    if (a[2] > b[2]) { /////// TEMP TEMP TEMP TEMP - use prominance
                        return 1;
                    } else {
                        return -1;
                    }
                });
                // console.log(hills.length);

                // const halfway = 1900 + this.masterInfo.manualDelay; // 100ms default offset seems to work well
                // console.log(halfway);

                // let midIdx = 0;
                // while (this.times[midIdx] < now - halfway) {
                //     midIdx += 1;
                //     if (!this.times[midIdx]) {
                //         break;
                //     }
                // }
                // console.log(startIdx, endIdx);
                // let midIdx = Math.floor(((endIdx + startIdx) / 2));
                // if (midIdx < 0) {
                //     midIdx = 0;
                // }
                // console.log("midIdx: " + midIdx);

                const peakIdx = hillPeakIdxs[midIdx] + midIdx;
                if (peakIdx) {
                    this.peakOffset = hillPeakIdxs[midIdx];
                }

                // noteValToUse = this.tallestTowers[midIdx + this.peakOffset].slice(
                //     this.tallestTowers[midIdx + this.peakOffset].length - 10, 
                //     this.tallestTowers[midIdx + this.peakOffset].length - 0
                // );
                // noteValToUse = Math.max(...this.tallestTowers[midIdx + this.peakOffset]);
                
                // NEW toneValToUse
                
                // toneValToUse = this.tallestTowerIdices[midIdx + this.peakOffset];
                // END NEW toneValToUse
                // OLD toneValToUse
                // toneValToUse = arrAverage(this.tallestTowers[midIdx + this.peakOffset].map((sub) => {
                //     return sub[1];
                // }));
                // END OLD toneValToUse


                let highest = 0;
                let highIdx = 0;
                this.tallestTowers[midIdx + this.peakOffset].forEach((tower) => {
                    if (tower[0] > highest) {
                        highest = tower[0];
                        highIdx = tower[1];
                    }
                })
                noteValToUse = highIdx;
                
                // toneValToUse = this.toneVals[peakIdx + this.peakOffset]; // TEMP TEMP TEMP TEMP TEMP TEMP TEMP TEMP
                toneValToUse = this.tallestTowerIndices[peakIdx + this.peakOffset]; // TEMP TEMP TEMP TEMP TEMP TEMP TEMP TEMP
                // if (this.rawArrs[peakIdx]) {
                //     // toneValToUse = weightedAve(this.rawArrs[peakIdx].slice(0, 2048));
                //     // average indices of top 10 

                //     // toneValToUse = Math.max(...this.rawArrs[peakIdx].slice(150, 2048));
                //     // // attempt to do ^that for real;
                //     let max = 0;
                //     let maxIdx = 0;
                //     this.rawArrs[peakIdx].forEach((val, i) => {
                //         if (val > max) {
                //             max = val;
                //             maxIdx = i;
                //         }
                //     });
                //     toneValToUse = maxIdx;
                // } else {
                //     toneValToUse = 1;
                // }



                

                
                const timePerStep = 4000 / this.tallestTowers.length;
                let numFutureSteps = Math.ceil(200 / timePerStep);


                if (this.masterInfo.sustainedNotes) {
                    this.writeTails(
                        this.tallestTowers[midIdx + this.peakOffset],
                        slideIds, 
                        this.tallestTowers.slice(midIdx + this.peakOffset + 1, midIdx + this.peakOffset + 1 + numFutureSteps),
                        // this.toneVals.slice(midIdx + this.peakOffset + 1, midIdx + this.peakOffset + 1 + numFutureSteps),
                        // Math.max(...this.tallestTowers.map(ele => ele[1])),
                        notesPerSecond,
                        this.timeArrayVariances[midIdx]
                    );
                } 
                
                // too quiet
                // if (this.timeArrayVariances[midIdx] < 15 || this.times[this.times.length - 1] - this.times[0] < 1900) {
                const soundAmt = this.timeArrayVariances[midIdx + this.peakOffset];
                

                const maxV = Math.max(...this.aveHillHeights);
                const minV = Math.min(...this.aveHillHeights);
                const midV = (1.0 * maxV + minV) / 2;
                const range = maxV - minV;
                const v = this.aveHillHeights[this.aveHillHeights.length - 1];
                const fraction = 1.0 * (v - minV) / range;
                
                // const cutoff = {
                //     1: 0.95,
                //     2: 0.75,
                //     3: 0.5,
                //     4: 0,
                //     5: 0
                // }[notesPerSecond];

                let cutoff = {
                    1: 0.15,
                    2: 0.3,
                    3: 0.5,
                    4: 0.75,
                    5: 1
                }[notesPerSecond];

                // for zoomInFactor
                // cutoff = 1 - ((1.0 - cutoff) / zoomInFactor);

                if (slideIds.length === 3) {
                    let cutoffDiff = 1 - cutoff;
                    // cutoffDiff *= 0.75;
                    cutoffDiff *= 0.9;
                    cutoff = 1 - cutoffDiff;
                }
                if (slideIds.length === 2) {
                    let cutoffDiff = 1 - cutoff;
                    // cutoffDiff *= 0.5;
                    cutoffDiff *= 0.65;
                    cutoff = 1 - cutoffDiff;
                }

                // number version (instead of fraction version)
                let numNotes = {
                    // 1: 3,
                    // 2: 6,
                    // 3: 10,
                    // 4: 20,
                    // 5: 60
                    1: 2,
                    2: 4,
                    3: 10,
                    4: 15,
                    5: 60
                }[notesPerSecond];
                if (slideIds.length === 3) {
                    // numNotes *= 0.75;
                    numNotes = Math.ceil(numNotes * 0.9);
                    // numNotes *= 0.9;
                }
                if (slideIds.length === 2) {
                    // numNotes *= 0.5;
                    numNotes = Math.ceil(numNotes * 0.65);
                    // numNotes *= 0.65;
                }

                if (soundAmt < 80) {
                    const fraction = 1.0 * soundAmt / 80;
                    numNotes = Math.floor(numNotes * fraction);
                }

                const doubleThreshold = {
                    "few": 0.75,
                    "medium": 0.5,
                    "many": 0
                } [this.masterInfo.doubleFrequency];

                const numToCutOff = this.masterInfo.algorithm === "A" ? numNotes : cutoff * hills.length;
                // console.log(cutoff);

                // const hillsToSearch = hills.slice(Math.floor(hills.length - numNotes), hills.length - 1); // num notes
                // const hillsToSearch = hills.slice(Math.floor(hills.length - (cutoff * hills.length)), hills.length - 1); // cutoff
                const hillsToSearch = hills.slice(Math.floor(hills.length - numToCutOff), hills.length - 1);
                hillsToSearch.forEach((hill, i) => {
                    if (hill[1] === midIdx) {
                        makeNote = true;

                        // TEMP
                        // document.noteVal = this.times.length;
                        // end TEMP
                        
                        if (i > doubleThreshold * hillsToSearch.length) {
                            // marked = true;
                            canDouble = true;
                        }
                    }
                });


                // if (hills.slice(Math.floor(hills.length - numNotes), hills.length - 1).map((hill) => {
                // // if (hills.slice(Math.floor(cutoff * hills.length), hills.length - 1).map((hill) => {
                //     return hill[1];
                // }).includes(midIdx)) {
                //     makeNote = true;
                // }

                this.lastAlls.push({
                    "slide-left": (now - this.lastAll["slide-left"]),
                    "slide-a": (now - this.lastAll["slide-a"]),
                    "slide-b": (now - this.lastAll["slide-b"]),
                    "slide-right": (now - this.lastAll["slide-right"])
                });
                if (this.lastAlls.length > this.times.length) {
                    this.lastAlls.shift();
                }

                const thisBackArr = [
                    Math.pow(arrAverage(arrToUse.slice(arrToUse.length - 2048, arrToUse.length - 1536)), 1.5),
                    Math.pow(arrAverage(arrToUse.slice(arrToUse.length - 1536, arrToUse.length - 1024)), 1.5),
                    Math.pow(arrAverage(arrToUse.slice(arrToUse.length - 1024, arrToUse.length - 512)), 1.5),
                    Math.pow(arrAverage(arrToUse.slice(arrToUse.length - 512, arrToUse.length - 256)), 1.5),
                    this.timeArrayVariances[this.timeArrayVariances.length - 1]
                ];
                // const thisBackArr = [
                //     Math.pow(arrAverage(timeArrToUse.slice(timeArrToUse.length - 2048, timeArrToUse.length - 1536)), 1.5),
                //     Math.pow(arrAverage(timeArrToUse.slice(timeArrToUse.length - 1536, timeArrToUse.length - 1024)), 1.5),
                //     Math.pow(arrAverage(timeArrToUse.slice(timeArrToUse.length - 1024, timeArrToUse.length - 512)), 1.5),
                //     Math.pow(arrAverage(timeArrToUse.slice(timeArrToUse.length - 512, timeArrToUse.length - 256)), 1.5)
                // ];
                // const thisBackArr = [
                //     noteValToUse,
                //     noteValToUse,
                //     noteValToUse,
                //     noteValToUse
                // ];
                this.lastArrs.push(thisBackArr);
                if (this.lastArrs.length > 8) {
                    this.lastArrs.shift();
                }
                const backArrToUse = [];
                for (let i = 0; i < thisBackArr.length; i++) {
                    backArrToUse.push(arrAverage(this.lastArrs.map((sub) => {
                        return sub[i];
                    })));
                }
                this.backgroundAnimator.animateBackground(backArrToUse);

                // FOR highestFreqs
                // const stepsEachSide = 30;
                // if (this.rawArrs.length > 2 * stepsEachSide + 50) {
                //     const littleArrToUse = this.rawArrs.slice(midIdx - stepsEachSide, midIdx + stepsEachSide);
                //     let maxIdx = 0;
                //     let maxVal = 0;
                //     littleArrToUse.forEach((subArr, i) => {
                //         const freqVal = subArr[highestPeakIdx];
                //         if (freqVal > maxVal) {
                //             maxVal = freqVal;
                //             maxIdx = i;
                //         }
                //     });
                //     if (maxIdx === Math.floor(littleArrToUse.length / 2)) {
                //         marked = true;
                //         makeNote = true;
                //     } else {
                //         makeNote = false;
                //     }
                // }
                
                if (soundAmt < 15) {
                    return;
                }
                if (now - this.times[0] < 1900) {
                    return;
                }
                
                hardToneValToUse = this.toneVals[midIdx];
                
            }

            if (this.masterInfo.songMode === "demo" && notesPerSecond === 1) {
                const thisSongNotes = songNotes[this.masterInfo.songCode];
                // const thisSongNotes = songNotes["blahBlahBlah"];
                
                // console.log(thisSongNotes);
                if (thisSongNotes) {
                    if (this.lastSongTime === undefined || this.lastSongTime === undefined || songTime < this.lastSongTime) {
                        this.lastSongTime = 0;
                        this.noteIdx = 0;
                        makeNote = false;
                    } else {
                        
                        
                        let makeNextNote = false;
                        while (thisSongNotes[this.noteIdx] < ((1.0 * this.masterInfo.songDelay - 4000) / 1000.0) + songTime + 2.0 - (this.masterInfo.manualDelay / 1000.0)) {
                            
                            this.noteIdx += 1;
                            makeNextNote = true;
                        }
                        if (makeNextNote) {
                            toneValToUse = hardToneValToUse;
                            
                            makeNote = true;
                        } else {
                            makeNote = false;
                        }
                        this.lastSongTime = songTime;
                    }
                }
            }
            
            if (makeNote) {
                
                const slideToRequest = this.getSlideToUse(toneValToUse, slideIds.length);
                
                this.attemptNoteWrite({
                    slideToUse: slideToRequest,
                    slideIds: slideIds,
                    noteVal: noteValToUse,
                    // noteVal: toneValToUse,
                    toneVal: toneValToUse,
                    // toneVal: hardToneValToUse,
                    addNote: this.addNote,
                    marked: marked,
                    mobile: true,
                    notesPerSecond: notesPerSecond,
                    canDouble: canDouble,
                    timeOffset: timeOffset
                });
            }
        // }
        
    }

    getSlideToUse(toneVal, numSlides) {
        const sortedTones = this.recentToneVals.map(ele => ele).sort((a, b) => {
            if (a > b) {
                return 1;
            } else {
                return -1;
            }
        });

        if (this.recentToneVals.length === 3 && numSlides === 4) {
            if (toneVal < this.recentToneVals[0]) {
                return "slide-left";
            }
            if (toneVal < this.recentToneVals[1]) {
                return "slide-a";
            }
            if (toneVal < this.recentToneVals[2]) {
                return "slide-b";
            }
            return "slide-right";
        }

        // TEMP
        // const left = document.notesRecord["slide-left"];
        // const a = document.notesRecord["slide-a"];
        // const b = document.notesRecord["slide-b"];
        // const right = document.notesRecord["slide-right"];
        // document.getElementById("song-label").innerText = `${left} ${a} ${b} ${right}`;
        // END TEMP

        // UP DOWN experiment
        // if (numSlides === 4 && this.lastSlide && this.lastToneVal && this.lastNoteTime && performance.now() - this.lastNoteTime < 1000) {
        //     this.lastNoteTime = performance.now();
        //     const slides = ["slide-left", "slide-a", "slide-b", "slide-right"];
        //     const max = Math.max(...this.recentToneVals);
        //     const min = Math.min(...this.recentToneVals);
        //     const range = max - min;
        //     const stepSize = 1.0 * range / 4;
        //     const diff = toneVal - this.lastToneVal;
        //     if (Math.abs(diff) < stepSize / 16) {
        //         this.lastToneVal = toneVal;
        //         return slides[this.lastSlide];
        //     }
        //     const diffNum = Math.round(1.0 * range / diff);
        //     if (diffNum > 0) { // go up
        //         this.lastSlide = (this.lastSlide + diffNum) % 4;
        //         this.lastToneVal = toneVal;
        //         return slides[this.lastSlide];
        //     } else { // go down
        //         let newNum = this.lastSlide + diffNum;
        //         while (newNum < 0) {
        //             newNum += 4;
        //         }
        //         this.lastSlide = newNum;
        //         this.lastToneVal = toneVal;
        //         return slides[this.lastSlide];
        //     }
        // }

        // this.lastToneVal = toneVal;
        // this.lastNoteTime = performance.now();
        // END UP DOWN experiment

        // TEMP - revisit old algorithm A
        // if (numSlides === 4) {
        //     const recents = this.recentToneVals.slice(this.recentToneVals.length - 3, this.recentToneVals.length).sort((a, b) => {
        //         if (a > b) {
        //             return 1;
        //         } else {
        //             return -1;
        //         }
        //     });
        //     if (toneVal < recents[0]) {
        //         this.lastSlide = 0; // for UP DOWN
        //         return "slide-left";
        //     }
        //     if (toneVal < recents[1]) {
        //         this.lastSlide = 1; // for UP DOWN
        //         return "slide-a";
        //     }
        //     if (toneVal < recents[2]) {
        //         this.lastSlide = 2; // for UP DOWN
        //         return "slide-b";
        //     }
        //     this.lastSlide = 3; // for UP DOWN
        //     return "slide-right";
        // }
        // if (numSlides === 3) {
        //     const recents = this.recentToneVals.slice(this.recentToneVals.length - 2, this.recentToneVals.length).sort((a, b) => {
        //     if (a > b) {
        //         return 1;
        //     } else {
        //         return -1;
        //     }
        // });
        //     if (toneVal < recents[0]) {
        //         return "slide-left";
        //     }
        //     if (toneVal > recents[1]) {
        //         return "slide-right";
        //     }
        //     return "slide-a";
        // }
        // if (toneVal < this.recentToneVals[this.recentToneVals.length - 1]) {
        //     return "slide-left";
        // }
        // return "slide-right";
        // end TEMP

        // exp - non-weighted range
        // if (numSlides === 4 && this.recentToneVals.length > 7) {
        //     const max = Math.max(...this.recentToneVals);
        //     const min = Math.min(...this.recentToneVals);
        //     const stepSize = (1.0 * max - min) / 4;
            
        //     if (toneVal < stepSize + min) {
        //         return "slide-left";
        //     }
        //     if (toneVal < (2 * stepSize) + min) {
        //         return "slide-a";
        //     }
        //     if (toneVal < (3 * stepSize) + min) {
        //         return "slide-b";
        //     }
        //     return "slide-right";
        // }

        // if (numSlides === 3 && this.recentToneVals.length > 7) {
        //     const max = Math.max(...this.recentToneVals);
        //     const min = Math.min(...this.recentToneVals);
        //     const stepSize = (1.0 * max - min) / 3;
            
        //     if (toneVal < stepSize + min) {
        //         return "slide-left";
        //     }
        //     if (toneVal < (2 * stepSize) + min) {
        //         return "slide-a";
        //     }
        //     return "slide-right";
        // }

        // if (numSlides === 2 && this.recentToneVals.length > 7) {
        //     const max = Math.max(...this.recentToneVals);
        //     const min = Math.min(...this.recentToneVals);
        //     const stepSize = (1.0 * max - min) / 2;
            
        //     if (toneVal < stepSize + min) {
        //         return "slide-left";
        //     }
        //     return "slide-right";
        // }
        // end exp

        // weighted range algo
        const highest = sortedTones[sortedTones.length - 1];
        const lowest  = sortedTones[0];
        
        if (toneVal > highest) {
            return "slide-right";
        } else if (toneVal < lowest) {
            return "slide-left";
        }
        
        
        
        if (numSlides === 4) {
            // let slideToReturn = "slide-left";
            // if (toneVal > sortedTones[Math.round(0.25 * sortedTones.length)]) {
            //     slideToReturn = "slide-a";
            //     if (toneVal > sortedTones[Math.round(0.5 * sortedTones.length)]) {
            //         slideToReturn = "slide-b";
            //         if (toneVal > sortedTones[Math.round(0.75 * sortedTones.length)]) {
            //             slideToReturn = "slide-right";
            //         }
            //     }
            // }
            let slideToReturn = "slide-right";
            if (toneVal < sortedTones[Math.round(0.75 * sortedTones.length)]) {
                slideToReturn = "slide-b";
                if (toneVal < sortedTones[Math.round(0.5 * sortedTones.length)]) {
                    slideToReturn = "slide-a";
                    if (toneVal < sortedTones[Math.round(0.25 * sortedTones.length)]) {
                        slideToReturn = "slide-left";
                    }
                }
            }
            return slideToReturn;
        }
        if (numSlides === 3) {
            let slideToReturn = "slide-left";
            if (toneVal > sortedTones[Math.round(0.33 * sortedTones.length)]) {
                slideToReturn = "slide-a";
                if (toneVal > sortedTones[Math.round(0.66 * sortedTones.length)]) {
                    slideToReturn = "slide-right";
                }
            }
            return slideToReturn;
        }
        if (numSlides === 2) {
            let slideToReturn = "slide-left";
            if (toneVal > sortedTones[Math.round(0.5 * sortedTones.length)]) {
                slideToReturn = "slide-right";
            }
            return slideToReturn;
        }
        // end range algo

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
            notesPerSecond,
            canDouble,
            timeOffset
        } = params;
        let noteMade = false;

        let gap = this.gap;
        // if (notesPerSecond > 4) {
            gap *= 0.75;
        // }
        // if (notesPerSecond === 2) {
        //     gap *= 1.5;
        // }
        // if (notesPerSecond === 1) {
        //     gap *= 2;
        // }

        if (slideToUse) { // make sure note wasn't triggered in slide we're not currently using
            const now = performance.now() - timeOffset;
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
                                addNote(slideToUse, noteVal, marked, timeOffset, canDouble);
                                noteMade = true;
                                this.sideWithNotes = slideToUse;
                                this.lastRight = now;
                                this.lastAll[slideToUse] = now;
                            }
                        } else if (slideToUse === this.leftId) {
                            if (midTime > gap || rightTime > gap) {
                                addNote(slideToUse, noteVal, marked, timeOffset, canDouble);
                                noteMade = true;
                                this.sideWithNotes = slideToUse;
                                this.lastLeft = now;
                                this.lastAll[slideToUse] = now;
                            }
                        } else {
                            if (leftTime > gap || rightTime > gap) {
                                addNote(slideToUse, noteVal, marked, timeOffset, canDouble);
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
                                addNote(slideToUse, noteVal, marked, timeOffset, canDouble);
                                noteMade = true;
                                this.lastLeft = now;
                                this.lastAll[slideToUse] = now;
                            }
                        } else { // we're on the right side
                            if (rightTime > gap) {
                                addNote(slideToUse, noteVal, marked, timeOffset, canDouble);
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
                                addNote(slideToUse, noteVal, marked, timeOffset, canDouble);
                                noteMade = true;
                                this.lastLeft = now;
                                this.lastAll[slideToUse] = now;
                            }
                        } else { // we're on the right side
                            if (rightTime > gap) {
                                addNote(slideToUse, noteVal, marked, timeOffset, canDouble);
                                noteMade = true;
                                this.lastRight = now;
                                this.lastAll[slideToUse] = now;
                            }
                        }
                    } else {
                        addNote(slideToUse, noteVal, marked, timeOffset, canDouble);
                        noteMade = true;
                        this.lastAll[slideToUse] = now;
                    }
                }
            }
        }

        if (noteMade) {
            // if (!this.lastValTime || performance.now() - this.lastValTime > (gap - 1)) {
                this.recentToneVals.push(toneVal);
                this.lastValTime = performance.now();
                if (this.recentToneVals.length > this.numToneVals) {
                    this.recentToneVals.shift();
                }
            // }
        }

    }
}

function arrSum(arr) {
    let total = 0;
    for (let i = 0; i < arr.length; i++) {
        total += arr[i];
    }
    return total;
}

function weightedAve(arr) {
    let num = 0;
    let total = 0;
    for (let i = 0; i < arr.length; i++) {
        const thisVal = arr[i];
        total += i * thisVal;
        num += thisVal;
    }
    if (num === 0) {
        return 0;
    } else {
        return 1.0 * total / num;
    }
}

function arrAverage(arr) {
    let sum = 0;
    arr.forEach((ele) => {
        sum += ele;
    });
    if (arr.length === 0) {
        return 0;
    } else {
        return 1.0 * sum / arr.length;
    }
}

function arrVariance(arr) {
    const ave = arrAverage(arr);
    let sum = 0;
    arr.forEach((ele) => {
        let diff = ele - ave;
        if (diff < 0) {
            diff *= -1;
        }
        sum += diff;
    });
    if (arr.length === 0) {
        return 0;
    } else {
        return 1.0 * sum / arr.length;
    }
}