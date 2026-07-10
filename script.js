// use our font!
function setFont(font) {
    tailwind.config = {
        theme: {
            extend: {
                fontFamily: {
                    sans: [font, "sans-serif"]
                }
            }
        }
    };
}

const setUbuntu = () => { setFont("Ubuntu"); readmode.style.display = "none"; }
const setExcalifont = () => setFont("Excalifont");

let finito = false;

const endexpand = () => {
    if (!finito) {
        finito = true;
        fetch("https://live.alimad.co/ping?app=finish:about");
    }
};

setExcalifont();

const $ = (id) => document.getElementById(id);
const esc = (e) => e.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const loadComments = () => fetch("https://log.alimad.co/api/pull?channel=comments:alimadhomepage").then(r => r.json()).then(d => onComments(d));

const postComment = async (text) => {
    if (text == "" || typeof text != "string") return;
    $("c-input").disabled = $("c-post").disabled = true;
    await fetch("https://log.alimad.co/api/log?channel=comments:alimadhomepage&text=" + text);
    $("c-input").disabled = $("c-post").disabled = false;
    $("c-input").value = "";
    loadComments();
};

async function onloaded() {
    fetch("https://api.alimad.co/info").then(r => r.json()).then(d => onGithub(d));
    (function live() { fetch("https://live.alimad.co/ping?app=alimadhomepage").then(r => r.text()).then(d => { onLive(d); setTimeout(live, 10000); }); })(); // trigger an initial load of online users, then call the function 15 seconds after successfully getting the count previously :sob:
    fetch("https://live.alimad.co/stats?app=alimadhomepage").then(r => r.json()).then(d => onLive(d));
    loadComments();
}

// comment

async function onComments(data) {
    data = data.logs;
    // format:
    // [{ channel, country, status, text, time (all strings) }]
    $("comments").innerHTML = "";
    for (let c of data) {
        $("comments").innerHTML += `<p class="pt-1">${esc(c.text)} <span class="text-neutral-500 text-xs ml-1">${timeago.format(new Date(c.time))}</span></p>`;
    }
    setTimeout(() => $("comments").scrollTop = $("comments").scrollHeight, 50); // wait for elemnt to saturate and settle, then scroll to bottom
}

async function onLive(data) {
    // format: string number || { totalPings, uniqueIds, onlineCount, lastPing }
    if (typeof data == "object") {
        for (let key of ["totalPings", "uniqueIds"]) {
            $(key).textContent = data[key];
            $(key).classList.add("text-white");
        }
    } else if (typeof data == "string") {
        $("online").textContent = data;
        $("online").classList.add("text-white");
    }
}

async function onGithub(data) {
    // data recieved, saturate
    // due to our specific id naming, we can make this code rlly smoll to do the thing haha
    for (let key of ["rank", "total_public_repos", "total_stars_earned", "total_prs", "total_commits", "contributed_to"]) {
        $(key).textContent = data[key];
        $(key).classList.add("text-white");
    }

    // saturate github activity
    const el = (commit, sha, repo, time) => {
        commit = esc(commit); // avoid being xssed lol
        time = new Date(time);
        const fullDate = time.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `<div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-x-2 py-2 border-b border-neutral-800/40 text-sm text-neutral-300"><p class="break-words min-w-0">Committed "<a class="text-emerald-400 hover:underline font-medium" href="https://github.com/${repo}/commit/${sha}">${commit}</a>" to <a class="text-neutral-200 hover:underline font-medium" href="https://github.com/${repo}">${repo.replace("Alimadcorp/", "")}</a></p><span class="text-xs text-neutral-500 shrink-0 whitespace-nowrap cursor-help" title="${fullDate}">${timeago.format(time)}</span></div>`;
    }

    $("gh_activity").innerHTML = "";
    for (let obj of data.latest) {
        $("gh_activity").innerHTML += el(obj.message, obj.sha, obj.repo, obj.time);
    }

    const bar = (name, percent) => {
        return `<p class="text-xs font-medium">${esc(name)}</p><div class="w-full bg-neutral-900 h-2 overflow-hidden" title="${percent}"><div class="h-full bg-emerald-500" style="width: ${percent}" title="${percent}"></div></div>`;
    }

    $("langs").innerHTML = "";
    for (let [key, value] of Object.entries(data.langs)) {
        $("langs").innerHTML += bar(key, value);
    }

    document.querySelectorAll("a").forEach(el => {
        if (el.href && el.hostname !== window.location.hostname) el.target = "_blank"; // make all external links open in new tabs
    });
}

function onHackatime(data) {
    const htContainer = $("hackatime-container");
    if (!htContainer) return;
    if (data.project && data.project.key) {
        $("ht-project").textContent = data.project.key;
        const hours = Math.floor(data.project.total / 3600);
        const minutes = Math.floor((data.project.total % 3600) / 60);
        $("ht-total").textContent = `(${hours}h ${minutes}m)`;
    } else {
        $("ht-project").textContent = "No active projects right now";
        $("ht-total").textContent = "";
    }
    if (data.time_today.startsWith("Start")) data.time_today = "0h 0m";
    $("ht-today").textContent = data.time_today || "0h 0m";
    $("ht-streak").textContent = data.streak || 0;
    htContainer.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    if (path == "/") {
        onloaded();

        $("c-input").addEventListener("keydown", (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            postComment($("c-input").value);
        });

        $("c-post").addEventListener("click", () => {
            postComment($("c-input").value);
        });
    } else {
        if (path.startsWith("/projects")) {
            fetch("https://api.alimad.co/info").then(r => r.json()).then(d => onHackatime(d.hackatime));
        }

        document.querySelectorAll("a").forEach(el => {
            if (el.href && el.hostname !== window.location.hostname) el.target = "_blank"; // make all external links open in new tabs, for pages other than home, do this on content loaded
        });
    }

    const time = $("time");
    const timeOptions = {
        timeZone: "Asia/Karachi",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    };
    setInterval(() => {
        time.textContent = new Date().toLocaleTimeString('en-US', timeOptions);
    }, 500);
});