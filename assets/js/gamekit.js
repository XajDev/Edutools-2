// GameKit: tiny helpers for loops, input, and sfx. No modules.
window.GameKit = (function() {
    function Loop(tick, fps) {
        var handle = 0,
            running = false,
            ms = Math.max(30, Math.floor(1000 / (fps || 60)));

        function start() { if (running) return;
            running = true;
            handle = setInterval(tick, ms); }

        function stop() { running = false; if (handle) clearInterval(handle); }

        function setFPS(newFPS) { ms = Math.max(20, Math.floor(1000 / Math.max(1, newFPS))); if (running) { stop();
                start(); } }
        return { start: start, stop: stop, setFPS: setFPS, isRunning: function() { return running; } };
    }

    function Key() {
        var s = {};
        document.addEventListener('keydown', function(e) { s[(e.key || '').toLowerCase()] = true; });
        document.addEventListener('keyup', function(e) { s[(e.key || '').toLowerCase()] = false; });
        return { down: function(k) { return !!s[(k || '').toLowerCase()]; } };
    }

    function Sfx(srcs) {
        var a = new Audio();
        a.preload = 'auto';
        var list = (srcs || []).map(function(s) { var x = new Audio(s);
            x.preload = 'auto'; return x; });
        var i = 0;
        return {
            play: function(vol) {
                if (!list.length) return;
                try { var snd = list[i++ % list.length];
                    snd.currentTime = 0;
                    snd.volume = (typeof vol === 'number' ? vol : 0.9);
                    snd.play(); } catch (e) {}
            }
        };
    }
    return { Loop: Loop, Key: Key, Sfx: Sfx };
})();