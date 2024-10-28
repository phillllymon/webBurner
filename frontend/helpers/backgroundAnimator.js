import { averageOf } from "./util.js";

export class BackgroundAnimator {
    constructor(masterInfo) {
        this.masterInfo = masterInfo;
        this.valsQueue = []; // contains objects in form [valsArr, timestamp]
        this.initializeColors();
        this.initializeBackground();
    }

    addValsArrayToQueue(vals) {
        this.valsQueue.push([vals, performance.now()]);
    }

    // newVals is CURRENT vals - we'll store it for later and use the older one
    animateBackground(newVals) {

        if (!this.masterInfo.animatedBackground) {
            return;
        }
        
        this.addValsArrayToQueue(newVals);
        // const targetTime = performance.now() - this.masterInfo.songDelay + masterInfo.autoAdjustment;
        const targetTime = performance.now() - this.masterInfo.songDelay;
        let valsToUse = null;
        let numObselete = 0;

        for (let i = 0; i < this.valsQueue.length; i++) {
            const thisVal = this.valsQueue[i];
            if (thisVal[1] < targetTime) {
                numObselete += 1;
            } else {
                valsToUse = thisVal[0];

                // smooth out valsToUse since we have no longer smooth in analyse
                // if (i > 7) {
                //     const valsArrsToUse = [
                //         this.valsQueue[i][0],
                //         this.valsQueue[i - 1][0],
                //         this.valsQueue[i - 2][0],
                //         this.valsQueue[i - 3][0],
                //         this.valsQueue[i - 4][0],
                //         this.valsQueue[i - 5][0],
                //         this.valsQueue[i - 6][0],
                //         this.valsQueue[i - 7][0]
                //     ];
                //     valsToUse = [];
                //     for (let j = 0; j < thisVal[0].length; j++) {
                //         valsToUse.push(averageOf(valsArrsToUse.map((arr) => {
                //             return arr[0];
                //         })));
                //     }
                // }

                break;
            }
        }

        for (let i = 0; i < numObselete; i++) {
            this.valsQueue.shift();
        }
        if (document.mobile) {
            this.changeColors();

            const colsToUse = this.colors.map((row) => {
                return row.map((col) => {
                    return col[0];
                }).join(",");
            });
            document.getElementById("play-area").style.backgroundColor = `rgb(${colsToUse[2]})`;
            const left = document.getElementById("background-left");
            const right = document.getElementById("background-right");

            const leftRightColor = this.masterInfo.onFire ? "255, 0, 0" : colsToUse[0];
            
            left.style.background = `linear-gradient(
                to left,
                rgba(${colsToUse[0]}, 0) 0%,
                rgba(${colsToUse[0]}, 1) 100%)`;
            right.style.background = `linear-gradient(
                to right,
                rgba(${colsToUse[0]}, 0) 0%,
                rgba(${colsToUse[0]}, 1) 100%)`;
            document.getElementById("fog-mobile-top").style.backgroundColor = `rgb(${colsToUse[0]})`;
            document.getElementById("fog-mobile-gradient").style.background = `linear-gradient(
                to top,
                rgba(${colsToUse[0]}, 0) 0%,
                rgba(${colsToUse[0]}, 1) 100%)`;

            let total = 0;

            // determine new widths for colors
            valsToUse.forEach((val) => {
                total += val;
            });

            // old
            // const percent = 100.0 * valsToUse[3] / total;

            // exp - old above
            const thisVal = valsToUse[4];

            if (this.distVals) {
                this.distVals.push(thisVal);
                if (this.distVals.length > 80) {
                    while (this.distVals.length > 80) {
                        this.distVals.shift();
                    }
                }
            } else {
                this.distVals = [thisVal];
            }
            const distMin = Math.min(...this.distVals);
            const distMax = Math.max(...this.distVals);

            const percent = 100.0 - (100.0 * (thisVal - distMin) / (distMax - distMin));
            
            if (this.percents) {
                this.percents.push(percent);
                if (this.percents.length > 5) {
                    while (this.percents.length > 5) {
                        this.percents.shift();
                    }
                }
            } else {
                this.percents = [percent];
            }

            const percentToUse = averageOf(this.percents);

            const adjustedPercent = Math.pow(0.4 * percentToUse, 0.75);
            // end exp

            left.style.width = `${5 + adjustedPercent}%`;
            right.style.width = `${5 + adjustedPercent}%`;

        } else {
            if (valsToUse) {
                let total = 0;
                
    
                // determine new widths for colors
                valsToUse.forEach((val) => {
                    total += val;
                });
                if (total > 0) {
                    const fractions = valsToUse.map((val) => {
                        return (1.0 * val) / total;
                    });
                    const a = fractions[0] * 60;
                    const b = a + 10;
                    const c = b + (fractions[1] * 60);
                    const d = c + 10;
                    const e = d + (fractions[2] * 60);
                    const f = e + 10;
    
                    this.changeColors();
    
                    const colsToUse = this.colors.map((row) => {
                        return row.map((col) => {
                            return col[0];
                        }).join(",");
                    });
                    
                    ["background-left", "fog-top-left", "fog-middle-left", "fog-gradient-left"].forEach((eleId) => {
                        document.getElementById(eleId).style.background = `linear-gradient(
                            to right,
                            rgba(${colsToUse[0]},1.0) ${a}%,
                            rgba(${colsToUse[1]},1.0) ${b}% ${c}%,
                            rgba(${colsToUse[2]},1.0) ${d}% ${e}%,
                            rgba(${colsToUse[3]},1.0) ${f}%
                        )`
                    });
                    ["background-right", "fog-top-right", "fog-middle-right", "fog-gradient-right"].forEach((eleId) => {
                        document.getElementById(eleId).style.background = `linear-gradient(
                            to left,
                            rgba(${colsToUse[0]},1.0) ${a}%,
                            rgba(${colsToUse[1]},1.0) ${b}% ${c}%,
                            rgba(${colsToUse[2]},1.0) ${d}% ${e}%,
                            rgba(${colsToUse[3]},1.0) ${f}%
                        )`;
                    });
                }
            }

        }
        
    }

