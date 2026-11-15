/* We Are Foilers · admin page */
(function () {
  'use strict';
  var CFG = window.WAF_CONFIG, I = window.ICONS, U = window.UI, esc = U.esc;
  var store = (CFG.supabaseUrl && CFG.supabaseAnonKey && window.createSupabaseStore) ? window.createSupabaseStore(CFG) : window.createDemoStore(CFG);
  var $ = function (id) { return document.getElementById(id); };
  var state = { tab: 'pending', all: [], reports: [], settings: {}, q: '' };

  $('logoIcon').innerHTML = I.foil;

  var STATUS = {
    approved: ['Live', 't-private'],
    pending: ['Waiting', 't-school'],
    hidden: ['Hidden', 't-shop'],
    blocked: ['Blocked', 'blocked']
  };

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function load() {
    return Promise.all([store.admin.listAll(), store.admin.listReports(), store.getSettings()]).then(function (r) {
      state.all = r[0]; state.reports = r[1]; state.settings = r[2];
      render();
    });
  }

  function byId(id) { return U.byId(state.all, id); }

  function item(p, extra) {
    var st = STATUS[p.status] || [p.status, ''];
    var pl = U.place(p);
    var acts = '';
    if (p.status !== 'approved') acts += '<button class="btn small accent" data-do="approved" data-id="' + esc(p.id) + '">' + I.check + 'Approve</button>';
    if (p.status !== 'hidden') acts += '<button class="btn small ghost" data-do="hidden" data-id="' + esc(p.id) + '">' + I.eyeOff + 'Hide</button>';
    if (p.status !== 'blocked') acts += '<button class="btn small danger" data-do="blocked" data-id="' + esc(p.id) + '">' + I.shield + 'Block</button>';
    acts += '<button class="btn small ghost" data-view="' + esc(p.id) + '">' + I.eye + 'View</button>';
    return '<div class="adm-item">' +
      '<div class="adm-main">' + U.avatar(p, 'sm') + '<div class="adm-text"><div class="adm-name">' + esc(p.name) +
        '<span class="mini-pill t-' + p.type + '">' + U.typeLabel(p) + '</span><span class="mini-pill ' + st[1] + '">' + st[0] + '</span>' + (p.visible === false ? '<span class="mini-pill t-shop">Hidden by user</span>' : '') + '</div>' +
        '<div class="adm-sub">' + I.pin + esc(pl.label) + ' · since ' + esc(p.createdAt || '?') + (p.mine ? ' · <b>your demo card</b>' : '') + '</div>' +
        (p.about ? '<div class="adm-about">“' + esc(p.about) + '”</div>' : '') + (extra || '') + '</div></div>' +
      '<div class="adm-acts">' + acts + '</div></div>';
  }

  function render() {
    var pending = state.all.filter(function (p) { return p.status === 'pending'; });
    var openReports = state.reports.filter(function (r) { return r.open; });
    var live = state.all.filter(function (p) { return p.status === 'approved'; }).length;

    var h = '';
    if (store.mode === 'demo') h += '<div class="notice teal">' + I.sparkle + '<span><b>Demo mode.</b> Everything here is stored in this browser only. In production only admins listed in the database can open this page.</span></div>';

    h += '<div class="adm-stats">' +
      '<div><b>' + live + '</b><span>live cards</span></div>' +
      '<div><b>' + pending.length + '</b><span>waiting</span></div>' +
      '<div><b>' + openReports.length + '</b><span>open reports</span></div></div>';

    h += '<div class="adm-setting"><div><b>Manual approval</b><p class="muted">New cards only show up after you approve them. Turn it off once things run smoothly.</p></div>' +
      '<button class="toggle' + (state.settings.manualApproval ? ' on' : '') + '" id="tglApproval" role="switch" aria-checked="' + !!state.settings.manualApproval + '"><span></span></button></div>';

    h += '<div class="seg adm-tabs">' +
      tab('pending', 'Waiting', pending.length) + tab('reports', 'Reported', openReports.length) + tab('all', 'All cards', state.all.length) + '</div>';

    if (state.tab === 'pending') {
      h += pending.length ? pending.map(function (p) { return item(p); }).join('')
        : empty('Inbox zero.', 'Nothing waiting. Go foiling.');
    } else if (state.tab === 'reports') {
      h += openReports.length ? openReports.map(function (r) {
        var p = byId(r.profileId);
        var extra = '<div class="adm-report">' + I.flag + '<span><b>' + esc(r.reason) + '</b>' + (r.note ? ': ' + esc(r.note) : '') + ' <span class="muted">· ' + esc(r.at.slice(0, 10)) + '</span></span>' +
          '<button class="link-btn" data-dismiss="' + esc(r.id) + '">' + I.check + 'Dismiss report</button></div>';
        return p ? item(p, extra) : '<div class="adm-item"><div class="adm-text">Deleted profile ' + extra + '</div></div>';
      }).join('') : empty('No reports.', 'Everyone is behaving. Nice.');
    } else {
      h += '<input class="input" id="admSearch" placeholder="Search name or place" value="' + esc(state.q) + '" style="margin-bottom:12px">';
      var q = state.q.toLowerCase();
      var list = state.all.filter(function (p) { return !q || (p.name + ' ' + U.place(p).label).toLowerCase().indexOf(q) >= 0; });
      h += list.map(function (p) { return item(p); }).join('') || empty('No match.', 'Try another name.');
    }

    if (store.mode === 'demo') h += '<p style="text-align:center;margin-top:28px"><button class="link-btn" id="resetDemo">' + I.trash + 'Reset demo data</button></p>';
    $('app').innerHTML = h;

    var s = $('admSearch');
    if (s) { s.addEventListener('input', function () { state.q = s.value; render(); var n = $('admSearch'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }); }
  }
  function tab(id, label, n) { return '<button class="' + (state.tab === id ? 'on' : '') + '" data-tab="' + id + '">' + label + (n ? ' <span class="count-dot">' + n + '</span>' : '') + '</button>'; }
  function empty(t, s) { return '<div class="empty"><span class="doodle">' + I.wave + '</span><h3>' + t + '</h3><p>' + s + '</p></div>'; }

  $('app').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { state.tab = b.dataset.tab; render(); }
    else if (b.dataset.do) {
      var p = byId(b.dataset.id), to = b.dataset.do;
      store.admin.decide(b.dataset.id, to).then(function () {
        toast(p.name + (to === 'approved' ? ' is live.' : to === 'hidden' ? ' is hidden.' : ' is blocked.'));
        // a hidden or blocked card closes its open reports
        if (to !== 'approved') state.reports.filter(function (r) { return r.open && r.profileId === p.id; }).forEach(function (r) { store.admin.closeReport(r.id); });
        load();
      });
    }
    else if (b.dataset.dismiss) store.admin.closeReport(b.dataset.dismiss).then(function () { toast('Report dismissed.'); load(); });
    else if (b.dataset.view) window.open('./#p=' + encodeURIComponent(b.dataset.view), '_blank');
    else if (b.id === 'tglApproval') store.admin.setSetting('manualApproval', !state.settings.manualApproval).then(function (s) {
      state.settings = s; toast(s.manualApproval ? 'New cards now wait for your OK.' : 'New cards go live right away.'); render();
    });
    else if (b.id === 'resetDemo') store.admin.resetDemo().then(function () { toast('Demo data reset.'); load(); });
  });

  store.init().then(store.admin.isAdmin).then(function (ok) {
    if (!ok) { $('app').innerHTML = empty('Admins only.', 'Sign in on the map with an admin account first.'); return; }
    return load();
  });
})();
