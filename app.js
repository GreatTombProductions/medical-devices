/**
 * Medical Device Safety Check — Frontend
 *
 * Searches pre-aggregated FDA adverse event data by device name or manufacturer.
 * Letter-sharded indexes loaded on demand. Detail panels show event breakdowns,
 * yearly trends, and related entities.
 */
(function() {
    'use strict';

    const BASE = '';
    let currentMode = 'devices';
    let indexCache = {};
    let stats = null;

    // --- Formatting ---

    function fmtNum(n) {
        if (n === undefined || n === null) return '—';
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return n.toLocaleString();
    }

    function md5(str) {
        // Simple MD5 for shard keys — matches Python hashlib.md5
        function md5cycle(x, k) {
            var a = x[0], b = x[1], c = x[2], d = x[3];
            a = ff(a, b, c, d, k[0], 7, -680876936);d = ff(d, a, b, c, k[1], 12, -389564586);
            c = ff(c, d, a, b, k[2], 17, 606105819);b = ff(b, c, d, a, k[3], 22, -1044525330);
            a = ff(a, b, c, d, k[4], 7, -176418897);d = ff(d, a, b, c, k[5], 12, 1200080426);
            c = ff(c, d, a, b, k[6], 17, -1473231341);b = ff(b, c, d, a, k[7], 22, -45705983);
            a = ff(a, b, c, d, k[8], 7, 1770035416);d = ff(d, a, b, c, k[9], 12, -1958414417);
            c = ff(c, d, a, b, k[10], 17, -42063);b = ff(b, c, d, a, k[11], 22, -1990404162);
            a = ff(a, b, c, d, k[12], 7, 1804603682);d = ff(d, a, b, c, k[13], 12, -40341101);
            c = ff(c, d, a, b, k[14], 17, -1502002290);b = ff(b, c, d, a, k[15], 22, 1236535329);
            a = gg(a, b, c, d, k[1], 5, -165796510);d = gg(d, a, b, c, k[6], 9, -1069501632);
            c = gg(c, d, a, b, k[11], 14, 643717713);b = gg(b, c, d, a, k[0], 20, -373897302);
            a = gg(a, b, c, d, k[5], 5, -701558691);d = gg(d, a, b, c, k[10], 9, 38016083);
            c = gg(c, d, a, b, k[15], 14, -660478335);b = gg(b, c, d, a, k[4], 20, -405537848);
            a = gg(a, b, c, d, k[9], 5, 568446438);d = gg(d, a, b, c, k[14], 9, -1019803690);
            c = gg(c, d, a, b, k[3], 14, -187363961);b = gg(b, c, d, a, k[8], 20, 1163531501);
            a = gg(a, b, c, d, k[13], 5, -1444681467);d = gg(d, a, b, c, k[2], 9, -51403784);
            c = gg(c, d, a, b, k[7], 14, 1735328473);b = gg(b, c, d, a, k[12], 20, -1926607734);
            a = hh(a, b, c, d, k[5], 4, -378558);d = hh(d, a, b, c, k[8], 11, -2022574463);
            c = hh(c, d, a, b, k[11], 16, 1839030562);b = hh(b, c, d, a, k[14], 23, -35309556);
            a = hh(a, b, c, d, k[1], 4, -1530992060);d = hh(d, a, b, c, k[4], 11, 1272893353);
            c = hh(c, d, a, b, k[7], 16, -155497632);b = hh(b, c, d, a, k[10], 23, -1094730640);
            a = hh(a, b, c, d, k[13], 4, 681279174);d = hh(d, a, b, c, k[0], 11, -358537222);
            c = hh(c, d, a, b, k[3], 16, -722521979);b = hh(b, c, d, a, k[6], 23, 76029189);
            a = hh(a, b, c, d, k[9], 4, -640364487);d = hh(d, a, b, c, k[12], 11, -421815835);
            c = hh(c, d, a, b, k[15], 16, 530742520);b = hh(b, c, d, a, k[2], 23, -995338651);
            a = ii(a, b, c, d, k[0], 6, -198630844);d = ii(d, a, b, c, k[7], 10, 1126891415);
            c = ii(c, d, a, b, k[14], 15, -1416354905);b = ii(b, c, d, a, k[5], 21, -57434055);
            a = ii(a, b, c, d, k[12], 6, 1700485571);d = ii(d, a, b, c, k[3], 10, -1894986606);
            c = ii(c, d, a, b, k[10], 15, -1051523);b = ii(b, c, d, a, k[1], 21, -2054922799);
            a = ii(a, b, c, d, k[8], 6, 1873313359);d = ii(d, a, b, c, k[15], 10, -30611744);
            c = ii(c, d, a, b, k[6], 15, -1560198380);b = ii(b, c, d, a, k[13], 21, 1309151649);
            a = ii(a, b, c, d, k[4], 6, -145523070);d = ii(d, a, b, c, k[11], 10, -1120210379);
            c = ii(c, d, a, b, k[2], 15, 718787259);b = ii(b, c, d, a, k[9], 21, -343485551);
            x[0] = add32(a, x[0]);x[1] = add32(b, x[1]);
            x[2] = add32(c, x[2]);x[3] = add32(d, x[3]);
        }
        function cmn(q,a,b,x,s,t){a=add32(add32(a,q),add32(x,t));return add32((a<<s)|(a>>>(32-s)),b)}
        function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t)}
        function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t)}
        function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t)}
        function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t)}
        function add32(a,b){return(a+b)&0xFFFFFFFF}

        var n = str.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
        var tail = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        for (i = 64; i <= n; i += 64) {
            var blk = [];
            for (var j = 0; j < 64; j += 4)
                blk.push(str.charCodeAt(i-64+j)|(str.charCodeAt(i-64+j+1)<<8)|(str.charCodeAt(i-64+j+2)<<16)|(str.charCodeAt(i-64+j+3)<<24));
            md5cycle(state, blk);
        }
        var len = n - ((i - 64));
        for (var j = 0; j < 16; j++) tail[j] = 0;
        for (var j = 0; j < len; j++)
            tail[j>>2] |= str.charCodeAt(i-64+j) << ((j%4)<<3);
        tail[j>>2] |= 0x80 << ((j%4)<<3);
        if (j > 55) { md5cycle(state, tail); for (j = 0; j < 16; j++) tail[j] = 0; }
        tail[14] = n * 8;
        md5cycle(state, tail);

        var hex = '';
        for (i = 0; i < 4; i++)
            for (j = 0; j < 4; j++)
                hex += ('0' + ((state[i] >> (j*8)) & 255).toString(16)).slice(-2);
        return hex;
    }

    function shardKey(name) {
        return md5(name.toLowerCase()).substring(0, 2);
    }

    // --- Data Loading ---

    async function loadJSON(path) {
        try {
            const resp = await fetch(BASE + path);
            if (!resp.ok) return null;
            return await resp.json();
        } catch { return null; }
    }

    async function loadStats() {
        stats = await loadJSON('/data/stats.json');
        if (!stats) return;

        document.getElementById('total-events').textContent = fmtNum(stats.total_events);
        document.getElementById('total-devices').textContent = fmtNum(stats.total_devices_indexed);

        var eb = stats.event_breakdown || {};
        document.getElementById('total-deaths').textContent = fmtNum(eb['Death'] || 0);
        document.getElementById('total-injuries').textContent = fmtNum(eb['Injury'] || 0);
        document.getElementById('total-malfunctions').textContent = fmtNum(eb['Malfunction'] || 0);
    }

    async function loadIndex(mode, letter) {
        var key = mode + '/' + letter;
        if (indexCache[key]) return indexCache[key];
        var data = await loadJSON('/data/' + mode + '/' + letter + '.json');
        if (data) indexCache[key] = data;
        return data || [];
    }

    async function loadDetail(name, type) {
        var sk = shardKey(name);
        var data = await loadJSON('/data/detail/' + sk + '.json');
        if (!data) return null;
        var key = type + ':' + name;
        return data[key] || null;
    }

    // --- Search ---

    function searchIndex(items, query) {
        var q = query.toLowerCase();
        return items.filter(function(item) {
            return item.name.toLowerCase().includes(q);
        }).sort(function(a, b) {
            // Exact start match first, then by count
            var aStarts = a.name.toLowerCase().startsWith(q) ? 1 : 0;
            var bStarts = b.name.toLowerCase().startsWith(q) ? 1 : 0;
            if (aStarts !== bStarts) return bStarts - aStarts;
            return b.count - a.count;
        });
    }

    var searchTimeout = null;

    async function doSearch() {
        var query = document.getElementById('search-input').value.trim();
        var resultsEl = document.getElementById('results');

        if (query.length < 2) {
            resultsEl.innerHTML = '<div class="empty-state">Type at least 2 characters to search</div>';
            return;
        }

        resultsEl.innerHTML = '<div class="loading">Searching...</div>';

        // Determine which letter shards to load
        var firstLetter = query[0].toLowerCase();
        var shardLetter = /[a-z]/.test(firstLetter) ? firstLetter : '_';

        var items = await loadIndex(currentMode, shardLetter);

        // Also search a few neighboring shards if query is short
        if (query.length <= 3) {
            // Just search the primary shard
        }

        var results = searchIndex(items, query);

        if (results.length === 0) {
            // Try loading all shards for a broader search
            var allLetters = 'abcdefghijklmnopqrstuvwxyz_'.split('');
            var allItems = [];
            for (var i = 0; i < allLetters.length; i++) {
                if (allLetters[i] === shardLetter) continue;
                var shard = await loadIndex(currentMode, allLetters[i]);
                allItems = allItems.concat(shard);
            }
            results = searchIndex(allItems, query);
        }

        renderResults(results.slice(0, 50));
    }

    function renderResults(results) {
        var resultsEl = document.getElementById('results');
        if (results.length === 0) {
            resultsEl.innerHTML = '<div class="empty-state">No matches found</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            var metaParts = ['<span>' + fmtNum(r.count) + ' reports</span>'];
            if (r.deaths > 0) metaParts.push('<span class="deaths">' + fmtNum(r.deaths) + ' deaths</span>');
            if (r.injuries > 0) metaParts.push('<span class="injuries">' + fmtNum(r.injuries) + ' injuries</span>');

            html += '<div class="result-item" data-name="' + escHtml(r.name) + '" data-has-detail="' + (r.has_detail ? '1' : '0') + '">';
            html += '<div class="result-name">' + escHtml(formatName(r.name)) + '</div>';
            html += '<div class="result-meta">' + metaParts.join('') + '</div>';
            html += '</div>';
        }
        resultsEl.innerHTML = html;

        // Attach click handlers
        var items = resultsEl.querySelectorAll('.result-item');
        for (var i = 0; i < items.length; i++) {
            items[i].addEventListener('click', function() {
                var name = this.getAttribute('data-name');
                var hasDetail = this.getAttribute('data-has-detail') === '1';
                if (hasDetail) showDetail(name, currentMode === 'devices' ? 'device' : 'mfr');
            });
        }
    }

    function formatName(name) {
        // Title case for readability
        if (!name) return '';
        return name.replace(/\b\w+/g, function(w) {
            if (w.length <= 2 && w !== w.toUpperCase()) return w;
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        });
    }

    function escHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // --- Detail Panel ---

    async function showDetail(name, type) {
        var panel = document.getElementById('detail-panel');
        var titleEl = document.getElementById('detail-title');
        var contentEl = document.getElementById('detail-content');

        titleEl.textContent = formatName(name);
        contentEl.innerHTML = '<div class="loading">Loading details...</div>';
        panel.classList.add('open');

        var detail = await loadDetail(name, type);
        if (!detail) {
            contentEl.innerHTML = '<div class="empty-state">Detail data not available</div>';
            return;
        }

        var html = '';

        // Stats row
        html += '<div class="detail-stats">';
        html += '<div class="detail-stat"><div class="detail-stat-value">' + fmtNum(detail.total_events) + '</div><div class="detail-stat-label">Total Reports</div></div>';
        html += '<div class="detail-stat"><div class="detail-stat-value death">' + fmtNum(detail.deaths) + '</div><div class="detail-stat-label">Deaths</div></div>';
        html += '<div class="detail-stat"><div class="detail-stat-value injury">' + fmtNum(detail.injuries) + '</div><div class="detail-stat-label">Injuries</div></div>';
        html += '<div class="detail-stat"><div class="detail-stat-value malfunction">' + fmtNum(detail.malfunctions) + '</div><div class="detail-stat-label">Malfunctions</div></div>';
        html += '</div>';

        // Yearly trend
        if (detail.yearly) {
            var years = Object.keys(detail.yearly).sort();
            var maxY = Math.max.apply(null, years.map(function(y) { return detail.yearly[y]; }));
            if (maxY > 0) {
                html += '<div class="detail-section"><h4>Reports by Year</h4>';
                html += '<div class="yearly-chart">';
                for (var i = 0; i < years.length; i++) {
                    var y = years[i];
                    var v = detail.yearly[y];
                    var pct = maxY > 0 ? (v / maxY * 100) : 0;
                    html += '<div class="yearly-bar">';
                    html += '<div class="yearly-bar-value">' + fmtNum(v) + '</div>';
                    html += '<div class="yearly-bar-fill" style="height:' + pct + '%"></div>';
                    html += '<div class="yearly-bar-label">' + y + '</div>';
                    html += '</div>';
                }
                html += '</div></div>';
            }
        }

        // Event type breakdown
        if (detail.event_types) {
            var types = Object.keys(detail.event_types);
            var maxT = Math.max.apply(null, types.map(function(t) { return detail.event_types[t]; }));
            if (types.length > 0 && maxT > 0) {
                html += '<div class="detail-section"><h4>Event Types</h4>';
                html += '<div class="detail-bar-chart">';
                types.sort(function(a, b) { return detail.event_types[b] - detail.event_types[a]; });
                for (var i = 0; i < types.length; i++) {
                    var t = types[i];
                    var v = detail.event_types[t];
                    var pct = (v / maxT * 100);
                    html += '<div class="bar-row">';
                    html += '<div class="bar-label">' + escHtml(t) + '</div>';
                    html += '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>';
                    html += '<div class="bar-value">' + fmtNum(v) + '</div>';
                    html += '</div>';
                }
                html += '</div></div>';
            }
        }

        // Related entities (manufacturers for devices, devices for manufacturers)
        if (type === 'device' && detail.top_manufacturers && detail.top_manufacturers.length > 0) {
            html += '<div class="detail-section"><h4>Top Manufacturers</h4>';
            html += '<ul class="top-list">';
            for (var i = 0; i < detail.top_manufacturers.length; i++) {
                var m = detail.top_manufacturers[i];
                html += '<li><span class="name">' + escHtml(formatName(m.name)) + '</span><span class="count">' + fmtNum(m.count) + ' reports</span></li>';
            }
            html += '</ul></div>';
        }

        if (type === 'mfr' && detail.top_devices && detail.top_devices.length > 0) {
            html += '<div class="detail-section"><h4>Top Devices</h4>';
            html += '<ul class="top-list">';
            for (var i = 0; i < detail.top_devices.length; i++) {
                var d = detail.top_devices[i];
                html += '<li><span class="name">' + escHtml(formatName(d.name)) + '</span><span class="count">' + fmtNum(d.count) + ' reports</span></li>';
            }
            html += '</ul></div>';
        }

        contentEl.innerHTML = html;
    }

    // --- Event Handlers ---

    document.getElementById('search-input').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(doSearch, 250);
    });

    document.querySelectorAll('.tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            currentMode = this.getAttribute('data-mode');
            document.getElementById('detail-panel').classList.remove('open');
            doSearch();
        });
    });

    document.getElementById('detail-close').addEventListener('click', function() {
        document.getElementById('detail-panel').classList.remove('open');
    });

    // --- Init ---
    loadStats();
})();
