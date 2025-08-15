// EduTools Maps: OSM (Leaflet) + Google Satellite + Earth link + search + markers
(function() {
    var statusEl = document.getElementById('status');
    var q = document.getElementById('q');
    var searchBtn = document.getElementById('search');
    var mylocBtn = document.getElementById('myloc');
    var clearBtn = document.getElementById('clearPins');

    var modeOSM = document.getElementById('modeOSM');
    var modeSAT = document.getElementById('modeSAT');
    var openEarth = document.getElementById('openEarth');

    var leafletWrap = document.getElementById('leafletWrap');
    var gWrap = document.getElementById('gWrap');
    var gFrame = document.getElementById('gFrame');

    var coordEl = document.getElementById('coord');
    var copyCoord = document.getElementById('copyCoord');
    var shareLink = document.getElementById('shareLink');

    var MAP_ZOOM = 12;
    var curLat = 0,
        curLon = 0,
        curZoom = 2;
    var markers = [];

    function setStatus(s) { if (statusEl) statusEl.textContent = s; }

    function isNum(x) { return typeof x === 'number' && isFinite(x); }

    function fmt(n) { return n.toFixed(6); }

    function updateCoordText() { coordEl.textContent = fmt(curLat) + ', ' + fmt(curLon) + ' @ z' + curZoom; }

    // ----- Leaflet init
    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var centerPin = L.marker([0, 0], { opacity: 0 }).addTo(map); // invisible helper for centering

    map.on('moveend', function() {
        var c = map.getCenter();
        curLat = c.lat;
        curLon = c.lng;
        curZoom = map.getZoom();
        updateCoordText();
        setGoogleSrc();
        saveState();
    });

    map.on('click', function(e) {
        dropMarker(e.latlng.lat, e.latlng.lng, 'Dropped pin');
    });

    function goTo(lat, lon, zoom) {
        try { map.setView([lat, lon], zoom || MAP_ZOOM); } catch (e) {}
    }

    function dropMarker(lat, lon, label) {
        var m = L.marker([lat, lon]).addTo(map).bindPopup(label || '');
        markers.push(m);
    }

    function clearMarkers() {
        for (var i = 0; i < markers.length; i++) { try { map.removeLayer(markers[i]); } catch (e) {} }
        markers = [];
    }

    // ----- Google Satellite iframe
    function setGoogleSrc() {
        if (!isNum(curLat) || !isNum(curLon)) { gFrame.src = ''; return; }
        var url = 'https://www.google.com/maps?q=' + curLat + ',' + curLon + '&t=k&z=' + (curZoom || MAP_ZOOM) + '&output=embed';
        gFrame.src = url;
    }

    function setMode(which) {
        if (which === 'sat') {
            modeSAT.classList.add('active');
            modeOSM.classList.remove('active');
            leafletWrap.style.display = 'none';
            gWrap.style.display = '';
            setGoogleSrc();
        } else {
            modeOSM.classList.add('active');
            modeSAT.classList.remove('active');
            gWrap.style.display = 'none';
            leafletWrap.style.display = '';
        }
        saveState();
    }

    modeOSM.addEventListener('click', function() { setMode('osm'); });
    modeSAT.addEventListener('click', function() { setMode('sat'); });

    openEarth.addEventListener('click', function() {
        if (!isNum(curLat) || !isNum(curLon)) return;
        var url = 'https://earth.google.com/web/@' + curLat + ',' + curLon + ',5000a,0d,60y,0h';
        window.open(url, '_blank');
    });

    // ----- Search (Nominatim)
    async function searchPlace(text) {
        setStatus('Searching…');
        var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(text);
        var r = await fetch(url);
        if (!r.ok) throw new Error('search failed');
        var arr = await r.json();
        if (!arr || !arr.length) throw new Error('not found');
        var it = arr[0];
        return { lat: Number(it.lat), lon: Number(it.lon), label: it.display_name };
    }

    async function doSearch() {
        var v = (q.value || '').trim();
        if (!v) return;
        try {
            var s = await searchPlace(v);
            curLat = s.lat;
            curLon = s.lon;
            curZoom = MAP_ZOOM;
            goTo(s.lat, s.lon, curZoom);
            dropMarker(s.lat, s.lon, s.label);
            updateCoordText();
            setStatus('OK');
        } catch (e) { setStatus('Not found'); }
    }

    searchBtn.addEventListener('click', doSearch);
    q.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault();
            doSearch(); } });

    // ----- Use My Location
    function useMyLocation() {
        setStatus('Getting location…');
        if (!navigator.geolocation) { setStatus('Geolocation not available'); return; }
        navigator.geolocation.getCurrentPosition(function(pos) {
            var lat = pos.coords.latitude,
                lon = pos.coords.longitude;
            curLat = lat;
            curLon = lon;
            curZoom = 13;
            goTo(lat, lon, curZoom);
            dropMarker(lat, lon, 'My location');
            updateCoordText();
            setStatus('OK');
        }, function() { setStatus('Location denied'); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
    }
    mylocBtn.addEventListener('click', useMyLocation);

    // ----- Clear markers
    clearBtn.addEventListener('click', function() { clearMarkers(); });

    // ----- Copy/share
    function copyText(t) {
        try {
            var ta = document.createElement('textarea');
            ta.value = t;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setStatus('Copied');
            setTimeout(function() { setStatus('OK'); }, 900);
        } catch (e) {}
    }
    copyCoord.addEventListener('click', function() {
        copyText(fmt(curLat) + ', ' + fmt(curLon));
    });
    shareLink.addEventListener('click', function() {
        var link = location.origin + location.pathname.replace(/[^/]+$/, '') + 'maps.html?lat=' + encodeURIComponent(curLat) + '&lon=' + encodeURIComponent(curLon) + '&z=' + (curZoom || MAP_ZOOM) + '&mode=' + currentMode();
        copyText(link);
    });

    function currentMode() { return gWrap.style.display === '' ? 'sat' : 'osm'; }

    // ----- Persist/restore state (optional, local)
    var KEY = 'maps.state';

    function saveState() {
        try {
            var s = { lat: curLat, lon: curLon, z: curZoom, mode: currentMode() };
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch (e) {}
    }

    function loadState() {
        try {
            var s = JSON.parse(localStorage.getItem(KEY) || 'null');
            return s || null;
        } catch (e) { return null; }
    }

    // ----- Boot
    (function init() {
        // URL params first
        var p = new URLSearchParams(location.search);
        var plat = Number(p.get('lat'));
        var plon = Number(p.get('lon'));
        var pz = Number(p.get('z'));
        var pmode = p.get('mode');

        var restored = loadState();

        if (isNum(plat) && isNum(plon)) {
            curLat = plat;
            curLon = plon;
            curZoom = isNum(pz) ? pz : MAP_ZOOM;
        } else if (restored && isNum(restored.lat) && isNum(restored.lon)) {
            curLat = restored.lat;
            curLon = restored.lon;
            curZoom = restored.z || MAP_ZOOM;
        } else {
            curLat = 0;
            curLon = 0;
            curZoom = 2; // world view
        }

        goTo(curLat, curLon, curZoom);
        updateCoordText();
        setGoogleSrc();

        if (pmode === 'sat') setMode('sat');
        else if (restored && restored.mode === 'sat') setMode('sat');
        else setMode('osm');

        setStatus('Ready');
    })();
})();