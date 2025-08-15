// Lane Battle (online) — uses your existing Workers WS relay.
// Matchmaking in lobby; then both clients join a private room and run a lockstep sim.
(function() {
    // ---- Config
    var WS_BASE = 'wss://edutools-chat.game01yt-official.workers.dev/ws/';
    var LOBBY = 'battle-lobby-v1'; // everyone enters to pair up
    var TICK_MS = 50; // 20 TPS
    var GOLD_PER_SEC = 4; // income rate (per second)
    var GOLD_MAX = 200;

    // Units: cost, speed, hp, dmg, atkDelay(ms), range(px)
    var UNITS = {
        peon: { cost: 10, spd: 0.9, hp: 18, dmg: 3, cd: 600, range: 18 },
        swift: { cost: 15, spd: 1.4, hp: 14, dmg: 2, cd: 420, range: 18 },
        tank: { cost: 25, spd: 0.6, hp: 36, dmg: 6, cd: 900, range: 20 }
    };
    var LANES = 3;
    var FIELD_W = 960,
        FIELD_H = 540;
    var PATH_Y = [150, 270, 390]; // lane y positions

    // ---- DOM
    var statusEl = document.getElementById('status');
    var nickEl = document.getElementById('nick');
    var quickBtn = document.getElementById('quick');
    var roomEl = document.getElementById('room');
    var joinBtn = document.getElementById('join');
    var leaveBtn = document.getElementById('leave');
    var youEl = document.getElementById('you');
    var foeEl = document.getElementById('foe');
    var goldEl = document.getElementById('gold');

    var cv = document.getElementById('game');
    var ctx = cv.getContext('2d');

    // ---- Net state
    var lobbyWS = null;
    var gameWS = null;
    var myId = randId();
    var myNick = '';
    var pairing = false;
    var room = '';
    var amHost = false;

    // ---- Game sim state
    var started = false;
    var startAt = 0; // ms wall clock when tick 0 begins
    var tick = 0; // sim tick
    var gold = 0;
    var selectedUnit = 'peon';
    var selectedLane = 1;
    var units = []; // {side:0/1,lane,x,y,hp,dir,kind,cd}
    var towers = [{ x: 50, y: 0, hp: 200 }, { x: FIELD_W - 50, y: 0, hp: 200 }];
    var lastFrame = 0;

    // ---- UI wiring
    setStatus('Idle');
    youEl.textContent = '—';
    foeEl.textContent = '—';
    goldEl.textContent = '0';

    quickBtn.addEventListener('click', quickMatch);
    joinBtn.addEventListener('click', joinRoomManual);
    leaveBtn.addEventListener('click', leaveAll);

    var unitBtns = document.querySelectorAll('.units .btn');
    for (var i = 0; i < unitBtns.length; i++) {
        unitBtns[i].addEventListener('click', function() {
            selectedUnit = this.getAttribute('data-unit');
        });
    }
    var laneBtns = document.querySelectorAll('.laneBtns .btn');
    for (var j = 0; j < laneBtns.length; j++) {
        laneBtns[j].addEventListener('click', function() {
            selectedLane = parseInt(this.getAttribute('data-lane'), 10);
            trySpawn(selectedUnit, selectedLane);
        });
    }
    document.addEventListener('keydown', function(e) {
        var k = (e.key || '').toLowerCase();
        if (k === '1') { selectedLane = 0;
            trySpawn(selectedUnit, 0); }
        if (k === '2') { selectedLane = 1;
            trySpawn(selectedUnit, 1); }
        if (k === '3') { selectedLane = 2;
            trySpawn(selectedUnit, 2); }
    });

    // ---- Net functions
    function quickMatch() {
        if (lobbyWS && lobbyWS.readyState === 1) return;
        pairing = true;
        myNick = (nickEl.value || '').trim() || 'anon';
        youEl.textContent = myNick;
        setStatus('Queueing…');
        lobbyWS = new WebSocket(WS_BASE + LOBBY);
        lobbyWS.addEventListener('open', function() {
            sendLobby({ t: 'find', id: myId, nick: myNick, ts: Date.now() });
        });
        lobbyWS.addEventListener('message', function(ev) {
            var m;
            try { m = JSON.parse(ev.data); } catch (_) { return; }
            if (!pairing) return;
            if (m.t === 'find' && m.id !== myId) {
                // deterministic pairing: lowest id pairs with next arrival, room = "battle-"+sorted ids
                var a = myId < m.id ? myId : m.id;
                var b = myId < m.id ? m.id : myId;
                var r = 'battle-' + a + '-' + b;
                if (myId === a) {
                    sendLobby({ t: 'pair', room: r, host: a, a: a, b: b, nickA: myNick, nickB: m.nick });
                    // host announces start
                }
            } else if (m.t === 'pair' && (m.a === myId || m.b === myId)) {
                pairing = false;
                safelyClose(lobbyWS);
                lobbyWS = null;
                room = m.room;
                amHost = (m.host === myId);
                var foeNick = (m.a === myId) ? m.nickB : m.nickA;
                foeEl.textContent = foeNick || 'foe';
                connectGameRoom(room, amHost);
            }
        });
        lobbyWS.addEventListener('close', function() { if (pairing) setStatus('Lobby disconnected'); });
    }

    function joinRoomManual() {
        pairing = false;
        myNick = (nickEl.value || '').trim() || 'anon';
        youEl.textContent = myNick;
        var r = (roomEl.value || '').trim();
        if (!r) { setStatus('Enter room code'); return; }
        room = 'battle-' + r;
        amHost = false;
        connectGameRoom(room, false);
    }

    function connectGameRoom(r, host) {
        setStatus('Joining ' + r + '…');
        gameWS = new WebSocket(WS_BASE + r);
        gameWS.addEventListener('open', function() {
            setStatus('Connected');
            sendGame({ t: 'join', id: myId, nick: myNick });
            if (host) {
                // Schedule a start a bit in the future to sync clocks
                var start = Date.now() + 1500;
                var seed = Math.floor(Math.random() * 1e9);
                sendGame({ t: 'start', at: start, seed: seed });
                onStart(start, seed);
            }
        });
        gameWS.addEventListener('message', function(ev) {
            var m;
            try { m = JSON.parse(ev.data); } catch (_) { return; }
            if (m.t === 'start') { onStart(m.at, m.seed); } else if (m.t === 'cmd') { queueCmd(m); } else if (m.t === 'leave') { setStatus('Opponent left'); }
        });
        gameWS.addEventListener('close', function() { setStatus('Disconnected');
            stopLoop(); });
    }

    function leaveAll() {
        pairing = false;
        if (lobbyWS) safelyClose(lobbyWS);
        lobbyWS = null;
        if (gameWS) safelyClose(gameWS);
        gameWS = null;
        stopLoop();
        resetMatchVisual();
        setStatus('Left');
    }

    function sendLobby(obj) { try { if (lobbyWS && lobbyWS.readyState === 1) lobbyWS.send(JSON.stringify(obj)); } catch (e) {} }

    function sendGame(obj) { try { if (gameWS && gameWS.readyState === 1) gameWS.send(JSON.stringify(obj)); } catch (e) {} }

    function safelyClose(ws) { try { ws.close(); } catch (e) {} }

    // ---- Command queue (lockstep)
    var cmdQ = []; // commands scheduled with a target tick
    function queueCmd(m) { if (typeof m.at === 'number') cmdQ.push(m); }

    // ---- Start match
    function onStart(atMs, seed) {
        // Reset sim
        started = true;
        startAt = atMs;
        tick = 0;
        gold = 50;
        goldEl.textContent = gold;
        units = [];
        towers = [{ x: 50, y: 0, hp: 200 }, { x: FIELD_W - 50, y: 0, hp: 200 }];
        cmdQ.length = 0;
        randSeed(seed); // seed RNG so both sides spawn fair crits if needed
        // Begin loop
        lastFrame = 0;
        startLoop();
    }

    // ---- Spawn & networking
    function trySpawn(kind, lane) {
        if (!started) return;
        var u = UNITS[kind];
        if (!u) return;
        if (lane < 0 || lane >= LANES) return;
        if (gold < u.cost) { setStatus('Not enough gold'); return; }
        // schedule for next 2 ticks (buffer)
        var at = tick + 2;
        gold -= u.cost;
        goldEl.textContent = gold;
        var msg = { t: 'cmd', cmd: 'spawn', at: at, lane: lane, kind: kind, id: myId };
        queueCmd(msg);
        sendGame(msg);
    }

    function applySpawn(side, kind, lane) {
        var u = UNITS[kind];
        if (!u) return;
        var dir = side === 0 ? 1 : -1;
        var x = side === 0 ? 80 : FIELD_W - 80;
        var y = PATH_Y[lane];
        units.push({ side: side, lane: lane, kind: kind, x: x, y: y, dir: dir, hp: u.hp, cd: 0 });
    }

    // ---- Main loop
    var interval = 0;

    function startLoop() { stopLoop();
        interval = setInterval(step, TICK_MS); }

    function stopLoop() { if (interval) clearInterval(interval);
        interval = 0;
        started = false; }

    function step() {
        var now = Date.now();
        if (now < startAt) { draw(); return; }
        // advance to the expected tick based on wall clock (keeps sync)
        var shouldTick = Math.floor((now - startAt) / TICK_MS);
        while (tick < shouldTick) {
            // apply queued commands for this tick
            for (var i = cmdQ.length - 1; i >= 0; i--) {
                var c = cmdQ[i];
                if (c.at <= tick) {
                    if (c.cmd === 'spawn') {
                        var side = (c.id === myId) ? 0 : 1;
                        applySpawn(side, c.kind, c.lane);
                    }
                    cmdQ.splice(i, 1);
                }
            }
            simTick();
            tick++;
        }
        draw();
    }

    function simTick() {
        // gold income
        gold = Math.min(GOLD_MAX, gold + GOLD_PER_SEC * (TICK_MS / 1000));
        goldEl.textContent = Math.floor(gold);

        // update units
        for (var i = 0; i < units.length; i++) {
            var u = units[i];
            var cfg = UNITS[u.kind];

            // target search: nearest enemy in same lane within melee range, else move
            var target = null;
            // enemy units
            for (var j = 0; j < units.length; j++) {
                var v = units[j];
                if (v.lane !== u.lane || v.side === u.side) continue;
                if (Math.abs(v.x - u.x) <= cfg.range + 8) {
                    if (!target || Math.abs(v.x - u.x) < Math.abs(target.x - u.x)) target = v;
                }
            }
            // check tower
            var foeTower = (u.side === 0) ? towers[1] : towers[0];
            if (!target) {
                var distToTower = Math.abs(foeTower.x - u.x);
                if (distToTower <= cfg.range + 10) target = foeTower;
            }

            if (target) {
                // attack cooldown
                if (u.cd <= 0) {
                    target.hp -= cfg.dmg;
                    u.cd = cfg.cd;
                } else {
                    u.cd -= TICK_MS;
                }
            } else {
                // move
                u.x += u.dir * cfg.spd * (TICK_MS / 16.6667); // normalize to ~60fps speed
                if (u.cd > 0) u.cd -= TICK_MS;
            }
        }

        // remove dead units
        for (var k = units.length - 1; k >= 0; k--) {
            if (units[k].hp <= 0) units.splice(k, 1);
        }

        // towers dead?
        if (towers[0].hp <= 0 || towers[1].hp <= 0) {
            setStatus(towers[1].hp <= 0 ? 'You WIN!' : 'You LOSE!');
            stopLoop();
        }
    }

    // ---- Render
    function draw() {
        // bg
        ctx.fillStyle = '#081018';
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);

        // lanes
        for (var i = 0; i < LANES; i++) {
            var y = PATH_Y[i];
            ctx.strokeStyle = '#163049';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(80, y);
            ctx.lineTo(FIELD_W - 80, y);
            ctx.stroke();
        }

        // towers
        drawTower(0, towers[0].hp);
        drawTower(1, towers[1].hp);

        // units
        for (var i = 0; i < units.length; i++) {
            drawUnit(units[i]);
        }

        // start banner
        if (Date.now() < startAt) {
            ctx.fillStyle = '#ffffffcc';
            ctx.font = '700 22px ui-monospace, Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Match starting…', FIELD_W / 2, FIELD_H / 2);
        }
    }

    function drawTower(side, hp) {
        var x = side === 0 ? 50 : FIELD_W - 50;
        ctx.fillStyle = side === 0 ? '#2e7dd6' : '#d65353';
        ctx.fillRect(x - 18, 100, 36, 340);
        // hp bar
        var pct = Math.max(0, Math.min(1, hp / 200));
        ctx.fillStyle = '#18c06e';
        ctx.fillRect(x - 22, 450, 44 * pct, 10);
        ctx.strokeStyle = '#203243';
        ctx.strokeRect(x - 22, 450, 44, 10);
    }

    function drawUnit(u) {
        var cfg = UNITS[u.kind];
        // body
        ctx.fillStyle = (u.side === 0) ? '#68b5ff' : '#ff8a8a';
        ctx.fillRect(u.x - 10, u.y - 10, 20, 20);
        // hp bar
        var pct = Math.max(0, Math.min(1, u.hp / cfg.hp));
        ctx.fillStyle = '#18c06e';
        ctx.fillRect(u.x - 12, u.y - 16, 24 * pct, 4);
        ctx.strokeStyle = '#203243';
        ctx.strokeRect(u.x - 12, u.y - 16, 24, 4);
    }

    // ---- Utils
    function setStatus(t) { if (statusEl) statusEl.textContent = t; }

    function randId() { return Math.random().toString(36).slice(2, 10); }

    // simple RNG seed (LCG) for future use
    var _seed = 1;

    function randSeed(s) { _seed = (s | 0) || 1; }

    function rand() { _seed = (1664525 * _seed + 1013904223) >>> 0; return _seed / 4294967296; }

})();