/* We Are Foilers · admin page */
(function () {
  'use strict';
  var CFG = window.WAF_CONFIG, I = window.ICONS, U = window.UI, esc = U.esc;
  var store = (CFG.supabaseUrl && CFG.supabaseAnonKey && window.createSupabaseStore) ? window.createSupabaseStore(CFG) : window.createDemoStore(CFG);
  var $ = function (id) { return document.getElementById(id); };
  var state = { tab: 'pending', all: [], reports: [], partners: [], settings: {}, q: '' };

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
    return store.admin.overview().then(function (o) {
      state.all = o.profiles; state.reports = o.reports; state.partners = o.partners; state.settings = o.settings;
      render();
    }).catch(function (e) { $('app').innerHTML = empty('Something went wrong.', esc(e.message)); });
  }

  function byId(id) { return U.byId(state.all, id); }
  function partnerReq(id) { for (var i = 0; i < state.partners.length; i++) if (state.partners[i].profileId === id) return state.partners[i]; return null; }

  function item(p, extra) {
    var st = STATUS[p.status] || [p.status, ''];
    var pl = U.place(p);
    var acts = '';
    if (p.status !== 'approved') acts += '<button class="btn small accent" data-do="approved" data-id="' + esc(p.id) + '">' + I.check + 'Approve</button>';
    if (p.status !== 'hidden' && !p.isAuto) acts += '<button class="btn small ghost" data-do="hidden" data-id="' + esc(p.id) + '">' + I.eyeOff + 'Hide</button>';
    if (p.isAuto) acts += '<button class="btn small danger" data-do="deleted" data-id="' + esc(p.id) + '">' + I.trash + 'Delete</button>';
    else if (p.status !== 'blocked') acts += '<button class="btn small danger" data-do="blocked" data-id="' + esc(p.id) + '">' + I.shield + 'Block</button>';
    if (state.settings.partnerProgram && !p.isAuto) acts += '<button class="btn small ghost" data-partner="' + (p.isPartner ? '0' : '1') + '" data-id="' + esc(p.id) + '">' + I.verified + (p.isPartner ? 'Remove check' : 'Give check') + '</button>';
    acts += '<button class="btn small ghost" data-view="' + esc(p.id) + '">' + I.eye + 'View</button>';

    var info = '';
    if (p.claimOf) {
      var c = byId(p.claimOf);
      info += '<div class="adm-flag teal">' + I.robot + '<span>Claims the automatic entry <b>' + esc(c ? c.name : p.claimOf) + '</b>. Approving replaces it.</span></div>';
    }
    var pr = partnerReq(p.id);
    if (pr && pr.status === 'requested') info += '<div class="adm-flag blue">' + I.verified + '<span>Partner request: <a href="' + esc(pr.link) + '" target="_blank" rel="noopener">' + esc(pr.link) + '</a></span></div>';

    return '<div class="adm-item">' +
      '<div class="adm-main">' + U.avatar(p, 'sm') + '<div class="adm-text"><div class="adm-name">' + esc(p.name) +
        '<span class="mini-pill t-' + p.type + '">' + U.typeLabel(p) + '</span><span class="mini-pill ' + st[1] + '">' + st[0] + '</span>' +
        (p.isAuto ? '<span class="mini-pill t-shop">Auto</span>' : '') + (p.visible === false ? '<span class="mini-pill t-shop">Hidden by user</span>' : '') + '</div>' +
        '<div class="adm-sub">' + I.pin + esc(pl.label) + ' · since ' + esc(p.createdAt || '?') + (p.mine ? ' · <b>your demo card</b>' : '') + '</div>' +
        (p.about ? '<div class="adm-about">“' + esc(p.about) + '”</div>' : '') +
        (p.isAuto && p.sourceUrl ? '<div class="adm-sub">' + I.link + '<a href="' + esc(p.sourceUrl) + '" target="_blank" rel="noopener">source</a></div>' : '') +
        info + (extra || '') + '</div></div>' +
      '<div class="adm-acts">' + acts + '</div></div>';
  }

  function toggleRow(id, title, text, on) {
    return '<div class="adm-setting"><div><b>' + title + '</b><p class="muted">' + text + '</p></div>' +
      '<button class="toggle' + (on ? ' on' : '') + '" data-setting="' + id + '" role="switch" aria-checked="' + !!on + '"><span></span></button></div>';
  }

  function render() {
    var pending = state.all.filter(function (p) { return p.status === 'pending' || (p.claimOf && p.status === 'approved'); });
    var openReports = state.reports.filter(function (r) { return r.open; });
    var partnerOpen = state.partners.filter(function (x) { return x.status === 'requested'; });
    var real = state.all.filter(function (p) { return !p.isAuto && !p.demo; });
    var live = real.filter(function (p) { return p.status === 'approved'; }).length;
    var auto = state.all.filter(function (p) { return p.isAuto; });

    var h = '';
    if (store.mode === 'demo') h += '<div class="notice teal">' + I.sparkle + '<span><b>Demo mode.</b> Everything here is stored in this browser only. In production only admins listed in the database can open this page.</span></div>';

    h += '<div class="adm-stats">' +
      '<div><b>' + live + '</b><span>live members</span></div>' +
      '<div><b>' + auto.length + '</b><span>auto entries</span></div>' +
      '<div><b>' + (pending.length + partnerOpen.length + openReports.length) + '</b><span>to do</span></div></div>';

    h += toggleRow('manualApproval', 'Manual approval', 'New cards only show up after you approve them. Turn it off once things run smoothly.', state.settings.manualApproval);
    h += toggleRow('showDemo', 'Show demo profiles', 'The 34 made-up foilers on the map. Switch off once there are enough real people.', state.settings.showDemo);
    h += toggleRow('partnerProgram', 'Partner program', 'Members can ask for the blue check after sharing We Are Foilers publicly.', state.settings.partnerProgram);

    h += '<div class="seg adm-tabs">' +
      tab('pending', 'Waiting', pending.length) + tab('partners', 'Partners', partnerOpen.length) + tab('reports', 'Reported', openReports.length) +
      tab('auto', 'Auto', 0) + tab('all', 'All', 0) + '</div>';

    if (state.tab === 'pending') {
      h += pending.length ? pending.map(function (p) { return item(p); }).join('') : empty('Inbox zero.', 'Nothing waiting. Go foiling.');
    } else if (state.tab === 'partners') {
      var withReq = state.partners.map(function (x) { return byId(x.profileId); }).filter(Boolean);
      var partners = real.filter(function (p) { return p.isPartner && withReq.indexOf(p) < 0; });
      var list = withReq.concat(partners);
      h += '<p class="muted adm-help">Open the link and check that We Are Foilers is shared there. Then give the blue check.</p>';
      h += list.length ? list.map(function (p) { return item(p); }).join('') : empty('No partners yet.', 'They\'ll show up here once someone shares the site.');
    } else if (state.tab === 'reports') {
      h += openReports.length ? openReports.map(function (r) {
        var p = byId(r.profileId);
        var extra = '<div class="adm-report">' + I.flag + '<span><b>' + esc(r.reason) + '</b>' + (r.note ? ': ' + esc(r.note) : '') + ' <span class="muted">· ' + esc(String(r.at).slice(0, 10)) + '</span></span>' +
          '<button class="link-btn" data-dismiss="' + esc(r.id) + '">' + I.check + 'Dismiss report</button></div>';
        return p ? item(p, extra) : '<div class="adm-item"><div class="adm-text">Deleted profile ' + extra + '</div></div>';
      }).join('') : empty('No reports.', 'Everyone is behaving. Nice.');
    } else {
      var src = state.tab === 'auto' ? auto : state.all.filter(function (p) { return !p.demo; });
      h += '<input class="input" id="admSearch" placeholder="Search name or place" value="' + esc(state.q) + '" style="margin-bottom:12px">';
      var q = state.q.toLowerCase();
      var found = src.filter(function (p) { return !q || (p.name + ' ' + U.place(p).label).toLowerCase().indexOf(q) >= 0; });
      h += found.map(function (p) { return item(p); }).join('') || empty('Nothing here.', q ? 'Try another name.' : 'No entries yet.');
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
    var p = b.dataset.id ? byId(b.dataset.id) : null;
    if (b.dataset.tab) { state.tab = b.dataset.tab; render(); }
    else if (b.dataset.do) {
      var to = b.dataset.do;
      var go = to === 'deleted' ? window.confirm('Delete the automatic entry "' + p.name + '"?') : true;
      if (!go) return;
      store.admin.decide(b.dataset.id, to).then(function () {
        toast(p.name + ({ approved: ' is live.', hidden: ' is hidden.', blocked: ' is blocked.', deleted: ' was deleted.' }[to] || ''));
        load();
      }).catch(function (err) { toast(err.message); });
    }
    else if (b.dataset.partner) store.admin.setPartner(b.dataset.id, b.dataset.partner === '1').then(function () {
      toast(b.dataset.partner === '1' ? p.name + ' got the blue check.' : 'Check removed.'); load();
    }).catch(function (err) { toast(err.message); });
    else if (b.dataset.dismiss) store.admin.closeReport(b.dataset.dismiss).then(function () { toast('Report dismissed.'); load(); });
    else if (b.dataset.view) window.open('./#p=' + encodeURIComponent(b.dataset.view), '_blank');
    else if (b.dataset.setting) {
      var k = b.dataset.setting;
      store.admin.setSetting(k, !state.settings[k]).then(function (s) { state.settings = s; toast('Saved.'); render(); }).catch(function (err) { toast(err.message); });
    }
    else if (b.id === 'resetDemo') store.admin.resetDemo().then(function () { toast('Demo data reset.'); load(); });
  });

  store.init().then(store.admin.isAdmin).then(function (ok) {
    if (!ok) {
      $('app').innerHTML = empty('Admins only.', store.getUser() ? 'This account is not an admin.' : 'Sign in on the map first, then come back here.') +
        '<p style="text-align:center"><a class="btn" href="./">Go to the map</a></p>';
      return;
    }
    return load();
  });
})();
