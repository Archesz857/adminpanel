// ARCHESZ ADMIN - works on the SAME demo database as the store (localStorage key 'archesz_demo').
// Put the ADMIN folder next to the STORE folder and open both from the SAME site/origin.
const ADMIN_PASS = 'archesz';   // <-- CHANGE THIS (front-end only, not real security)

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const money = (n) => '₱' + Number(n).toLocaleString();
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let tab = 'pending', flashId = null;

  const unlock = () => { $('#gate').hidden = true; $('#app').hidden = false; render(); };
  const tryLogin = () => {
    if ($('#pass').value === ADMIN_PASS) { sessionStorage.setItem('arc_admin', '1'); unlock(); }
    else { $('#passErr').hidden = false; }
  };
  $('#loginBtn').addEventListener('click', tryLogin);
  $('#pass').addEventListener('keydown', (e) => e.key === 'Enter' && tryLogin());
  $('#logout').addEventListener('click', () => { sessionStorage.removeItem('arc_admin'); location.reload(); });

  const card = (h, i) => {
    const base = `style="animation-delay:${i * 70}ms"`;
    if (h.status === 'pending') return `
      <div class="order-card" ${base} data-id="${h.id}">
        <div class="order-top"><h3>PENDING USER ORDER <span class="plus">+1</span></h3><span class="pill pending">pending</span></div>
        <div class="kv"><b>ORDER ID:</b><span>${h.id}</span></div>
        <div class="kv"><b>RECEIPT:</b>${h.receipt ? `<a data-view="${h.id}">${esc(h.name || 'receipt.jpg')}</a>` : `<span>${esc(h.name || 'no file')}</span>`}</div>
        ${h.receipt ? `<img class="thumb" data-view="${h.id}" src="${h.receipt}" alt="Receipt">` : ''}
        <div class="kv"><b>AMOUNT:</b><span class="amt">${money(h.amount ?? h.pts)}</span></div>
        <div class="kv"><b>TOP-UP:</b><span class="coins">+${h.pts.toLocaleString()} Coins</span></div>
        <div class="act-row"><button class="btn btn-cancel" data-act="cancel" data-id="${h.id}"><i class="fas fa-xmark"></i> Cancel Order</button>
        <button class="btn btn-ok" data-act="approve" data-id="${h.id}"><i class="fas fa-check"></i> Approve</button></div>
      </div>`;
    if (h.status === 'approved') return `
      <div class="order-card ${flashId === h.id ? 'flash' : ''}" ${base}>
        <div class="success-box"><h3>SUCCESSFUL ORDER</h3>
          <div class="kv"><b>APPROVE DATE:</b><span>${ymd(h.approvedAt || h.ts)}</span></div>
          <div class="kv"><b>AMOUNT:</b><span class="amt">${money(h.amount ?? 0)}</span></div>
          <div class="kv"><b>POINTS ADD:</b><span class="coins">${h.pts.toLocaleString()} Coins</span></div>
          <div class="big">✅ APPROVED ORDER</div></div>
      </div>`;
    return `
      <div class="order-card" ${base}>
        <div class="success-box cancel"><h3>CANCELLED ORDER</h3>
          <div class="kv"><b>ORDER ID:</b><span>${h.id}</span></div>
          <div class="kv"><b>AMOUNT:</b><span class="amt">${money(h.amount ?? 0)}</span></div>
          <div class="big">❌ ORDER CANCELLED</div></div>
      </div>`;
  };

  function render() {
    const d = loadDB(), H = d.history;
    $('#stPend').textContent = H.filter((h) => h.status === 'pending').length;
    $('#stDone').textContent = H.filter((h) => h.status === 'approved').length;
    $('#stCoins').textContent = H.filter((h) => h.status === 'approved').reduce((a, h) => a + h.pts, 0).toLocaleString();
    $('#stSales').textContent = d.purchases.length;
    updateBadge();
    $('#supportBox').hidden = tab !== 'support'; $('#list').hidden = tab === 'support';
    if (tab === 'support') return renderSupport();
    const list = $('#list');
    if (tab === 'sales') {
      list.innerHTML = d.purchases.length ? d.purchases.map((p, i) => `
        <div class="order-card" style="animation-delay:${i * 70}ms"><div class="order-top"><div class="sale-head">${pIcon(prodOf(p.product))}<h3>${esc(p.product)}</h3></div><span class="pill approved">${esc(p.plan)}</span></div>
        <div class="kv"><b>ORDER ID:</b><span>${p.id}</span></div><div class="kv"><b>DATE:</b><span>${ymd(p.ts)}</span></div>
        <div class="kv"><b>PAID:</b><span class="coins">${p.pts} Points</span></div></div>`).join('')
        : `<div class="empty-state"><i class="fas fa-box-open"></i><p>No product sales yet.</p></div>`;
      return;
    }
    const rows = H.filter((h) => h.status === tab);
    list.innerHTML = rows.length ? rows.map(card).join('')
      : `<div class="empty-state"><i class="fas fa-inbox"></i><p>No ${tab} orders.</p></div>`;
  }

  document.querySelectorAll('#tabs .filter-btn').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.f; render(); }));

  $('#list').addEventListener('click', (e) => {
    const v = e.target.closest('[data-view]');
    if (v) { const h = loadDB().history.find((x) => x.id === v.dataset.view); if (h?.receipt) modal(`<h2>${esc(h.name)}</h2><img class="rcpt-full" src="${h.receipt}"><button class="btn btn-dark full-btn" data-close>Close</button>`); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const d = loadDB(), h = d.history.find((x) => x.id === b.dataset.id);
    if (!h || h.status !== 'pending') return render();
    if (b.dataset.act === 'approve') {
      h.status = 'approved'; h.approvedAt = Date.now(); h.seen = false; d.balance += h.pts; flashId = h.id;
      saveDB(d); toast('✅ APPROVED ORDER - ' + h.pts.toLocaleString() + ' Coins added'); tab = 'approved';
      document.querySelectorAll('#tabs .filter-btn').forEach((x) => x.classList.toggle('active', x.dataset.f === 'approved'));
    } else {
      if (!confirm('Cancel this order?')) return;
      h.status = 'cancelled'; h.seen = false; saveDB(d); toast('Order cancelled');
    }
    render();
  });

  $('#manBtn').addEventListener('click', () => {
    const n = parseInt($('#manPts').value) || 0; if (n < 1) return toast('Enter points to add.');
    const d = loadDB(); d.balance += n;
    d.history.unshift({ id: 'ADM-' + Math.random().toString(36).slice(2, 8).toUpperCase(), pts: n, amount: 0, status: 'approved', manual: true, ts: Date.now(), approvedAt: Date.now(), seen: false });
    saveDB(d); $('#manPts').value = ''; toast(`+${n.toLocaleString()} points added to user`); render();
  });

  // ---- SUPPORT CENTER (admin side) ----
  let thread = null, aImg = null, aName = '';
  const supBox = $('#supportBox');
  const isUnread = (m) => m.from === 'user' && !m.read;
  function updateBadge() { const n = loadChat().filter(isUnread).length, b = $('#supBadge'); b.hidden = !n; b.textContent = n; return n; }
  function buildSupport() {
    supBox.innerHTML = `
      <div class="panel-card chat-panel"><div class="order-top"><h3>NEW USER SUPPORT <span class="plus" id="supNew">+0</span></h3><span class="vip-badge" style="margin:0"><span class="dot"></span> LIVE</span></div>
        <div class="sup-users" id="supUsers"></div></div>
      <div class="panel-card chat-panel" id="supChat">
        <div class="kv"><b>USER:</b><span id="supWho">-</span></div>
        <div class="chat-box" id="supMsgs"></div>
        <div class="attach-chip" id="supChip" hidden></div>
        <div class="chat-input"><button type="button" class="icon-btn" id="supAttach" title="Send image"><i class="fas fa-image"></i></button>
          <div class="field-box"><input id="supIn" type="text" placeholder="Reply to user…" autocomplete="off"></div>
          <button type="button" class="btn btn-purple" id="supSend"><i class="fas fa-paper-plane"></i> SEND</button></div>
      </div>`;
  }
  function renderSupport() {
    if (!$('#supUsers')) buildSupport();
    const all = loadChat(), last = (e) => Math.max(...all.filter((m) => m.email === e).map((m) => m.ts));
    const emails = [...new Set(all.map((m) => m.email))].sort((x, y) => last(y) - last(x));
    if (!thread || !emails.includes(thread)) thread = emails[0] || null;
    const unreadBy = (e) => all.filter((m) => m.email === e && isUnread(m)).length, others = {};
    emails.forEach((e) => (others[e] = e === thread ? 0 : unreadBy(e)));
    let ch = false; all.forEach((m) => { if (m.email === thread && isUnread(m)) { m.read = true; ch = true; } }); if (ch) saveChat(all);
    updateBadge(); $('#supNew').textContent = '+' + (all.filter(isUnread).length);
    $('#supChat').hidden = !thread;
    $('#supUsers').innerHTML = emails.length ? emails.map((e) => {
      const lm = all.filter((m) => m.email === e).slice(-1)[0];
      return `<div class="sup-user ${e === thread ? 'active' : ''}" data-e="${esc(e)}"><div class="menu-icon purple-icon">${esc(e[0].toUpperCase())}</div><div class="hist-info"><h3>${esc(e)}</h3><p>${esc(lm.text || '📷 image')}</p></div>${others[e] ? `<span class="badge">${others[e]}</span>` : ''}</div>`;
    }).join('') : `<div class="empty-state"><i class="fas fa-headset"></i><p>No user support yet.</p></div>`;
    if (!thread) return;
    $('#supWho').textContent = thread;
    const box = $('#supMsgs'), near = box.scrollHeight - box.scrollTop - box.clientHeight < 80, tchanged = box._t !== thread;
    box.innerHTML = all.filter((m) => m.email === thread).map((m) => bubble(m, m.from === 'admin', m.from === 'admin' ? 'ARCHESZ ADMIN' : thread)).join('');
    if (near || tchanged) box.scrollTop = box.scrollHeight; box._t = thread;
  }
  const supChip = () => { const c = $('#supChip'); c.hidden = !aImg; c.innerHTML = aImg ? `<i class="fas fa-image"></i> ${esc(aName)} <button type="button" id="supRm">✕</button>` : ''; };
  const supPicker = document.createElement('input'); supPicker.type = 'file'; supPicker.accept = 'image/png,image/jpeg'; supPicker.hidden = true; document.body.appendChild(supPicker);
  supPicker.addEventListener('change', async () => {
    const f = supPicker.files[0]; supPicker.value = ''; if (!f) return;
    if (f.size > 5 * 1024 * 1024) return alert('Max file size is 5MB.');
    try { aImg = await uploadReceiptDemo(f); aName = f.name; supChip(); } catch { alert('Could not read that image.'); }
  });
  function supSend() {
    const t = $('#supIn').value.trim(); if (!thread || (!t && !aImg)) return;
    const all = loadChat(); all.push({ id: 'M' + Date.now().toString(36), email: thread, from: 'admin', text: t, img: aImg, ts: Date.now(), read: false });
    if (!saveChat(all)) return toast('Storage full - try a smaller image.');
    $('#supIn').value = ''; aImg = null; supChip(); renderSupport(); $('#supMsgs').scrollTop = $('#supMsgs').scrollHeight;
  }
  supBox.addEventListener('click', (e) => {
    const u = e.target.closest('.sup-user'); if (u) { thread = u.dataset.e; return renderSupport(); }
    if (e.target.closest('#supAttach')) return supPicker.click();
    if (e.target.closest('#supSend')) return supSend();
    if (e.target.id === 'supRm') { aImg = null; supChip(); }
  });
  supBox.addEventListener('keydown', (e) => { if (e.target.id === 'supIn' && e.key === 'Enter') { e.preventDefault(); supSend(); } });

  addEventListener('storage', (e) => {
    if ($('#app').hidden) return;
    if (e.key === 'archesz_demo') render();
    if (e.key === CHAT) { const before = +$('#supBadge').textContent || 0; render(); const n = loadChat().filter(isUnread).length; if (n > before && tab !== 'support') toast('💬 New user support message'); }
  });
  if (sessionStorage.getItem('arc_admin') === '1') unlock();
});
