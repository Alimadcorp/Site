const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const blogDir = path.join(__dirname, 'blog');
const base = 'https://alimad.co/blog';
const favicon = 'https://cdn.alimad.co/f/static/icon/favicon.png';

function tree(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            tree(filePath, fileList);
        } else if (filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

function setMetaTag($, property, content, isName = false) {
    const attribute = isName ? 'name' : 'property';
    const selector = `meta[${attribute}="${property}"]`;

    if ($(selector).length) {
        $(selector).attr('content', content);
    } else {
        $('head').append(`    <meta ${attribute}="${property}" content="${content}">\n`);
    }
}

function process(filePath) {
    console.log(`Processing: ${filePath}`);

    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html, { decodeEntities: false });
    let title = $('#blogTitle').text().trim();
    if (!title) title = $('h1').first().text().trim();
    if (!title) title = $('title').text().replace(' | Alimad Co: Blogs', '').trim();
    const fullTitle = `${title} | Alimad Co: Blogs`;
    let descriptionText = $('#blogContent').text() || $('main').text();
    let description = descriptionText
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 150);

    if (description.length === 150) description += '...';
    let imageUrl = favicon;
    const firstImg = $('img').first().attr('src');
    if (firstImg && firstImg.startsWith('http')) {
        imageUrl = firstImg;
    }
    const relativePath = path.relative(blogDir, filePath)
        .replace(/\\/g, '/')
        .replace(/\/index\.html$/, '')
        .replace(/\.html$/, '');

    const url = relativePath === 'index' ? base : `${base}/${relativePath}`;

    $('title').text(fullTitle);
    setMetaTag($, 'description', description, true);

    if ($('link[rel="canonical"]').length) {
        $('link[rel="canonical"]').attr('href', url);
    } else {
        $('head').append(`    <link rel="canonical" href="${url}">\n`);
    }

    const rawDate = $('#publishDate').text().trim();
    let isoDate = new Date().toISOString().split('T')[0];

    if (rawDate) {
        const cleanDateStr = rawDate.replace(/\bSept\b/i, 'Sep');
        const parsedDate = new Date(cleanDateStr);
        if (!isNaN(parsedDate)) {
            isoDate = parsedDate.toISOString().split('T')[0];
        }
    }

    setMetaTag($, 'og:type', 'article');
    setMetaTag($, 'og:title', fullTitle);
    setMetaTag($, 'og:description', description);
    setMetaTag($, 'og:url', url);
    setMetaTag($, 'og:image', imageUrl);
    setMetaTag($, 'og:site_name', 'Alimad Co');

    setMetaTag($, 'twitter:card', 'summary_large_image', true);
    setMetaTag($, 'twitter:title', fullTitle, true);
    setMetaTag($, 'twitter:description', description, true);
    setMetaTag($, 'twitter:image', imageUrl, true);

    let jsonLdScript = $('script[type="application/ld+json"]');
    let schemaData = {};

    if (jsonLdScript.length) {
        try {
            schemaData = JSON.parse(jsonLdScript.html());
        } catch (e) {
            schemaData = {};
        }
    }

    schemaData["@context"] = "https://schema.org";
    schemaData["@type"] = "BlogPosting";
    schemaData["headline"] = title;
    schemaData["datePublished"] = isoDate;
    schemaData["description"] = description;
    schemaData["image"] = imageUrl;

    if (jsonLdScript.length) {
        jsonLdScript.html(JSON.stringify(schemaData, null, 2));
    } else {
        $('head').append(`    <script type="application/ld+json">\n${JSON.stringify(schemaData, null, 2)}\n    </script>\n`);
    }

    fs.writeFileSync(filePath, $.html());
}

try {
    if (!fs.existsSync(blogDir)) {
        console.error(`no directory :noooovanish:`);
        process.exit(1);
    }

    const htmlFiles = tree(blogDir);
    console.log(`Found ${htmlFiles.length} blogs!`);

    htmlFiles.forEach(process);

    console.log("I'm done");
} catch (e) {
    console.error(e);
}