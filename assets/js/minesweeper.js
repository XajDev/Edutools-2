// EduTools Minesweeper — tablet-friendly, no modules
(function() {
    var boardEl = document.getElementById('board');
    var diffSel = document.getElementById('difficulty');
    var restart = document.getElementById('restart');
    var flagBtn = document.getElementById('flagMode');
    var mineCountEl = document.getElementById('mineCount');
    var flagsLeftEl = document.getElementById('flagsLeft');
    var timerEl = document.getElementById('timer');
    var statusEl = document.getElementById('status');

    var rows = 16,
        cols = 16,
        mines = 40;
    var grid = [],
        revealed = 0,
        flags = 0,
        started = false,
        over = false,
        flagMode = false,
        tHandle = 0,
        seconds = 0;

    function setStatus(t) { if (statusEl) statusEl.textContent = t; }

    function parseDiff(v) {
        var m = (v || '16x16x40').match(/^(\d+)x(\d+)x(\d+)$/);
        if (!m) return { r: 16, c: 16, m: 40 };
        return { r: parseInt(m[1], 10), c: parseInt(m[2], 10), m: parseInt(m[3], 10) };
    }

    function stopTimer() { if (tHandle) clearInterval(tHandle);
        tHandle = 0; }

    function startTimer() {
        if (tHandle) return;
        tHandle = setInterval(function() { seconds++;
            timerEl.textContent = seconds; }, 1000);
    }

    function makeGrid() {
        grid = [];
        for (var r = 0; r < rows; r++) {
            var row = [];
            for (var c = 0; c < cols; c++) {
                row.push({ mine: false, adj: 0, rev: false, flag: false, el: null });
            }
            grid.push(row);
        }
    }

    function inBounds(r, c) { return r >= 0 && r < rows && c >= 0 && c < cols; }

    function placeMines(avoidR, avoidC) {
        var placed = 0;
        while (placed < mines) {
            var r = Math.floor(Math.random() * rows);
            var c = Math.floor(Math.random() * cols);
            if (grid[r][c].mine) continue;
            // keep first click safe (avoid the 3x3 around first click)
            if (Math.abs(r - avoidR) <= 1 && Math.abs(c - avoidC) <= 1) continue;
            grid[r][c].mine = true;
            placed++;
        }
        // compute adjacents
        for (var r2 = 0; r2 < rows; r2++) {
            for (var c2 = 0; c2 < cols; c2++) {
                if (grid[r2][c2].mine) continue;
                var n = 0;
                for (var dr = -1; dr <= 1; dr++)
                    for (var dc = -1; dc <= 1; dc++) {
                        if (!dr && !dc) continue;
                        var rr = r2 + dr,
                            cc = c2 + dc;
                        if (inBounds(rr, cc) && grid[rr][cc].mine) n++;
                    }
                grid[r2][c2].adj = n;
            }
        }
    }

    function render() {
        boardEl.innerHTML = '';
        boardEl.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
        revealed = 0;
        flags = 0;
        seconds = 0;
        timerEl.textContent = '0';
        mineCountEl.textContent = mines;
        flagsLeftEl.textContent = mines - flags;
        setStatus('Ready');
        over = false;
        started = false;
        stopTimer();

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var d = document.createElement('button');
                d.className = 'cell';
                d.setAttribute('data-r', r);
                d.setAttribute('data-c', c);
                d.setAttribute('aria-label', 'Hidden');
                attachCellHandlers(d);
                boardEl.appendChild(d);
                grid[r][c].el = d;
            }
        }
    }

    function reveal(r, c) {
        var cell = grid[r][c];
        if (cell.rev || cell.flag) return;
        cell.rev = true;
        revealed++;
        var el = cell.el;
        el.classList.add('revealed');
        el.setAttribute('aria-label', 'Revealed');
        if (cell.mine) {
            el.classList.add('mine');
            el.textContent = '💥';
            return;
        }
        if (cell.adj > 0) {
            el.textContent = String(cell.adj);
            el.classList.add('nums-' + cell.adj);
        } else {
            // flood
            for (var dr = -1; dr <= 1; dr++)
                for (var dc = -1; dc <= 1; dc++) {
                    if (!dr && !dc) continue;
                    var rr = r + dr,
                        cc = c + dc;
                    if (inBounds(rr, cc)) reveal(rr, cc);
                }
        }
    }

    function toggleFlag(r, c) {
        var cell = grid[r][c];
        if (cell.rev) return;
        cell.flag = !cell.flag;
        if (cell.flag) { flags++;
            cell.el.classList.add('flag');
            cell.el.setAttribute('aria-label', 'Flagged'); } else { flags--;
            cell.el.classList.remove('flag');
            cell.el.setAttribute('aria-label', 'Hidden'); }
        flagsLeftEl.textContent = Math.max(0, mines - flags);
    }

    function clickCell(r, c, useFlag) {
        if (over) return;
        if (!started) {
            // on first click, place mines avoiding this area
            placeMines(r, c);
            started = true;
            startTimer();
        }
        var cell = grid[r][c];
        if (useFlag) { toggleFlag(r, c); return; }
        if (cell.flag || cell.rev) return;

        reveal(r, c);

        if (cell.mine) {
            // reveal all mines
            for (var rr = 0; rr < rows; rr++)
                for (var cc = 0; cc < cols; cc++) {
                    var ce = grid[rr][cc];
                    if (ce.mine) { ce.el.classList.add('revealed', 'mine'); if (!ce.el.textContent) ce.el.textContent = '💣'; }
                }
            over = true;
            stopTimer();
            setStatus('BOOM! Game Over');
            return;
        }

        // win?
        if (revealed === rows * cols - mines) {
            over = true;
            stopTimer();
            setStatus('You win! 🏆');
            // auto-flag remaining
            for (var rr2 = 0; rr2 < rows; rr2++)
                for (var cc2 = 0; cc2 < cols; cc2++) {
                    var ce2 = grid[rr2][cc2];
                    if (!ce2.rev && ce2.mine) { ce2.flag = true;
                        ce2.el.classList.add('flag'); }
                }
        }
    }

    function attachCellHandlers(el) {
        // Left click = reveal, Right click = flag
        el.addEventListener('click', function(e) {
            var r = parseInt(this.getAttribute('data-r'), 10);
            var c = parseInt(this.getAttribute('data-c'), 10);
            clickCell(r, c, flagMode); // if flag mode ON, clicking flags
        });
        el.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            var r = parseInt(this.getAttribute('data-r'), 10);
            var c = parseInt(this.getAttribute('data-c'), 10);
            toggleFlag(r, c);
        });

        // Long-press for touch to flag (700ms)
        var tId = 0,
            pressed = false;
        el.addEventListener('touchstart', function(e) {
            pressed = true;
            var self = this;
            tId = setTimeout(function() {
                if (!pressed) return;
                var r = parseInt(self.getAttribute('data-r'), 10);
                var c = parseInt(self.getAttribute('data-c'), 10);
                toggleFlag(r, c);
            }, 700);
        }, { passive: true });
        el.addEventListener('touchend', function() { pressed = false;
            clearTimeout(tId); }, { passive: true });
        el.addEventListener('touchmove', function() { pressed = false;
            clearTimeout(tId); }, { passive: true });
    }

    function applyDiff() {
        var d = parseDiff(diffSel.value);
        rows = d.r;
        cols = d.c;
        mines = Math.min(d.m, d.r * d.c - 1);
        makeGrid();
        render();
    }

    // UI
    diffSel.addEventListener('change', applyDiff);
    restart.addEventListener('click', function() { applyDiff(); });
    flagBtn.addEventListener('click', function() {
        flagMode = !flagMode;
        flagBtn.textContent = 'Flag Mode: ' + (flagMode ? 'On' : 'Off');
    });

    // Keyboard quick actions
    document.addEventListener('keydown', function(e) {
        var k = (e.key || '').toLowerCase();
        if (k === 'r') applyDiff();
        if (k === 'f') { flagMode = !flagMode;
            flagBtn.textContent = 'Flag Mode: ' + (flagMode ? 'On' : 'Off'); }
    });

    // boot
    applyDiff();
})();