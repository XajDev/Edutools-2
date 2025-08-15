// Dummy-friendly version, no optional chaining
(function() {
    var statusEl = document.getElementById('status');
    var downEl = document.getElementById('down');
    var rttEl = document.getElementById('rtt');
    var typeEl = document.getElementById('type');
    var pingBtn = document.getElementById('ping');
    var pingOut = document.getElementById('pingOut');

    function getConnection() {
        return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    }

    function onlineText() {
        return navigator.onLine ? 'ONLINE ✅' : 'OFFLINE ❌';
    }

    function render() {
        var nc = getConnection();

        // Internet Status
        if (statusEl) statusEl.textContent = onlineText();

        // Download Speed
        if (downEl) {
            if (nc && typeof nc.downlink !== 'undefined' && nc.downlink !== null) {
                downEl.textContent = nc.downlink + ' Mbps';
            } else {
                downEl.textContent = '—';
            }
        }

        // Ping (Latency)
        if (rttEl) {
            if (nc && typeof nc.rtt !== 'undefined' && nc.rtt !== null) {
                rttEl.textContent = nc.rtt + ' ms';
            } else {
                rttEl.textContent = '—';
            }
        }

        // Connection Type
        if (typeEl) {
            if (nc && typeof nc.effectiveType !== 'undefined' && nc.effectiveType) {
                typeEl.textContent = nc.effectiveType.toUpperCase();
            } else {
                typeEl.textContent = '—';
            }
        }
    }

    // Offline-safe synthetic ping
    function doSyntheticPing() {
        var start = performance.now();
        var x = 0;
        while (performance.now() - start < 50) {
            x += Math.sqrt(x + 1);
        }
        var end = performance.now();
        if (pingOut) pingOut.textContent = Math.round(end - start) + ' ms';
    }

    window.addEventListener('online', render);
    window.addEventListener('offline', render);
    if (pingBtn) pingBtn.addEventListener('click', doSyntheticPing);

    render();
})();