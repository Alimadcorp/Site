// this script runs /github/info
// get basic github stats and send them over
import * as cheerio from "cheerio";

const GITHUB_TOKEN = process.env.GH_TOKEN;
const GITHUB = process.env.GITHUB_USNM;
const HAKATIME = process.env.HACKATIME_USNM;


const theHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Authorization: GITHUB_TOKEN ? `token ${GITHUB_TOKEN}` : undefined
};

export async function getInfo() {
    const username = GITHUB;
    const base = `https://stats.github.alimad.co/api`;

    async function getPublicRepoCount() {
        try {
            const res = await fetch(`https://api.github.com/users/${username}`, { headers: theHeaders });
            if (!res.ok) return 0;
            const data = await res.json();
            return data.public_repos || 0;
        } catch {
            return 0;
        }
    }

    async function latestCommits() {
        const res = await fetch(`https://api.github.com/users/${username}/events/public`, { headers: theHeaders });
        const events = await res.json();
        if (!Array.isArray(events)) return null;
        const pushEvents = events.filter(e => e.type === "PushEvent").slice(0, 10);
        if (!pushEvents.length) return null;
        const commitPromises = pushEvents.map(async (p) => {
            const repo = p.repo.name;
            const sha = p.payload.head;
            const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}`, { headers: theHeaders });
            const commitData = await commitRes.json();
            return {
                message: commitData.commit?.message || "No message",
                time: commitData.commit?.author?.date || null,
                repo,
                sha
            };
        });
        let r = await Promise.all(commitPromises);
        return r.slice(0, 5);
    }

    async function hackatime() {
        function date(i, u = 0) {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Karachi',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const parts = formatter.formatToParts(i);
            console.log(parts)
            const dd = parts.find(p => p.type === 'day').value;
            const mm = parts.find(p => p.type === 'month').value;
            const yyyy = parts.find(p => p.type === 'year').value;
            return u == 1 ? encodeURIComponent(`${yyyy}-${mm}-${dd}T00:00:00+0500`) : `${dd}-${mm}-${yyyy}`;
        }
        const today = date(new Date());
        const tomorrow = date((new Date).setDate((new Date()).getDate() + 1));
        const today2 = date(new Date(), 1);
        const tomorrow2 = date((new Date).setDate((new Date()).getDate() + 1), 1);
        const headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
            "Cookie": process.env.HC_COOKIE || ""
        };

        const u1 = `https://hackatime.hackclub.com/api/v1/users/${HAKATIME}/stats?start_date=${today}&end_date=${tomorrow}`;
        const u2 = `https://hackatime.hackclub.com/api/summary?from=${today2}&to=${tomorrow2}&user_id=${HAKATIME}`;

        const r = await fetch(u1, { headers });
        const d = await r.json();

        const t = await fetch(u2, { headers });
        const p = await t.json();

        console.log(u1, d, u2, p);

        let lp = { key: "", total: 0 };
        for (let pr of p.projects) {
            if (lp.total < pr.total) {
                lp = pr;
            }
        }

        return { project: lp, time_today: d.data.human_readable_total, streak: d.data.streak };
    }

    const errors = [];
    const safeText = async (res, name) => {
        if (!res) {
            errors.push(`${name}: fetch failed`);
            return null;
        }
        try {
            if (!res.ok) {
                errors.push(`${name}: HTTP ${res.status}`);
                return null;
            }
            return await res.text();
        } catch (e) {
            errors.push(`${name}: text() error ${e?.message || e}`);
            return null;
        }
    };

    try {
        const fetchPromises = [
            fetch(`${base}?username=${username}&show_icons=true`),
            fetch(`${base}/top-langs?username=${username}`)
        ];

        const settled = await Promise.allSettled(fetchPromises);
        const responses = settled.map((s, i) => {
            if (s.status === "fulfilled") return s.value;
            errors.push(`fetch[${i}] rejected: ${s.reason?.message || s.reason}`);
            return null;
        });

        const [mainSvgRes, langSvgRes] = responses;
        const [mainSvg, langSvg] = await Promise.all([
            safeText(mainSvgRes, "mainSvg"),
            safeText(langSvgRes, "langSvg")
        ]);

        let values = {};
        let rank = "";
        const langs = {};

        if (mainSvg) {
            try {
                const $ = cheerio.load(mainSvg, { xmlMode: true });

                // Pinpoint extraction targeting your exact template's rank token identifier
                rank = $("[data-testid='level-rank-icon']").text().trim();

                // Extract structural key-value stat pairs 
                $("text.stat").each((_, el) => {
                    const labelText = $(el).text().trim();
                    if (labelText.includes(":")) {
                        const key = labelText.replace(":", "").toLowerCase().replace(/\s+/g, "_").replace(/[\(\)]/g, "").replace("_last_year", "");
                        const valueNode = $(el).next("text");
                        if (valueNode.length) {
                            values[key] = valueNode.text().trim();
                        }
                    }
                });
            } catch (e) {
                errors.push(`mainSvg parse error: ${e?.message || e}`);
            }
        }

        if (langSvg) {
            try {
                const $ = cheerio.load(langSvg, { xmlMode: true });

                // Map target parameters by walking parent block elements sequentially
                $("g.stagger").each((_, el) => {
                    const name = $(el).find("text[data-testid='lang-name']").text().trim();
                    // Percentage is the trailing sibling text node within that exact cluster
                    const percentage = $(el).find("text").not("[data-testid]").text().trim();

                    if (name && percentage) {
                        langs[name] = percentage;
                    }
                });
            } catch (e) {
                errors.push(`langSvg parse error: ${e?.message || e}`);
            }
        }

        const [latest, totalPublicRepos, hacka] = await Promise.all([
            latestCommits(),
            getPublicRepoCount(),
            hackatime()
        ]);

        const payload = { username, rank, total_public_repos: totalPublicRepos, ...values, langs, latest, hackatime: hacka };
        if (errors.length) payload._warnings = errors;
        return payload;
    } catch (e) {
        return { error: e?.message || String(e) };
    }
}
