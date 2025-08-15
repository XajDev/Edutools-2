// Tablet-friendly calc (no modules, touch + keyboard + gestures)
(function() {
    var scr = document.getElementById('scr');
    var history = document.getElementById('history');
    var grid = document.querySelector('.calc-grid');
    var eqBtn = document.getElementById('eq');
    var delBtn = document.getElementById('del');

    // Small haptic helper
    function vibe(ms) {
        try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) {}
    }

    // Sanitized eval: allow only digits, operators, parentheses, dot, spaces, percent
    function isSafe(expr) {
        return /^[0-9+\-*/().%\s]*$/.test(expr);
    }

    function percentize(expr) {
        // Turn "50%+20" into "(50/100)+20" etc., basic pass
        return expr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
    }

    function calculate() {
        var expr = (scr.value || '').trim();
        if (!expr) return;
        if (!isSafe(expr)) { scr.value = 'Error'; return; }
        try {
            // Replace unicode divide/multiply if user pasted
            expr = expr.replace(/÷/g, '/').replace(/×/g, '*');
            expr = percentize(expr);
            // eslint-disable-next-line no-eval
            var res = eval(expr);
            if (typeof res === 'number' && isFinite(res)) {
                history.textContent = expr + ' =';
                scr.value = String(res);
                vibe(15);
            } else {
                scr.value = 'Error';
            }
        } catch (e) {
            scr.value = 'Error';
        }
    }

    function insert(v) {
        if (v === 'neg') {
            // Toggle sign of the last number chunk
            var s = scr.value;
            // find last number (with optional decimal)
            var m = s.match(/(-?\d+(\.\d+)?)\s*$/);
            if (m) {
                var num = m[1];
                var start = s.lastIndexOf(num);
                var toggled = (num[0] === '-') ? num.slice(1) : '-' + num;
                scr.value = s.slice(0, start) + toggled;
            } else if (!s) {
                scr.value = '-';
            } else {
                scr.value += ' -';
            }
            return;
        }
        scr.value += v;
    }

    function clearAll() { scr.value = '';
        history.textContent = ''; }

    function clearEntry() {
        // Clear last token (number or operator)
        var s = scr.value;
        if (!s) return;
        // If ends with space + operator, remove two chars; else trim digits
        var opEnd = s.match(/\s*[+\-*/()]$/);
        if (opEnd) {
            scr.value = s.slice(0, s.length - opEnd[0].length);
        } else {
            scr.value = s.slice(0, -1);
        }
    }

    function deleteOne() {
        if (!scr.value) return;
        scr.value = scr.value.slice(0, -1);
    }

    // Press-and-hold for delete
    var delHoldTimer = 0,
        delRepeat = 0;

    function startDelHold() {
        deleteOne();
        vibe(7);
        delRepeat = setInterval(function() { deleteOne(); }, 60);
    }

    function endDelHold() {
        clearTimeout(delHoldTimer);
        clearInterval(delRepeat);
    }
    if (delBtn) {
        delBtn.addEventListener('mousedown', startDelHold);
        delBtn.addEventListener('touchstart', function(e) { e.preventDefault();
            startDelHold(); }, { passive: false });
        ['mouseup', 'mouseleave', 'blur', 'touchend', 'touchcancel'].forEach(function(ev) {
            delBtn.addEventListener(ev, endDelHold);
        });
    }

    // Swipe left on screen to delete one char
    (function enableSwipeToDelete() {
        var screen = document.getElementById('screen');
        if (!screen) return;
        var x0 = 0,
            y0 = 0,
            swiping = false;
        screen.addEventListener('touchstart', function(e) {
            if (!e.touches || !e.touches[0]) return;
            x0 = e.touches[0].clientX;
            y0 = e.touches[0].clientY;
            swiping = true;
        }, { passive: true });

        screen.addEventListener('touchmove', function(e) {
            if (!swiping || !e.touches || !e.touches[0]) return;
            var dx = e.touches[0].clientX - x0;
            var dy = e.touches[0].clientY - y0;
            if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
                // left swipe
                if (dx < 0) { deleteOne();
                    vibe(7);
                    swiping = false; }
            }
        }, { passive: true });

        screen.addEventListener('touchend', function() { swiping = false; }, { passive: true });
    })();

    // Keypad clicks/taps
    if (grid) {
        grid.addEventListener('click', function(e) {
            var t = e.target.closest('.calc-btn');
            if (!t) return;
            var k = t.getAttribute('data-key');
            if (!k && t.id === 'eq') k = '=';
            if (!k && t.id === 'del') { deleteOne(); return; }
            vibe(8);

            if (k === '=') return calculate();
            if (k === 'AC') return clearAll();
            if (k === 'C') return clearEntry();
            if (k === '%') return insert('%');
            if (k === 'neg') return insert('neg');
            // digits/operators
            insert(k);
        });
    }

    // Keyboard support
    scr.addEventListener('keydown', function(e) {
        var k = e.key;
        if (k === 'Enter' || k === '=') { e.preventDefault();
            calculate(); return; }
        if (k === 'Backspace') { e.preventDefault();
            deleteOne(); return; }
        if (k === 'Escape') { e.preventDefault();
            clearAll(); return; }
        // Allow only safe chars
        var allowed = /[0-9+\-*/().%\s]/.test(k);
        if (!allowed) { e.preventDefault(); }
    });

    // Keep focus out of the way; tap on screen focuses input for OSK if needed
    document.getElementById('screen').addEventListener('click', function() {
        try { scr.focus(); } catch (e) {}
    });

    // Calculate on equals button
    if (eqBtn) eqBtn.addEventListener('click', calculate);
})();