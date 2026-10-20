// ARCHESZ ADMIN - talks to the store server (/api). Password = ADMIN_PASSWORD env var in Vercel.
document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const money = (n) => '₱' + Number(n).toLocaleString();
  let D = { orders: [], purchases: [], users: [], fbs: [], threads: [], prodImg: '' }, tab = 'pending', flashId = null, sig = '', thread = null, aImg = null, aName = '', tsig = '', busy = false;

  // ---------- login ----------
  const unlock = () => { $('#gate').hidden = true; $('#app').hidden = false; pull(true); setInterval(pull, 6000); };
  const tryLogin = async () => {
    const j = await api('adm_login', { pass: $('#pass').value, quiet: true });
    if (j.ok) { sessionStorage.setItem('arc_at', j.at); unlock(); } else { $('#passErr').textContent = j.err || 'Wrong passcode.'; $('#passErr').hidden = false; }
  };
  $('#loginBtn').addEventListener('click', tryLogin);
  $('#pass').addEventListener('keydown', (e) => e.key === 'Enter' && tryLogin());
  $('#logout').addEventListener('click', () => { sessionStorage.removeItem('arc_at'); location.reload(); });

  // ---------- data ----------
  async function pull(force) {
    if (busy) return; busy = true;
    const j = await api('adm_all'); busy = false;
    if (j.code === 401) { sessionStorage.removeItem('arc_at'); return location.reload(); }
    if (!j.ok) return;
    const s = JSON.stringify(j); if (s === sig && !force) { if (tab === 'support') loadThread(); return; }
    const oldUn = D.threads.reduce((a, t) => a + t.unread, 0); D = j; sig = s; /* APK icon now comes from /ASSETS/apk-icon.png (same as the store) */
    const newUn = D.threads.reduce((a, t) => a + t.unread, 0); if (newUn > oldUn && tab !== 'support' && !force) toast('💬 New user support message');
    render();
  }
  const act = async (a, d, okMsg) => { const j = await api(a, d); if (!j.ok) { toast(j.err || 'Failed'); return j; } if (okMsg) toast(okMsg); await pull(true); return j; };

  // ---------- cards ----------
  const mail = (h) => `<div class="kv"><b>GMAIL:</b><span class="keep-case">${escH(h.email)}</span></div>`;
  const card = (h, i) => {
    const base = `style="animation-delay:${i * 70}ms"`;
    if (h.status === 'pending') return `
      <div class="order-card" ${base}>
        <div class="order-top"><h3>PENDING USER ORDER <span class="plus">+1</span></h3><span class="pill pending">pending</span></div>
        <div class="kv"><b>ORDER ID:</b><span>${h.id}</span></div>${mail(h)}
        <div class="kv"><b>RECEIPT:</b><a data-view="${h.id}">${escH(h.name || 'receipt.jpg')}</a></div>
        ${h.receipt ? `<img class="thumb" data-img src="${h.receipt}" alt="Receipt">` : ''}
        <div class="kv"><b>AMOUNT:</b><span class="amt">${money(h.amount ?? h.pts)}</span></div>
        <div class="kv"><b>TOP-UP:</b><span class="coins">+₱${h.pts.toLocaleString()}</span></div>
        <div class="act-row"><button class="btn btn-cancel" data-act="adm_cancel" data-id="${h.id}"><i class="fas fa-xmark"></i> Cancel Order</button>
        <button class="btn btn-ok" data-act="adm_approve" data-id="${h.id}"><i class="fas fa-check"></i> Approve</button></div>
      </div>`;
    if (h.status === 'approved') return `
      <div class="order-card ${flashId === h.id ? 'flash' : ''}" ${base}><div class="success-box"><h3>SUCCESSFUL ORDER</h3>${mail(h)}
        <div class="kv"><b>APPROVE DATE:</b><span>${ymd(h.approvedAt || h.ts)}</span></div>
        <div class="kv"><b>AMOUNT:</b><span class="amt">${money(h.amount ?? 0)}</span></div>
        <div class="kv"><b>FUNDS ADD:</b><span class="coins">₱${h.pts.toLocaleString()}</span></div>
        <div class="big">✅ APPROVED ORDER</div></div></div>`;
    return `<div class="order-card" ${base}><div class="success-box cancel"><h3>CANCELLED ORDER</h3><div class="kv"><b>ORDER ID:</b><span>${h.id}</span></div>${mail(h)}<div class="kv"><b>AMOUNT:</b><span class="amt">${money(h.amount ?? 0)}</span></div><div class="big">❌ ORDER CANCELLED</div></div></div>`;
  };
  const empty = (i, t) => `<div class="empty-state"><i class="fas ${i}"></i><p>${t}</p></div>`;

  function render() {
    const O = D.orders;
    $('#stPend').textContent = O.filter((h) => h.status === 'pending').length;
    $('#stDone').textContent = O.filter((h) => h.status === 'approved').length;
    $('#stCoins').textContent = O.filter((h) => h.status === 'approved').reduce((a, h) => a + h.pts, 0).toLocaleString();
    $('#stSales').textContent = D.purchases.length;
    const n = D.threads.reduce((a, t) => a + t.unread, 0), b = $('#supBadge'); b.hidden = !n; b.textContent = n;
    $('#list').hidden = ['support', 'users'].includes(tab); $('#supportBox').hidden = tab !== 'support'; $('#usersBox').hidden = tab !== 'users';
    if (tab === 'support') return renderSupport();
    if (tab === 'users') return renderUsers();
    const L = $('#list');
    if (tab === 'sales') L.innerHTML = D.purchases.length ? D.purchases.map((p, i) => `
      <div class="order-card" style="animation-delay:${i * 70}ms"><div class="order-top"><div class="sale-head">${pIcon(prodOf(p.product))}<h3>${escH(p.product)}</h3></div><span class="pill approved">${escH(p.plan)}</span></div>
      <div class="kv"><b>ORDER ID:</b><span>${p.id}</span></div>${mail(p)}<div class="kv"><b>DATE:</b><span>${ymd(p.ts)}</span></div><div class="kv"><b>PAID:</b><span class="coins">₱${p.pts}</span></div></div>`).join('') : empty('fa-box-open', 'No product sales yet.');
    else if (tab === 'feedback') L.innerHTML = D.fbs.length ? D.fbs.map((f, i) => `
      <div class="order-card fb-card" style="animation-delay:${i * 60}ms"><div class="order-top"><h3 class="fb-mail">${escH(f.email)}</h3><span class="fb-stars">${stars(f.stars)}</span></div>
      <p class="fb-text">${escH(f.text)}</p>${f.img ? `<img class="thumb" data-img src="${f.img}" alt="feedback">` : ''}<small class="fb-time">${fmtTime(f.ts)}</small>
      <div class="act-row">${f.img ? `<button class="btn btn-cancel" data-fb="adm_fbimg" data-id="${f.id}"><i class="fas fa-image"></i> Delete image</button>` : ''}<button class="btn btn-cancel" data-fb="adm_fbdel" data-id="${f.id}"><i class="fas fa-trash"></i> Delete</button></div></div>`).join('') : empty('fa-star', 'No feedbacks yet.');
    else { const rows = O.filter((h) => h.status === tab); L.innerHTML = rows.length ? rows.map(card).join('') : empty('fa-inbox', `No ${tab} orders.`); }
  }

  // ---------- users tab ----------
  function renderUsers() {
    $('#mailList').innerHTML = D.users.map((u) => `<option value="${escH(u.email)}">`).join('');
    $('#uCount').textContent = '+' + D.users.length;
    $('#prodPrev').innerHTML = pIcon(PRODUCTS[0]);
    $('#userRows').innerHTML = D.users.length ? D.users.map((u, i) => `<div class="hist-item" style="animation-delay:${i * 50}ms"><div class="menu-icon purple-icon">${escH(u.email[0].toUpperCase())}</div>
      <div class="hist-info"><h3 class="keep-case" style="word-break:break-all">${escH(u.email)}</h3><p><span class="${u.online ? 'on-txt' : 'off-txt'}"><i class="on-dot"></i>${u.online ? 'Online' : 'Offline'}</span></p></div>
      <div class="hist-right"><span class="hist-pts">₱${u.coins.toLocaleString()}</span><span class="pill approved">wallet</span></div></div>`).join('') : empty('fa-users', 'No registered users yet.');
  }
  $('#addBtn').addEventListener('click', async () => {
    const j = await act('adm_add', { email: $('#addMail').value, coins: $('#addCoins').value }); if (j.ok) { toast(`✅ +${Number($('#addCoins').value).toLocaleString()} added to wallet.  New balance: ${j.coins.toLocaleString()}`); $('#addCoins').value = ''; }
  });
  const pickProd = document.createElement('input'); pickProd.type = 'file'; pickProd.accept = 'image/png,image/jpeg'; pickProd.hidden = true; document.body.appendChild(pickProd);
  $('#prodUp').addEventListener('click', () => pickProd.click());
  pickProd.addEventListener('change', async () => { const f = pickProd.files[0]; pickProd.value = ''; if (!f) return; try { await act('adm_setprod', { img: await uploadReceiptDemo(f, 480) }, '✅ Product image saved'); } catch { toast('Could not read that image.'); } });
  $('#prodDel').addEventListener('click', () => act('adm_setprod', { img: '' }, 'Product image removed'));

  // ---------- support tab ----------
  function renderSupport() {
    if (!$('#supUsers')) $('#supportBox').innerHTML = `
      <div class="panel-card chat-panel"><div class="order-top"><h3>NEW USER SUPPORT <span class="plus" id="supNew">+0</span></h3><span class="vip-badge" style="margin:0"><span class="dot"></span> LIVE</span></div><div class="sup-users" id="supUsers"></div></div>
      <div class="panel-card chat-panel" id="supChat"><div class="kv"><b>USER:</b><span id="supWho">-</span></div><div class="chat-box" id="supMsgs"></div><div class="attach-chip" id="supChip" hidden></div>
        <div class="chat-input"><button type="button" class="icon-btn" id="supAttach" title="Send image"><i class="fas fa-image"></i></button><div class="field-box"><input id="supIn" type="text" placeholder="Reply to user…" autocomplete="off"></div>
        <button type="button" class="btn btn-purple" id="supSend"><i class="fas fa-paper-plane"></i> SEND</button></div></div>`;
    const T = D.threads; if (!thread || !T.find((t) => t.email === thread)) thread = T[0]?.email || null;
    const online = (e) => D.users.find((u) => u.email === e)?.online;
    $('#supNew').textContent = '+' + T.reduce((a, t) => a + t.unread, 0); $('#supChat').hidden = !thread;
    $('#supUsers').innerHTML = T.length ? T.map((t) => `<div class="sup-user ${t.email === thread ? 'active' : ''}" data-e="${escH(t.email)}"><div class="menu-icon purple-icon">${escH(t.email[0].toUpperCase())}</div>
      <div class="hist-info"><h3><span class="keep-case">${escH(t.email)}</span> • <span class="${online(t.email) ? 'on-txt' : 'off-txt'}"><i class="on-dot"></i>${online(t.email) ? 'Online' : 'Offline'}</span></h3><p>${escH(t.last.text || '📷 image')}</p></div>${t.unread && t.email !== thread ? `<span class="badge">${t.unread}</span>` : ''}</div>`).join('') : empty('fa-headset', 'No user support yet.');
    if (thread) { $('#supWho').innerHTML = `<span class="keep-case">${escH(thread)}</span> • <span class="${online(thread) ? 'on-txt' : 'off-txt'}"><i class="on-dot"></i>${online(thread) ? 'Online' : 'Offline'}</span>`; loadThread(); }
  }
  async function loadThread(force) {
    if (!thread) return; const j = await api('adm_chat', { email: thread }); if (!j.ok) return;
    const k = thread + j.msgs.length + (j.msgs.at(-1)?.id || ''); if (k === tsig && !force) return; tsig = k;
    const box = $('#supMsgs'), near = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = j.msgs.map((m) => bubble(m, m.from === 'admin', m.from === 'admin' ? 'ARCHESZ ADMIN' : thread)).join('');
    if (near || force) box.scrollTop = box.scrollHeight;
  }
  const supChip = () => { const c = $('#supChip'); c.hidden = !aImg; c.innerHTML = aImg ? `<i class="fas fa-image"></i> ${escH(aName)} <button type="button" id="supRm">✕</button>` : ''; };
  const pk = document.createElement('input'); pk.type = 'file'; pk.accept = 'image/png,image/jpeg'; pk.hidden = true; document.body.appendChild(pk);
  pk.addEventListener('change', async () => { const f = pk.files[0]; pk.value = ''; if (!f) return; try { aImg = await uploadReceiptDemo(f); aName = f.name; supChip(); } catch { toast('Could not read that image.'); } });
  async function supSend() {
    const t = $('#supIn').value.trim(); if (!thread || (!t && !aImg)) return;
    const j = await api('adm_csend', { email: thread, text: t, img: aImg }); if (!j.ok) return toast(j.err);
    $('#supIn').value = ''; aImg = null; supChip(); loadThread(true); pull(true);
  }
  $('#supportBox').addEventListener('click', (e) => {
    const u = e.target.closest('.sup-user'); if (u) { thread = u.dataset.e; tsig = ''; return renderSupport(); }
    const lic = e.target.closest('[data-sendlic]'); if (lic) { const i = $('#supIn'); i.value = `YOUR LICENCE (${lic.dataset.product} - ${lic.dataset.plan}): `; i.focus(); toast('PASTE THE LICENCE KEY, THEN SEND ✅'); return; }
    if (e.target.closest('#supAttach')) return pk.click(); if (e.target.closest('#supSend')) return supSend(); if (e.target.id === 'supRm') { aImg = null; supChip(); }
  });
  $('#supportBox').addEventListener('keydown', (e) => { if (e.target.id === 'supIn' && e.key === 'Enter') { e.preventDefault(); supSend(); } });

  // ---------- clicks ----------
  document.querySelectorAll('#tabs .filter-btn').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.f; document.querySelectorAll('#tabs .filter-btn').forEach((x) => x.classList.toggle('active', x === b)); render(); }));
  $('#list').addEventListener('click', async (e) => {
    const v = e.target.closest('[data-view]'); if (v) { const h = D.orders.find((x) => x.id === v.dataset.view); if (h?.receipt) modal(`<h2>${escH(h.name)}</h2><img class="rcpt-full" src="${h.receipt}"><button class="btn btn-dark full-btn" data-close>Close</button>`); return; }
    const f = e.target.closest('[data-fb]'); if (f) { if (!confirm(f.dataset.fb === 'adm_fbdel' ? 'Delete this feedback?' : 'Delete this image?')) return; return act(f.dataset.fb, { id: f.dataset.id }, 'Deleted'); }
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'adm_cancel' && !confirm('Cancel this order?')) return;
    b.disabled = true; const j = await act(b.dataset.act, { id: b.dataset.id });
    if (j.ok && b.dataset.act === 'adm_approve') { flashId = b.dataset.id; toast('✅ APPROVED ORDER'); tab = 'approved'; document.querySelectorAll('#tabs .filter-btn').forEach((x) => x.classList.toggle('active', x.dataset.f === 'approved')); render(); } else b.disabled = false;
  });

  if (sessionStorage.getItem('arc_at')) unlock();
});
