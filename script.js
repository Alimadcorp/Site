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

// umm code starts here??

async function onloaded() {
    fetch("https://api.alimad.co/github/info").then(r => r.json()).then(d => onGithub(d));
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
        commit = commit.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); // avoid being xssed lol
        time = new Date(time);
        const fullDate = time.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `<div class="flex flex-col sm:flex-row sm:items-baseline gap-x-2 gap-y-0 mt-2 text-sm lg:text-base text-gray-300"><p class="break-words min-w-0">Committed "<a class="text-white hover:underline font-medium" href="https://github.com/${repo}/commit/${sha}">${commit}</a>" to <a class="text-white hover:underline font-medium" href="https://github.com/${repo}">${repo.replace("Alimadcorp/", "")}</a></p><span class="text-xs text-gray-400 shrink-0 whitespace-nowrap cursor-help" title="${fullDate}">${timeago.format(time)}</span></div>`;
        // looks a lil cramped up, but minimal is better :3
    }

    $("gh_activity").innerHTML = "";
    for (let obj of data.latest) {
        $("gh_activity").innerHTML += el(obj.message, obj.sha, obj.repo, obj.time);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    onloaded();
})

console.log("Yup, its loaded");