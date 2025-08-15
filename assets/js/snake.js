// EduTools Snake — tablet-friendly, no modules
(function() {
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');

    var scoreEl = document.getElementById('score');
    var bestEl = document.getElementById('best');
    var msgEl = document.getElementById('msg');

    var upB = document.getElementById('up');
    var downB = document.getElementById('down');
    var leftB = document.getElementById('left');
    var rightB = document.getElementById('right');
    var pauseB = document.getElementById('pause');
    var restartB = document.getElementById('restart');

    var slowB = document.getElementById('slow');
    var normalB = document.getElementById('normal');
    var fastB = document.getElementById('fast');

    // Grid
    var CELL = 24;
    var COLS = Math.floor(canvas.width / CELL);
    var ROWS = Math.floor(canvas.height / CELL);

    // Game state
    var snake, dir, nextDir, food, score, best, tickMs, loop, paused, dead;

    // Colors (fit your theme)
    var BG = '#0a0f16';
    var GRID = '#0e1520';
    var SNAKE_HEAD = '#6ec1ff';
    var SNAKE_BODY = '#357ABD';
    var FOOD = '#ffd166';

    // Speed presets
    var SPEED = { slow: 180, normal: 120, fast: 80 };

    // High score
    try {
        var saved = window.store ? store.get('snake.best', 0) : parseInt(localStorage.getItem('snake.best') || '0', 10);
        best = isFinite(saved) ? saved : 0;
    } catch (e) { best = 0; }
    bestEl.textContent = best;

    function init() {
        snake = [
            { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) },
            { x: Math.floor(COLS / 2) - 1, y: Math.floor(ROWS / 2) },
            { x: Math.floor(COLS / 2) - 2, y: Math.floor(ROWS / 2) }
        ];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        score = 0;
        scoreEl.textContent = '0';
        paused = false;
        dead = false;
        tickMs = SPEED.normal;
        spawnFood();
        draw();
        if (loop) clearInterval(loop);
        loop = setInterval(tick, tickMs);
        setMsg('Tap arrows or use arrow/WASD keys to play');
    }

    function setMsg(t) { if (msgEl) msgEl.textContent = t; }

    function spawnFood() {
        var ok = false,
            fx = 0,
            fy = 0;
        while (!ok) {
            fx = Math.floor(Math.random() * COLS);
            fy = Math.floor(Math.random() * ROWS);
            ok = true;
            for (var i = 0; i < snake.length; i++) {
                if (snake[i].x === fx && snake[i].y === fy) { ok = false; break; }
            }
        }
        food = { x: fx, y: fy };
    }

    function tick() {
        if (paused || dead) return;
        // apply nextDir if it isn't reversing
        if ((nextDir.x !== -dir.x) || (nextDir.y !== -dir.y)) {
            dir = nextDir;
        }

        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // collisions with walls
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
            return gameOver();
        }
        // collisions with self
        for (var i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) return gameOver();
        }

        // move
        snake.unshift(head);

        // food?
        if (head.x === food.x && head.y === food.y) {
            score++;
            scoreEl.textContent = score;
            spawnFood();
            // speed up a tiny bit every few points (optional)
            if (score % 5 === 0 && tickMs > 60) setSpeed(tickMs - 5);
        } else {
            snake.pop();
        }

        draw();
    }

    function gameOver() {
        dead = true;
        setMsg('Game over — press Restart');
        if (loop) clearInterval(loop);
        if (score > best) {
            best = score;
            bestEl.textContent = best;
            try {
                if (window.store) store.set('snake.best', best);
                else localStorage.setItem('snake.best', String(best));
            } catch (e) {}
        }
        draw(true);
    }

    function setSpeed(ms) {
        tickMs = ms;
        if (loop) clearInterval(loop);
        loop = setInterval(tick, tickMs);
    }

    function draw(showDeath) {
        // bg
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // grid (subtle)
        ctx.strokeStyle = GRID;
        ctx.lineWidth = 1;
        for (var x = 1; x < COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL + .5, 0);
            ctx.lineTo(x * CELL + .5, canvas.height);
            ctx.stroke();
        }
        for (var y = 1; y < ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL + .5);
            ctx.lineTo(canvas.width, y * CELL + .5);
            ctx.stroke();
        }

        // food
        rect(food.x, food.y, FOOD);

        // snake
        for (var i = snake.length - 1; i >= 0; i--) {
            rect(snake[i].x, snake[i].y, i === 0 ? (showDeath ? '#ff7a7a' : SNAKE_HEAD) : SNAKE_BODY);
        }
    }

    function rect(gx, gy, color) {
        ctx.fillStyle = color;
        ctx.fillRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);
    }

    // input handlers
    function setDir(nx, ny) {
        // prevent instant reverse
        if ((nx === -dir.x && ny === 0 && snake.length > 1) ||
            (ny === -dir.y && nx === 0 && snake.length > 1)) return;
        nextDir = { x: nx, y: ny };
    }

    document.addEventListener('keydown', function(e) {
        var k = e.key.toLowerCase();
        if (k === 'arrowup' || k === 'w') {
            setDir(0, -1);
            e.preventDefault();
        }
        if (k === 'arrowdown' || k === 's') {
            setDir(0, 1);
            e.preventDefault();
        }
        if (k === 'arrowleft' || k === 'a') {
            setDir(-1, 0);
            e.preventDefault();
        }
        if (k === 'arrowright' || k === 'd') {
            setDir(1, 0);
            e.preventDefault();
        }
        if (k === ' ') {
            togglePause();
            e.preventDefault();
        }
    });

    // touch buttons
    upB.addEventListener('click', function() { setDir(0, -1); });
    downB.addEventListener('click', function() { setDir(0, 1); });
    leftB.addEventListener('click', function() { setDir(-1, 0); });
    rightB.addEventListener('click', function() { setDir(1, 0); });

    pauseB.addEventListener('click', function() { togglePause(); });
    restartB.addEventListener('click', function() { init(); });

    slowB.addEventListener('click', function() {
        setSpeed(SPEED.slow);
        setMsg('Speed: Slow');
    });
    normalB.addEventListener('click', function() {
        setSpeed(SPEED.normal);
        setMsg('Speed: Normal');
    });
    fastB.addEventListener('click', function() {
        setSpeed(SPEED.fast);
        setMsg('Speed: Fast');
    });

    function togglePause() {
        if (dead) return;
        paused = !paused;
        if (paused) {
            if (loop) clearInterval(loop);
            setMsg('Paused');
        } else {
            setMsg('Go!');
            loop = setInterval(tick, tickMs);
        }
    }

    // simple swipe support (whole canvas)
    (function enableSwipe(el) {
        var sx = 0,
            sy = 0,
            swiping = false;
        el.addEventListener('touchstart', function(e) {
            if (!e.touches || !e.touches[0]) return;
            sx = e.touches[0].clientX;
            sy = e.touches[0].clientY;
            swiping = true;
        }, { passive: true });
        el.addEventListener('touchmove', function(e) {
            if (!swiping || !e.touches || !e.touches[0]) return;
            var dx = e.touches[0].clientX - sx;
            var dy = e.touches[0].clientY - sy;
            if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
                if (Math.abs(dx) > Math.abs(dy)) { setDir(dx > 0 ? 1 : -1, 0); } else { setDir(0, dy > 0 ? 1 : -1); }
                swiping = false;
            }
        }, { passive: true });
        el.addEventListener('touchend', function() { swiping = false; }, { passive: true });
    })(canvas);

    // boot
    init();
    // === SNAKE CODE ABOVE ===


    // ===== Angry Toaster Easter Egg (robust + logs) =====
    (function() {
        var btn = document.getElementById('toasterEgg');
        if (!btn) { console.warn('[toaster] Button #toasterEgg not found'); return; }

        var BASE = '../assets/audio/toaster/'; // relative to tools/snake.html
        var COUNT = 15; // change if you have a different number
        var EXT = '.mp3'; // change to '.wav' or '.ogg' if needed

        // Build file list toaster-01.mp3 ... toaster-15.mp3
        var files = [];
        for (var i = 1; i <= COUNT; i++) {
            var n = String(i);
            while (n.length < 2) n = '0' + n;
            files.push('toaster-' + n + EXT);
        }

        // Preload: we’ll still create elements on demand to avoid weird autoplay issues
        var supports = (new Audio()).canPlayType('audio/mpeg');
        if (!supports) console.warn('[toaster] Browser may not support MP3, try .ogg or .wav');

        var current = null;
        var lastIdx = -1;

        function pickIndex() {
            if (COUNT <= 1) return 0;
            var idx = Math.floor(Math.random() * COUNT);
            if (idx === lastIdx) idx = (idx + 1) % COUNT; // avoid immediate repeat
            lastIdx = idx;
            return idx;
        }

        function makePlayer(src) {
            var a = new Audio(src);
            a.preload = 'auto';
            // Don’t set crossOrigin for local files; some browsers mis-handle it on file:// or simple hosts
            a.addEventListener('error', function() {
                var code = (a.error && a.error.code) || '?';
                console.error('[toaster] audio error', code, 'for', src);
                if (window.msg) try { msg('Audio error ' + code + ' for ' + src); } catch (_) {}
            });
            return a;
        }

        function playRandom() {
            try {
                if (current && !current.paused) {
                    try { current.pause();
                        current.currentTime = 0; } catch (_) {}
                }
                var idx = pickIndex();
                var src = BASE + files[idx];
                current = makePlayer(src);

                // fun wobble
                btn.classList.add('wobble');
                setTimeout(function() { btn.classList.remove('wobble'); }, 450);

                current.volume = 0.85;
                var p = current.play(); // user click = gesture, should be allowed
                if (p && typeof p.catch === 'function') {
                    p.catch(function(err) {
                        console.warn('[toaster] play() blocked or failed:', err);
                    });
                }
            } catch (e) {
                console.error('[toaster] unexpected error', e);
            }
        }

        btn.addEventListener('click', playRandom);

        // Optional keyboard shortcut: T
        document.addEventListener('keydown', function(e) {
            if ((e.key || '').toLowerCase() === 't') playRandom();
        });
    })();
})();