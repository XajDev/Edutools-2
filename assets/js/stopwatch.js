// Tablet-friendly Stopwatch + Timer (no modules)
/* global navigator */
(function() {
    // ----- tiny helpers
    function vibe(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) {} }

    function fmtMS(ms) {
        var m = Math.floor(ms / 60000);
        var s = Math.floor((ms % 60000) / 1000);
        var ms3 = Math.floor(ms % 1000);
        return ('' + m).padStart(2, '0') + ':' + ('' + s).padStart(2, '0') + '.' + ('' + ms3).padStart(3, '0');
    }

    function fmtMMSS(total) {
        total = Math.max(0, total | 0);
        var m = Math.floor(total / 60);
        var s = total % 60;
        return ('' + m).padStart(2, '0') + ':' + ('' + s).padStart(2, '0');
    }

    // ===== STOPWATCH =====
    var swDisplay = document.getElementById('swDisplay');
    var swStart = document.getElementById('swStart');
    var swLapBtn = document.getElementById('swLap');
    var swReset = document.getElementById('swReset');
    var lapsEl = document.getElementById('laps');

    var swRunning = false,
        swStartTime = 0,
        swElapsed = 0,
        raf = 0,
        lapCount = 0;

    function swTick() {
        if (!swRunning) return;
        var now = performance.now();
        var total = swElapsed + (now - swStartTime);
        swDisplay.textContent = fmtMS(total);
        raf = requestAnimationFrame(swTick);
    }

    function swStartStop() {
        swRunning = !swRunning;
        if (swRunning) {
            swStartTime = performance.now();
            swStart.textContent = 'Pause';
            swTick();
            vibe(12);
        } else {
            cancelAnimationFrame(raf);
            swElapsed += performance.now() - swStartTime;
            swStart.textContent = 'Start';
            vibe(8);
        }
    }

    function swLap() {
        if (!swRunning && swElapsed === 0) return;
        lapCount++;
        var row = document.createElement('div');
        row.className = 'lap';
        var nowText = swDisplay.textContent;
        row.innerHTML = '<span class="num">#' + lapCount + '</span><span>' + nowText + '</span><small>Lap</small>';
        lapsEl.prepend(row);
        vibe(8);
    }

    function swResetAll() {
        swRunning = false;
        cancelAnimationFrame(raf);
        swElapsed = 0;
        swStart.textContent = 'Start';
        swDisplay.textContent = '00:00.000';
        lapsEl.innerHTML = '';
        lapCount = 0;
        vibe(6);
    }

    if (swStart) swStart.addEventListener('click', swStartStop);
    if (swLapBtn) swLapBtn.addEventListener('click', swLap);
    if (swReset) swReset.addEventListener('click', swResetAll);

    // Keys: Space start/pause, L lap, R reset
    document.addEventListener('keydown', function(e) {
        if (/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) return;
        if (e.code === 'Space') { e.preventDefault();
            swStartStop(); }
        if (e.key === 'l' || e.key === 'L') { e.preventDefault();
            swLap(); }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault();
            swResetAll(); }
    });

    // ===== TIMER =====
    var tmDisplay = document.getElementById('tmDisplay');
    var tMin = document.getElementById('tMin');
    var tSec = document.getElementById('tSec');
    var tmStart = document.getElementById('tmStart');
    var tmReset = document.getElementById('tmReset');

    var minusMin = document.getElementById('minusMin');
    var plusMin = document.getElementById('plusMin');
    var minusSec = document.getElementById('minusSec');
    var plusSec = document.getElementById('plusSec');

    var preset1 = document.getElementById('preset1');
    var preset3 = document.getElementById('preset3');
    var preset5 = document.getElementById('preset5');
    var preset10 = document.getElementById('preset10');

    var tmLeft = 0,
        tmInt = 0,
        tmRunning = false,
        beep = null;

    // simple beep
    (function makeBeep() {
        try {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            var ctx = new Ctx();
            beep = function() {
                var o = ctx.createOscillator(),
                    g = ctx.createGain();
                o.frequency.value = 880;
                o.connect(g);
                g.connect(ctx.destination);
                g.gain.value = .05;
                o.start();
                setTimeout(function() {
                    try { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + .25);
                        o.stop(ctx.currentTime + .26); } catch (e) {}
                }, 10);
            };
        } catch (e) {
            beep = function() {};
        }
    })();

    function updateTmDisplay() {
        tmDisplay.textContent = fmtMMSS(tmLeft);
    }

    function readInputsToLeft() {
        var m = parseInt(tMin.value || '0', 10);
        if (isNaN(m) || m < 0) m = 0;
        var s = parseInt(tSec.value || '0', 10);
        if (isNaN(s) || s < 0) s = 0;
        tmLeft = Math.max(0, m * 60 + s);
        updateTmDisplay();
    }

    function writeLeftToInputs() {
        var m = Math.floor(tmLeft / 60),
            s = tmLeft % 60;
        tMin.value = m;
        tSec.value = s;
        updateTmDisplay();
    }

    // inputs
    if (tMin) tMin.addEventListener('input', readInputsToLeft);
    if (tSec) tSec.addEventListener('input', readInputsToLeft);

    function tmTick() {
        tmLeft--;
        if (tmLeft <= 0) {
            tmLeft = 0;
            clearInterval(tmInt);
            tmRunning = false;
            tmStart.textContent = 'Start';
            updateTmDisplay();
            writeLeftToInputs();
            for (var i = 0; i < 3; i++) setTimeout(beep, i * 350);
            vibe(40);
            return;
        }
        updateTmDisplay();
    }

    function tmStartPause() {
        if (!tmRunning) {
            // If no time set, read from inputs first
            if (tmLeft <= 0) { readInputsToLeft(); }
            if (tmLeft <= 0) return; // still zero → do nothing
            tmRunning = true;
            tmStart.textContent = 'Pause';
            updateTmDisplay();
            tmInt = setInterval(tmTick, 1000);
            vibe(12);
        } else {
            tmRunning = false;
            tmStart.textContent = 'Start';
            clearInterval(tmInt);
            writeLeftToInputs();
            vibe(8);
        }
    }

    function tmResetAll() {
        tmRunning = false;
        clearInterval(tmInt);
        tmLeft = 0;
        tMin.value = '';
        tSec.value = '';
        updateTmDisplay();
        tmStart.textContent = 'Start';
        vibe(6);
    }

    if (tmStart) tmStart.addEventListener('click', tmStartPause);
    if (tmReset) tmReset.addEventListener('click', tmResetAll);

    // adjust buttons (with press-and-hold repeat)
    function changeBy(delta) {
        tmLeft = Math.max(0, tmLeft + delta);
        writeLeftToInputs();
    }

    function holdRepeat(btn, fn) {
        var rpt;

        function start() { fn();
            vibe(6);
            rpt = setInterval(fn, 120); }

        function end() { clearInterval(rpt); }
        btn.addEventListener('mousedown', start);
        btn.addEventListener('touchstart', function(e) { e.preventDefault();
            start(); }, { passive: false });
        ['mouseup', 'mouseleave', 'blur', 'touchend', 'touchcancel'].forEach(function(ev) { btn.addEventListener(ev, end); });
    }

    if (minusMin) { holdRepeat(minusMin, function() { changeBy(-60); }); }
    if (plusMin) { holdRepeat(plusMin, function() { changeBy(+60); }); }
    if (minusSec) { holdRepeat(minusSec, function() { changeBy(-5); }); }
    if (plusSec) { holdRepeat(plusSec, function() { changeBy(+5); }); }

    // presets
    function setPreset(sec) { tmLeft = sec;
        writeLeftToInputs();
        vibe(8); }
    if (preset1) preset1.addEventListener('click', function() { setPreset(60); });
    if (preset3) preset3.addEventListener('click', function() { setPreset(180); });
    if (preset5) preset5.addEventListener('click', function() { setPreset(300); });
    if (preset10) preset10.addEventListener('click', function() { setPreset(600); });

    // init
    updateTmDisplay();
})();