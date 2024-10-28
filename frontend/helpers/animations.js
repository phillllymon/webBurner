export function lightUp(slideId, tapperId) {
    // console.log("LIGHT UP WOO! " + slideId);

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

export function flyAway(slideId, tapperId, numSlides) {
    // console.log("fly " + slideId);

    let leavingClass = "note-leaving-left";
    if (slideId === "slide-b" || slideId === "slide-right") {
        leavingClass = "note-leaving-right";
    }
    if (slideId === "slide-a" && numSlides === 3 && Math.random() > 0.5) {
        leavingClass = "note-leaving-right";
    }

    const leavingNote = document.createElement("div");
    leavingNote.classList.add("note");
    leavingNote.classList.add(leavingClass);
    document.getElementById(tapperId).appendChild(leavingNote);
    setTimeout(() => {
        leavingNote.remove();
    }, 1000);
}