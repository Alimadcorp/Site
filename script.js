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

const $ = (id) => document.getElementById(id);
const esc = (e) => e.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function onloaded() {
    fetch("https://api.alimad.co/github/info").then(r => r.json()).then(d => onGithub(d));
    (function live() { fetch("https://live.alimad.co/ping?app=alimadhomepage").then(r => r.text()).then(d => { onLive(d); setTimeout(live, 10000); }); })(); // trigger an initial load of online users, then call the function 15 seconds after successfully getting the count previously :sob:
    fetch("https://live.alimad.co/stats?app=alimadhomepage").then(r => r.json()).then(d => onLive(d));
    fetch("https://log.alimad.co/api/pull?channel=comments:alimadhomepage").then(r => r.json()).then(d => onComments(d));
}

async function onComments(data) {
    data = data.logs;
    // format:
    // [{ channel, country, status, text, time (all strings) }]
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
        return `<div class="flex flex-col sm:flex-row sm:items-baseline gap-x-2 gap-y-0 mt-1 text-sm lg:text-base text-gray-300"><p class="break-words min-w-0">Committed "<a class="text-white hover:underline font-medium" href="https://github.com/${repo}/commit/${sha}">${commit}</a>" to <a class="text-white hover:underline font-medium" href="https://github.com/${repo}">${repo.replace("Alimadcorp/", "")}</a></p><span class="text-xs text-gray-400 shrink-0 whitespace-nowrap cursor-help" title="${fullDate}">${timeago.format(time)}</span></div>`;
        // looks a lil cramped up, but minimal is better :3
    }

    $("gh_activity").innerHTML = "";
    for (let obj of data.latest) {
        $("gh_activity").innerHTML += el(obj.message, obj.sha, obj.repo, obj.time);
    }

    const bar = (name, percent) => {
        return `<p>${esc(name)}</p><div class="w-full bg-gray-900 h-1.5 rounded-full" title="${percent}"><div class="w-[${percent}] h-full bg-white rounded-full" title="${percent}"></div></div>`;
    }

    $("langs").innerHTML = "";
    for (let [key, value] of Object.entries(data.langs)) {
        $("langs").innerHTML += bar(key, value);
    }

    document.querySelectorAll("a").forEach(el => {
        if (el.href && el.hostname !== window.location.hostname) el.target = "_blank"; // make all external links open in new tabs
    });
}

document.addEventListener("DOMContentLoaded", () => {
    onloaded();
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
    }, 7);
});