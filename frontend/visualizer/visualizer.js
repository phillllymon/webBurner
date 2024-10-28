console.log("hello world");

let song;
let dataArray;
let now = performance.now();
let animating = false;
let playAnimating = false;
let analyser;
let songTime = 0.0;

const rowWidths = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

const line = document.getElementById("vertical");

document.getElementById("file-input").addEventListener("change", (e) => {

    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (readerE) => {
        const str = btoa(readerE.target.result);
        const newSongData = `data:audio/x-wav;base64,${str}`;
        song = new Audio(newSongData);

        const audioCtx = new AudioContext();
        const audioSource = audioCtx.createMediaElementSource(song);
        analyser = audioCtx.createAnalyser();
        audioSource.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 32;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        // dataArray = new Float32Array(analyser.frequencyBinCount);

        song.addEventListener("ended", () => {
            animating = false;
        });
    };
    reader.readAsBinaryString(file);
});

document.getElementById("row0").addEventListener("click", (e) => {
    song.currentTime = 1.0 * e.clientX / 100;
});

document.getElementById("play-button").addEventListener("click", () => {
    song.play();
    now = performance.now();

    animating = true;
    animate();
});
document.getElementById("pause-button").addEventListener("click", () => {
    song.pause();
    animating = false;
    playAnimating = false;
});
document.getElementById("restart-button").addEventListener("click", () => {
    song.currentTime = 0;
});
document.getElementById("play-normal").addEventListener("click", () => {
    song.play();
    // playAnimate();
    // playAnimating = true;
    setInterval(() => {
        line.style.left = `${100.0 * song.currentTime}px`;
    }, 20);
});

function playAnimate() {
    console.log(song.currentTime);
    line.style.left = `${100.0 * song.currentTime}px`;
    console.log(line.style.left);
    // if (playAnimating) {
    //     requestAnimationFrame(playAnimate);
    // }

}

function animate() {
    songTime += 0.01;
    song.currentTime = songTime;
    // analyser.getFloatFrequencyData(dataArray);
    // console.log(dataArray);
    analyser.getByteFrequencyData(dataArray);
    dataArray.forEach((val, i) => {
        const newCol = document.createElement("div");
        newCol.classList.add("col");
        newCol.style.height = `${100.0 * (val * val / 65025)}px`;
        // newCol.style.height = `${100.0 * (val / 255)}px`;
        const rowId = `row${i}`;
        const row = document.getElementById(rowId);
        rowWidths[i] += 1;
        row.style.width = `${rowWidths[i]}px`;
        row.appendChild(newCol);
    });

    if (animating) {
        const newTime = performance.now();
        const dt = newTime - now;
        now = newTime;
        setTimeout(animate, Math.max(0, 10 - dt));
    }
}