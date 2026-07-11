const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const blogDir = path.join(__dirname, 'blog');
const base = 'https://alimad.co/blog';
const favicon = 'https://blog.alimad.co/favicon.ico';

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toKebab(s) {
    return s.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase().replace(/^-/, '');
}

function parseInline(line) {
    let last = 0, html = '', m;
    const tokenRe = /(`[^`]+`)|(\*[^*]+\*)|(_[^_]+_)|(~{2}[^~]+~{2})|(__[^_]+__)|(\[[^\]]+\])|(%[A-Za-z0-9_-]+%)|(:[a-zA-Z0-9_+-]+:)|(https?:\/\/[^\s]+)/g;

    while ((m = tokenRe.exec(line))) {
        if (m.index > last) html += escapeHtml(line.slice(last, m.index));
        const t = m[0];

        if (t.startsWith('`')) html += `<code class="px-1 rounded bg-gray-800 text-green-500">${escapeHtml(t.slice(1, -1))}</code>`;
        else if (t.startsWith('~~')) html += `<del>${escapeHtml(t.slice(2, -2))}</del>`;
        else if (t.startsWith('__')) html += `<u>${escapeHtml(t.slice(2, -2))}</u>`;
        else if (t.startsWith('*')) html += `<strong>${escapeHtml(t.slice(1, -1))}</strong>`;
        else if (t.startsWith('_')) html += `<em>${escapeHtml(t.slice(1, -1))}</em>`;
        else if (t.startsWith('[')) html += `<span class="text-gray-500 font-bold">${escapeHtml(t)}</span>`;
        else if (t.startsWith('http')) {
            const [url, label] = t.split('|');
            html += `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" class="text-cyan-600 underline">${escapeHtml(label || url)}</a>`;
        }
        else if (t.startsWith(':') && t.endsWith(':')) {
            const name = t.slice(1, -1);
            html += `<img src="https://emoji.alimad.co/${name}" alt="${name}" onerror="this.outerHTML='<span style=\\'color:#eab308\\'>:${name}:</span>'" class="inline-block align-middle mx-[2px] w-[1.2em] h-[1.2em] -translate-y-[8%]">`;
        }
        else if (t.startsWith('%')) {
            const rawName = t.slice(1, -1);
            const kebabName = toKebab(rawName);
            html += `<i data-lucide="${kebabName}" class="inline-block align-middle w-[1em] h-[1em] -translate-y-[8%]"></i>`;
        }
        last = m.index + t.length;
    }
    if (last < line.length) html += escapeHtml(line.slice(last));
    return html;
}

