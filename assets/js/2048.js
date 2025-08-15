(function() {
    var gridEl = document.getElementById('grid'),
        scoreEl = document.getElementById('score'),
        restart = document.getElementById('restart');
    var g = [],
        score = 0,
        over = false;

    function init() { g = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        score = 0;
        over = false;
        spawn();
        spawn();
        render(); }

    function spawn() {
        var empty = [];
        for (var i = 0; i < 16; i++)
            if (!g[i]) empty.push(i);
        if (!empty.length) return;
        var pick = empty[Math.floor(Math.random() * empty.length)];
        g[pick] = Math.random() < 0.9 ? 2 : 4;
    }

    function render() { gridEl.innerHTML = ''; for (var i = 0; i < 16; i++) { var d = document.createElement('div');
            d.className = 'cell';
            d.textContent = g[i] || '';
            gridEl.appendChild(d); }
        scoreEl.textContent = score; }

    function idx(x, y) { return y * 4 + x; }

    function slide(arr) {
        var a = arr.filter(function(v) { return v !== 0; });
        for (var i = 0; i < a.length - 1; i++) { if (a[i] === a[i + 1]) { a[i] *= 2;
                score += a[i];
                a.splice(i + 1, 1); } }
        while (a.length < 4) a.push(0);
        return a;
    }

    function move(dir) {
        if (over) return;
        var before = g.join(',');
        if (dir === 'left' || dir === 'right') {
            for (var y = 0; y < 4; y++) {
                var row = [g[idx(0, y)], g[idx(1, y)], g[idx(2, y)], g[idx(3, y)]];
                if (dir === 'right') row.reverse();
                row = slide(row);
                if (dir === 'right') row.reverse();
                g[idx(0, y)] = row[0];
                g[idx(1, y)] = row[1];
                g[idx(2, y)] = row[2];
                g[idx(3, y)] = row[3];
            }
        } else {
            for (var x = 0; x < 4; x++) {
                var col = [g[idx(x, 0)], g[idx(x, 1)], g[idx(x, 2)], g[idx(x, 3)]];
                if (dir === 'down') col.reverse();
                col = slide(col);
                if (dir === 'down') col.reverse();
                g[idx(x, 0)] = col[0];
                g[idx(x, 1)] = col[1];
                g[idx(x, 2)] = col[2];
                g[idx(x, 3)] = col[3];
            }
        }
        if (g.join(',') !== before) { spawn();
            render();
            checkOver(); }
    }

    function checkOver() {
        for (var i = 0; i < 16; i++)
            if (!g[i]) return;
        for (var y = 0; y < 4; y++)
            for (var x = 0; x < 4; x++) {
                var v = g[idx(x, y)];
                if (x < 3 && g[idx(x + 1, y)] === v) return;
                if (y < 3 && g[idx(x, y + 1)] === v) return;
            }
        over = true;
    }
    document.addEventListener('keydown', function(e) {
        var k = (e.key || '').toLowerCase();
        if (k === 'arrowleft' || k === 'a') move('left');
        if (k === 'arrowright' || k === 'd') move('right');
        if (k === 'arrowup' || k === 'w') move('up');
        if (k === 'arrowdown' || k === 's') move('down');
    });
    gridEl.addEventListener('touchstart', function(e) { var t = e.touches && e.touches[0]; if (!t) return;
        this._sx = t.clientX;
        this._sy = t.clientY; }, { passive: true });
    gridEl.addEventListener('touchend', function(e) {
        var dx = (e.changedTouches[0].clientX - this._sx),
            dy = (e.changedTouches[0].clientY - this._sy);
        if (Math.abs(dx) > 30 || Math.abs(dy) > 30) { if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
            else move(dy > 0 ? 'down' : 'up'); }
    }, { passive: true });
    restart.addEventListener('click', init);
    init();
})();