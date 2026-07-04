// use our exaclifont!
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ["Excalifont", "sans-serif"]
            }
        }
    }
};

// umm code starts here??

async function onloaded() {
    fetch("https://api.alimad.co/github/info").then(r => r.json()).then(d => onGithub(d));
}

async function onGithub(data) {
    // data recieved, saturate
}

document.addEventListener("DOMContentLoaded", () => {
    onloaded();
})

console.log("Yup, its loaded");