    changeColors() {
        this.colors.forEach((row, rIdx) => {
            return row.map((color, cIdx) => {
                if (Math.random() > 0.9) {
                    color[1] = color[1] === 1 ? -1 : 1
                }
                const nextIdx = rIdx === this.colors.length - 1 ? rIdx : rIdx + 1;
                const maxVal = rIdx === this.colors.length - 1 ? 250 : this.colors[nextIdx][cIdx][0];
                if (color[0] > maxVal - 5 && color[1] === 1) {
                    color[1] = -1;
                }
                if (color[0] < 40 && color[1] === -1) {
                    color[1] = 1;
                }
                // exp
                if (this.masterInfo.onFire) {
                    if (rIdx === 2) {
                        if (cIdx === 0 && color[0] < 255) {
                            color[1] = 1;
                        } else if (color[0] > 0) {
                            color[1] = -1;
                        }
                    }
                } else {
                    if (rIdx === 2 && this.masterInfo.puttingOutFire) {
                        if (cIdx === 0) {
                            if (color[0] > 150) {
                                color[1] = -1;
                            }
                        } else {
                            if (color[0] < 150) {
                                color[1] = 1;
                            }
                        }
                    }
                }
                // end exp
                if (Math.random() > 0.8) {
                    color[0] += color[1] * Math.floor(3 * Math.random());
                }
            });
        });
    }

    initializeColors() {
        const a1 = Math.floor(100 * Math.random());
        const a2 = Math.floor(100 * Math.random());
        const a3 = Math.floor(100 * Math.random());
        const b1 = Math.floor(a1 + ((255 - a1) * Math.random()));
        const b2 = Math.floor(a2 + ((255 - a2) * Math.random()));
        const b3 = Math.floor(a3 + ((255 - a3) * Math.random()));
        const c1 = Math.floor(b1 + ((255 - b1) * Math.random()));
        const c2 = Math.floor(b2 + ((255 - b2) * Math.random()));
        const c3 = Math.floor(b3 + ((255 - b3) * Math.random()));
        const d1 = Math.floor(c1 + ((255 - c1) * Math.random()));
        const d2 = Math.floor(c2 + ((255 - c2) * Math.random()));
        const d3 = Math.floor(c3 + ((255 - c3) * Math.random()));
        this.colors = [
            [[a1, 1], [a2, -1], [a3, 1]],
            [[b1, -1], [b2, 1], [b3, -1]],
            [[c1, 1], [c2, -1], [c3, 1]],
            [[d1, -1], [d2, 1], [d3, -1]]
        ];
    }

    initializeBackground() {
        if (!document.mobile) {
            const colsToUse = this.colors.map((row) => {
                return row.map((col) => {
                    return col[0];
                }).join(",");
            });
            ["background-left", "fog-top-left", "fog-middle-left", "fog-gradient-left"].forEach((eleId) => {
                document.getElementById(eleId).style.background = `linear-gradient(
                    to right,
                    rgba(${colsToUse[0]},1.0) 20%,
                    rgba(${colsToUse[1]},1.0) 30% 45%,
                    rgba(${colsToUse[2]},1.0) 55% 70%,
                    rgba(${colsToUse[3]},1.0) 80%
                )`
            });
            ["background-right", "fog-top-right", "fog-middle-right", "fog-gradient-right"].forEach((eleId) => {
                document.getElementById(eleId).style.background = `linear-gradient(
                    to left,
                    rgba(${colsToUse[0]},1.0) 20%,
                    rgba(${colsToUse[1]},1.0) 30% 45%,
                    rgba(${colsToUse[2]},1.0) 55% 70%,
                    rgba(${colsToUse[3]},1.0) 80%
                )`;
            });
        }
    }

    initializeMobileBackground() {
        const colsToUse = this.colors.map((row) => {
            return row.map((col) => {
                return col[0];
            }).join(",");
        });
        document.getElementById("play-area").style.backgroundColor = `rgb(${colsToUse[2]})`;
        document.getElementById("background-left").style.background = `linear-gradient(
            to left,
            rgba(${colsToUse[1]}, 0) 0%,
            rgba(${colsToUse[1]}, 1) 100%)`;
        document.getElementById("background-right").style.background = `linear-gradient(
            to right,
            rgba(${colsToUse[1]}, 0) 0%,
            rgba(${colsToUse[1]}, 1) 100%)`;
        document.getElementById("fog-mobile").classList.remove("hidden");
        document.getElementById("fog-mobile-top").style.backgroundColor = `rgb(${colsToUse[0]})`;
        document.getElementById("fog-mobile-gradient").style.background = `linear-gradient(
            to top,
            rgba(${colsToUse[0]}, 0) 0%,
            rgba(${colsToUse[0]}, 1) 100%)`;
    }
}