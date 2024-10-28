import {
    getUserProfile,
    setUserProfile
} from "./util.js";

export class StatsManager {
    constructor(masterInfo) {
        this.masterInfo = masterInfo;
        this.resetCounters();
        this.streaks = { // keep track of highest streaks achieved this session - we don't want to reset this in resetCounters()
            l1: 0,
            l2: 0,
            l3: 0,
            l4: 0,
            l5: 0
        };
        this.currentStreak = 0;
        this.activateMenuButtons();
        // setTimeout(() => {
        //     this.populateData().then(() => {
        //         this.getPreviousStreak();
        //     });
        // }, 5000);
    }

    setup() {
        return new Promise((resolve) => {
            this.populateData().then(() => {
                this.getPreviousStreak().then(() => {
                    this.masterInfo.streak = this.currentStreak;
                    resolve();
                });
            });
        });
    }

    getPreviousStreak() {
        return new Promise((resolve) => {
            getUserProfile().then((profile) => {
                this.streaks[`l${profile.stats.streakLevel}`] = profile.stats.currentStreak;
                this.currentStreak = profile.stats.currentStreak;
                this.currentStreakLevel = profile.stats.streakLevel;
                resolve();
            });
        })
    }

    resetCounters() {
        this.notesHit = {
            l1: 0,
            l2: 0,
            l3: 0,
            l4: 0,
            l5: 0
        };
        this.notesMissed = {
            l1: 0,
            l2: 0,
            l3: 0,
            l4: 0,
            l5: 0
        };
        this.notesHitOnFire = 0;
    }

    updateInfo() {
        // console.log("UPDATE");
        this.updateProfile().then(() => {
            // console.log("about to populate data");
            this.populateData();
        });
    }

    updateProfile() {
        // console.log("+++++++++++");
        // console.log(this.notesHit);
        // console.log(this.notesMissed);
        // console.log("+++++++++++");

        return new Promise((resolve) => {
            getUserProfile().then((profile) => {
                // console.log("&&&&&&");
                // console.log(this.streaks);
                ["l1", "l2", "l3", "l4", "l5"].forEach((level) => {
                    if (this.streaks[level] > profile.stats.streaks[level]) {
                        profile.stats.streaks[level] = this.streaks[level];
                    }

                    const fractionHitOld = 1.0 * profile.stats.accuracy[level] / 100.0;
                    const totalNotesOld = fractionHitOld === 0 ? 0 : 1.0 * profile.stats.notesHit[level] / fractionHitOld;
                    const notesMissedOld = totalNotesOld - profile.stats.notesHit[level];
    
                    const newNotesHit = profile.stats.notesHit[level] + this.notesHit[level];
                    const newNotesMissed = notesMissedOld + this.notesMissed[level];
                    const newAccuracy = 1.0 * Math.round((1000.0 * newNotesHit) / (newNotesHit + newNotesMissed)) / 10;
    
                    // console.log(newNotesHit, newNotesMissed, newAccuracy);

                    profile.stats.accuracy[level] = newAccuracy;
                    profile.stats.notesHit[level] += this.notesHit[level];
                });
                profile.stats.notesHitOnFire += this.notesHitOnFire;
                profile.stats.currentStreak = this.currentStreak;
                
                this.resetCounters();
                // console.log("POOOOOP");
                this.updateRank(profile);
                setUserProfile(profile).then(() => {
                    // console.log(profile.stats);
                    resolve();
                });
            });
        });
    }

    updateRank(profile) {
        let rank = "groupie";
        const totalNotes = profile.stats.notesHit.l1 + profile.stats.notesHit.l2 + profile.stats.notesHit.l3 + profile.stats.notesHit.l4 + profile.stats.notesHit.l5;
        if (totalNotes > 1000) {
            rank = "backup bass";
        }
        if (totalNotes > 10000) {
            rank = "lead guitar";
        }
        if (totalNotes > 30000) {
            rank = "pop star";
        }
        if (totalNotes > 80000) {
            rank = "rock icon";
        }
        if (totalNotes > 150000) {
            rank = "music legend";
        }
        if (totalNotes > 300000) {
            rank = "beat burner";
        }
        profile.stats.rank = rank;
    }

