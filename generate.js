const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const blogDir = path.join(__dirname, 'blog');
const base = 'https://alimad.co/blog';
const favicon = 'https://blog.alimad.co/favicon.ico';

const mediaRegex = /^\s*<([^>]+)>\s*$/;

function parseInline(line) {
    let last = 0, html = '', m;
    const tokenRe = /(`[^`]+`)|(\*[^*]+\*)|(_[^_]+_)|(~{2}[^~]+~{2})|(__[^_]+__)|(\[[^\]]+\])|(%[A-Za-z0-9_-]+%)|(:[a-zA-Z0-9_+-]+:)|(https?:\/\/[^\s]+)/g;

    while ((m = tokenRe.exec(line))) {
        if (m.index > last) html += line.slice(last, m.index);
        const t = m[0];
        // ... (Keep existing logic)
        last = m.index + t.length;
    }
    if (last < line.length) html += line.slice(last);
    return html;
}

function parseToHTML(raw) {
    const lines = raw.split(/\r?\n/);
    let html = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) { html += '<div class="h-4"></div>\n'; continue; }

        const mediaMatch = line.match(mediaRegex);
        if (mediaMatch) {
            let j = i;
            const mediaItems = [];
            while (j < lines.length) {
                const res = lines[j].trim().match(mediaRegex);
                if (!res) break;
                const [url, name] = res[1].split('|');
                if (url) mediaItems.push({ url: url.trim(), name: (name || '').trim() });
                j++;
            }
            i = j - 1; continue;
        }
    }
    return html;
}

function processFile(filePath) {
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(htmlContent, { decodeEntities: false });

    if ($('#saturated').length) return;

    if (!$('#blogTitle').length) console.warn(`Warning: #blogTitle not found in ${filePath}`);
    if (!$('#blogContent').length) console.warn(`Warning: #blogContent not found in ${filePath}`);

    let title = $('#blogTitle').text().trim() || $('h1').first().text().trim();
    let contentRaw = $('#blogContent').text();

    const blogContentElement = $('#blogContent');
    if (blogContentElement.length) {
        const parsedHtml = parseToHTML(contentRaw);
        blogContentElement.html(parsedHtml);
    }

    $('body').append('\n    <div id="saturated" style="display: none;"></div>\n');
    fs.writeFileSync(filePath, $.html());
}