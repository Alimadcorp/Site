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

let liveApp = "";
let commentApp = "";
let prod = false; // whether the site is on localhost or production

const loadComments = (page = "alimadhomepage") => {
  commentApp = page;
  fetch("https://log.alimad.co/api/pull?channel=comments:" + page).then(r => r.json()).then(d => onComments(d));
};

const setupComments = (page) => {
  $("c-input").addEventListener("keydown", (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      postComment($("c-input").value);
    }
  });

  $("c-post").addEventListener("click", () => {
    postComment($("c-input").value);
  });

  setInterval(() => $("c-post").disabled = !$("c-input").value.trim(), 500);
}

const setupSubs = (page) => {
  $("s-input").addEventListener("keydown", (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      subscribe($("s-input").value);
    }
  });

  $("s-subscribe").addEventListener("click", () => {
    subscribe($("s-input").value);
  });

  setInterval(() => $("s-subscribe").disabled = !$("s-input").value.trim(), 500);
}

const subscribe = async (text) => {
  if (text == "" || typeof text != "string") return;
  $("s-input").disabled = $("s-subscribe").disabled = true;
  await fetch(`https://log.alimad.co/api/log?channel=subscribe:${commentApp}&text=${text}`);
  $("s-input").disabled = $("s-subscribe").disabled = false;
  $("s-input").value = "";
  $("subb").innerHTML = "We've added you to the newsletter, thanks for subscribing! Here's a heart <3";
  $("s-div").style.display = "none";
};

const postComment = async (text) => {
  if (text == "" || typeof text != "string") return;
  $("c-input").disabled = $("c-post").disabled = true;
  await fetch(`https://log.alimad.co/api/log?channel=comments:${commentApp}&text=${text}`);
  $("c-input").disabled = $("c-post").disabled = false;
  $("c-input").value = "";
  loadComments();
};

function setupLive(app) {
  liveApp = app;
  // trigger an initial load of online users, then call the function 15 seconds after successfully getting the count previously :sob:
  (
    function live() {
      fetch(`https://live.alimad.co/ping?app=${app}:online`).then(r => r.text()).then(d => onLive(d));
      if (!window.lives) {
        setInterval(live, 15000); // start interval if it doesnt already exist
        window.lives = true;
      }
    }
  )();

  const getVisits = () => fetch(`https://live.alimad.co/stats?app=${app}`).then(r => r.json()).then(d => onLive(d));

  if (shouldLog(app)) fetch(`https://live.alimad.co/ping?app=${app}`).then(_ => getVisits());
  else getVisits();
  // we have 2 keys, one to count visits, one to count currently online users, as if we fetch the key every 15 seconds, it would count a "visit" every 15 seconds :sob:
}

async function onloaded() { // only called when on main page
  // check if we are in a production or development environment
  prod = !(/^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|\[::1\])$/.test(window.location.hostname) || window.location.protocol === 'file:');
  // (got this snippet from a random ahh website)

  fetch(prod ? "https://api.alimad.co/info" : "http://localhost:5501/info").then(r => r.json()).then(d => onGithub(d));
  setupLive("alimad.co");
  loadComments();
  setupComments();
  setupSubs();
}

// make sure that if a user rapidly refreshes the page, do not log visits, this reduces inflation of visits
function shouldLog(app) {
  const key = "live.alimad.co:lastLog:" + app;
  const lastLog = new Date(localStorage.getItem(key));
  if ((new Date() - lastLog) > 30000) {
    localStorage.setItem(key, (new Date()).toISOString());
    return true;
  }
  return false;
}

// comments
async function onComments(data) {
  data = data.logs;
  // format:
  // [{ channel, country, status, text, time (all strings) }]
  $("comments").innerHTML = "";
  if (data.length == 0) $("comments").innerHTML = "<p>No comments yet, be the first to leave one!</p>"
  for (let c of data) {
    $("comments").innerHTML += `<p class="pt-1">${esc(c.text)} <span class="text-neutral-500 text-xs ml-1">${timeago.format(new Date(c.time))}</span></p>`;
  }
  // wait for elemnt to saturate and settle, then scroll to bottom
  setTimeout(() => $("comments").scrollTop = $("comments").scrollHeight, 50);
}

async function onLive(data) {
  // format: string number || { totalPings, uniqueIds, onlineCount, lastPing }
  if (typeof data == "object") {
    for (let key of ["totalPings", "uniqueIds", "onlineCount"]) {
      $(key).textContent = data[key];
      // use toggle true instead of add to avoid dupes
      $(key).classList.toggle("text-white", true);
      const diff = processLocalCount(key, data[key]);
      if (diff > 0) {
        $("d" + key).textContent = `(+${diff})`;
      }
    }
  } else if (typeof data == "string") {
    $("onlineCount").textContent = data;
    $("onlineCount").classList.toggle("text-white", true);
  }
}

function processLocalCount(key, val) {
  const p = "live.alimad.co:last:" + liveApp;
  const last = parseInt(localStorage.getItem(p + key));
  localStorage.setItem(p + key, val);
  return val - last - (key == "totalPings" ? 1 : 0);
}

async function onGithub(data) {
  // data recieved, saturate
  // due to our specific id naming, we can make this code rlly smoll to do the thing haha
  for (let key of ["rank", "total_public_repos", "total_stars_earned", "total_prs", "total_commits", "contributed_to"]) {
    $(key).textContent = data[key];
    $(key).classList.toggle("text-white", true);
  }

  // saturate github activity
  const el = (commit, sha, repo, time) => {
    // avoid being xssed lol
    commit = esc(commit);
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
    // make all external links open in new tabs
    if (el.href && el.hostname !== window.location.hostname) el.target = "_blank";
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
  htContainer.classList.toggle("hidden", false);
}

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname.toLowerCase();

  if (path == "/") {
    onloaded();
  } else {
    if (path.startsWith("/projects")) {
      const cProject = () => fetch("https://api.alimad.co/info").then(r => r.json()).then(d => onHackatime(d.hackatime));
      cProject();
      setInterval(cProject, 1000 * 90); // update every one and half minutes
    }

    if (path.startsWith("/blog/")) {
      const blogPath = path.replaceAll("/", ":").replace(".html", "");
      setupLive("alimad.co" + blogPath);
      loadComments(blogPath); // each blog has its own comment section
      setupComments();
    }

    document.querySelectorAll("a").forEach(el => {
      // make all external links open in new tabs, for pages other than home, do this on content loaded
      if (el.href && el.hostname !== window.location.hostname) el.target = "_blank";
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