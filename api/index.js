// a bunch of dynamic information about me which can be served on the go for saturating the websiet
// uses express.js
// author: Muhammad Ali

const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
const port = 5501; // +1 coz ill run the static site on 3000

app.get("/", (req, res) => {
    res.redirect("https://github.com/Alimadcorp/Site/tree/main/api")
});

app.listen(port, () => {
    console.log("Meow");
});

// ts so empty for now hehe
