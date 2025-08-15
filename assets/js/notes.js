const title = $('#title'),
    body = $('#body'),
    status = $('#status'),
    list = $('#list');
const KEY = 'notes.items';

function render() {
    const items = store.get(KEY, []);
    list.innerHTML = '';
    items.forEach((n, i) => {
        const row = document.createElement('div');
        row.className = 'row';
        const btn = document.createElement('button');
        btn.textContent = 'Open';
        btn.onclick = () => {
            title.value = n.title;
            body.value = n.body;
            status.textContent = `Loaded (${n.when})`;
        };
        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.onclick = () => {
            items.splice(i, 1);
            store.set(KEY, items);
            render();
        };
        const meta = document.createElement('span');
        meta.className = 'badge';
        meta.textContent = n.title || '(untitled)';
        row.append(btn, del, meta);
        list.append(row);
    });
}

$('#save').onclick = () => {
    const items = store.get(KEY, []);
    items.unshift({ title: title.value.trim(), body: body.value, when: new Date().toLocaleString() });
    store.set(KEY, items.slice(0, 100));
    status.textContent = 'Saved ✔';
    render();
};

$('#clear').onclick = () => {
    title.value = '';
    body.value = '';
    status.textContent = 'Cleared';
};

render();