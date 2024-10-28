export class NoteWriter {
    constructor(masterInfo, addNote) {
        this.masterInfo = masterInfo;
        this.addNote = addNote;

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
        // this.recentToneVals = [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5];

        this.sideWithNotes = null // remember which side can have new notes when sustained note in middle of 3 slides
    
        this.last = performance.now();

        // EXPERIMENTAL
        this.gap = 200;

        // DETAIL EXPERIMENT
        this.times = [];
        this.collectArrays = [];
        this.startTime = performance.now();
        this.lastTime = performance.now();
        this.stepTime = 25; // ms to collapse data
        this.arrLength = 2048; // average order every
        // ^^^^^ REDUCED FURTHER AFTER ANALYZE

        // weighted - change in toneVals
        this.toneVals = [];

        // precise - hills in moment get taller
        this.aveHillHeights = [];

        // order - order changes
        this.order = [];
        this.diffs = [];
        this.orders = [];

        // average - hills breach variance
        this.totals = [];
        this.aveArrs = [];

        // sum - total sum
        this.sums = [];
        this.biggests = [];
        this.numBiggestsSum = 6;
        this.dir = -1;
        this.low = 0;
        this.lowIdx = 0;
        
        // every - hills on every col
        this.numBiggests = 2;
        this.arrs = [];
        this.biggestsArrs = [];
        this.dirs = [];
        this.lows = [];
        this.lowIdxs = [];
        
        
        // preset
        for (let i = 0; i < this.arrLength; i++) {
            this.arrs.push([]);
            this.aveArrs.push([]);
            this.biggestsArrs.push([]);
            this.dirs.push(-1);
            this.lows.push(0);
            this.lowIdxs.push(0);
            this.totals.push(0);
            this.order.push([i, i]);
        }

        // which algorithm?
        this.doPrecise = true;
        this.doWeighted = false;
        this.doOrder = false;
        this.doAverage = false;
        this.doSum = false;
        this.doEvery = false;
    }

    writeNotes(dataArray, slideIds, notesPerSecond) {
        // document.getElementById("exp").style.zIndex = 10;

        // collect
        for (let i = 0; i < dataArray.length; i++) {
            const thisVal = dataArray[i];
            if (this.collectArrays[i] !== undefined) {
                this.collectArrays[i].push(thisVal);
            } else {
                this.collectArrays.push([thisVal]);
            }
        }
        

        

        // analyze
        const now = performance.now();
        if (now - this.lastTime > this.stepTime) {
            this.times.push(now);
            
            while (this.times[0] < now - 4000) {
                this.times.shift();
            }

            if (this.times[this.times.length - 1] - this.times[0] < 3900) {
                return;
            }
            
            this.lastTime += this.stepTime;

            let amt = 0;
            let arrToUse = this.collectArrays.map((subArr, i) => {
                let sum = 0;
                subArr.forEach((ele) => {
                    sum += ele;
                });
                this.collectArrays[i] = [];
                const aveVal = 1.0 * sum / subArr.length;
                const fraction = aveVal / 255;
                const answer = Math.pow(fraction, 0.25);
                amt += answer;
                return answer;
            });

            // EXP
            // arrToUse = [
            //     Math.max(...arrToUse.slice(0, 4)),
            //     Math.max(...arrToUse.slice(4, 8)),
            //     Math.max(...arrToUse.slice(8, 12)),
            //     Math.max(...arrToUse.slice(12, 16))
            // ];
            // END EXP

            // console.log(amt);
            // if (amt < 7) {
            //     return;
            // }

            let makeNote = false;
            let marked = false;
            let colVal = false;

            // precise below
            if (this.doPrecise) {
                let hillsFound = 0;
                let totalHeight = 0;
                let dir = -1;
                let low = 0;
                let prev = 0;
                for (let i = 0; i < arrToUse.length; i++) {
                    const thisHeight = arrToUse[i];
                    if (thisHeight < prev) { // went down
                        if (dir === 1) {
                            // found peak
                            hillsFound += 1;
                            totalHeight += thisHeight - low;
                            dir = -1;
                        } else {
                            // already going down
                            low = thisHeight;
                        }
                    } else { // went up
                        if (dir === -1) {
                            // found low
                            low = thisHeight;
                            dir = 1;
                        }
                    }
                    prev = thisHeight;
                }
                let aveHillHeight = 0;
                if (hillsFound > 0) {
                    aveHillHeight = 1.0 * totalHeight / hillsFound;
                }
                
                this.aveHillHeights.push(aveHillHeight);
                if (this.aveHillHeights.length > this.times.length) {
                    this.aveHillHeights.shift();
                }

                const leg = 50;
                const midIdx = Math.floor(this.aveHillHeights.length / 2);
                const smallArr = this.aveHillHeights.slice(midIdx - leg, midIdx + leg);

                const maxDiffs = [];
                const numMaxes = 20;
                smallArr.forEach((height, i) => {
                    if (i === 0) {
                        return 0;
                    } else {
                        const diff = height - smallArr[i - 1];
                        if (maxDiffs.length === 0 || diff > maxDiffs[0][0]) {
                            maxDiffs.push([diff, i]);
                            maxDiffs.sort((a, b) => {
                                if (a[0] > b[0]) {
                                    return 1;
                                } else {
                                    return -1;
                                }
                            });
                            
                            if (maxDiffs.length > numMaxes) {
                                maxDiffs.shift();
                            }

                        }
                        return diff;
                    }
                });

                // console.log(hillDiffs.map((ele) => { return ele; }));
                
                if (maxDiffs.map((diffPair) => {
                    return diffPair[1];
                }).includes(Math.floor(smallArr.length / 2) - 5)) {
                    makeNote = true;
                }
            }



            // weighted below precise above
            if (this.doWeighted) {
                this.toneVals.push(weightedAve(arrToUse));
                while (this.toneVals.length > this.times.length) {
                    this.toneVals.shift();
                }

                const legSize = 15;
                const mid = Math.floor(this.toneVals.length / 2);
                let maxFound = 0;
                let maxDiffIdx = 0;
                const toneDiffs = this.toneVals.slice(mid - legSize, mid + legSize).map((toneVal, i) => {
                    if (i === 0) {
                        return 0;
                    } else {
                        let toneDiff = toneVal - this.toneVals[i - 1];
                        if (toneDiff < 0) {
                            toneDiff *= -1;
                        }
                        if (toneDiff > maxFound) {
                            maxFound = toneDiff;
                            maxDiffIdx = i;
                        }
                        return toneDiff;
                    }
                });

                // exp
                const aveToneDiff = arrAverage(toneDiffs);
                let sum = 0;
                toneDiffs.forEach((val) => {
                    let thisVar = val - aveToneDiff;
                    if (thisVar < 0) {
                        thisVar *= -1;
                    }
                    sum += thisVar;
                });
                let diffVariance = 1.0 * sum / toneDiffs.length;
                const diffThreshold = 0.85 * aveToneDiff + (diffVariance / aveToneDiff);
                if (toneDiffs[Math.floor(toneDiffs.length / 2)] > diffThreshold) {
                    makeNote = true;
                }
                // end exp

                // if (Math.floor(toneDiffs.length / 2) === maxDiffIdx) {
                //     makeNote = true;
                // }
            }


            // weighted above order below
            if (this.doOrder) {
                const newOrder = arrToUse.map((val, i) => {
                    return [val, i];
                }).sort((a, b) => {
                    if (a[0] > b[0]) {
                        return -1;
                    } else {
                        return 1;
                    }
                }).map((pair, i) => {
                    return [pair[1], i]; // [col, newPos]
                });
                const newRanks = {};
                newOrder.forEach((pair) => {
                    newRanks[pair[0]] = pair[1];
                });
                let diff = 0;
                this.order.forEach((pair) => {
                    const col = pair[0];
                    const oldRank = pair[1];
                    const newRank = newRanks[col];
                    let thisDiff = newRank - oldRank;
                    if (thisDiff < 0) {
                        thisDiff *= -1;
                    }
                    diff += thisDiff;
                });
                this.order = newOrder;
                this.diffs.push(diff);
                while (this.diffs.length > this.times.length) {
                    this.diffs.shift();
                }

                const midIdx = Math.floor(this.diffs.length / 2);
                const leg = 60;
                const midArr = this.diffs.slice(midIdx - leg, midIdx + leg);
                
                // exp
                const maxDiffs = 20;
                const bigDiffs = [];
                for (let i = 0; i < midArr.length; i++) {
                    const thisDiff = midArr[i];
                    if (bigDiffs.length === 0 || thisDiff > bigDiffs[0][0]) {
                        bigDiffs.push([thisDiff, i]); // [size, idx]
                        bigDiffs.sort((a, b) => {
                            if (a[0] > b[0]) {
                                return 1;
                            } else {
                                return -1;
                            }
                        });
                        if (bigDiffs.length > maxDiffs) {
                            bigDiffs.shift();
                        }
                    }
                }

                if (bigDiffs.map((pair) => {
                    return pair[1];
                }).includes(Math.floor(midArr.length / 2))) {
                    makeNote = true;
                    // marked = "yellow";
                }
                // end exp

                // const threshold = 1 * (arrAverage(midArr) + arrVariance(midArr));
                // if (diff > threshold) {
                //     makeNote = true;
                //     marked = "yellow";
                // }
            }

            // average below order above
            if (this.doAverage) {
                arrToUse.forEach((val, arrIdx) => {
                    this.aveArrs[arrIdx].push(val);
                    this.totals[arrIdx] += val;
                });
                while (this.aveArrs[0].length > this.times.length) {
                    for (let i = 0; i < arrToUse.length; i++) {
                        const thisArr = this.aveArrs[i];
                        this.totals[i] -= thisArr.shift();
                    }
                }
    
                for (let i = 0; i < arrToUse.length; i++) {
                    const thisArr = this.aveArrs[i];
                    const thisAverage = 1.0 * this.totals[i] / thisArr.length;
    
                    const legSize = 25;
                    const midIdx = Math.floor(arrToUse.length / 2);
    
                    let sumVariance = 0;
                    if (thisArr.length > 2 * legSize) {
                        for (let j = 0; j < thisArr.length; j++) {
                        // for (let j = midIdx - legSize; j < midIdx + legSize; j++) {
                            let diff = thisArr[j] - thisAverage;
                            if (diff < 0) {
                                diff *= -1;
                            }
                            sumVariance += diff;
                        }
                        const variance = 1.0 * sumVariance / thisArr.length;
                        const diffFactor = 1 + (1.1 * variance / thisAverage);
        
                        const controlIdx = midIdx;
                        const testIdx = controlIdx + 1;
                        
                        if (thisArr[controlIdx] < thisAverage && thisArr[testIdx] > diffFactor * thisAverage) {
                            makeNote = true;
                            // marked = "blue";
                        }
        
                        
                    }
                    
                }
            }



            // every below average above
            if (this.doEvery) {
                arrToUse.forEach((val, arrIdx) => {
                    this.arrs[arrIdx].push(val);
                });
                while (this.arrs[0].length > this.times.length) {
                    for (let i = 0; i < arrToUse.length; i++) {
                        const thisArr = this.arrs[i];
                        thisArr.shift();
                        let remove = false;
                        const thisBiggests = this.biggestsArrs[i];
                        thisBiggests.forEach((bigNote, idx) => {
                            bigNote.idx -= 1;
                            if (bigNote.idx < 0) {
                                remove = idx;
                            }
                        });
                        if (remove !== false) {
                            const first = thisBiggests.slice(0, remove);
                            const second = thisBiggests.slice(remove + 1, thisBiggests.length);
                            this.biggestsArrs[i] = first.concat(second);
                        }
                    }
                }
                for (let i = 0; i < arrToUse.length; i++) {
                    const thisArr = this.arrs[i];
                    if (thisArr.length > 1) {
                        const thisVal = thisArr[thisArr.length - 1];
                        const prevVal = thisArr[thisArr.length - 2];
                        const newDiff = thisVal - prevVal;
                        if (newDiff > 0) { // going up
                            if (this.dirs[i] === -1) {
                                this.lows[i] = prevVal;
                                this.lowIdxs[i] = thisArr.length - 2;
                                this.dirs[i] = 1;
                            }
                        } else { // going down
                            if (this.dirs[i] === 1) {
                                // found a peak
                                const newHeight = prevVal - this.lows[i];
                                const thisBiggests = this.biggestsArrs[i];
                                
                                if (thisBiggests.length > 0) {
    
                                    if (newHeight > thisBiggests[0].height) {
                                        let runner = 0;
                                        while (thisBiggests[runner] && newHeight > thisBiggests[runner].height) {
                                            runner += 1;
                                        }
                                        const first = thisBiggests.slice(0, runner);
                                        const second = thisBiggests.slice(runner, thisBiggests.length);
                                        first.push({ height: newHeight, idx: this.lowIdxs[i] }); // USE LOW AS idx - MAY CHANGE THIS
                                        this.biggestsArrs[i] = first.concat(second);
            
                                        if (thisBiggests.length > this.numBiggests) {
                                            thisBiggests.shift();
                                        }
                                    }
    
                                } else {
                                    this.biggestsArrs[i].push({ height: newHeight, idx: this.lowIdxs[i] });
                                }
    
                                this.dirs[i] = -1;
                            } else {
                                this.lows[i] = prevVal;
                                this.lowIdxs[i] = thisArr.length - 2;
                            }
                        }
                    }
                    if (this.biggestsArrs[i].map((bigNote) => {
                        return bigNote.idx;
                    }).includes(Math.floor(arrToUse.length / 2))) {
                        makeNote = true;
                        // marked = "green";
                    }
                    // if (makeNote) {
                    //     colVal = i;
                    //     break;
                    // }
                }
            }

            
            // sum below, every above
            if (this.doSum) {
                const thisSum = arrSum(arrToUse);
                this.sums.push(thisSum);
                
    
                while(this.sums.length > this.times.length) {
                    this.sums.shift();
    
                    let remove = false;
                    this.biggests.forEach((bigNote, i) => {
                        bigNote.idx -= 1;
                        
                        if (bigNote.idx < 0) {
                            remove = i;
                        }
                    });
                    if (remove !== false) {
                        const first = this.biggests.slice(0, remove);
                        const second = this.biggests.slice(remove + 1, this.biggests.length);
                        this.biggests = first.concat(second);
                    }
                }
    
                if (this.sums.length > 1) {
                    const thisVal = this.sums[this.sums.length - 1];
                    const prevVal = this.sums[this.sums.length - 2];
                    const newDiff = thisVal - prevVal;
                    if (newDiff > 0) { // going up
                        if (this.dir === -1) {
                            // found a low
                            this.low = prevVal;
                            this.lowIdx = this.sums.length - 2;
                            this.dir = 1;
                        }
                    } else {    // going down
                        if (this.dir === 1) {
                            // found a high
                            const newHeight = prevVal - this.low;
                        
                            if (this.biggests.length > 0) {
    
                                if (newHeight > this.biggests[0].height) {
                                    let runner = 0;
                                    while (this.biggests[runner] && newHeight > this.biggests[runner].height) {
                                        runner += 1;
                                    }
                                    const first = this.biggests.slice(0, runner);
                                    const second = this.biggests.slice(runner, this.biggests.length);
                                    first.push({ height: newHeight, idx: this.lowIdx }); // USE LOW AS idx - MAY CHANGE THIS
                                    this.biggests = first.concat(second);
        
                                    if (this.biggests.length > this.numBiggestsSum) {
                                        this.biggests.shift();
                                    }
                                }
                            } else {
                                this.biggests.push({ height: newHeight, idx: this.lowIdx });
                            }
    
                            this.dir = -1;
                        } else {
                            this.low = thisVal;
                            this.lowIdx = this.sums.length - 1;
                        }
                    }
                }
                if (this.biggests.map((bigNote) => {
                    return bigNote.idx;
                }).includes(Math.floor(arrToUse.length / 2))) {
                    makeNote = true;
                    marked = "orange";
                }
            }
            // sum above


            
            if (makeNote) {

                let toneValToUse = weightedAve(arrToUse);
                const slideToRequest = this.getSlideToUse(toneValToUse, slideIds.length);
                
                if (colVal !== false) {
                    toneValToUse = colVal;
                }
                this.attemptNoteWrite({
                    slideToUse: slideToRequest,
                    slideIds: slideIds,
                    noteVal: toneValToUse,
                    toneVal: toneValToUse,
                    addNote: this.addNote,
                    marked: marked,
                    mobile: true,
                    notesPerSecond: notesPerSecond
                });
            }
        }
        
    }

    getSlideToUse(toneVal, numSlides) {
        const sortedTones = this.recentToneVals.map((val) => {
            return val;
        }).sort();

        // exp - also involves having 16 recents instead of only 3 - see constructor
        // let i = 0;
        // while (toneVal > sortedTones[i]) {
        //     i += 1;
        // }
        // if (numSlides === 4) {
        //     if (i < 4) {
        //         return "slide-left";
        //     }
        //     if (i < 8) {
        //         return "slide-a";
        //     }
        //     if (i < 12) {
        //         return "slide-b";
        //     }
        //     return "slide-right";
        // }
        // end exp

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
            // if (!this.lastValTime || performance.now() - this.lastValTime > (gap - 1)) {
                this.recentToneVals.push(toneVal);
                this.lastValTime = performance.now();
                this.recentToneVals.shift();
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