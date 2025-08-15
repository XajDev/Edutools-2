// Weather tool using Open-Meteo (free, no key). Tablet-friendly, no modules.
(function() {
    var statusEl = document.getElementById('status');
    var q = document.getElementById('q');
    var searchBtn = document.getElementById('search');
    var mylocBtn = document.getElementById('myloc');

    var locEl = document.getElementById('loc');
    var nowTemp = document.getElementById('nowTemp');
    var nowFeels = document.getElementById('nowFeels');
    var nowHum = document.getElementById('nowHum');
    var nowWind = document.getElementById('nowWind');
    var nowRain = document.getElementById('nowRain');
    var nowDesc = document.getElementById('nowDesc');
    var nowIcon = document.getElementById('nowIcon');
    var hi = document.getElementById('hi');
    var lo = document.getElementById('lo');
    var daysEl = document.getElementById('days');

    var GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=';
    // current + daily
    function wxURL(lat, lon) {
        var base = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon;
        var current = '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m';
        var daily = '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum';
        return base + current + daily + '&timezone=auto' +
            '&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch';
    }

    // tiny icon map similar to Minecraft-y text
    var W = {
        0: '☀️ Clear',
        1: '🌤️ Mostly clear',
        2: '⛅ Partly cloudy',
        3: '☁️ Cloudy',
        45: '🌫️ Fog',
        48: '🌫️ Fog',
        51: '🌦️ Drizzle',
        53: '🌦️ Drizzle',
        55: '🌦️ Drizzle',
        56: '🌧️ Freezing drizzle',
        57: '🌧️ Freezing drizzle',
        61: '🌧️ Rain',
        63: '🌧️ Rain',
        65: '🌧️ Heavy rain',
        66: '🌧️ Freezing rain',
        67: '🌧️ Freezing rain',
        71: '🌨️ Snow',
        73: '🌨️ Snow',
        75: '🌨️ Heavy snow',
        77: '🌨️ Snow grains',
        80: '🌦️ Showers',
        81: '🌦️ Showers',
        82: '🌧️ Heavy showers',
        85: '🌨️ Snow showers',
        86: '🌨️ Snow showers',
        95: '⛈️ Thunderstorm',
        96: '⛈️ Thunder w/ hail',
        99: '⛈️ Thunder w/ hail'
    };

    function setStatus(t) { if (statusEl) statusEl.textContent = t; }

    function renderNow(current, daily) {
        var c = current || {};
        var d = daily || {};
        nowTemp.textContent = formatTemp(c.temperature_2m);
        nowFeels.textContent = formatTemp(c.apparent_temperature);
        nowHum.textContent = isNum(c.relative_humidity_2m) ? Math.round(c.relative_humidity_2m) + '%' : '—';
        nowWind.textContent = isNum(c.wind_speed_10m) ? Math.round(c.wind_speed_10m) + ' mph' : '—';
        nowRain.textContent = isNum(d.precipitation_sum && d.precipitation_sum[0]) ? d.precipitation_sum[0].toFixed(2) + ' in' : '—';
        hi.textContent = isNum(d.temperature_2m_max && d.temperature_2m_max[0]) ? Math.round(d.temperature_2m_max[0]) + '°' : '—';
        lo.textContent = isNum(d.temperature_2m_min && d.temperature_2m_min[0]) ? Math.round(d.temperature_2m_min[0]) + '°' : '—';

        var w = W[c.weather_code] || '—';
        nowDesc.textContent = w.replace(/^[^ ]+ /, ''); // remove emoji for desc
        nowIcon.textContent = (w.match(/^\S+/) || ['—'])[0];
    }

    function renderDays(daily) {
        daysEl.innerHTML = '';
        if (!daily || !daily.time) return;
        for (var i = 0; i < daily.time.length && i < 7; i++) {
            var box = document.createElement('div');
            box.className = 'wx-day';
            var date = new Date(daily.time[i]);
            var label = date.toLocaleDateString(undefined, { weekday: 'short' });
            var code = daily.weather_code[i];
            var icon = (W[code] || '—').match(/^\S+/) || ['—'];
            box.innerHTML =
                '<div>' + label + '</div>' +
                '<div class="wx-big">' + icon[0] + '</div>' +
                '<div>H ' + Math.round(daily.temperature_2m_max[i]) + '°</div>' +
                '<div>L ' + Math.round(daily.temperature_2m_min[i]) + '°</div>' +
                '<div class="muted">' + (isNum(daily.precipitation_sum[i]) ? daily.precipitation_sum[i].toFixed(2) + ' in' : '—') + '</div>';
            daysEl.appendChild(box);
        }
    }

    function isNum(x) { return typeof x === 'number' && isFinite(x); }

    function formatTemp(x) { return isNum(x) ? Math.round(x) + '°' : '—'; }

    // cache last result (for offline viewing)
    var KEY = 'wx.cache';

    function saveCache(obj) {
        try {
            var data = { when: Date.now(), payload: obj };
            if (window.store) store.set(KEY, data);
            else localStorage.setItem(KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function loadCache() {
        try {
            var data = window.store ? store.get(KEY, null) : JSON.parse(localStorage.getItem(KEY) || 'null');
            return data && data.payload;
        } catch (e) { return null; }
    }

    async function byCity(name) {
        setStatus('Searching…');
        var res = await fetch(GEO_URL + encodeURIComponent(name));
        if (!res.ok) throw new Error('geocoding failed');
        var j = await res.json();
        if (!j || !j.results || !j.results.length) throw new Error('place not found');
        var it = j.results[0];
        return { lat: it.latitude, lon: it.longitude, label: [it.name, it.admin1, it.country].filter(Boolean).join(', ') };
    }

    async function getWx(lat, lon) {
        setStatus('Loading weather…');
        var res = await fetch(wxURL(lat, lon));
        if (!res.ok) throw new Error('weather fetch failed');
        return res.json();
    }

    async function goCity(name) {
        try {
            var g = await byCity(name);
            var data = await getWx(g.lat, g.lon);
            locEl.textContent = g.label;
            renderNow(data.current, data.daily);
            renderDays(data.daily);
            setStatus('OK');
            saveCache({ label: g.label, data: data });
        } catch (e) {
            setStatus('Error');
            // try cache
            var c = loadCache();
            if (c) {
                locEl.textContent = c.label + ' (cached)';
                renderNow(c.data.current, c.data.daily);
                renderDays(c.data.daily);
            }
        }
    }

    function useMyLocation() {
        setStatus('Waiting for location…');
        if (!navigator.geolocation) { setStatus('Geolocation not available'); return; }
        navigator.geolocation.getCurrentPosition(async function(pos) {
            try {
                var lat = pos.coords.latitude,
                    lon = pos.coords.longitude;
                // reverse: just show coords if we don't have a name
                var label = 'My Location';
                var data = await getWx(lat, lon);
                locEl.textContent = label;
                renderNow(data.current, data.daily);
                renderDays(data.daily);
                setStatus('OK');
                saveCache({ label: label, data: data });
            } catch (e) { setStatus('Error'); }
        }, function(err) { setStatus('Location denied'); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
    }

    // events
    searchBtn.addEventListener('click', function() {
        var v = (q.value || '').trim();
        if (!v) return;
        goCity(v);
    });
    q.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchBtn.click();
        }
    });
    mylocBtn.addEventListener('click', useMyLocation);

    // boot: show cache if available
    (function init() {
        var c = loadCache();
        if (c) {
            locEl.textContent = c.label + ' (cached)';
            renderNow(c.data.current, c.data.daily);
            renderDays(c.data.daily);
            setStatus('Cached');
        } else {
            setStatus('Type a city or use location');
        }
    })();
})();