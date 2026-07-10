// a bunch of dynamic information about me which can be served on the go for saturating the websiet
// uses express.js
// author: Muhammad Ali

import express from "express";
import cors from "cors";
import { getInfo } from "./info.js";

const app = express();
app.use(cors());
const port = 5501; // +1 coz ill run the static site on 5500

app.get("/", (req, res) => {
    res.redirect("https://github.com/Alimadcorp/Site/tree/main/api")
});

app.get("/info", async (req, res) => {
    res.json(await getInfo());
});

app.listen(port, () => {
    console.log("Meow");
});

// ts so empty for now hehe
