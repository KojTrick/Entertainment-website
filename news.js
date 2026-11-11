/*
 * KPEntertainment live news: Ghana, Nigeria and international entertainment.
 *
 * How it works
 *  - Headlines come from the public RSS feeds listed in SOURCES (plus Google News searches).
 *    Browsers can't read most RSS feeds directly (CORS), so each feed is read through the free
 *    rss2json.com converter, which returns it as JSON.
 *  - Stories are merged, de-duplicated and sorted newest first. The page refreshes itself
 *    every 10 minutes while it is open.
 *  - HIGH-RESOLUTION PICTURES ONLY: a story's picture is used on a tile, grid or slider only after
 *    the browser has loaded it and confirmed it is at least TILE_W pixels wide (HERO_W for the big
 *    slider). Smaller pictures are never shown; that tile shows a coloured panel with the headline.
 *  - Each category (music, movies, ...) filters the stories by keywords or by region.
 *
 * To add or remove a news site, edit SOURCES. To tune a category, edit CATS.
 */
(function () {
    'use strict';

    var REFRESH_MS = 10 * 60 * 1000;       // how often an open page refreshes
    var CACHE_TTL_MS = 9 * 60 * 1000;      // reuse saved headlines newer than this
    var CACHE_KEY = 'kpe:news:v1';
    var IMG_KEY = 'kpe:img:v1';
    var IMG_TTL_MS = 3 * 24 * 3600 * 1000;
    var PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';

    var TILE_W = 900, TILE_H = 450;        // smallest picture allowed on a tile or grid (pixels)
    var HERO_W = 1200;                     // smallest picture preferred for the big slider (pixels)

    var REGION_LABEL = { gh: 'GHANA', ng: 'NIGERIA', us: 'US', uk: 'UK', intl: 'WORLD' };

    /* ---------- sources ---------- */

    function gnewsUrl(q) {
        return 'https://news.google.com/rss/search?q=' + encodeURIComponent('(' + q + ') when:7d') +
            '&hl=en-US&gl=US&ceid=US:en';
    }

    function gnewsSource(q, id, region) {
        return { id: id, name: 'Google News', site: 'https://news.google.com', feed: gnewsUrl(q), google: true,
                 region: region, kind: 'Google News search: the latest articles on a topic from many publishers.' };
    }

    // region: gh = Ghana, ng = Nigeria, us = United States, uk = United Kingdom, intl = other / worldwide
    // filter: true keeps only entertainment stories (for general news sites)
    var SOURCES = [
        { id: 'pulsegh', name: 'Pulse Ghana', region: 'gh', site: 'https://www.pulse.com.gh',
          feed: 'https://www.pulse.com.gh/rss-articles.xml', kind: 'Ghana entertainment, music and celebrity news.', filter: true },
        { id: 'accramail', name: 'Accra Mail', region: 'gh', site: 'https://accramail.com',
          feed: 'https://accramail.com/feed/', kind: 'Ghana entertainment news and celebrity gossip.' },
        { id: 'apumone', name: 'Apumone', region: 'gh', site: 'https://www.apumone.com',
          feed: 'https://www.apumone.com/feed/', kind: 'Ghana music, celebrity gossip and comedy.' },
        { id: 'myjoy', name: 'MyJoyOnline', region: 'gh', site: 'https://www.myjoyonline.com',
          feed: 'https://www.myjoyonline.com/feed/', kind: 'Ghana news site (entertainment stories only).', filter: true },
        { id: 'adom', name: 'Adom Online', region: 'gh', site: 'https://www.adomonline.com',
          feed: 'https://www.adomonline.com/feed/', kind: 'Ghana news site (entertainment stories only).', filter: true },
        gnewsSource('Ghana (showbiz OR entertainment OR celebrity OR musician OR actor OR actress OR Ghollywood OR "Ghana music")',
            'gn-gh', 'gh'),

        { id: 'bellanaija', name: 'BellaNaija', region: 'ng', site: 'https://www.bellanaija.com',
          feed: 'https://www.bellanaija.com/feed/', kind: 'Nigerian entertainment, fashion and lifestyle.' },
        { id: 'lindaikeji', name: "Linda Ikeji's Blog", region: 'ng', site: 'https://www.lindaikejisblog.com',
          feed: 'https://www.lindaikejisblog.com/feeds/posts/default?alt=rss', kind: 'Nigerian celebrity news and gossip.' },
        { id: 'hynaija', name: 'HyNaija', region: 'ng', site: 'https://hynaija.com',
          feed: 'https://hynaija.com/feed/', kind: 'Naija news, Nollywood and celebrity gossip.' },
        { id: 'nollywire', name: 'Nollywire', region: 'ng', site: 'https://nollywire.com',
          feed: 'https://nollywire.com/feed/', kind: 'Nollywood news and movie updates.' },
        { id: 'infong', name: 'Information Nigeria', region: 'ng', site: 'https://informationng.com',
          feed: 'https://informationng.com/feed', kind: 'Nigerian news site (entertainment stories only).', filter: true },
        gnewsSource('Nigeria (Nollywood OR showbiz OR celebrity OR Afrobeats OR "Nigerian singer" OR BBNaija OR "Nigerian actress")',
            'gn-ng', 'ng'),

        { id: 'variety', name: 'Variety', region: 'us', site: 'https://variety.com',
          feed: 'https://variety.com/feed/', kind: 'Hollywood film, TV and music industry news.' },
        { id: 'thr', name: 'The Hollywood Reporter', region: 'us', site: 'https://www.hollywoodreporter.com',
          feed: 'https://www.hollywoodreporter.com/feed/', kind: 'Hollywood and entertainment business news.' },
        { id: 'deadline', name: 'Deadline', region: 'us', site: 'https://deadline.com',
          feed: 'https://deadline.com/feed/', kind: 'Film, TV and box-office news.' },
        { id: 'billboard', name: 'Billboard', region: 'us', site: 'https://www.billboard.com',
          feed: 'https://www.billboard.com/feed/', kind: 'Music charts, artists and industry news.' },
        { id: 'eonline', name: 'E! News', region: 'us', site: 'https://www.eonline.com',
          feed: 'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml', kind: 'US celebrity and pop culture news.' },
        { id: 'bbc', name: 'BBC Entertainment & Arts', region: 'uk', site: 'https://www.bbc.com/news/entertainment_and_arts',
          feed: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', kind: 'UK and world entertainment and arts news.' },
        gnewsSource('Hollywood OR celebrity OR "box office" OR Grammy OR Netflix', 'gn-intl', 'intl')
    ];

    var ENT_RE = /\b(entertainment|showbiz|celebrit\w*|celeb|music|musician|song|songs|album|single|singer|rapper|artiste|afrobeats?|hiplife|highlife|amapiano|dancehall|gospel|concert|movie|movies|film|films|nollywood|ghollywood|actor|actress|series|tv show|bbnaija|big brother|awards?|grammys?|gossip|red carpet|fashion|wedding|trailer|premiere|netflix|showmax|comedian|comedy|dj)\b/i;

    /* ---------- categories ---------- */

    function words(list) { return new RegExp('\\b(?:' + list.join('|') + ')\\b', 'i'); }

    var CATS = {
        music: {
            name: 'Music', blurb: 'New songs, albums, tours and charts from Ghana, Nigeria and the world.',
            re: words(['music', 'songs?', 'singles?', 'albums?', 'eps?', 'mixtapes?', 'tours?', 'concerts?', 'afrobeats?', 'afropop',
                'hiplife', 'highlife', 'amapiano', 'dancehall', 'gospel', 'rappers?', 'singers?', 'artistes?', 'grammys?', 'billboard',
                'lyrics', 'collaboration', 'collab', 'drill', 'hip-hop', 'hip hop']),
            gq: '(Afrobeats OR "Ghana music" OR "Nigerian music" OR Billboard OR Grammy OR "new album" OR "new single")'
        },
        movies: {
            name: 'Movies', blurb: 'Nollywood, Ghollywood and Hollywood: films, series, trailers and box office.',
            re: words(['films?', 'movies?', 'nollywood', 'ghollywood', 'cinema', 'box office', 'trailers?', 'series', 'netflix', 'prime video',
                'showmax', 'actors?', 'actress(?:es)?', 'directors?', 'premieres?', 'sequels?', 'seasons?', 'tv show', 'bbnaija']),
            gq: '(Nollywood OR Ghollywood OR "box office" OR "new movie" OR Netflix OR Showmax)'
        },
        fashion: {
            name: 'Fashion', blurb: 'Red carpets, designers, outfits and style from the stars.',
            re: words(['fashion', 'outfits?', 'styles?', 'styled', 'dress(?:es)?', 'gowns?', 'red carpet', 'designers?', 'runway', 'met gala',
                'couture', 'aso ebi', 'slays?', 'wedding', 'beauty', 'makeup', 'model(?:s|ling)?']),
            gq: '(fashion OR "red carpet" OR "Met Gala" OR "aso ebi" OR designer) (celebrity OR Ghana OR Nigeria)'
        },
        trending: {
            name: 'Trending', blurb: 'The stories that several news sites are covering right now.', special: 'trending',
            gq: '(trending OR viral) (celebrity OR Ghana OR Nigeria OR Hollywood)'
        },
        gallery: {
            name: 'Gallery', blurb: 'Big pictures from the latest entertainment stories. High-resolution images only.', special: 'gallery'
        },
        gossip: {
            name: 'Latest Gossip', blurb: 'Rumours, feuds, splits, weddings and celebrity drama.',
            re: words(['gossip', 'rumou?rs?', 'alleged(?:ly)?', 'split', 'breakups?', 'break up', 'divorce', 'dating', 'relationship', 'cheating',
                'feud', 'beef', 'shade', 'slams?', 'spat', 'pregnant', 'baby bump', 'engaged', 'married', 'scandal', 'leaked', 'controversy',
                'reacts', 'exposes', 'claims', 'reveals', 'drags']),
            gq: '(celebrity gossip OR feud OR breakup OR "alleged" OR scandal) (Ghana OR Nigeria OR Hollywood)'
        },
        usshowbiz: {
            name: 'US Showbiz', blurb: 'Hollywood, US music and American celebrity news.',
            test: function (i) { return i.region === 'us' || i.region === 'intl'; },
            gq: '(Hollywood OR "US celebrity" OR Billboard OR "Oscars" OR "Emmys")'
        },
        africa: {
            name: 'African Showbiz', blurb: 'Ghanaian and Nigerian showbiz, plus the rest of Africa.',
            test: function (i) { return i.region === 'gh' || i.region === 'ng'; },
            gq: '(Ghana OR Nigeria OR Africa OR Afrobeats OR Nollywood) (showbiz OR entertainment OR celebrity)'
        },
        kpop: {
            name: 'K-Pop', blurb: 'BLACKPINK, KATSEYE, BTS, Stray Kids and the rest of K-pop: comebacks, tours and news.',
            re: words(['k-?pop', 'kpop', 'k-?pop idols?', 'blackpink', 'katseye', 'bts', 'stray kids', 'twice', 'newjeans', 'aespa', 'ive', 'le sserafim',
                'itzy', 'seventeen', 'enhypen', 'txt', 'tomorrow x together', 'ateez', 'jennie', 'lisa', 'ros[eé]', 'jisoo', 'jungkook', 'jimin',
                'korean', 'idols?', 'hybe', 'yg entertainment', 'jyp', 'sm entertainment', 'comeback']),
            gq: '(K-pop OR BLACKPINK OR KATSEYE OR BTS OR "Stray Kids" OR TWICE OR NewJeans OR aespa)'
        }
    };

    /* ---------- small helpers ---------- */

    function $(id) { return document.getElementById(id); }

    function h(tag, props, kids) {
        var n = document.createElement(tag);
        Object.keys(props || {}).forEach(function (k) {
            if (k === 'class') n.className = props[k];
            else if (k === 'text') n.textContent = props[k];
            else n.setAttribute(k, props[k]);
        });
        (kids || []).forEach(function (c) { n.appendChild(c); });
        return n;
    }

    function setText(id, t) { var e = $(id); if (e) e.textContent = t; }

    function safeUrl(u) {
        if (!u) return null;
        try {
            var x = new URL(u, location.href);
            return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : null;
        } catch (e) { return null; }
    }

    function stripHtml(html) {
        var doc = new DOMParser().parseFromString(html || '', 'text/html');
        return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function truncate(s, n) {
        return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
    }

    function parseDate(s) {
        if (!s) return 0;
        var t = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(s) ? Date.parse(s.replace(' ', 'T') + 'Z') : Date.parse(s);
        return isNaN(t) ? 0 : t;
    }

    function timeAgo(ts) {
        if (!ts) return '';
        var m = Math.round((Date.now() - ts) / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return m + ' min ago';
        var hrs = Math.round(m / 60);
        if (hrs < 24) return hrs + ' h ago';
        return Math.round(hrs / 24) + ' d ago';
    }

    function cssUrl(u) { return 'url("' + String(u).replace(/"/g, '%22') + '")'; }

    // Own large pictures from the site's images/ folder, used when a story has no high-resolution picture of its own.
    function fallbackFor(it) {
        var s = (it.title + ' ' + it.tags).toLowerCase(), f = 'music.jpg';
        if (/film|movie|nollywood|ghollywood|series|netflix|trailer|box office|actor|actress/.test(s)) f = 'movies.jpg';
        else if (/fashion|dress|outfit|red carpet|designer|style/.test(s)) f = 'fashion3.jpg';
        else if (/k-?pop|blackpink|katseye|bts/.test(s)) f = 'music.jpg';
        else if (!/music|song|album|singer|rapper|concert|tour|afrobeat/.test(s) && isForeign(it)) f = 'usshowbiz.jpg';
        return 'images/' + f;
    }

    function isForeign(i) { return i.region !== 'gh' && i.region !== 'ng'; }

    var US_POLITICS_RE = /\b(democrats?|democratic party|republicans?|gop|congress\w*|senate|senators?|white house|trump|biden|harris|obama|vance|capitol hill|supreme court|u\.s\. house|pentagon)\b/i;
    var US_RE = /\b(u\.?s\.?a?|americans?|america|hollywood|new york|los angeles|washington|nashville|texas|california|billboard|grammys?|oscars?|emmys?)\b/i;
    var GH_RE = /\b(ghana|ghanaian|ghanaians|accra|kumasi|ghollywood|hiplife|highlife)\b/i;
    var NG_RE = /\b(nigeria|nigerian|nigerians|lagos|abuja|naija|nollywood|bbnaija|afrobeats?)\b/i;

    // The tag follows what the story is about, not only which site or search it came from.
    function fixRegion(src, source, title, summary) {
        var text = title + ' ' + summary, base = src.region === 'auto' ? inferRegion(source, title) : src.region;
        var mentionsGh = GH_RE.test(text), mentionsNg = NG_RE.test(text);
        if (US_POLITICS_RE.test(text) && !mentionsGh && !mentionsNg) return 'us';
        if ((base === 'gh' || base === 'ng') && (src.google || src.filter)) {
            // search results and general news sites: keep the Ghana/Nigeria tag only if the story is about them
            if (base === 'gh' && mentionsGh) return 'gh';
            if (base === 'ng' && mentionsNg) return 'ng';
            if (mentionsGh) return 'gh';
            if (mentionsNg) return 'ng';
            var g = inferRegion(source, title);
            if (g === 'gh' || g === 'ng') return g;
            return US_RE.test(text) ? 'us' : (g === 'uk' ? 'uk' : 'intl');
        }
        return base;
    }

    // Google News results with a mixed topic: guess the country from the publisher and headline.
    function inferRegion(source, title) {
        var s = (source + ' ' + title).toLowerCase();
        if (/\b(ghana|ghanaian|accra|kumasi|joy ?online|citi|adom|graphic online|peace fm|ghanaweb|modern ghana)\b/.test(s)) return 'gh';
        if (/\b(nigeria|nigerian|lagos|abuja|naija|nollywood|punch|vanguard|bellanaija|legit|daily post|premium times|thisday|tribune|channels tv|thecable|linda ikeji|pulse nigeria)\b/.test(s)) return 'ng';
        if (/\b(bbc|guardian|the sun|daily mail|mirror|sky news|metro|nme)\b/.test(s)) return 'uk';
        return 'intl';
    }

    /* ---------- picture candidates ---------- */

    function allImgs(html) {
        var out = [], re = /<img[^>]+src=["']([^"']+)["']/ig, m;
        while ((m = re.exec(html || '')) && out.length < 3) out.push(m[1]);
        return out;
    }

    // Asks for the biggest version of a picture the site offers (many sites serve small thumbnails in feeds).
    function upgradeImg(u) {
        var x = u.replace(/-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp)(?:\?|$))/i, '');
        x = x.replace(/(ichef\.bbci\.co\.uk\/[^?]*?\/)\d{2,4}(\/cpsprodpb\/)/, '$11024$2');
        try {
            var url = new URL(x);
            ['w', 'width'].forEach(function (k) { if (url.searchParams.has(k)) url.searchParams.set(k, '1600'); });
            ['h', 'height', 'resize', 'fit', 'crop'].forEach(function (k) { url.searchParams.delete(k); });
            x = url.href;
        } catch (e) { /* keep as is */ }
        return x;
    }

    function imageCandidates(raw) {
        var list = [];
        function add(u) {
            u = safeUrl(String(u || '').replace(/^http:/, 'https:'));
            if (u && list.indexOf(u) < 0) list.push(u);
        }
        var enc = raw.enclosure || {};
        if (enc.link && (/image/i.test(enc.type || '') || /\.(jpe?g|png|webp)(\?|$)/i.test(enc.link))) add(enc.link);
        add(raw.thumbnail);
        allImgs(raw.content).concat(allImgs(raw.description)).slice(0, 2).forEach(add);
        var out = [];
        list.slice(0, 3).forEach(function (u) {
            var up = upgradeImg(u);
            if (up !== u && out.indexOf(up) < 0) out.push(up);
            if (out.indexOf(u) < 0) out.push(u);
        });
        return out.slice(0, 5);
    }

    /* ---------- loading headlines ---------- */

    function normalize(raw, src) {
        var title = stripHtml(raw.title);
        var source = src.name;
        var summary = truncate(stripHtml(raw.description || raw.content || ''), 170);
        if (src.google) {
            // Google News titles end with " - Publisher"; the description is only a link list.
            var m = /^(.*\S)\s+-\s+([^-]{2,60})$/.exec(title);
            if (m) { title = m[1]; source = m[2].trim(); }
            summary = '';
        }
        return {
            title: title,
            link: safeUrl(raw.link),
            source: source,
            region: fixRegion(src, source, title, summary),
            date: parseDate(raw.pubDate),
            imgs: imageCandidates(raw),
            summary: summary,
            tags: (raw.categories || []).join(' ')
        };
    }

    function fetchSource(src) {
        var ctl = new AbortController();
        var timer = setTimeout(function () { ctl.abort(); }, 12000);
        return fetch(PROXY + encodeURIComponent(src.feed), { signal: ctl.signal })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                if (d.status !== 'ok' || !Array.isArray(d.items)) throw new Error('feed error');
                var items = d.items.map(function (i) { return normalize(i, src); })
                    .filter(function (i) { return i.title && i.link; });
                if (src.filter) items = items.filter(function (i) { return ENT_RE.test(i.tags + ' ' + i.title + ' ' + i.summary); });
                return items;
            })
            .finally(function () { clearTimeout(timer); });
    }

    function readCache() {
        try {
            var c = JSON.parse(localStorage.getItem(CACHE_KEY));
            return c && Array.isArray(c.items) ? c : null;
        } catch (e) { return null; }
    }

    function writeCache(c) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) { /* storage unavailable */ }
    }

    function titleKey(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60); }

    // Newest first; the same story from two sites is shown once (keeping every picture option).
    function mergeItems(list) {
        list = list.slice().sort(function (a, b) { return b.date - a.date; });
        var byLink = {}, byTitle = {}, out = [];
        list.forEach(function (i) {
            var k = titleKey(i.title);
            if (byLink[i.link]) return;
            if (byTitle[k]) {
                i.imgs.forEach(function (u) { if (byTitle[k].imgs.indexOf(u) < 0) byTitle[k].imgs.push(u); });
                return;
            }
            byLink[i.link] = true;
            byTitle[k] = i;
            out.push(i);
        });
        return out;
    }

    function loadItems(force) {
        var cached = readCache();
        if (!force && cached && Date.now() - cached.time < CACHE_TTL_MS) {
            return Promise.resolve({ items: cached.items, status: cached.status, time: cached.time, stale: false });
        }
        return Promise.allSettled(SOURCES.map(fetchSource)).then(function (results) {
            var status = {}, items = [];
            results.forEach(function (r, i) {
                var ok = r.status === 'fulfilled' && r.value.length > 0;
                status[SOURCES[i].id] = ok;
                if (ok) items = items.concat(r.value);
            });
            if (!items.length) {
                if (cached) return { items: cached.items, status: cached.status, time: cached.time, stale: true };
                return { items: [], status: status, time: Date.now(), stale: true, failed: true };
            }
            var out = { items: mergeItems(items).slice(0, 260), status: status, time: Date.now() };
            writeCache(out);
            return { items: out.items, status: status, time: out.time, stale: false };
        });
    }

    /* ---------- high-resolution check ---------- */

    var imgMemo = readImgMemo();

    function readImgMemo() {
        try {
            var c = JSON.parse(localStorage.getItem(IMG_KEY));
            return c && typeof c === 'object' ? c : {};
        } catch (e) { return {}; }
    }

    function saveImgMemo() {
        try {
            var keys = Object.keys(imgMemo);
            if (keys.length > 500) {
                keys.sort(function (a, b) { return imgMemo[a][2] - imgMemo[b][2]; })
                    .slice(0, 250).forEach(function (k) { delete imgMemo[k]; });
            }
            localStorage.setItem(IMG_KEY, JSON.stringify(imgMemo));
        } catch (e) { /* storage unavailable */ }
    }

    // Loads a picture and reports its real size: { w, h } (0 if it cannot be loaded).
    function probe(url) {
        var m = imgMemo[url];
        if (m && Date.now() - m[2] < IMG_TTL_MS) return Promise.resolve({ w: m[0], h: m[1] });
        return new Promise(function (resolve) {
            var im = new Image(), done = false;
            function finish(w, hgt) {
                if (done) return;
                done = true;
                imgMemo[url] = [w, hgt, Date.now()];
                resolve({ w: w, h: hgt });
            }
            im.referrerPolicy = 'no-referrer';
            im.onload = function () { finish(im.naturalWidth, im.naturalHeight); };
            im.onerror = function () { finish(0, 0); };
            setTimeout(function () { finish(0, 0); }, 8000);
            im.src = url;
        });
    }

    // Sets item.hi = { url, w, h } when one of its pictures is big enough (otherwise item.hi = null).
    function checkItem(it) {
        if (it.hi !== undefined) return Promise.resolve(it);
        var urls = it.imgs.slice();
        return (function next() {
            if (!urls.length) { it.hi = null; return Promise.resolve(it); }
            var u = urls.shift();
            return probe(u).then(function (s) {
                if (s.w >= TILE_W && s.h >= TILE_H) { it.hi = { url: u, w: s.w, h: s.h }; return it; }
                return next();
            });
        })();
    }

    // Checks stories in small batches until `wanted` have a high-resolution picture (or `max` were tried).
    function ensureHiRes(pool, wanted, max) {
        var list = pool.slice(0, max), pos = 0;
        function good() { return list.filter(function (i) { return i.hi; }).length; }
        function batch() {
            if (pos >= list.length || good() >= wanted) { saveImgMemo(); return Promise.resolve(pool); }
            var part = list.slice(pos, pos + 6);
            pos += 6;
            return Promise.all(part.map(checkItem)).then(batch);
        }
        return batch();
    }

    // Mixes Ghana, Nigeria and foreign stories so each region gets pictures.
    function interleave(items) {
        var g = { gh: [], ng: [], fr: [] };
        items.forEach(function (i) { g[i.region === 'gh' ? 'gh' : i.region === 'ng' ? 'ng' : 'fr'].push(i); });
        var out = [], k = 0, more = true;
        while (more) {
            more = false;
            ['gh', 'ng', 'fr'].forEach(function (r) { if (g[r][k]) { out.push(g[r][k]); more = true; } });
            k++;
        }
        return out;
    }

    /* ---------- drawing stories ---------- */

    function openLink(a, link) {
        a.setAttribute('href', link);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
    }

    function chip(it) {
        return h('span', { class: 'chip chip-' + it.region, text: REGION_LABEL[it.region] || 'WORLD' });
    }

    function metaText(it) { return it.source + (it.date ? ' · ' + timeAgo(it.date) : ''); }

    function setPic(pic, it) {
        if (!pic) return;
        // only the story's own picture is ever shown; no stock or unrelated pictures
        pic.style.backgroundImage = it && it.hi ? cssUrl(it.hi.url) : '';
        if (pic.parentNode && pic.parentNode.classList) pic.parentNode.classList.toggle('no-pic', !(it && it.hi));
    }

    // Fills a tile that has: .pic, .t (headline), .chipslot, .meta
    function fillTile(el, it) {
        if (!el || !it) return;
        openLink(el, it.link);
        el.classList.remove('no-pic');
        setPic(el.querySelector('.pic'), it);
        var t = el.querySelector('.t'); if (t) t.textContent = it.title;
        var c = el.querySelector('.chipslot'); if (c) { c.textContent = ''; c.appendChild(chip(it)); }
        var m = el.querySelector('.meta'); if (m) m.textContent = metaText(it);
        var s = el.querySelector('.sum'); if (s) s.textContent = it.summary || '';
    }

    function headlineLi(it, withSummary) {
        var li = h('li', {}, [
            h('a', { href: it.link, target: '_blank', rel: 'noopener noreferrer', text: it.title }),
            h('div', { class: 'meta' }, [chip(it), document.createTextNode(' ' + metaText(it))])
        ]);
        if (withSummary && it.summary) li.appendChild(h('p', { text: it.summary }));
        return li;
    }

    function fillList(id, items, emptyText) {
        var ul = $(id);
        if (!ul) return;
        ul.textContent = '';
        items.forEach(function (it) { ul.appendChild(headlineLi(it, false)); });
        if (!items.length) ul.appendChild(h('li', { class: 'empty', text: emptyText }));
    }

    function statusLine(data, extra) {
        var t = new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (data.failed) return 'Live news is unavailable right now. Please try again in a few minutes.';
        return 'Live Ghana, Nigeria and international entertainment news · updated ' + t + ' · refreshes every 10 min' +
            (data.stale ? ' (offline: showing the last saved copy)' : '') + (extra || '');
    }

    /* ---------- home page ---------- */

    var slideIdx = 0, slideTimer = null;

    function showSlide(i) {
        var s = document.querySelectorAll('#hero .slide');
        if (!s.length) return;
        slideIdx = (i + s.length) % s.length;
        s.forEach(function (n, k) { n.classList.toggle('is-active', k === slideIdx); });
    }

    function startSlides() {
        clearInterval(slideTimer);
        slideTimer = setInterval(function () { showSlide(slideIdx + 1); }, 5500);
    }

    function renderSlides(list) {
        var box = $('hero');
        if (!box) return;
        box.querySelectorAll('.slide').forEach(function (n) { n.remove(); });
        list.forEach(function (it) {
            var a = h('a', { class: 'slide' }, [
                h('div', { class: 'pic' }),
                h('div', { class: 'overlay' }, [h('span', { class: 'live', text: 'Latest News' }), chip(it)]),
                h('div', { class: 'text' }, [h('h3', { text: it.title }), h('small', { text: metaText(it) })])
            ]);
            openLink(a, it.link);
            setPic(a.querySelector('.pic'), it);
            box.appendChild(a);
        });
        showSlide(0);
    }

    function renderHome(data) {
        setText('statusText', statusLine(data));
        var items = data.items;
        if (!items.length) return;
        var pool = interleave(items.filter(function (i) { return i.imgs.length; })).slice(0, 100);
        ensureHiRes(pool, 22, 70).then(function () {
            var good = pool.filter(function (i) { return i.hi; });
            var used = new Set();
            function pickFrom(list, pred) {
                for (var k = 0; k < list.length; k++) {
                    if (!used.has(list[k]) && (!pred || pred(list[k]))) { used.add(list[k]); return list[k]; }
                }
                return null;
            }
            var preds = {
                gh: function (i) { return i.region === 'gh'; },
                ng: function (i) { return i.region === 'ng'; },
                fr: isForeign
            };
            // best match: a story with a big picture from that region, then any story from that region
            function pick(region) {
                return pickFrom(good, preds[region]) || pickFrom(good);
            }

            // slider: the biggest pictures; falls back to the page's own slides if there are too few
            var hero = good.filter(function (i) { return i.hi.w >= HERO_W; });
            var slides = (hero.length >= 3 ? hero : good).slice(0, 5);
            if (slides.length >= 1) {
                slides.forEach(function (i) { used.add(i); });
                renderSlides(slides);
            }

            var side = document.querySelectorAll('[data-slot="side"]');
            ['gh', 'ng'].forEach(function (r, k) { fillTile(side[k], pick(r)); });
            var grid = document.querySelectorAll('[data-slot="grid"]');
            ['ng', 'gh', 'fr', 'ng', 'gh', 'fr'].forEach(function (r, k) { fillTile(grid[k], pick(r)); });
            var intl = document.querySelectorAll('[data-slot="intl"]');
            ['fr', 'fr', 'fr'].forEach(function (r, k) { fillTile(intl[k], pick(r)); });

            function rest(pred) { return items.filter(function (i) { return !used.has(i) && pred(i); }).slice(0, 6); }
            fillList('listGh', rest(preds.gh), 'No Ghana stories right now.');
            fillList('listNg', rest(preds.ng), 'No Nigeria stories right now.');
            fillList('listIntl', rest(preds.fr), 'No international stories right now.');
        });
    }

    /* ---------- category pages ---------- */

    var STOP = new Set(('the and for with from that this have has had will was were are not but you your our after before over about into ' +
        'says said new more most than then who what when how why can could would should just they their his her its out').split(' '));

    function tokens(t) {
        return t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 3 && !STOP.has(w); });
    }

    // Trending = stories that other sites are also reporting (their headlines share several words).
    function trendingOrder(items) {
        var toks = items.map(function (i) { return new Set(tokens(i.title)); });
        var score = items.map(function (it, a) {
            var s = 0;
            for (var b = 0; b < items.length; b++) {
                if (a === b || items[b].source === it.source) continue;
                var shared = 0;
                toks[a].forEach(function (w) { if (toks[b].has(w)) shared++; });
                if (shared >= 3 || (shared >= 2 && Math.min(toks[a].size, toks[b].size) <= 4)) s++;
            }
            return s;
        });
        var idx = items.map(function (_, k) { return k; })
            .sort(function (a, b) { return score[b] - score[a] || items[b].date - items[a].date; });
        return idx.map(function (k) { return items[k]; });
    }

    function catItems(def, items) {
        if (def.special === 'trending') return trendingOrder(items);
        if (def.special === 'gallery') return items.filter(function (i) { return i.imgs.length; });
        var out = items.filter(function (i) {
            return def.test ? def.test(i) : def.re.test(i.title + ' ' + i.summary + ' ' + i.tags);
        });
        return out.sort(function (a, b) { return b.date - a.date; });
    }

    var catState = null;

    function regionOk(region) {
        return function (i) {
            if (region === 'all') return true;
            if (region === 'world') return isForeign(i);
            return i.region === region;
        };
    }

    function paintCategory() {
        var s = catState, def = s.def;
        var list = catItems(def, s.items).filter(regionOk(s.region));
        var hero = $('catHero'), grid = $('catGrid'), more = $('catMore');
        setText('catTitle', def.name);
        setText('catBlurb', def.blurb);
        document.title = def.name + ' - KPEntertainment';
        document.querySelectorAll('#chips button').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-region') === s.region);
        });

        var isGallery = def.special === 'gallery';
        var pool = interleave(list.filter(function (i) { return i.imgs.length; })).slice(0, isGallery ? 80 : 50);
        var token = ++s.token;
        ensureHiRes(pool, isGallery ? 24 : 10, isGallery ? 70 : 40).then(function () {
            if (token !== s.token) return;   // a newer filter was chosen meanwhile
            var good = pool.filter(function (i) { return i.hi; });
            var used = new Set();
            hero.textContent = '';
            grid.textContent = '';
            more.textContent = '';

            if (!isGallery && list.length) {
                var f = good[0] || list[0];
                used.add(f);
                var card = h('a', { class: 'hero-card' }, [
                    h('div', { class: 'pic' }),
                    h('div', { class: 'body' }, [chip(f), h('h2', { text: f.title }), h('p', { text: f.summary }), h('small', { text: metaText(f) })])
                ]);
                openLink(card, f.link);
                setPic(card.querySelector('.pic'), f);
                hero.appendChild(card);
            }
            (isGallery ? good : good.concat(list.filter(function (i) { return !i.hi; }))).filter(function (i) { return !used.has(i); }).slice(0, isGallery ? 24 : 9).forEach(function (it) {
                used.add(it);
                var tile = h('a', { class: 'box4 tile' }, [
                    h('div', { class: 'pic' }),
                    h('div', { class: 'down' }, [h('span', { class: 'chipslot' }), h('p', { class: 't' }), h('small', { class: 'meta' })])
                ]);
                fillTile(tile, it);
                grid.appendChild(tile);
            });
            if (isGallery && !good.length) {
                grid.appendChild(h('p', { class: 'note', text: 'No high-resolution pictures are available for these stories right now. Please check back soon.' }));
            }
            if (!isGallery) {
                list.filter(function (i) { return !used.has(i); }).slice(0, 20).forEach(function (it) { more.appendChild(headlineLi(it, true)); });
                if (!more.children.length) {
                    more.appendChild(h('li', { class: 'empty', text: list.length ? 'That is everything for now.' : 'No stories in this category right now. Check back soon.' }));
                }
            }
            $('moreWrap').hidden = isGallery;
            setText('statusText', statusLine(s.data, ' · ' + list.length + ' stories'));
        });
    }

    function renderCategory(data, key) {
        var def = CATS[key];
        if (!def) { setText('catTitle', 'This category does not exist.'); return; }
        var prev = catState;
        catState = { def: def, data: data, items: data.items, region: prev ? prev.region : 'all', token: prev ? prev.token : 0 };
        paintCategory();
        if (def.gq) {
            fetchSource(gnewsSource(def.gq, 'gn-cat', 'auto')).catch(function () { return []; }).then(function (extra) {
                if (!extra.length || !catState || catState.def !== def) return;
                catState.items = mergeItems(data.items.concat(extra));
                paintCategory();
            });
        }
    }

    /* ---------- categories overview page ---------- */

    // Tiles whose own picture is too small get the newest big picture from that category's stories.
    // Category tiles that show a chosen person: the picture comes from that person's Wikipedia page
    // (largest version available, at least 600 px wide). Tiles with a fixed local picture keep it.
    var PERSON_KEY = 'kpe:person:v1:', PERSON_TTL = 7 * 24 * 3600 * 1000;

    function wikiPicture(title) {
        try {
            var c = JSON.parse(localStorage.getItem(PERSON_KEY + title));
            if (c && c.url && Date.now() - c.t < PERSON_TTL) return Promise.resolve(c.url);
        } catch (e) {}
        return fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title))
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (d) {
                var o = d.originalimage, t = d.thumbnail, url = null;
                if (o && o.source) {
                    url = o.source;
                    // ask Wikimedia for a 1280 px version of big originals (smaller file, still high definition)
                    if (o.width > 1400 && /\/commons\/|\/wikipedia\//.test(o.source) && !/\.svg$/i.test(o.source) && t && /\/\d+px-/.test(t.source)) {
                        url = t.source.replace(/\/\d+px-/, '/1280px-');
                    }
                } else if (t && t.source) {
                    url = t.source.replace(/\/\d+px-/, '/800px-');
                }
                if (!url) throw new Error('no picture');
                return probe(url).then(function (sz) {
                    if (sz.w >= 600) {
                        try { localStorage.setItem(PERSON_KEY + title, JSON.stringify({ url: url, t: Date.now() })); } catch (e) {}
                        return url;
                    }
                    if (o && o.source && o.source !== url) return probe(o.source).then(function (s2) { return s2.w >= 600 ? o.source : null; });
                    return null;
                });
            })
            .catch(function () { return null; });
    }

    function renderCategoryTiles(data) {
        var tiles = document.querySelectorAll('.cats[data-live]');
        Array.prototype.forEach.call(tiles, function (tile) {
            var wiki = tile.getAttribute('data-wiki');
            if (!wiki) return;
            wikiPicture(wiki).then(function (url) {
                if (url) { tile.style.backgroundImage = cssUrl(url); tile.classList.add('has-pic'); }
            });
        });

        // tiles with no chosen person (Latest Gossip, US Showbiz) still show a live story picture
        var used = new Set();
        var live = Array.prototype.filter.call(tiles, function (t) { return !t.classList.contains('person'); });
        (function next(k) {
            if (k >= live.length) { saveImgMemo(); return; }
            var def = CATS[live[k].getAttribute('data-live')];
            var pool = def ? catItems(def, data.items).filter(function (i) { return i.imgs.length && !used.has(i); }).slice(0, 12) : [];
            ensureHiRes(pool, 1, 12).then(function () {
                var it = pool.filter(function (i) { return i.hi; })[0];
                if (it) {
                    used.add(it);
                    live[k].style.backgroundImage = cssUrl(it.hi.url);
                    live[k].classList.add('has-pic');
                }
                next(k + 1);
            });
        })(0);
    }

    /* ---------- sources page ---------- */

    function renderSources(data) {
        var grid = $('sources');
        setText('statusText', statusLine(data));
        if (!grid) return;
        grid.textContent = '';
        SOURCES.forEach(function (s) {
            var state = data.status ? data.status[s.id] : undefined;
            var line = h('li', {}, [
                h('a', { href: s.site, target: '_blank', rel: 'noopener noreferrer', text: s.name }),
                document.createTextNode(' \u2013 ' + s.kind + (state === true ? ' (live)' : state === false ? ' (unavailable)' : ''))
            ]);
            grid.appendChild(line);
        });
    }

    /* ---------- wiring ---------- */

    var page = 'home', catKey = 'music', lastRefresh = 0;

    function refresh(force) {
        loadItems(force).then(function (data) {
            lastRefresh = Date.now();
            if (page === 'category') renderCategory(data, catKey);
            else if (page === 'categories') renderCategoryTiles(data);
            else if (page === 'sources') renderSources(data);
            else renderHome(data);
        }).catch(function () {
            setText('statusText', 'Live news is unavailable right now.');
        });
    }

    function init() {
        page = document.body.getAttribute('data-page') || 'home';
        var q = new URLSearchParams(location.search).get('cat');
        if (Object.prototype.hasOwnProperty.call(CATS, q)) catKey = q;

        if (page === 'home') {
            startSlides();
            [['heroPrev', -1], ['heroNext', 1]].forEach(function (b) {
                var el = $(b[0]);
                if (el) el.addEventListener('click', function () { showSlide(slideIdx + b[1]); startSlides(); });
            });
        }
        if (page === 'category') {
            document.querySelectorAll('#chips button').forEach(function (b) {
                b.addEventListener('click', function () {
                    if (!catState) return;
                    catState.region = b.getAttribute('data-region');
                    paintCategory();
                });
            });
        }

        refresh(false);
        setInterval(function () { refresh(true); }, REFRESH_MS);
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && Date.now() - lastRefresh > REFRESH_MS) refresh(true);
        });
        window.addEventListener('online', function () { refresh(true); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
