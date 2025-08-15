(function() {
    var boardEl = document.getElementById('board');
    var turnEl = document.getElementById('turn');
    var restart = document.getElementById('restart');

    var cells = [],
        b = ['', '', '', '', '', '', '', '', ''],
        turn = 'X',
        over = false;

    function render() {
        boardEl.innerHTML = '';
        cells = [];
        for (var i = 0; i < 9; i++) {
            var d = document.createElement('button');
            d.className = 'cell';
            d.textContent = b[i] || '';
            (function(ix) {
                d.addEventListener('click', function() {
                    if (over || b[ix]) return;
                    b[ix] = turn;
                    swapTurn();
                    update();
                });
            })(i);
            boardEl.appendChild(d);
            cells.push(d);
        }
        update();
    }

    function swapTurn() { turn = (turn === 'X' ? 'O' : 'X');
        turnEl.textContent = turn; }

    function lines() { return [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6]
        ]; }

    function winner() {
        var L = lines();
        for (var i = 0; i < L.length; i++) {
            var a = L[i][0],
                c = L[i][1],
                d = L[i][2];
            if (b[a] && b[a] === b[c] && b[a] === b[d]) return { p: b[a], line: L[i] };
        }
        if (b.join('').length === 9) return { p: 'draw', line: null };
        return null;
    }

    function update() {
        for (var i = 0; i < 9; i++) cells[i].textContent = b[i] || '';
        var w = winner();
        if (w) {
            over = true;
            if (w.p === 'draw') { turnEl.textContent = 'Draw'; } else {
                turnEl.textContent = w.p + ' wins!';
                for (var j = 0; j < w.line.length; j++) cells[w.line[j]].classList.add('win');
            }
        }
    }

    restart.addEventListener('click', function() { b = ['', '', '', '', '', '', '', '', ''];
        turn = 'X';
        over = false;
        turnEl.textContent = turn;
        render(); });
    render();
})();