// a bunch of dynamic information about me which can be served on the go for saturating the websiet
// uses express.js
// author: Muhammad Ali

import express from "express";
import cors from "cors";
import axios from "axios";
import { getInfo } from "./info.js";
import { hs } from "./scr.js";
import dotenv from "dotenv";

// hehe

if (process.env.NODE_ENV !== "production") {
    dotenv.config({ path: ".env.local" });
}

const hackatime_auth_url = 'https://api.alimad.co/auth/hackatime/callback';
const hackabeat_url = 'https://beat.alimad.co';

const app = express();
app.use(cors());
const port = 5501; // +1 coz ill run the static site on 5500

app.get("/", (req, res) => {
    res.redirect("https://github.com/Alimadcorp/Site/tree/main/api")
});

app.get("/info", async (req, res) => {
    res.json(await getInfo());
});

app.get("/script.js", async (req, res) => {
    res.type("js");
    res.send(hs);
});

// refer to hackabeat: https://github.com/Alimadcorp/Hackabeat
app.get('/auth/hackatime/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Authorization code payload missing.');
    }
    try {
        const response = await axios.post('https://hackatime.hackclub.com/oauth/token', {
            client_id: process.env.HACKATIME_CLIENT_ID,
            client_secret: process.env.HACKATIME_CLIENT_SECRET,
            redirect_uri: hackatime_auth_url,
            grant_type: 'authorization_code',
            code: code
        });

        const { access_token } = response.data;

        const userResponse = await axios.get('https://hackatime.hackclub.com/api/v1/authenticated/me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const username = userResponse.data?.github_username; //  yup we got the username
        return res.redirect(`${hackabeat_url}/#access_token=${access_token}&username=${username}&uid=${userResponse.data?.id}`);
    } catch (error) {
        console.error('OAuth Exchange Failed:', error.response?.data || error.message);
        return res.status(500).send('Authentication routine failed.');
    }
});

app.get("/beat/leaderboard", async (req, res) => {
    const t = process.env.HC_COOKIE;
    let uid = req.query.uid;
    if (!uid) return res.sendStatus(400);
    uid = parseInt(uid);
    if (!t) return res.sendStatus(503);

    const i = await fetch("https://hackatime.hackclub.com/leaderboards?period_type=daily&scope=global", {
        headers: { "Cookie": t }
    });

    if (!i.ok) {
        console.error(i.status);
        return res.sendStatus(500);
    }

    const html = await i.text();
    const m = html.match(/(?<=\<script data\-page\="app" type\="application\/json">).*?(?=\<\/script\>)/s);
    const match = m ? m[0] : null;

    if (!match) { return res.sendStatus(500); }

    const ver = JSON.parse(match).version;
    const r = await fetch("https://hackatime.hackclub.com/leaderboards?period_type=daily&scope=global",
        {
            headers: {
                "Cookie": t,
                "X-Inertia": true,
                "X-Inertia-Partial-Component": "Leaderboards/Index",
                'X-Inertia-Partial-Data': "entries",
                "X-Inertia-Version": ver
            }
        }
    );

    const w = await r.json();
    const data = w.props?.entries?.entries;
    if (!(data && data.length > 0)) return res.sendStatus(500);

    // data is in format:
    /* 
        [
            {
                user_id: Int,
                total_seconds: Int,
                streak_count: Int,
                is_current_user: Bool,
                user: Object { display_name, avatar_url, profile_path, verified: Bool, country_code, red: Bool },
                active_project: Object { name, repo_url }
            }
        ]
    */

    let global_rank, local_rank, country, response;
    const me = data.find(e => e.user_id === uid);
    country = me.user.country_code;

    global_rank = data.findIndex(e => e.user_id === uid) + 1;
    local_rank = data.filter(e => e.user.country_code == country).findIndex(e => e.user_id === uid) + 1;

    return res.json({ name: me.user.display_name, pfp: me.user.avatar_url, link: "https://hackatime.hackclub.com" + me.user.profile_path, local_rank, global_rank });
});

app.listen(port, () => {
    console.log("Meow");
});

// aint so empty no more