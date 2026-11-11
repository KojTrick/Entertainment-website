/*
 * Top 100 Billboard artists slideshow (About Us page).
 *
 * - ARTISTS holds each artist's position on the Billboard Artist 100 chart. This list is typed in by
 *   hand, so update the numbers/names here when the chart changes (the chart is at
 *   https://www.billboard.com/charts/artist-100/).
 * - Slides play in RANDOM order. Each one stays for SLIDE_MS (never less than 5 seconds) and then
 *   fades into the next. The artist's chart position is shown on the picture.
 * - Pictures come from the Deezer artist search (picture_xl, 1000x1000). Artists whose picture
 *   cannot be loaded are skipped. The small link under the name opens the artist's top songs.
 */
(function () {
    'use strict';
    var SLIDE_MS = 6000;      // time each artist stays on screen (must be 5000 or more)
    var FADE_MS = 1200;       // fade between pictures (set to match .artist-slide in style.css)
    if (SLIDE_MS < 5000) SLIDE_MS = 5000;

    // Saved list, used if the live chart cannot be read. Ranks 1-5 were confirmed from billboard.com
    // (Oct/Nov 2026); the rest are typed in by hand and can be out of date.
    var ARTISTS = [
        {rank: 1, name: "Morgan Wallen"},
        {rank: 2, name: "Michael Jackson"},
        {rank: 3, name: "Ella Langley"},
        {rank: 4, name: "Olivia Rodrigo"},
        {rank: 5, name: "Drake"},
        {rank: 6, name: "Dolly Parton"},
        {rank: 7, name: "Taylor Swift"},
        {rank: 8, name: "Bad Bunny"},
        {rank: 9, name: "Olivia Dean"},
        {rank: 10, name: "Kendrick Lamar"},
        {rank: 11, name: "The Weeknd"},
        {rank: 12, name: "SZA"},
        {rank: 13, name: "Sabrina Carpenter"},
        {rank: 14, name: "Zach Bryan"},
        {rank: 15, name: "Luke Combs"},
        {rank: 16, name: "Post Malone"},
        {rank: 17, name: "Billie Eilish"},
        {rank: 18, name: "Ariana Grande"},
        {rank: 19, name: "Chris Stapleton"},
        {rank: 20, name: "Tyler, the Creator"},
        {rank: 21, name: "Doja Cat"},
        {rank: 22, name: "Alex Warren"},
        {rank: 23, name: "Shaboozey"},
        {rank: 24, name: "Teddy Swims"},
        {rank: 25, name: "Noah Kahan"},
        {rank: 26, name: "Lady Gaga"},
        {rank: 27, name: "Bruno Mars"},
        {rank: 28, name: "Travis Scott"},
        {rank: 29, name: "Future"},
        {rank: 30, name: "Metro Boomin"},
        {rank: 31, name: "Playboi Carti"},
        {rank: 32, name: "Gunna"},
        {rank: 33, name: "Lil Baby"},
        {rank: 34, name: "Lil Uzi Vert"},
        {rank: 35, name: "21 Savage"},
        {rank: 36, name: "J. Cole"},
        {rank: 37, name: "Eminem"},
        {rank: 38, name: "Rihanna"},
        {rank: 39, name: "Beyonce"},
        {rank: 40, name: "Ed Sheeran"},
        {rank: 41, name: "Justin Bieber"},
        {rank: 42, name: "Dua Lipa"},
        {rank: 43, name: "Harry Styles"},
        {rank: 44, name: "Lana Del Rey"},
        {rank: 45, name: "Chappell Roan"},
        {rank: 46, name: "Benson Boone"},
        {rank: 47, name: "Tate McRae"},
        {rank: 48, name: "Gracie Abrams"},
        {rank: 49, name: "Hozier"},
        {rank: 50, name: "Zach Top"},
        {rank: 51, name: "Cody Johnson"},
        {rank: 52, name: "Jelly Roll"},
        {rank: 53, name: "Bailey Zimmerman"},
        {rank: 54, name: "Riley Green"},
        {rank: 55, name: "Lainey Wilson"},
        {rank: 56, name: "Kane Brown"},
        {rank: 57, name: "Jason Aldean"},
        {rank: 58, name: "Thomas Rhett"},
        {rank: 59, name: "Tucker Wetmore"},
        {rank: 60, name: "Megan Moroney"},
        {rank: 61, name: "Fleetwood Mac"},
        {rank: 62, name: "Jon Pardi"},
        {rank: 63, name: "Stray Kids"},
        {rank: 64, name: "BTS"},
        {rank: 65, name: "Karol G"},
        {rank: 66, name: "Peso Pluma"},
        {rank: 67, name: "Feid"},
        {rank: 68, name: "Fuerza Regida"},
        {rank: 69, name: "Junior H"},
        {rank: 70, name: "Juice WRLD"},
        {rank: 71, name: "XXXTENTACION"},
        {rank: 72, name: "Lil Wayne"},
        {rank: 73, name: "Nicki Minaj"},
        {rank: 74, name: "Cardi B"},
        {rank: 75, name: "Megan Thee Stallion"},
        {rank: 76, name: "GloRilla"},
        {rank: 77, name: "Sexyy Red"},
        {rank: 78, name: "Ice Spice"},
        {rank: 79, name: "Doechii"},
        {rank: 80, name: "Don Toliver"},
        {rank: 81, name: "Kehlani"},
        {rank: 82, name: "Summer Walker"},
        {rank: 83, name: "Brent Faiyaz"},
        {rank: 84, name: "Bryson Tiller"},
        {rank: 85, name: "Chris Brown"},
        {rank: 86, name: "Usher"},
        {rank: 87, name: "Miley Cyrus"},
        {rank: 88, name: "Selena Gomez"},
        {rank: 89, name: "Charli xcx"},
        {rank: 90, name: "Coldplay"},
        {rank: 91, name: "Imagine Dragons"},
        {rank: 92, name: "Maroon 5"},
        {rank: 93, name: "Linkin Park"},
        {rank: 94, name: "Metallica"},
        {rank: 95, name: "Mac Miller"},
        {rank: 96, name: "Queen"},
        {rank: 97, name: "Adele"},
        {rank: 98, name: "Burna Boy"},
        {rank: 99, name: "Tems"},
        {rank: 100, name: "Rema"}
    ];


    /* ---- live chart: read the Billboard Artist 100 page through a CORS proxy, fall back to the saved list ---- */
    var CHART_KEY = 'kpe:chart:v1', CHART_TTL = 6 * 3600 * 1000;
    var PROXIES = [
        function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); },
        function (u) { return 'https://corsproxy.io/?' + encodeURIComponent(u); }
    ];
    var CHART_URL = 'https://www.billboard.com/charts/artist-100/';

    function parseChart(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html'), out = [];
        doc.querySelectorAll('ul.o-chart-results-list-row').forEach(function (row, i) {
            var t = row.querySelector('h3#title-of-a-story, h3.c-title');
            var name = t && t.textContent.replace(/\s+/g, ' ').trim();
            if (name) out.push({ rank: i + 1, name: name });
        });
        return out.length >= 50 ? out.slice(0, 100) : null;
    }

    function fetchChart() {
        try {
            var c = JSON.parse(localStorage.getItem(CHART_KEY));
            if (c && Date.now() - c.t < CHART_TTL) return Promise.resolve(c.list);
        } catch (e) {}
        function tryProxy(i) {
            if (i >= PROXIES.length) return Promise.resolve(null);
            var ctl = window.AbortController ? new AbortController() : null;
            var to = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
            return fetch(PROXIES[i](CHART_URL), ctl ? { signal: ctl.signal } : {})
                .then(function (r) { return r.ok ? r.text() : null; })
                .then(function (h) { clearTimeout(to); var l = h && parseChart(h); return l || tryProxy(i + 1); })
                .catch(function () { clearTimeout(to); return tryProxy(i + 1); });
        }
        return tryProxy(0).then(function (list) {
            if (list) { try { localStorage.setItem(CHART_KEY, JSON.stringify({ t: Date.now(), list: list })); } catch (e) {} }
            return list;
        });
    }

    var box = document.getElementById('artistGrid');
    if (!box) return;

    function shuffle(a) {
        a = a.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    /* ---- Deezer lookup (JSONP, because Deezer has no CORS), cached in this browser ---- */
    var CK = 'kpe:artist:v1:';
    function cacheGet(n) { try { return JSON.parse(localStorage.getItem(CK + n)); } catch (e) { return null; } }
    function cacheSet(n, v) { try { localStorage.setItem(CK + n, JSON.stringify(v)); } catch (e) {} }
    var jp = 0;
    function lookup(artist) {
        return new Promise(function (resolve) {
            var c = cacheGet(artist.name);
            if (c) return resolve(c);
            var cb = '__kpeArtist' + (jp++), s = document.createElement('script'), done = false;
            function end(v) {
                if (done) return; done = true;
                try { delete window[cb]; } catch (e) { window[cb] = undefined; }
                if (s.parentNode) s.parentNode.removeChild(s);
                resolve(v);
            }
            window[cb] = function (r) {
                var a = r && r.data && r.data[0];
                if (!a) return end(null);
                var v = { id: a.id, pic: a.picture_xl || a.picture_big, link: a.link };
                cacheSet(artist.name, v);
                end(v);
            };
            s.onerror = function () { end(null); };
            s.src = 'https://api.deezer.com/search/artist?q=' + encodeURIComponent(artist.name) +
                '&limit=1&output=jsonp&callback=' + cb;
            document.head.appendChild(s);
            setTimeout(function () { end(null); }, 8000);
        });
    }

    function loadImage(url) {
        return new Promise(function (resolve) {
            var im = new Image();
            im.onload = function () { resolve(im.naturalWidth >= 500 ? url : null); };   // keep only big pictures
            im.onerror = function () { resolve(null); };
            im.src = url;
        });
    }

    /* Resolve one artist to {artist, pic, songs} or null (no usable picture). */
    var prepared = {};
    function prepare(artist) {
        if (prepared[artist.rank]) return prepared[artist.rank];
        prepared[artist.rank] = lookup(artist).then(function (d) {
            if (!d || !d.pic || /\/images\/artist\/\/|default/i.test(d.pic)) return null;
            return loadImage(d.pic).then(function (ok) {
                if (!ok) return null;
                return { artist: artist, pic: ok,
                         songs: d.id ? 'https://www.deezer.com/artist/' + d.id + '/top_track'
                                     : 'https://open.spotify.com/search/' + encodeURIComponent(artist.name) };
            });
        });
        return prepared[artist.rank];
    }

    /* ---- slideshow ---- */
    var order = [], pos = -1, layers = [], front = 0, timer = null, paused = false;

    function makeLayer() {
        var d = document.createElement('div');
        d.className = 'artist-slide';
        box.appendChild(d);
        return d;
    }

    function fill(layer, item) {
        layer.textContent = '';
        var img = document.createElement('img');
        img.src = item.pic; img.alt = item.artist.name; layer.appendChild(img);
        var badge = document.createElement('span');
        badge.className = 'artist-rank'; badge.textContent = '#' + item.artist.rank;
        layer.appendChild(badge);
        var cap = document.createElement('div'); cap.className = 'artist-cap';
        var h = document.createElement('strong'); h.textContent = item.artist.name; cap.appendChild(h);
        var pos = document.createElement('span');
        pos.textContent = 'Billboard Artist 100 \u00b7 No. ' + item.artist.rank; cap.appendChild(pos);
        var a = document.createElement('a');
        a.href = item.songs; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.className = 'artist-songs'; a.textContent = 'Listen to ' + item.artist.name + ' songs \u2192';
        cap.appendChild(a);
        layer.appendChild(cap);
    }

    // Find the next artist (in random order) that has a usable picture.
    function nextItem(tries) {
        if (tries > order.length) return Promise.resolve(null);
        pos = (pos + 1) % order.length;
        return prepare(order[pos]).then(function (it) { return it || nextItem(tries + 1); });
    }

    function show(first) {
        nextItem(0).then(function (item) {
            if (!item) { box.classList.add('artist-empty'); box.textContent = 'Artist pictures are unavailable right now.'; return; }
            var back = layers[1 - front];
            fill(back, item);
            back.classList.add('is-on');
            if (!first) layers[front].classList.remove('is-on');   // cross-fade
            front = 1 - front;
            // warm up the next picture while this one is on screen
            var peek = order[(pos + 1) % order.length]; if (peek) prepare(peek);
            clearTimeout(timer);
            timer = setTimeout(tick, SLIDE_MS);   // full time on screen, counted from when the picture appears
        });
    }
    function tick() { if (paused || document.hidden) { timer = setTimeout(tick, 500); return; } show(false); }

    layers = [makeLayer(), makeLayer()];
    box.addEventListener('mouseenter', function () { paused = true; });
    box.addEventListener('mouseleave', function () { paused = false; });
    fetchChart().then(function (list) {
        var note = document.querySelector('.artists-note');
        if (list) { ARTISTS = list; if (note) note.textContent = 'Live from the Billboard Artist 100 chart. Tap the small link under a name for their songs.'; }
        order = shuffle(ARTISTS);
        show(true);
    });
})();