function parseToHTML(raw) {
    const lines = raw.split(/\r?\n/);
    let html = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) {
            html += '<div class="h-4"></div>\n';
            continue;
        }

        if (line.match(/^<([^>]+)>$/)) {
            let j = i;
            const mediaItems = [];

            while (j < lines.length) {
                const res = lines[j].trim().match(/^<([^>]+)>$/);
                if (!res) break;

                const [url, name] = res[1].split('|');
                if (url) mediaItems.push({ url, name });
                j++;
            }

            if (mediaItems.length > 0) {
                let containerClass = "my-6 grid gap-4 w-full ";
                if (mediaItems.length === 1) containerClass = "my-6 flex justify-center w-full max-w-3xl mx-auto";
                else if (mediaItems.length === 2) containerClass += "grid-cols-1 sm:grid-cols-2";
                else containerClass += "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

                html += `<div class="${containerClass}">\n`;

                mediaItems.forEach(item => {
                    const { url, name } = item;
                    let inner = '';
                    let wrapClass = "relative group flex flex-col items-center justify-center bg-black/40 rounded-xl overflow-hidden border border-emerald-900/30";

                    if (/\.(jpe?g|png|gif|webp)$/i.test(url)) {
                        inner = `<img src="${url}" alt="${escapeHtml(name || '')}" class="w-full h-auto max-h-[60vh] object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy">`;
                    } else if (/\.mp4$/i.test(url)) {
                        inner = `<video src="${url}" controls class="w-full h-auto max-h-[60vh] object-contain bg-black" title="${escapeHtml(name || '')}"></video>`;
                    } else if (/\.mp3$/i.test(url)) {
                        wrapClass = "w-full p-4 bg-black/40 rounded-xl border border-emerald-900/30 flex flex-col items-center gap-3";
                        inner = `<audio src="${url}" controls class="w-full"></audio>${name ? `<span class="text-sm text-neutral-400 font-medium">${escapeHtml(name)}</span>` : ''}`;
                    } else {
                        inner = `<img src="${url}" alt="${escapeHtml(name || '')}" class="w-full h-auto max-h-[60vh] object-cover" loading="lazy">`;
                    }

                    if (name && !/\.mp3$/i.test(url)) {
                        inner += `<div class="absolute bottom-3 right-3 text-xs text-white bg-black/80 px-2.5 py-1 backdrop-blur-md rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">${escapeHtml(name)}</div>`;
                    }
                    html += `<div class="${wrapClass}">${inner}</div>\n`;
                });

                html += `</div>\n`;
                i = j - 1;
                continue;
            }
        }

        if (line.startsWith(":::summary")) {
            const title = line.slice(10).trim();
            let depth = 1;
            let j = i + 1;
            const bodyLines = [];

            for (; j < lines.length; j++) {
                if (lines[j].startsWith(":::summary")) {
                    depth++;
                    bodyLines.push(lines[j]);
                } else if (lines[j].startsWith(":::")) {
                    depth--;
                    if (depth === 0) break;
                    bodyLines.push(lines[j]);
                } else {
                    bodyLines.push(lines[j]);
                }
            }

            html += `<details class="my-3 bg-black/40 border border-emerald-900/30 rounded-lg p-3">
                <summary class="cursor-pointer text-emerald-400 text-lg font-semibold outline-none">${escapeHtml(title)}</summary>
                <div class="pl-4 pt-3 space-y-1 border-l-2 border-emerald-900/30 ml-2 mt-2">
                    ${parseToHTML(bodyLines.join("\n"))}
                </div>
            </details>\n`;
            i = j;
            continue;
        }

        if (line.startsWith("##")) {
            html += `<h2 class="mt-6 mb-2 text-2xl font-semibold" style="color: #ddd">${parseInline(line.slice(2).trim())}</h2>\n`;
        } else if (line.startsWith("#")) {
            html += `<h1 class="mt-8 mb-3 text-3xl font-bold" style="color: #ddd">${parseInline(line.slice(1).trim())}</h1>\n`;
        } else {
            html += `<p class="mt-1 mb-2 leading-relaxed text-base">${parseInline(line)}</p>\n`;
        }
    }
    return html;
}

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

function processFile(filePath) {
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(htmlContent, { decodeEntities: false });
    if ($('#saturated').length) {
        console.log(`Skipping (Already Saturated): ${filePath}`);
        return;
    }

    console.log(`Processing: ${filePath}`);

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

    const blogContentElement = $('#blogContent');
    if (blogContentElement.length) {
        const rawText = blogContentElement.text().trim();
        const parsedHtmlString = parseToHTML(rawText);
        blogContentElement.replaceWith(`<div id="blogContent" class="text-neutral-300">\n${parsedHtmlString}\n</div>`);
    }

    $('body').append('\n    <div id="saturated" style="display: none;"></div>\n');

    fs.writeFileSync(filePath, $.html());
}

try {
    if (!fs.existsSync(blogDir)) {
        console.error(`no directory :noooovanish:`);
        process.exit(1);
    }

    const htmlFiles = tree(blogDir);
    console.log(`Found ${htmlFiles.length} blogs!`);

    htmlFiles.forEach(processFile);

    console.log("I'm done");
} catch (e) {
    console.error(e);
}