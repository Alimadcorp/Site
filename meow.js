let msg = "312";
let u = msg.split('');
let map = ["-", "m", ":3", "mew", "meow", "purrr", "mmeoww", "murrppp"];

let o = [];
for (let i = 0; i < u.length; i++) {
    let w = parseInt(u[i]);
    o.push(map[w]);
}
console.log(o.join(" "));