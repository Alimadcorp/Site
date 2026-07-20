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

        const username = userResponse.data?.id; //  yup we got the username
        return res.redirect(`${hackabeat_url}/#access_token=${access_token}&username=${username}`);
    } catch (error) {
        console.error('OAuth Exchange Failed:', error.response?.data || error.message);
        return res.status(500).send('Authentication routine failed.');
    }
});

app.listen(port, () => {
    console.log("Meow");
});

// ts so empty for now hehe
