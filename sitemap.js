const fs = require('fs');
const path = require('path');

// this automatically generates the sitemap of this siteee

const domain = 'https://alimad.co';

const exclude = "api,CNAME,history.txt,README.md,robots.txt,script.js,generate.js,sitemap.js,sitemap.xml,meow.js,style.css,todo.txt,generateOG.js,package.json,node_modules,package-lock.json,example-blog.html,projects.txt".split(",");

let urls = [];

let indexModDate = new Date().toISOString().split('T')[0];

if (fs.existsSync(path.join(__dirname, 'index.html'))) {
    indexModDate = fs.statSync(path.join(__dirname, 'index.html')).mtime.toISOString().split('T')[0];
}

urls.push({ url: domain, lastmod: indexModDate });

function generate(dadd) {
    let dir = __dirname + dadd;
    console.log(dir);
    const files = fs.readdirSync(dir);

    files.forEach(f => {
        if (f.startsWith('.') || exclude.includes(f)) return;

        let p = path.join(dir, f);
        let stat = fs.statSync(p);

        if (stat.isFile()) {
            let route = f;

            if (route.endsWith('.html')) {
                if (route === 'index.html') return;
                route = '/' + route.replace('.html', '');
            } else {
                route = '/' + route;
            }

            const fileModDate = stat.mtime.toISOString().split('T')[0];

            urls.push({
                url: domain + dadd.replace("\\", "/") + route,
                lastmod: fileModDate
            });
        } else {
            generate("/" + f);
        }
    });
}

generate("");

console.log(urls);
urls = urls.sort((a, b) => a.url.localeCompare(b.url));
console.log(urls);

const base = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.url === domain ? 'weekly' : 'monthly'}</changefreq>
    <priority>${item.url === domain ? '1.0' : '0.8'}</priority>
  </url>`).join("\n")}
</urlset>`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), base);
console.log("Done");