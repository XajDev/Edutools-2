const len = $('#len'),
    lower = $('#lower'),
    upper = $('#upper'),
    nums = $('#nums'),
    syms = $('#syms');
const out = $('#out');

function gen() {
    const L = +len.value || 16;
    let set = '';
    if (lower.checked) { set += 'abcdefghijklmnopqrstuvwxyz'; }
    if (upper.checked) { set += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; }
    if (nums.checked) { set += '0123456789'; }
    if (syms.checked) { set += '!@#$%^&*()-_=+[]{};:,.<>/?'; }
    if (!set) { out.value = '(select at least one set)'; return; }

    const picks = [];
    const rand = (s) => s[Math.floor(Math.random() * s.length)];
    if (lower.checked) picks.push(rand('abcdefghijklmnopqrstuvwxyz'));
    if (upper.checked) picks.push(rand('ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
    if (nums.checked) picks.push(rand('0123456789'));
    if (syms.checked) picks.push(rand('!@#$%^&*()-_=+[]{};:,.<>/?'));

    const remain = Math.max(0, L - picks.length);
    for (let i = 0; i < remain; i++) picks.push(rand(set));
    out.value = picks.sort(() => Math.random() - .5).join('');
}
$('#gen').onclick = gen;
$('#copy').onclick = () => { out.select();
    document.execCommand('copy'); };
gen();