    recordNoteHit(level, onFire = false) {
        this.notesHit[`l${level}`] += 1;
        if (onFire) {
            this.notesHitOnFire += 1;
        }
        this.currentStreak += 1;
        if (level < this.currentStreakLevel) {
            this.currentStreakLevel = level; // record streak at lowest level occurring during it
            getUserProfile().then((profile) => {
                profile.stats.streakLevel = this.currentStreakLevel;
                setUserProfile(profile);
            });
        }
    }

    recordNoteMissed(level) {
        // console.log("JJJJJ " + this.currentStreakLevel);
        this.notesMissed[`l${level}`] += 1;
        if (this.currentStreak > this.streaks[`l${this.currentStreakLevel}`]) {
            this.streaks[`l${this.currentStreakLevel}`] = this.currentStreak;
        }
        this.currentStreak = 0;
        this.currentStreakLevel = 6; // hack so it'll be set correctly on the first note hit in the streak
    }

    activateMenuButtons() {
        document.getElementById("show-stats").addEventListener("click", () => {
            document.getElementById("stats-modal").classList.remove("hidden");
        });
        document.getElementById("close-stats-button").addEventListener("click", () => {
            document.getElementById("stats-modal").classList.add("hidden");
        });
    }

    populateData() {
        return new Promise((resolve) => {
            // console.log("A");
            getUserProfile().then((profile) => {
                if (profile.stats) {
                    // console.log("-------");
                    // console.log(profile.stats);
                    document.getElementById("stats-rank").innerText = profile.stats.rank;
                    [
                        ["stats-super-easy-streak", profile.stats.streaks.l1],
                        ["stats-easy-streak", profile.stats.streaks.l2],
                        ["stats-medium-streak", profile.stats.streaks.l3],
                        ["stats-hard-streak", profile.stats.streaks.l4],
                        ["stats-crazy-hard-streak", profile.stats.streaks.l5]
                    ].forEach((pair) => {
                        document.getElementById(pair[0]).innerText = pair[1];
                    });
                    [
                        ["stats-super-easy-percent", profile.stats.accuracy.l1],
                        ["stats-easy-percent", profile.stats.accuracy.l2],
                        ["stats-medium-percent", profile.stats.accuracy.l3],
                        ["stats-hard-percent", profile.stats.accuracy.l4],
                        ["stats-crazy-hard-percent", profile.stats.accuracy.l5]
                    ].forEach((pair) => {
                        if (!pair[1]) {
                            document.getElementById(pair[0]).innerText = `- %`;
                        } else {
                            document.getElementById(pair[0]).innerText = `${pair[1]} %`;
                        }
                    });
                    const totalNotes = profile.stats.notesHit.l1 + profile.stats.notesHit.l2 + profile.stats.notesHit.l3 + profile.stats.notesHit.l4 + profile.stats.notesHit.l5;
                    const onFireNotes = profile.stats.notesHitOnFire;
                    document.getElementById("stats-total-notes-hit").innerText = totalNotes;
                    let percentOnFire = Math.round(1000.0 * onFireNotes / totalNotes);
                    if (percentOnFire > 0) {
                        percentOnFire /= 10.0;
                    } else {
                        percentOnFire = "-";
                    }
                    document.getElementById("stats-notes-hit-on-fire").innerText = `${onFireNotes} (${percentOnFire} %)`;
                    resolve();
                } else {
                    profile.stats = {
                        currentStreak: 0,
                        streakLevel: 6,
                        notesHitOnFire: 0,
                        rank: "groupie",
                        streaks: {
                            l1: 0,
                            l2: 0,
                            l3: 0,
                            l4: 0,
                            l5: 0
                        },
                        accuracy: { // stored as percent
                            l1: 100,
                            l2: 100,
                            l3: 100,
                            l4: 100,
                            l5: 100
                        },
                        notesHit: {
                            l1: 0,
                            l2: 0,
                            l3: 0,
                            l4: 0,
                            l5: 0
                        }
                    }
                    setUserProfile(profile).then(() => {
                        resolve();
                    });
                }
            });
        });
    }
}