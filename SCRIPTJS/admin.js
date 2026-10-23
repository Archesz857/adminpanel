// ARCHESZ ADMIN - talks to the store server (/api). Password = ADMIN_PASSWORD env var in Vercel.
document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const money = (n) => '₱' + Number(n).toLocaleString();
  let D = { orders: [], purchases: [], users: [], fbs: [], threads: [], prodImg: '' }, tab = 'pending', flashId = null, sig = '', thread = null, aImg = null, aName = '', tsig = '', busy = false;

  // ---------- login ----------
  const unlock = () => { $('#gate').hidden = true; $('#app').hidden = false; $('#logout').hidden = false; pull(true); setInterval(() => !document.hidden && pull(), 6000); };
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
  const av = (e) => `<div class="oc-av">${escH((e || '?').slice(0, 2).toUpperCase())}</div>`;
  const kv = (k, v, c = '') => `<div class="${c.includes('wide') ? 'wide' : ''}"><small>${k}</small><b class="${c.replace('wide', '').trim()}">${v}</b></div>`;
  const card = (h, i) => {
    const st = h.status, dl = `style="animation-delay:${Math.min(i, 8) * 60}ms"`, cls = { pending: 'st-warn', approved: 'st-ok', cancelled: 'st-bad' }[st];
    const head = `<div class="oc-top">${av(h.email)}<div class="oc-ti"><b class="keep-case">${escH(h.email)}</b><small>${h.id} · ${ymd(h.ts)}</small></div><span class="st ${cls}">${st.toUpperCase()}</span></div>`;
    const grid = `<div class="oc-grid">${kv('AMOUNT', money(h.amount ?? h.pts))}${kv('TOP-UP', '+₱' + h.pts.toLocaleString(), 'pp')}${st === 'approved' ? kv('APPROVED ON', ymd(h.approvedAt || h.ts)) : kv('METHOD', 'GCASH')}${kv('STATUS', st.toUpperCase())}</div>`;
    const rc = h.receipt ? `<div class="oc-rcpt"><small>PAYMENT PROOF · ${escH(h.name || 'receipt.jpg')}</small><img class="thumb" data-img src="${h.receipt}" alt="Receipt" loading="lazy"></div>` : '';
    if (st === 'pending') return `<article class="ocard is-pending" ${dl}>${head}${grid}${rc}<div class="oc-act"><button class="abtn abtn-no" data-act="adm_cancel" data-id="${h.id}"><i class="fas fa-xmark"></i> CANCEL</button><button class="abtn abtn-ok" data-act="adm_approve" data-id="${h.id}"><i class="fas fa-check"></i> APPROVE</button></div></article>`;
    if (st === 'approved') return `<article class="ocard is-approved ${flashId === h.id ? 'flash' : ''}" ${dl}>${head}${grid}${rc}<div class="oc-ban ok"><i class="fas fa-circle-check"></i> APPROVED ORDER</div></article>`;
    return `<article class="ocard is-cancelled" ${dl}>${head}${grid}${rc}<div class="oc-ban bad"><i class="fas fa-circle-xmark"></i> ORDER CANCELLED</div></article>`;
  };
  const empty = (i, t) => `<div class="empty-state"><i class="fas ${i}"></i><p>${t}</p></div>`;

  function render() {
    const O = D.orders, n = (s) => O.filter((h) => h.status === s).length;
    $('#stPend').textContent = n('pending'); $('#stDone').textContent = n('approved'); $('#stCoins').textContent = '₱' + O.filter((h) => h.status === 'approved').reduce((a, h) => a + h.pts, 0).toLocaleString(); $('#stSales').textContent = D.purchases.length;
    $('#cPend').textContent = n('pending'); $('#cDone').textContent = n('approved'); $('#cBad').textContent = n('cancelled'); $('#cSales').textContent = D.purchases.length; $('#cFb').textContent = D.fbs.length; $('#cUsers').textContent = D.users.length;
    const un = D.threads.reduce((a, t) => a + t.unread, 0), b = $('#supBadge'); b.hidden = !un; b.textContent = un;
    $('#list').hidden = ['support', 'users'].includes(tab); $('#supportBox').hidden = tab !== 'support'; $('#usersBox').hidden = tab !== 'users';
    if (tab === 'support') return renderSupport();
    if (tab === 'users') return renderUsers();
    const L = $('#list');
    if (tab === 'sales') L.innerHTML = D.purchases.length ? D.purchases.map((p, i) => `
      <article class="ocard is-approved" style="animation-delay:${Math.min(i, 8) * 60}ms"><div class="oc-top"><img class="oc-pic" src="${prodOf(p.product).img}" alt="" onerror="this.style.visibility='hidden'"><div class="oc-ti"><b>${escH(p.product)}</b><small>${p.id} · ${ymd(p.ts)}</small></div><span class="st st-ok">${escH(p.plan)}</span></div>
      <div class="oc-grid">${kv('BUYER', `<span class="keep-case">${escH(p.email)}</span>`, 'wide')}${kv('PAID', '₱' + p.pts, 'pp')}${kv('DATE', ymd(p.ts))}</div></article>`).join('') : empty('fa-box-open', 'NO PRODUCT SALES YET.');
    else if (tab === 'feedback') L.innerHTML = D.fbs.length ? D.fbs.map((f, i) => `
      <article class="ocard" style="animation-delay:${Math.min(i, 8) * 60}ms"><div class="oc-top">${av(f.email)}<div class="oc-ti"><b class="keep-case">${escH(f.email)}</b><small>${fmtTime(f.ts)}</small></div><span class="fb-stars">${stars(f.stars)}</span></div>
      <p class="fb-text">${escH(f.text)}</p>${f.img ? `<img class="thumb" data-img src="${f.img}" alt="feedback" loading="lazy" style="margin-top:10px;max-height:200px;border-radius:12px">` : ''}
      <div class="oc-act" style="margin-top:12px">${f.img ? `<button class="abtn abtn-no" data-fb="adm_fbimg" data-id="${f.id}"><i class="fas fa-image"></i> DELETE IMAGE</button>` : ''}<button class="abtn abtn-no" data-fb="adm_fbdel" data-id="${f.id}"><i class="fas fa-trash"></i> DELETE</button></div></article>`).join('') : empty('fa-star', 'NO FEEDBACKS YET.');
    else { const rows = O.filter((h) => h.status === tab); L.innerHTML = rows.length ? rows.map(card).join('') : empty('fa-inbox', `NO ${tab.toUpperCase()} ORDERS.`); }
  }

  // ---------- users tab ----------
  function renderUsers() {
    $('#mailList').innerHTML = D.users.map((u) => `<option value="${escH(u.email)}">`).join('');
    $('#uCount').textContent = D.users.length;
    $('#userRows').innerHTML = D.users.length ? D.users.map((u, i) => `<article class="ucard" style="animation-delay:${Math.min(i, 8) * 60}ms"><div class="oc-av">${escH(u.email.slice(0, 2).toUpperCase())}<i class="dot-s ${u.online ? 'on' : ''}"></i></div>
      <div class="oc-ti"><b class="keep-case">${escH(u.email)}</b><small>${u.online ? 'ONLINE' : 'OFFLINE'}</small></div><div class="u-bal"><small>WALLET</small><b>₱${u.coins.toLocaleString()}</b></div></article>`).join('') : empty('fa-users', 'NO REGISTERED USERS YET.');
  }
  $('#addBtn').addEventListener('click', async () => {
    const j = await act('adm_add', { email: $('#addMail').value, coins: $('#addCoins').value }); if (j.ok) { toast(`✅ +₱${Number($('#addCoins').value).toLocaleString()} added to wallet.  New balance: ₱${j.coins.toLocaleString()}`); $('#addCoins').value = ''; }
  });

  // ---------- support tab ----------
  function renderSupport() {
    if (!$('#supUsers')) $('#supportBox').innerHTML = `
      <h3 class="adm-h">USER SUPPORT <em id="supNew">0</em></h3><div id="supUsers"></div>
      <section class="chat-shell" id="supChat"><div class="chat-head"><div class="oc-av" id="supAv">?</div><div><b id="supWho" class="keep-case">-</b><small id="supOn"></small></div></div>
        <div class="chat-box" id="supMsgs"></div><div class="attach-chip" id="supChip" hidden></div>
        <div class="chat-input"><button type="button" class="icon-btn" id="supAttach" title="Send image"><i class="fas fa-image"></i></button><div class="field-box"><input id="supIn" type="text" placeholder="Reply to user…" autocomplete="off"></div>
        <button type="button" class="btn btn-purple send-btn" id="supSend"><i class="fas fa-paper-plane"></i></button></div></section>`;
    const T = D.threads; if (!thread || !T.find((t) => t.email === thread)) thread = T[0]?.email || null;
    const online = (e) => D.users.find((u) => u.email === e)?.online;
    $('#supNew').textContent = T.reduce((a, t) => a + t.unread, 0); $('#supChat').hidden = !thread;
    $('#supUsers').innerHTML = T.length ? T.map((t) => `<div class="sup-user ${t.email === thread ? 'active' : ''}" data-e="${escH(t.email)}"><div class="oc-av">${escH(t.email.slice(0, 2).toUpperCase())}<i class="dot-s ${online(t.email) ? 'on' : ''}"></i></div>
      <div class="oc-ti"><b class="keep-case">${escH(t.email)}</b><small>${escH(t.last.text || '📷 image')}</small></div>${t.unread && t.email !== thread ? `<span class="badge">${t.unread}</span>` : ''}</div>`).join('') : empty('fa-headset', 'NO USER SUPPORT YET.');
    if (thread) { $('#supWho').textContent = thread; $('#supAv').textContent = thread.slice(0, 2).toUpperCase(); $('#supOn').innerHTML = `<i class="dot-s ${online(thread) ? 'on' : ''}"></i>${online(thread) ? 'ONLINE' : 'OFFLINE'}`; loadThread(); }
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
  document.querySelectorAll('#tabs .chip').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.f; document.querySelectorAll('#tabs .chip').forEach((x) => x.classList.toggle('active', x === b)); render(); }));
  $('#list').addEventListener('click', async (e) => {
    const v = e.target.closest('[data-view]'); if (v) { const h = D.orders.find((x) => x.id === v.dataset.view); if (h?.receipt) modal(`<h2>${escH(h.name)}</h2><img class="rcpt-full" src="${h.receipt}"><button class="btn btn-dark full-btn" data-close>Close</button>`); return; }
    const f = e.target.closest('[data-fb]'); if (f) { if (!confirm(f.dataset.fb === 'adm_fbdel' ? 'Delete this feedback?' : 'Delete this image?')) return; return act(f.dataset.fb, { id: f.dataset.id }, 'Deleted'); }
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'adm_cancel' && !confirm('Cancel this order?')) return;
    b.disabled = true; const j = await act(b.dataset.act, { id: b.dataset.id });
    if (j.ok && b.dataset.act === 'adm_approve') { flashId = b.dataset.id; toast('✅ APPROVED ORDER'); tab = 'approved'; document.querySelectorAll('#tabs .chip').forEach((x) => x.classList.toggle('active', x.dataset.f === 'approved')); render(); } else b.disabled = false;
  });

  if (sessionStorage.getItem('arc_at')) unlock();
});
