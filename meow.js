let msg = "71713215616106156130123561352121034535450132161242455203121532612";
let u = msg.split('');
let map = ["-", "m", ":3", "mew", "meow", "purrr", "mmeoww", "murrppp"];

let o = [];
for (let i = 0; i < u.length; i++) {
    let w = parseInt(u[i]);
    o.push(map[w]);
}
console.log(o.join(" "));