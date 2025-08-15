// /assets/js/unit-converter.js  (tablet-friendly, complete, no modules)
(function() {
    // ---- element refs
    var m = document.getElementById('m');
    var ft = document.getElementById('ft');

    var kg = document.getElementById('kg');
    var lb = document.getElementById('lb');

    var c = document.getElementById('c');
    var f = document.getElementById('f');

    // ---- constants
    var M_PER_FT = 0.3048; // 1 ft = 0.3048 m
    var FT_PER_M = 3.28084; // 1 m = 3.28084 ft
    var LB_PER_KG = 2.2046226218;
    var KG_PER_LB = 1 / LB_PER_KG;

    function fix(v, n) { return Number.isFinite(v) ? v.toFixed(n) : ''; }

    // ---- live conversions (both directions)
    if (m) m.oninput = function() { ft.value = fix((parseFloat(m.value || 0) * FT_PER_M), 4); };
    if (ft) ft.oninput = function() { m.value = fix((parseFloat(ft.value || 0) * M_PER_FT), 4); };

    if (kg) kg.oninput = function() { lb.value = fix((parseFloat(kg.value || 0) * LB_PER_KG), 4); };
    if (lb) lb.oninput = function() { kg.value = fix((parseFloat(lb.value || 0) * KG_PER_LB), 4); };

    if (c) c.oninput = function() { f.value = fix(((parseFloat(c.value || 0) * 9 / 5) + 32), 2); };
    if (f) f.oninput = function() { c.value = fix(((parseFloat(f.value || 0) - 32) * 5 / 9), 2); };

    // ---- swap buttons
    function swapIfPossible(a, b, toB) {
        // if a has a number, compute b from a; else if b has a number, compute a from b
        var av = parseFloat(a && a.value);
        var bv = parseFloat(b && b.value);
        if (!isNaN(av)) {
            toB(av, true);
        } else if (!isNaN(bv)) {
            toB(bv, false);
        }
    }

    var swapLen = document.getElementById('swapLen');
    var swapMass = document.getElementById('swapMass');
    var swapTemp = document.getElementById('swapTemp');

    if (swapLen) swapLen.addEventListener('click', function() {
        swapIfPossible(m, ft, function(val, fromA) {
            if (fromA) { ft.value = fix(val * FT_PER_M, 4);
                m.value = fix(val, 4); } else { m.value = fix(val * M_PER_FT, 4);
                ft.value = fix(val, 4); }
        });
    });

    if (swapMass) swapMass.addEventListener('click', function() {
        swapIfPossible(kg, lb, function(val, fromA) {
            if (fromA) { lb.value = fix(val * LB_PER_KG, 4);
                kg.value = fix(val, 4); } else { kg.value = fix(val * KG_PER_LB, 4);
                lb.value = fix(val, 4); }
        });
    });

    if (swapTemp) swapTemp.addEventListener('click', function() {
        swapIfPossible(c, f, function(val, fromA) {
            if (fromA) { f.value = fix((val * 9 / 5) + 32, 2);
                c.value = fix(val, 2); } else { c.value = fix((val - 32) * 5 / 9, 2);
                f.value = fix(val, 2); }
        });
    });

    // ---- clear buttons
    var clearLen = document.getElementById('clearLen');
    var clearMass = document.getElementById('clearMass');
    var clearTemp = document.getElementById('clearTemp');

    function clearPair(a, b) { if (a) a.value = ''; if (b) b.value = ''; }

    if (clearLen) clearLen.addEventListener('click', function() { clearPair(m, ft); });
    if (clearMass) clearMass.addEventListener('click', function() { clearPair(kg, lb); });
    if (clearTemp) clearTemp.addEventListener('click', function() { clearPair(c, f); });

    // ---- quick presets
    var preset1m = document.getElementById('preset1m');
    var preset10m = document.getElementById('preset10m');
    var preset100m = document.getElementById('preset100m');

    var preset1kg = document.getElementById('preset1kg');
    var preset5kg = document.getElementById('preset5kg');
    var preset10kg = document.getElementById('preset10kg');

    var preset0c = document.getElementById('preset0c');
    var preset20c = document.getElementById('preset20c');
    var preset100c = document.getElementById('preset100c');

    function setAndConvert(inputEl, value) {
        if (!inputEl) return;
        inputEl.value = String(value);
        // trigger the oninput handler to update the paired field
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // length presets
    if (preset1m) preset1m.addEventListener('click', function() { setAndConvert(m, 1); });
    if (preset10m) preset10m.addEventListener('click', function() { setAndConvert(m, 10); });
    if (preset100m) preset100m.addEventListener('click', function() { setAndConvert(m, 100); });

    // mass presets
    if (preset1kg) preset1kg.addEventListener('click', function() { setAndConvert(kg, 1); });
    if (preset5kg) preset5kg.addEventListener('click', function() { setAndConvert(kg, 5); });
    if (preset10kg) preset10kg.addEventListener('click', function() { setAndConvert(kg, 10); });

    // temperature presets
    if (preset0c) preset0c.addEventListener('click', function() { setAndConvert(c, 0); });
    if (preset20c) preset20c.addEventListener('click', function() { setAndConvert(c, 20); });
    if (preset100c) preset100c.addEventListener('click', function() { setAndConvert(c, 100); });
})();