// Minimal tablet To‑Do (no modules, offline via localStorage)
(function() {
    var KEY = 'todo.items';
    var task = document.getElementById('task');
    var add = document.getElementById('add');
    var list = document.getElementById('todos');
    var clearDone = document.getElementById('clearDone');
    var clearAll = document.getElementById('clearAll');
    var countAll = document.getElementById('countAll');
    var countActive = document.getElementById('countActive');
    var countDone = document.getElementById('countDone');
    var emptyEl = document.getElementById('empty');

    // Filters
    var currentFilter = 'all';
    var filterBtns = document.querySelectorAll('.filters .btn[data-filter]');

    // Use shared store if present; fallback to direct localStorage
    var store = window.store || {
        get: function(k, fb) { try { return JSON.parse(localStorage.getItem(k)) || fb; } catch (e) { return fb; } },
        set: function(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
    };

    function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

    function load() { return store.get(KEY, []); }

    function save(items) { store.set(KEY, items); }

    function stats(items) {
        var all = items.length;
        var done = items.filter(function(t) { return !!t.done; }).length;
        var active = all - done;
        countAll.textContent = '(' + all + ')';
        countActive.textContent = '(' + active + ')';
        countDone.textContent = '(' + done + ')';
        emptyEl.hidden = all !== 0;
    }

    function filtered(items) {
        if (currentFilter === 'active') return items.filter(function(t) { return !t.done; });
        if (currentFilter === 'done') return items.filter(function(t) { return t.done; });
        return items.slice();
    }

    function render() {
        var items = load();
        stats(items);
        list.innerHTML = '';
        filtered(items).forEach(function(t) {
            var row = document.createElement('div');
            row.className = 'item' + (t.done ? ' done' : '');
            row.setAttribute('data-id', t.id);

            // big checkbox
            var chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'check';
            chk.checked = !!t.done;
            chk.setAttribute('aria-label', 'Toggle task');

            // editable text
            var txt = document.createElement('div');
            txt.className = 'txt';
            txt.textContent = t.text;
            txt.title = 'Tap to edit';
            txt.setAttribute('role', 'textbox');

            // delete button
            var del = document.createElement('button');
            del.className = 'btn del';
            del.textContent = 'Delete';
            del.setAttribute('aria-label', 'Delete task');

            // events
            chk.addEventListener('change', function() {
                var items = load();
                var i = items.findIndex(function(x) { return x.id === t.id; });
                if (i > -1) { items[i].done = chk.checked;
                    save(items);
                    render(); }
            });

            // inline edit on tap
            txt.addEventListener('click', function() {
                if (txt.getAttribute('contenteditable') === 'true') return;
                txt.setAttribute('contenteditable', 'true');
                var sel = window.getSelection && window.getSelection();
                var range = document.createRange && document.createRange();
                if (sel && range) {
                    range.selectNodeContents(txt);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                txt.focus();
            });

            function commitEdit() {
                if (txt.getAttribute('contenteditable') !== 'true') return;
                txt.setAttribute('contenteditable', 'false');
                var v = (txt.textContent || '').trim();
                var items = load();
                var i = items.findIndex(function(x) { return x.id === t.id; });
                if (i > -1) {
                    if (!v) { // empty => delete
                        items.splice(i, 1);
                    } else {
                        items[i].text = v;
                    }
                    save(items);
                    render();
                }
            }
            txt.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault();
                    commitEdit(); }
                if (e.key === 'Escape') { e.preventDefault();
                    txt.textContent = t.text;
                    txt.setAttribute('contenteditable', 'false'); }
            });
            txt.addEventListener('blur', commitEdit);

            del.addEventListener('click', function() {
                removeById(t.id);
            });

            // swipe-to-delete (left)
            (function enableSwipe(el, id) {
                var x0 = 0,
                    y0 = 0,
                    swiping = false;
                el.addEventListener('touchstart', function(e) {
                    if (!e.touches || !e.touches[0]) return;
                    x0 = e.touches[0].clientX;
                    y0 = e.touches[0].clientY;
                    swiping = true;
                }, { passive: true });
                el.addEventListener('touchmove', function(e) {
                    if (!swiping || !e.touches || !e.touches[0]) return;
                    var dx = e.touches[0].clientX - x0;
                    var dy = e.touches[0].clientY - y0;
                    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
                        if (dx < 0) {
                            el.classList.add('swipe-away');
                            setTimeout(function() { removeById(id); }, 120);
                        }
                        swiping = false;
                    }
                }, { passive: true });
                el.addEventListener('touchend', function() { swiping = false; }, { passive: true });
            })(row, t.id);

            row.appendChild(chk);
            row.appendChild(txt);
            row.appendChild(del);
            list.appendChild(row);
        });

        // mark selected filter button
        filterBtns.forEach(function(b) {
            var selected = b.getAttribute('data-filter') === currentFilter;
            b.setAttribute('aria-selected', selected ? 'true' : 'false');
            if (selected) b.classList.add('primary');
            else b.classList.remove('primary');
        });
    }

    function removeById(id) {
        var items = load();
        var i = items.findIndex(function(x) { return x.id === id; });
        if (i > -1) { items.splice(i, 1);
            save(items);
            render(); }
    }

    function addTask() {
        var v = (task.value || '').trim();
        if (!v) return;
        var items = load();
        items.unshift({ id: uid(), text: v, done: false, created: Date.now() });
        save(items);
        task.value = '';
        render();
    }

    // events
    add.addEventListener('click', addTask);
    task.addEventListener('keydown', function(e) { if (e.key === 'Enter') addTask(); });

    clearDone.addEventListener('click', function() {
        var items = load().filter(function(t) { return !t.done; });
        save(items);
        render();
    });

    clearAll.addEventListener('click', function() {
        if (!confirm('Clear all tasks?')) return;
        save([]);
        render();
    });

    filterBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentFilter = btn.getAttribute('data-filter');
            render();
        });
    });

    // boot
    render();
})();