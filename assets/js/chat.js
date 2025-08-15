// Minecraft-style chat: [HH:MM] Username: message
(function() {
    var WS_URL = 'wss://edutools-chat.game01yt-official.workers.dev/ws/general';

    var log = document.getElementById('chatLog');
    var nickI = document.getElementById('nick');
    var msgI = document.getElementById('msg');
    var sendB = document.getElementById('send');
    var stat = document.getElementById('status');

    // persist nickname
    try {
        var saved = (window.store ? store.get('chat.nick', '') : JSON.parse(localStorage.getItem('chat.nick') || '""'));
        if (saved) nickI.value = saved;
        nickI.addEventListener('input', function() {
            try {
                if (window.store) store.set('chat.nick', nickI.value.trim());
                else localStorage.setItem('chat.nick', JSON.stringify(nickI.value.trim()));
            } catch (e) {}
        });
    } catch (e) {}

    var ws = null,
        reconnectTimer = 0,
        connected = false;

    function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

    function hhmm(ts) {
        var d = new Date(ts);
        return '[' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ']';
    }

    function lineHTML(time, name, text) {
        var div = document.createElement('div');
        div.className = 'chat-line';
        var t = document.createElement('span');
        t.className = 'time';
        t.textContent = time;
        var n = document.createElement('span');
        n.className = 'name';
        n.textContent = name + ':';
        var x = document.createElement('span');
        x.textContent = ' ' + text;
        div.appendChild(t);
        div.appendChild(n);
        div.appendChild(x);
        return div;
    }

    function sysHTML(text) {
        var div = document.createElement('div');
        div.className = 'chat-line sys';
        div.textContent = text;
        return div;
    }

    function add(el) {
        log.appendChild(el);
        log.scrollTop = log.scrollHeight;
    }

    function setStatus(s) { if (stat) stat.textContent = s; }

    function connect() {
        // disable send until connected
        sendB.disabled = true;
        msgI.disabled = true;
        setStatus('Connecting…');
        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            add(sysHTML('This browser does not support WebSocket.'));
            setStatus('Error');
            return;
        }

        ws.addEventListener('open', function() {
            connected = true;
            setStatus('Connected');
            sendB.disabled = false;
            msgI.disabled = false;
            // announce join
            safeSend({ type: 'join', nick: currentNick(), ts: Date.now() });
        });

        ws.addEventListener('message', function(ev) {
            var data;
            try { data = JSON.parse(ev.data); } catch (e) { return; }
            if (!data || typeof data !== 'object') return;

            if (data.type === 'chat') {
                add(lineHTML(hhmm(data.ts || Date.now()), String(data.nick || 'anon'), String(data.text || '')));
            } else if (data.type === 'join') {
                add(sysHTML((data.nick || 'someone') + ' joined.'));
            } else if (data.type === 'leave') {
                add(sysHTML((data.nick || 'someone') + ' left.'));
            } else if (data.type === 'sys') {
                add(sysHTML(String(data.text || '')));
            }
        });

        ws.addEventListener('close', function() {
            if (connected) setStatus('Disconnected — retrying…');
            connected = false;
            sendB.disabled = true;
            msgI.disabled = true;
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connect, 1200);
        });

        ws.addEventListener('error', function() { /* close handler will retry */ });
    }

    function currentNick() {
        var n = (nickI.value || '').trim();
        if (!n) n = 'anon';
        return n.slice(0, 24);
    }

    function safeSend(obj) {
        try {
            if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
        } catch (e) {}
    }

    function sendChat() {
        var text = (msgI.value || '').trim();
        if (!text) return;
        safeSend({ type: 'chat', nick: currentNick(), text: text, ts: Date.now() });
        msgI.value = '';
    }

    sendB.addEventListener('click', sendChat);
    msgI.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendChat(); });

    // leave notice (best-effort)
    window.addEventListener('beforeunload', function() {
        safeSend({ type: 'leave', nick: currentNick(), ts: Date.now() });
    });

    // boot
    connect();
})();