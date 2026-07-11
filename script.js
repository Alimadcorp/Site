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

const loadComments = (page) => fetch("https://log.alimad.co/api/pull?channel=comments:alimadhomepage" + page).then(r => r.json()).then(d => onComments(d));

const postComment = async (text) => {
  if (text == "" || typeof text != "string") return;
  $("c-input").disabled = $("c-post").disabled = true;
  await fetch("https://log.alimad.co/api/log?channel=comments:alimadhomepage&text=" + text);
  $("c-input").disabled = $("c-post").disabled = false;
  $("c-input").value = "";
  loadComments();
};

function setupLive(app) {
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
  fetch("https://api.alimad.co/info").then(r => r.json()).then(d => onGithub(d));
  setupLive("alimad.co");
  loadComments();
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
  const p = "live.alimad.co:last:";
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
      const cProject = () => fetch("https://api.alimad.co/info").then(r => r.json()).then(d => onHackatime(d.hackatime));
      cProject();
      setInterval(cProject, 1000 * 90); // update every one and half minutes
    }

    if (path.startsWith("/blog/")) {
      const blogPath = path.replace("/", ":");
      loadComments(blogPath); // each blog has its own comment section
      setupLive("alimad.co" + blogPath);

      const blogContentElement = document.getElementById("blogContent");
      if (!blogContentElement) return;
      const rawText = blogContentElement.textContent.trim();
      // quick escapes
      const escapeHtml = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const toKebab = (s) => s.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase().replace(/^-/, '');

      function parseInline(line) {
        let last = 0, html = '', m;
        const tokenRe = /(`[^`]+`)|(\*[^*]+\*)|(_[^_]+_)|(~{2}[^~]+~{2})|(__[^_]+__)|(\[[^\]]+\])|(%[A-Za-z0-9_-]+%)|(:[a-zA-Z0-9_+-]+:)|(https?:\/\/[^\s]+)/g;

        while ((m = tokenRe.exec(line))) {
          if (m.index > last) html += escapeHtml(line.slice(last, m.index));
          const t = m[0];

          if (t.startsWith('`')) html += `<code class="px-1 rounded bg-gray-800 text-green-500">${escapeHtml(t.slice(1, -1))}</code>`;
          else if (t.startsWith('~~')) html += `<del>${escapeHtml(t.slice(2, -2))}</del>`;
          else if (t.startsWith('__')) html += `<u>${escapeHtml(t.slice(2, -2))}</u>`;
          else if (t.startsWith('*')) html += `<strong>${escapeHtml(t.slice(1, -1))}</strong>`;
          else if (t.startsWith('_')) html += `<em>${escapeHtml(t.slice(1, -1))}</em>`;
          else if (t.startsWith('[')) html += `<span class="text-gray-500 font-bold">${escapeHtml(t)}</span>`;
          else if (t.startsWith('http')) {
            const [url, label] = t.split('|');
            html += `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" class="text-cyan-600 underline">${escapeHtml(label || url)}</a>`;
          }
          else if (t.startsWith(':') && t.endsWith(':')) {
            const name = t.slice(1, -1);
            html += `<img src="https://emoji.alimad.co/${name}" alt="${name}" onerror="this.outerHTML='<span style=\\'color:#eab308\\'>:${name}:</span>'" class="inline-block align-middle mx-[2px] w-[1.2em] h-[1.2em] -translate-y-[8%]">`;
            // emoji was a little off-centered so i used em and scaling
          }
          else if (t.startsWith('%')) {
            const rawName = t.slice(1, -1);
            const kebabName = toKebab(rawName);
            html += `<i data-lucide="${kebabName}" class="inline-block align-middle w-[1em] h-[1em] -translate-y-[8%]"></i>`;
          }
          last = m.index + t.length;
        }
        if (last < line.length) html += escapeHtml(line.slice(last));
        return html;
      }

      // 2. Updated Block Parser
      function parseToDOM(raw) {
        const lines = raw.split(/\r?\n/);
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Reduced standard spacing, explicit double line breaks
          if (!line) {
            const spacer = document.createElement('div');
            spacer.className = "h-4"; // Controls the size of your double line break
            fragment.appendChild(spacer);
            continue;
          }

          // Intelligent Media Grid
          if (line.match(/^<([^>]+)>$/)) {
            let j = i;
            const mediaItems = [];

            while (j < lines.length) {
              const res = lines[j].trim().match(/^<([^>]+)>$/);
              if (!res) break;

              const [url, name] = res[1].split('|');
              if (url) mediaItems.push({ url, name });
              j++;
            }

            if (mediaItems.length > 0) {
              const container = document.createElement('div');

              // Dynamic Grid Layout based on media count
              if (mediaItems.length === 1) {
                container.className = "my-6 flex justify-center w-full max-w-3xl mx-auto";
              } else if (mediaItems.length === 2) {
                container.className = "my-6 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full";
              } else {
                container.className = "my-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full";
              }

              mediaItems.forEach(item => {
                const { url, name } = item;
                const wrap = document.createElement('div');
                wrap.className = "relative group flex flex-col items-center justify-center bg-black/40 rounded-xl overflow-hidden border border-emerald-900/30";

                if (/\.(jpe?g|png|gif|webp)$/i.test(url)) {
                  wrap.innerHTML = `<img src="${url}" alt="${name || ''}" class="w-full h-auto max-h-[60vh] object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy">`;
                } else if (/\.mp4$/i.test(url)) {
                  wrap.innerHTML = `<video src="${url}" controls class="w-full h-auto max-h-[60vh] object-contain bg-black" title="${name || ''}"></video>`;
                } else if (/\.mp3$/i.test(url)) {
                  wrap.className = "w-full p-4 bg-black/40 rounded-xl border border-emerald-900/30 flex flex-col items-center gap-3";
                  wrap.innerHTML = `<audio src="${url}" controls class="w-full"></audio>${name ? `<span class="text-sm text-neutral-400 font-medium">${name}</span>` : ''}`;
                } else {
                  wrap.innerHTML = `<img src="${url}" alt="${name || ''}" class="w-full h-auto max-h-[60vh] object-cover" loading="lazy">`;
                }

                // Elegant fade-in captions
                if (name && !/\.mp3$/i.test(url)) {
                  wrap.innerHTML += `<div class="absolute bottom-3 right-3 text-xs text-white bg-black/80 px-2.5 py-1 backdrop-blur-md rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">${name}</div>`;
                }
                container.appendChild(wrap);
              });

              fragment.appendChild(container);
              i = j - 1;
              continue;
            }
          }

          // Summary Blocks (Unchanged)
          if (line.startsWith(":::summary")) {
            const title = line.slice(10).trim();
            const details = document.createElement('details');
            details.className = "my-3 bg-black/40 border border-emerald-900/30 rounded-lg p-3";
            details.innerHTML = `<summary class="cursor-pointer text-emerald-400 text-lg font-semibold outline-none">${title}</summary>`;

            const bodyContainer = document.createElement('div');
            bodyContainer.className = "pl-4 pt-3 space-y-1 border-l-2 border-emerald-900/30 ml-2 mt-2";

            let depth = 1;
            let j = i + 1;
            const bodyLines = [];
            for (; j < lines.length; j++) {
              if (lines[j].startsWith(":::summary")) {
                depth++;
                bodyLines.push(lines[j]);
              } else if (lines[j].startsWith(":::")) {
                depth--;
                if (depth === 0) break;
                bodyLines.push(lines[j]);
              } else {
                bodyLines.push(lines[j]);
              }
            }

            bodyContainer.appendChild(parseToDOM(bodyLines.join("\n")));
            details.appendChild(bodyContainer);
            fragment.appendChild(details);
            i = j;
            continue;
          }

          // Headings & Text: Tighter spacing
          const el = document.createElement(line.startsWith("##") ? 'h2' : line.startsWith("#") ? 'h1' : 'p');

          if (line.startsWith("##")) {
            el.className = "mt-6 mb-2 text-2xl font-semibold"; // Tighter bottom margin
            el.style.color = "#ddd";
            el.innerHTML = parseInline(line.slice(2).trim());
          } else if (line.startsWith("#")) {
            el.className = "mt-8 mb-3 text-3xl font-bold";
            el.style.color = "#ddd";
            el.innerHTML = parseInline(line.slice(1).trim());
          } else {
            el.className = "mt-1 mb-2 leading-relaxed text-base"; // Tighter overall margins
            el.innerHTML = parseInline(line);
          }

          fragment.appendChild(el);
        }
        return fragment;
      }

      const parsedNodes = parseToDOM(rawText);

      const wrapper = document.createElement('div');
      wrapper.id = "blogContent";
      wrapper.className = "text-neutral-300"; // Inherit clean text color
      wrapper.appendChild(parsedNodes);

      blogContentElement.replaceWith(wrapper);

      if (window.lucide) {
        window.lucide.createIcons();
      }
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