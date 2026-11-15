/* We Are Foilers · map page */
(function () {
  'use strict';
  var CFG = window.WAF_CONFIG, C = window.CATALOG, I = window.ICONS, U = window.UI;
  var NOMINATIM = 'https://nominatim.openstreetmap.org';
  var store = (CFG.supabaseUrl && CFG.supabaseAnonKey && window.createSupabaseStore) ? window.createSupabaseStore(CFG) : window.createDemoStore(CFG);

  var $ = function (id) { return document.getElementById(id); };
  var esc = U.esc;
  var state = { profiles: [], me: null, settings: {}, partnerRequest: null, claim: null, view: 'list', selected: null, filters: { types: [], disc: [], brands: [], kit: [], open: [] } };
  var quip = C.quips[Math.floor(Math.random() * C.quips.length)];
  var desktop = window.matchMedia('(min-width: 900px)');

  /* ---------- Static icons ---------- */
  $('logoIcon').innerHTML = I.foil;
  $('searchIcon').innerHTML = I.search;
  $('btnLocate').innerHTML = I.locate;
  $('btnAbout').innerHTML = I.heart;

  /* ---------- Map ---------- */
  var map = L.map('map', { zoomControl: false, worldCopyJump: true, minZoom: 2, maxZoom: 18 }).setView(CFG.defaultCenter, CFG.defaultZoom);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  if (CFG.mapStyle && L.maplibreGL) {
    var gl = L.maplibreGL({ style: CFG.mapStyle, attribution: CFG.mapAttribution }).addTo(map);
    var ml = gl.getMaplibreMap();
    // Recolor the base map to the "Morning Glass" palette
    ml.on('style.load', function () {
      ml.getStyle().layers.forEach(function (l) {
        try {
          if (l.type === 'background') ml.setPaintProperty(l.id, 'background-color', '#F7F9F8');
          else if (l.id === 'water') ml.setPaintProperty(l.id, 'fill-color', '#DCEFF4');
          else if (l.id === 'waterway') ml.setPaintProperty(l.id, 'line-color', '#CBE6EE');
          else if (/^water_name/.test(l.id)) ml.setPaintProperty(l.id, 'text-color', '#7FB3C2');
          else if (l.type === 'raster') ml.setPaintProperty(l.id, 'raster-opacity', 0.35);
          // English place names everywhere, local name as fallback
          if (l.type === 'symbol' && l.layout && l.layout['text-field']) {
            ml.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']]);
          }
        } catch (e) { /* layer may not support it */ }
      });
    });
  } else {
    L.tileLayer(CFG.tileUrl, { attribution: CFG.tileAttribution, maxZoom: 19 }).addTo(map);
  }
  var cluster = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 46, spiderfyOnMaxZoom: true,
    iconCreateFunction: function (c) {
      var n = c.getChildCount();
      return L.divIcon({ html: '<div class="cluster' + (n > 19 ? ' big' : '') + '">' + n + '</div>', className: 'cluster-wrap', iconSize: [52, 52] });
    }
  });
  map.addLayer(cluster);
  var markers = {}, halo = null;

  function pinIcon(p, sel) {
    var badge = '';
    if (p.atAway && p.away) badge = '<span class="badge away">' + I.plane + '</span>';
    else if (p.type === 'school') badge = '<span class="badge school">' + I.sparkle + '</span>';
    else if (p.type === 'shop') badge = '<span class="badge shop">' + I.home + '</span>';
    return L.divIcon({ html: '<div class="pin' + (sel ? ' sel' : '') + '">' + U.avatar(p) + badge + '</div>', className: 'pin-wrap', iconSize: [40, 40], iconAnchor: [20, 20] });
  }

  /* ---------- Filters ----------
     Top row: who (Foilers / Schools & Rentals / Shops) plus a "Filters" sheet with
     Disciplines, Brands, Gear and Open for. Within a group any match counts, groups combine. */
  var GROUPS = [
    { key: 'disc',   title: 'Disciplines', items: function () { return C.disciplines.filter(function (d) { return d.id !== 'other'; }); } },
    { key: 'brands', title: 'Brands',      items: function () { return C.brands.map(function (b) { return { id: b, label: b }; }); } },
    { key: 'kit',    title: 'Gear',        items: function () { return C.kit; } },
    { key: 'open',   title: 'Open for',    items: function () { return C.openFor; } }
  ];
  function lower(a) { return (a || []).map(function (x) { return String(x).toLowerCase(); }); }
  function anyIn(have, want) { return have.some(function (x) { return want.indexOf(x) >= 0; }); }
  function matches(p) {
    var f = state.filters;
    if (f.types.length && f.types.indexOf(p.type) < 0) return false;
    if (f.disc.length && !anyIn((p.disciplines || []).map(function (d) { return d.id; }), f.disc)) return false;
    if (f.brands.length && !anyIn(lower(p.gear), lower(f.brands))) return false;
    if (f.kit.length && !anyIn(p.kit || [], f.kit)) return false;
    if (f.open.length && !anyIn(p.openFor || [], f.open)) return false;
    return true;
  }
  function filtered() { return state.profiles.filter(matches); }
  function find(id) { return U.byId(state.profiles, id); }
  function moreCount() { var f = state.filters; return f.disc.length + f.brands.length + f.kit.length + f.open.length; }
  function itemLabel(key, id) {
    var g = GROUPS.filter(function (x) { return x.key === key; })[0];
    var it = U.byId(g.items(), id); return it ? it.label : id;
  }
  function toggleIn(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }

  function renderMarkers() {
    cluster.clearLayers(); markers = {};
    filtered().forEach(function (p) {
      var pl = U.place(p);
      var m = L.marker([pl.lat, pl.lng], { icon: pinIcon(p, p.id === state.selected), title: p.name, riseOnHover: true });
      m.on('click', function () { openProfile(p.id, { fly: false }); });
      markers[p.id] = m; cluster.addLayer(m);
    });
  }

  function typeButtons(cls) {
    return C.types.map(function (t) {
      return '<button type="button" class="' + cls + (state.filters.types.indexOf(t.id) >= 0 ? ' on' : '') + '" data-type-f="' + t.id + '"><i class="tdot t-' + t.id + '"></i>' + t.plural + '</button>';
    }).join('');
  }
  function renderChips() {
    var f = state.filters, n = f.types.length + moreCount();
    var h = '<button class="chip add-filter' + (n ? ' on' : '') + '" data-more="1" aria-label="' + (n ? 'Filters, ' + n + ' active' : 'Add filters') + '">' +
      I.filter + 'Add filters' + (n ? '<span class="count">' + n + '</span>' : '') + '</button>';
    // active filters as quick-remove pills
    f.types.forEach(function (id) {
      var t = U.byId(C.types, id);
      h += '<button class="chip active-f" data-rm="types" data-v="' + id + '" aria-label="Remove filter ' + t.plural + '"><i class="tdot t-' + id + '"></i>' + t.plural + I.close + '</button>';
    });
    GROUPS.forEach(function (g) {
      f[g.key].forEach(function (id) {
        h += '<button class="chip active-f" data-rm="' + g.key + '" data-v="' + esc(id) + '" aria-label="Remove filter ' + esc(itemLabel(g.key, id)) + '">' + esc(itemLabel(g.key, id)) + I.close + '</button>';
      });
    });
    $('chips').innerHTML = h;
    syncFinderHeight();
  }
  $('chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    if (b.dataset.more) return openFilters();
    if (b.dataset.rm) toggleIn(state.filters[b.dataset.rm], b.dataset.v);
    refresh();
  });

  function openFilters() {
    var f = state.filters;
    function groupHtml(g, open) {
      var n = f[g.key].length;
      return '<details class="fgroup" data-g="' + g.key + '"' + (open ? ' open' : '') + '><summary><span>' + g.title + '</span>' +
        '<span class="fcount' + (n ? '' : ' hidden') + '">' + n + '</span>' + I.chevron + '</summary>' +
        '<div class="checks' + (g.key === 'brands' ? ' three' : '') + '">' + g.items().map(function (x) {
          return '<label class="check"><input type="checkbox" data-k="' + g.key + '" value="' + esc(x.id) + '"' + (f[g.key].indexOf(x.id) >= 0 ? ' checked' : '') + '>' +
            '<span class="box">' + I.check + '</span><span>' + esc(x.label) + '</span></label>';
        }).join('') + '</div></details>';
    }
    var d = openDialog(
      head('Filters') +
      '<div class="dlg-body filters">' +
        '<div class="type-seg">' + typeButtons('tbtn') + '</div>' +
        GROUPS.map(function (g, i) { return groupHtml(g, i === 0 || f[g.key].length > 0); }).join('') +
      '</div>' +
      '<div class="dlg-foot"><button class="btn ghost" data-reset>Clear all</button><button class="btn accent" data-close id="fShow"></button></div>', 'sheet');
    function update() {
      var n = filtered().length;
      d.querySelector('#fShow').textContent = n ? 'Show ' + n + (n === 1 ? ' result' : ' results') : 'Nothing matches';
      GROUPS.forEach(function (g) {
        var c = d.querySelector('[data-g="' + g.key + '"] .fcount'); c.textContent = f[g.key].length; c.classList.toggle('hidden', !f[g.key].length);
      });
      d.querySelectorAll('[data-type-f]').forEach(function (b) { b.classList.toggle('on', f.types.indexOf(b.dataset.typeF) >= 0); });
      refresh();
    }
    d.addEventListener('change', function (e) {
      var c = e.target.closest('input[data-k]'); if (!c) return;
      toggleIn(f[c.dataset.k], c.value); update();
    });
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-type-f]');
      if (t) { toggleIn(f.types, t.dataset.typeF); update(); }
      if (e.target.closest('[data-reset]')) {
        f.types = []; GROUPS.forEach(function (g) { f[g.key] = []; });
        d.querySelectorAll('input[data-k]').forEach(function (x) { x.checked = false; });
        update();
      }
    });
    update();
  }

  /* ---------- Panel ---------- */
  var panel = $('panel'), body = $('panelBody');
  var SIZES = ['peek', 'half', 'full'];
  function setSize(s) { panel.dataset.size = s; $('grip').setAttribute('aria-label', s === 'peek' ? 'Expand list' : 'Collapse list'); }
  function size() { return panel.dataset.size; }

  (function gripGestures() {
    var startY = null, moved = 0;
    var grip = $('grip');
    grip.addEventListener('pointerdown', function (e) { startY = e.clientY; moved = 0; grip.setPointerCapture(e.pointerId); });
    grip.addEventListener('pointermove', function (e) { if (startY !== null) moved = e.clientY - startY; });
    grip.addEventListener('pointerup', function () {
      var i = SIZES.indexOf(size());
      if (moved < -30) i = Math.min(2, i + 1);
      else if (moved > 30) i = Math.max(0, i - 1);
      else i = (i + 1) % 3;
      startY = null; setSize(SIZES[i]);
    });
  })();
  // tapping the list header while peeking opens the list
  body.addEventListener('click', function (e) {
    if (size() === 'peek' && e.target.closest('.panel-head') && !desktop.matches) setSize('half');
  });
  map.on('dragstart', function () { if (!desktop.matches && state.view === 'list' && size() !== 'peek') setSize('peek'); });

  function renderPanel() {
    if (state.view === 'card') return renderCard();
    if (state.view === 'me') return renderMe();
    renderList();
  }

  function footer() {
    return '<footer class="foot"><nav><button data-action="about">About & FAQ</button><a href="terms.html">Terms</a><a href="privacy.html">Privacy</a><a href="imprint.html">Imprint</a></nav>' +
      contactLinks() +
      '<p>Made with <span class="heart">' + I.heart + '</span> by foilers, for foilers.<br>Non-profit, brand-neutral, unofficial community project.</p></footer>';
  }
  function contactLinks() {
    var l = [];
    if (CFG.instagram) l.push('<a href="https://instagram.com/' + esc(CFG.instagram) + '" target="_blank" rel="noopener">' + I.ig + '@' + esc(CFG.instagram) + '</a>');
    if (CFG.contactEmail) l.push('<a href="mailto:' + esc(CFG.contactEmail) + '">' + I.mail + esc(CFG.contactEmail) + '</a>');
    return l.length ? '<nav class="foot-contact">' + l.join('') + '</nav>' : '';
  }

  function renderList() {
    var b = map.getBounds(), center = map.getCenter();
    var list = filtered().filter(function (p) { var pl = U.place(p); return b.contains([pl.lat, pl.lng]); });
    list.sort(function (a, c) {
      if (!!a.isPartner !== !!c.isPartner) return a.isPartner ? -1 : 1;
      var pa = U.place(a), pc = U.place(c); return center.distanceTo([pa.lat, pa.lng]) - center.distanceTo([pc.lat, pc.lng]);
    });
    var n = list.length, h;
    if (!n) {
      h = '<div class="panel-head"><div class="grow"><h2>Nobody here yet</h2><p class="quip">' + I.wave + 'Legends start somewhere.</p></div></div>' +
        '<div class="empty"><span class="doodle">' + I.board + '</span><h3>Be the first local</h3><p>Put yourself on the map, so the next traveller finds a buddy right here.</p>' +
        '<div class="actions" style="justify-content:center"><button class="btn accent" data-action="me">' + I.plus + 'Add my card</button><button class="btn ghost" data-action="zoomout">Zoom out</button></div></div>';
    } else {
      var word = n === 1 ? 'foiler' : 'foilers';
      h = '<div class="panel-head"><div class="grow"><h2>' + n + ' ' + word + ' around here</h2><p class="quip">' + I.heart + esc(quip) + '</p></div></div>';
      h += '<div class="rows">' + list.slice(0, 60).map(U.row).join('') + '</div>';
      if (n > 60) h += '<p class="muted" style="text-align:center;font-size:13px;margin-top:10px">Zoom in to see everyone.</p>';
    }
    body.innerHTML = h + footer();
  }

  function renderCard() {
    var p = find(state.selected);
    if (!p) { state.view = 'list'; return renderList(); }
    body.innerHTML = '<button class="link-btn back" data-action="back">' + I.back + 'Everyone around here</button>' + U.card(p, { own: p.mine }) + footer();
    body.scrollTop = 0;
  }

  function openProfile(id, opts) {
    var p = find(id); if (!p) return;
    var prev = state.selected;
    state.selected = id; state.view = 'card';
    if (prev && markers[prev]) markers[prev].setIcon(pinIcon(find(prev) || p, false));
    if (markers[id]) markers[id].setIcon(pinIcon(p, true));
    if (halo) { map.removeLayer(halo); halo = null; }
    var pl = U.place(p);
    if (p.type === 'private') halo = L.circle([pl.lat, pl.lng], { radius: CFG.fuzzMeters, className: 'halo', interactive: false }).addTo(map);
    history.replaceState(null, '', '#p=' + encodeURIComponent(id));
    if (!desktop.matches) setSize('half');
    renderCard();
    if (opts && opts.fly) flyToVisible([pl.lat, pl.lng], Math.max(map.getZoom(), p.type === 'private' ? 12 : 13));
    else ensureVisible([pl.lat, pl.lng]);
  }

  function closeProfile() {
    var prev = state.selected;
    state.selected = null; state.view = 'list';
    if (prev && markers[prev] && find(prev)) markers[prev].setIcon(pinIcon(find(prev), false));
    if (halo) { map.removeLayer(halo); halo = null; }
    history.replaceState(null, '', location.pathname + location.search);
    renderList();
  }

  /* Center a point in the part of the map that isn't covered by the sheet. */
  function offsetFor(z) {
    if (desktop.matches) return [0, 0];
    // use the size the sheet is animating to, not its current height
    var H = map.getSize().y, s = size();
    var covered = s === 'full' ? H - 64 : s === 'half' ? H * 0.58 : 132;
    return [0, Math.min(covered, H * 0.6) / 2];
  }
  function flyToVisible(latlng, z) {
    var o = offsetFor(z);
    var pt = map.project(latlng, z).add(o);
    map.flyTo(map.unproject(pt, z), z, { duration: .8 });
  }
  function ensureVisible(latlng) {
    setTimeout(function () {
      var p = map.latLngToContainerPoint(latlng), h = map.getSize().y - (desktop.matches ? 0 : offsetFor()[1] * 2);
      if (p.y > h - 30 || p.y < 110) flyToVisible(latlng, map.getZoom());
    }, 340);
  }

  /* ---------- Me ---------- */
  function renderTopButton() {
    var b = $('btnMe'), u = store.getUser();
    if (!u) { b.className = 'btn'; b.innerHTML = 'Join'; return; }
    if (!state.me) { b.className = 'btn accent'; b.innerHTML = I.plus + 'My card'; return; }
    b.className = 'me-btn'; b.innerHTML = U.avatar(state.me, 'sm') + '<span class="label">My card</span>'; b.setAttribute('aria-label', 'My card');
  }

  function openMe() {
    if (!store.getUser()) return openAuth('join');
    if (!state.me) return openEditor();
    state.view = 'me'; state.selected = null;
    if (halo) { map.removeLayer(halo); halo = null; }
    if (!desktop.matches) setSize('full');
    renderMe();
  }

  function renderMe() {
    var p = state.me;
    if (!p) { state.view = 'list'; return renderList(); }
    var h = '<button class="link-btn back" data-action="back">' + I.back + 'Back to the map</button>';
    if (p.status === 'pending') h += '<div class="notice">' + I.clock + '<span><b>Almost there.</b> Your card shows up on the map after a quick check. Usually within a day.</span></div>';
    if (p.status === 'hidden' || p.status === 'blocked') h += '<div class="notice red">' + I.shield + '<span>Your card is currently not shown on the map. Questions? Get in touch with us.</span></div>';
    if (!p.visible) h += '<div class="notice teal">' + I.eyeOff + '<span>Your card is hidden. Only you can see it.</span></div>';

    h += '<div class="panel-head"><div class="grow"><h2>Where are you?</h2><p class="sub">Your whole card moves with you.</p></div></div>';
    h += '<div class="switch2">' +
      '<button class="' + (p.atAway ? '' : 'on') + '" data-action="go-home"><b>' + I.home + 'Home</b><span>' + esc(p.home.label) + '</span></button>' +
      '<button class="' + (p.atAway ? 'on' : '') + '" data-action="go-away"><b>' + I.plane + 'Away</b><span>' + (p.away ? esc(p.away.label) : 'Set a travel spot') + '</span></button></div>';
    if (p.away) h += '<p style="margin:-6px 0 16px;text-align:right"><button class="link-btn" data-action="edit-away">' + I.edit + 'Change travel spot</button></p>';

    h += U.card(p, { own: true });
    h += partnerBox(p);
    h += '<div class="me-actions"><button class="btn" data-action="edit">' + I.edit + 'Edit card</button>' +
      '<button class="btn ghost" data-action="toggle-visible">' + (p.visible ? I.eyeOff + 'Hide card' : I.eye + 'Show card') + '</button></div>';
    h += '<div class="me-links"><button class="link-btn" data-action="signout">' + I.logout + 'Sign out</button><button class="link-btn" data-action="delete">' + I.trash + 'Delete account</button></div>';
    body.innerHTML = h + footer();
    body.scrollTop = 0;
  }

  /* ---------- Partner program ---------- */
  function shareUrl() { return CFG.siteUrl.replace(/\/$/, ''); }
  function partnerBox(p) {
    if (!state.settings.partnerProgram || p.status !== 'approved') return '';
    var r = state.partnerRequest;
    if (p.isPartner) return '<div class="partner-box"><h4>' + I.verified + 'You\'re a partner</h4><p>Thanks for spreading the word! Your card has the blue check and shows up first in lists.</p></div>';
    if (r && r.status === 'requested') return '<div class="partner-box"><h4>' + I.clock + 'Checking your link</h4><p>We\'ll look at ' + esc(r.link) + ' and add your blue check soon.</p></div>';
    return '<div class="partner-box"><h4>' + I.verified + 'Get the blue check</h4><p>Share We Are Foilers in your Instagram bio, on your website or your school\'s page. ' +
      'Partners get a blue check and show up first.</p><button class="btn small" data-action="partner">' + I.link + 'Become a partner</button></div>';
  }
  function openPartner() {
    var d = openDialog(head('Become a partner') +
      '<div class="dlg-body"><div class="auth-hero"><span class="doodle">' + I.verified + '</span><h3>Spread the stoke</h3><p>Put this link somewhere public, then tell us where.</p></div>' +
      '<div class="field"><span class="label">1. Share this link</span><div class="copy-row"><span>' + esc(shareUrl().replace(/^https?:\/\//, '')) + '</span><button class="btn small soft" data-copy>' + I.copy + 'Copy</button></div>' +
      '<p class="hint">For example in your Instagram bio, your link-in-bio page, or on your school or shop website.</p></div>' +
      '<div class="field"><label for="pLink">2. Where did you put it?</label><input class="input" id="pLink" type="url" placeholder="https://instagram.com/yourhandle" maxlength="300">' +
      '<p class="hint err hidden" id="pErr"></p></div></div>' +
      '<div class="dlg-foot"><button class="btn ghost" data-close>Later</button><button class="btn accent" data-send>' + I.check + 'Send for check</button></div>', 'small');
    if (state.me && state.me.instagram) d.querySelector('#pLink').value = 'https://instagram.com/' + state.me.instagram;
    else if (state.me && state.me.website) d.querySelector('#pLink').value = state.me.website;
    d.querySelector('[data-copy]').addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(shareUrl()) : Promise.reject()).then(function () { toast('Link copied.'); }, function () { toast(shareUrl()); });
    });
    d.querySelector('[data-send]').addEventListener('click', function () {
      var v = d.querySelector('#pLink').value.trim();
      if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
      if (!/^https:\/\/[^\s]+\.[^\s]+/i.test(v)) { var e = d.querySelector('#pErr'); e.textContent = 'Please paste the full link, starting with https://'; e.classList.remove('hidden'); return; }
      store.requestPartner(v).then(function () { d.close(); toast('Thanks! We\'ll check it soon.'); return reload(); }).catch(function (err) { toast(err.message); });
    });
  }

  /* ---------- Claim an automatic entry ---------- */
  function startClaim(id) {
    var p = find(id); if (!p) return;
    state.claim = p;
    if (!store.getUser()) { toast('Create an account first, then your card replaces the automatic one.'); return openAuth('join'); }
    if (state.me) {
      return confirmDlg('Claim ' + esc(p.name) + '?', 'We\'ll replace the automatic entry with your card once we\'ve had a quick look.', 'Claim it')
        .then(function (ok) { if (!ok) { state.claim = null; return; } store.saveMyProfile({ claimOf: p.id }).then(function (m) { state.me = m; state.claim = null; toast('Got it! We\'ll check and merge it.'); }); });
    }
    openEditor();
  }

  /* ---------- Panel actions ---------- */
  body.addEventListener('click', function (e) {
    var row = e.target.closest('.row');
    if (row) return openProfile(row.dataset.id, { fly: true });
    var a = e.target.closest('[data-action]'); if (!a) return;
    var act = a.dataset.action;
    if (act === 'back') { state.view === 'me' && !desktop.matches && setSize('half'); closeProfile(); }
    else if (act === 'report') openReport(a.dataset.id);
    else if (act === 'partner') openPartner();
    else if (act === 'claim') startClaim(a.dataset.id);
    else if (act === 'join') openAuth('join');
    else if (act === 'about') openAbout();
    else if (act === 'me') openMe();
    else if (act === 'zoomout') map.setZoom(Math.max(2, map.getZoom() - 3));
    else if (act === 'edit') openEditor();
    else if (act === 'edit-away') openAway();
    else if (act === 'go-home') setAway(false);
    else if (act === 'go-away') { if (state.me.away) setAway(true); else openAway(); }
    else if (act === 'toggle-visible') store.setVisible(!state.me.visible).then(function (p) { state.me = p; toast(p.visible ? 'Your card is back on the map.' : 'Card hidden. Take your time.'); reload(); });
    else if (act === 'signout') store.signOut();
    else if (act === 'delete') confirmDlg('Delete your account?', 'Your card and all your data are removed for good. This can\'t be undone.', 'Delete everything', true)
      .then(function (ok) { if (ok) store.deleteAccount().then(function () { state.me = null; toast('Account deleted. Hope to see you on the water.'); }); });
  });

  function setAway(on) {
    if (!desktop.matches) setSize('half');
    store.setAtAway(on).then(function (p) {
      state.me = p;
      toast(on ? 'Have fun in ' + p.away.label.split(',')[0] + '! Your card moved with you.' : 'Welcome back home!');
      reload().then(function () { var pl = U.place(p); flyToVisible([pl.lat, pl.lng], 10); });
    });
  }

  /* ---------- Dialog helpers ---------- */
  var dlg = $('dlg');
  function head(title) { return '<div class="dlg-head"><h2>' + title + '</h2><button class="icon-btn" data-close aria-label="Close">' + I.close + '</button></div>'; }
  function openDialog(html, cls) {
    var fresh = dlg.cloneNode(false); dlg.parentNode.replaceChild(fresh, dlg); dlg = fresh; // drop old listeners
    dlg.className = cls || '';
    dlg.innerHTML = '<div class="dlg">' + html + '</div>';
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
    if (!dlg.open) dlg.showModal();
    return dlg;
  }
  function confirmDlg(title, text, ok, danger) {
    return new Promise(function (resolve) {
      var d = openDialog(head(title) + '<div class="dlg-body"><p style="color:var(--ink-2)">' + text + '</p></div>' +
        '<div class="dlg-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn' + (danger ? ' danger' : '') + '" data-ok>' + ok + '</button></div>', 'small');
      var answered = false;
      d.querySelector('[data-ok]').addEventListener('click', function () { answered = true; d.close(); resolve(true); });
      d.addEventListener('close', function () { if (!answered) resolve(false); });
    });
  }
  var toastTimer;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  /* ---------- Auth ---------- */
  function openAuth(mode) {
    var demo = store.mode === 'demo';
    var d = openDialog(head(mode === 'join' ? 'Join' : 'Sign in') +
      '<form class="dlg-body" id="authForm" novalidate>' +
      '<div class="auth-hero"><span class="doodle">' + I.board + '</span><h3>' + (mode === 'join' ? 'Join the crew' : 'Welcome back') + '</h3>' +
      '<p>' + (mode === 'join' ? 'Free, non-profit, no spam.<br>Just foilers finding foilers.' : 'Good to see you again.') + '</p></div>' +
      '<div class="seg" style="margin-bottom:20px"><button type="button" class="' + (mode === 'join' ? 'on' : '') + '" data-mode="join">Join</button><button type="button" class="' + (mode === 'join' ? '' : 'on') + '" data-mode="signin">Sign in</button></div>' +
      '<div class="field"><label for="aEmail">Email</label><input class="input" id="aEmail" type="email" autocomplete="email" required></div>' +
      '<div class="field"><label for="aPass">Password</label><input class="input" id="aPass" type="password" minlength="8" autocomplete="' + (mode === 'join' ? 'new-password' : 'current-password') + '" required>' +
      (mode === 'join' ? '<p class="hint">At least 8 characters.</p>' : '<p class="hint"><button type="button" class="link-btn" data-forgot>Forgot your password?</button></p>') + '</div>' +
      (mode === 'join' ? '<div class="field"><label class="check"><input type="checkbox" id="aTerms"><span>I\'m 18 or older and I accept the <a href="terms.html" target="_blank">Terms</a>. I know this site only connects people and isn\'t responsible for what happens on or off the water.</span></label></div>' : '') +
      (demo ? '<div class="notice teal">' + I.sparkle + '<span><b>Demo mode.</b> Any email and password work. Nothing is sent anywhere.</span></div>' : '') +
      '<p class="hint err hidden" id="aErr"></p>' +
      '<button class="btn block accent" type="submit" style="margin-top:8px">' + (mode === 'join' ? 'Create account' : 'Sign in') + '</button>' +
      '</form>', 'small');
    d.querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { openAuth(b.dataset.mode); }); });
    var forgot = d.querySelector('[data-forgot]');
    if (forgot) forgot.addEventListener('click', function () {
      var em = d.querySelector('#aEmail').value.trim();
      if (!em) return showErr('Enter your email first.');
      store.resetPassword(em).then(function () { toast('Check your inbox for a reset link.'); });
    });
    function showErr(m) { var x = d.querySelector('#aErr'); x.textContent = m; x.classList.remove('hidden'); }
    d.querySelector('#authForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var em = d.querySelector('#aEmail').value.trim(), pw = d.querySelector('#aPass').value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return showErr('Please enter a valid email.');
      if (pw.length < 8) return showErr('Your password needs at least 8 characters.');
      if (mode === 'join' && !d.querySelector('#aTerms').checked) return showErr('Please confirm you\'re 18+ and accept the Terms.');
      (mode === 'join' ? store.signUp(em, pw) : store.signIn(em, pw)).then(function (r) {
        if (r && r.needsConfirm) { d.close(); toast('Almost done: check your inbox to confirm your email.'); return; }
        afterLogin = mode === 'join' ? 'editor' : 'me';
        d.close();
      }).catch(function (err) { showErr(err.message || 'Something went wrong. Please try again.'); });
    });
  }
  var afterLogin = null;

  /* ---------- Location search ---------- */
  function shortLabel(r) {
    var a = r.address || {};
    var place = r.name || a.village || a.town || a.city || a.municipality || a.suburb || a.hamlet || a.county || '';
    var region = a.island || a.country || '';
    if (region === place) region = a.country !== place ? a.country : '';
    var parts = [place, region].filter(Boolean);
    return parts.join(', ') || r.display_name.split(',').slice(0, 2).join(',');
  }
  function geoSearch(q, limit) {
    return fetch(NOMINATIM + '/search?format=jsonv2&addressdetails=1&accept-language=en&limit=' + (limit || 5) + '&q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); });
  }
  function geoReverse(lat, lng) {
    return fetch(NOMINATIM + '/reverse?format=jsonv2&addressdetails=1&zoom=12&accept-language=en&lat=' + lat + '&lon=' + lng)
      .then(function (r) { return r.json(); });
  }

  /* A small location picker used in the editor and the travel dialog. */
  function locationPicker(el, current, onChange, opts) {
    opts = opts || {};
    function render() {
      var v = current();
      if (v) {
        el.innerHTML = '<div class="chosen">' + I.pin + '<span>' + esc(v.label) + '</span><button type="button" data-change>Change</button></div>';
        el.querySelector('[data-change]').addEventListener('click', function () { onChange(null); render(); });
        return;
      }
      el.innerHTML = '<div class="input-row"><input class="input" type="search" placeholder="' + (opts.placeholder || 'Town or spot, e.g. Tarifa') + '" enterkeyhint="search">' +
        '<button type="button" class="btn soft" data-go>' + I.search + '</button></div>' +
        '<div class="results"></div>' +
        '<p class="hint"><button type="button" class="link-btn" data-here>' + I.locate + 'Use my current location</button></p>';
      var input = el.querySelector('input'), res = el.querySelector('.results');
      function go() {
        var q = input.value.trim(); if (q.length < 2) return;
        res.innerHTML = '<p class="hint">Searching…</p>';
        geoSearch(q, 5).then(function (list) {
          if (!list.length) { res.innerHTML = '<p class="hint">Nothing found. Try a town name.</p>'; return; }
          res.innerHTML = list.map(function (r, i) { return '<button type="button" data-i="' + i + '">' + I.pin + '<span>' + esc(shortLabel(r)) + '<br><small class="muted">' + esc(r.display_name) + '</small></span></button>'; }).join('');
          res.querySelectorAll('[data-i]').forEach(function (b) {
            b.addEventListener('click', function () { var r = list[+b.dataset.i]; onChange({ label: shortLabel(r), lat: +r.lat, lng: +r.lon, exact: true }); render(); });
          });
        }).catch(function () { res.innerHTML = '<p class="hint err">Search is not available right now.</p>'; });
      }
      el.querySelector('[data-go]').addEventListener('click', go);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      el.querySelector('[data-here]').addEventListener('click', function () {
        if (!navigator.geolocation) return;
        res.innerHTML = '<p class="hint">Finding you…</p>';
        navigator.geolocation.getCurrentPosition(function (pos) {
          var lat = pos.coords.latitude, lng = pos.coords.longitude;
          geoReverse(lat, lng).then(function (r) { onChange({ label: shortLabel(r), lat: lat, lng: lng, exact: true }); render(); })
            .catch(function () { onChange({ label: 'My location', lat: lat, lng: lng, exact: true }); render(); });
        }, function () { res.innerHTML = '<p class="hint err">Couldn\'t get your location. Search instead.</p>'; }, { timeout: 10000 });
      });
    }
    render();
  }

  /* ---------- Editor ---------- */
  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = 400, c = document.createElement('canvas'); c.width = s; c.height = s;
        var m = Math.min(img.width, img.height), sx = (img.width - m) / 2, sy = (img.height - m) / 2;
        c.getContext('2d').drawImage(img, sx, sy, m, m, 0, 0, s, s);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', .85));
      };
      img.onerror = reject; img.src = url;
    });
  }

  function openEditor() {
    var isNew = !state.me, claim = isNew ? state.claim : null;
    var dr = JSON.parse(JSON.stringify(state.me || {
      type: 'private', name: '', photo: '', home: null, away: null, atAway: false, disciplines: [], disciplineOther: '',
      openFor: [], gear: [], gearOther: '', kit: [], about: '', instagram: '', whatsapp: '', email: '', website: '', hours: ''
    }));
    if (claim) {
      ['type', 'name', 'disciplines', 'openFor', 'gear', 'kit', 'about', 'instagram', 'website', 'hours'].forEach(function (k) { dr[k] = JSON.parse(JSON.stringify(claim[k] || dr[k])); });
      dr.home = { label: claim.home.label, lat: claim.home.lat, lng: claim.home.lng, exact: true };
      dr.claimOf = claim.id;
    }
    if (!dr.kit) dr.kit = [];
    if (!dr.id) dr.id = 'new-' + Date.now();
    if (!dr.avatarSeed) dr.avatarSeed = dr.id; // keeps the same color blob after saving

    var discChips = C.disciplines.map(function (d) { return '<button type="button" class="chip" data-disc="' + d.id + '">' + d.label + '</button>'; }).join('');
    var openChips = C.openFor.map(function (o) { return '<button type="button" class="chip" data-open="' + o.id + '">' + I[o.icon] + o.label + '</button>'; }).join('');
    var kitChips = C.kit.map(function (k) { return '<button type="button" class="chip" data-kit="' + k.id + '">' + k.label + '</button>'; }).join('');
    var brandChips = C.brands.map(function (b) { return '<button type="button" class="chip" data-brand="' + esc(b) + '">' + esc(b) + '</button>'; }).join('');

    var d = openDialog(head(isNew ? 'Your card' : 'Edit your card') +
      '<div class="dlg-body" id="ed">' +
      (claim ? '<div class="notice teal">' + I.robot + '<span>You\'re claiming <b>' + esc(claim.name) + '</b>. We filled in what we knew. Once we\'ve had a quick look, your card replaces the automatic entry.</span></div>' : '') +
      '<p class="section-title">The basics</p>' +
      '<div class="field"><span class="label">I am</span><div class="seg" id="edType">' +
        C.types.map(function (t) { return '<button type="button" data-type="' + t.id + '">' + (t.id === 'private' ? 'A foiler' : t.id === 'school' ? 'School / rental' : 'A shop') + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="edName" id="edNameLabel">Name or nickname</label><input class="input" id="edName" maxlength="40" autocomplete="nickname"><p class="hint err hidden" data-err="name"></p></div>' +
      '<div class="field"><span class="label">Photo <span class="muted" style="font-weight:600">(optional)</span></span><div class="photo-row"><span id="edAvatar"></span><div class="btns">' +
        '<label class="btn ghost small">' + I.camera + '<span id="edPhotoLbl">Add photo</span><input type="file" accept="image/*" id="edPhoto" class="sr"></label>' +
        '<button type="button" class="btn ghost small hidden" id="edPhotoDel">' + I.trash + 'Remove</button></div></div>' +
        '<p class="hint">No photo? No problem. You get your own color blob.</p></div>' +
      '<div class="field"><span class="label" id="edHomeLabel">Home spot</span><div id="edHome"></div><p class="hint" id="edHomeHint"></p><p class="hint err hidden" data-err="home"></p></div>' +

      '<p class="section-title">On the water</p>' +
      '<div class="field"><span class="label">What do you ride?</span><div class="pick" id="edDisc">' + discChips + '</div>' +
        '<input class="input hidden" id="edDiscOther" placeholder="Which one?" maxlength="30" style="margin-top:10px">' +
        '<div class="levels" id="edLevels"></div><p class="hint err hidden" data-err="disc"></p></div>' +
      '<div class="field"><span class="label">Open for</span><div class="pick" id="edOpen">' + openChips + '</div></div>' +
      '<div class="field"><span class="label"><span id="edKitLabel">Gear</span> <span class="muted" style="font-weight:600">(optional)</span></span><div class="pick" id="edKit">' + kitChips + '</div></div>' +
      '<div class="field"><span class="label"><span id="edBrandLabel">Brands</span> <span class="muted" style="font-weight:600">(optional)</span></span><div class="pick" id="edGear">' + brandChips + '</div>' +
        '<input class="input" id="edGearOther" placeholder="Something else? e.g. a homemade foil" maxlength="40" style="margin-top:10px"></div>' +
      '<div class="field"><label for="edAbout">About you <span class="counter" id="edAboutCount"></span></label><textarea class="input" id="edAbout" maxlength="160" placeholder="Dawn patrol or sunset sessions? Coffee or beer after?"></textarea></div>' +

      '<p class="section-title">Contact</p>' +
      '<div class="notice teal">' + I.lock + '<span>All optional. WhatsApp and email are only visible to signed-in members, never to random visitors.</span></div>' +
      '<div class="field"><label for="edIg">Instagram</label><div class="prefix"><span>@</span><input class="input" id="edIg" maxlength="40" autocapitalize="off" placeholder="yourhandle"></div><p class="hint err hidden" data-err="ig"></p></div>' +
      '<div class="field"><label for="edWa">WhatsApp</label><input class="input" id="edWa" type="tel" placeholder="+49 151 2345678" maxlength="24"><p class="hint err hidden" data-err="wa"></p></div>' +
      '<div class="field"><label for="edMail">Email</label><input class="input" id="edMail" type="email" placeholder="you@example.com" maxlength="120"><p class="hint err hidden" data-err="mail"></p></div>' +
      '<div class="biz"><div class="field"><label for="edWeb">Website</label><input class="input" id="edWeb" type="url" placeholder="https://" maxlength="200"><p class="hint err hidden" data-err="web"></p></div>' +
      '<div class="field"><label for="edHours">Opening hours</label><input class="input" id="edHours" maxlength="80" placeholder="e.g. Daily 9:00 – 18:00"></div></div>' +
      '</div>' +
      '<div class="dlg-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn accent" id="edSave">' + I.check + (isNew ? 'Put me on the map' : 'Save') + '</button></div>');

    var q = function (s) { return d.querySelector(s); };
    var setOn = function (sel, attr, arr) { d.querySelectorAll(sel).forEach(function (b) { b.classList.toggle('on', arr.indexOf(b.dataset[attr]) >= 0); }); };

    function syncType() {
      d.querySelectorAll('[data-type]').forEach(function (b) { b.classList.toggle('on', b.dataset.type === dr.type); });
      var biz = dr.type !== 'private';
      q('#edNameLabel').textContent = biz ? (dr.type === 'school' ? 'School or rental name' : 'Shop name') : 'Name or nickname';
      q('#edKitLabel').textContent = { private: 'Your gear', school: 'Gear for rent', shop: 'Gear you sell or rent' }[dr.type];
      q('#edBrandLabel').textContent = { private: 'Brands you ride', school: 'Brands you use', shop: 'Brands you carry' }[dr.type];
      q('#edHomeLabel').textContent = biz ? 'Address' : 'Home spot';
      q('#edHomeHint').textContent = biz ? 'Shown exactly on the map, so people can find you.' : 'We never show your address. Your pin is moved a little and drawn as a soft circle.';
      q('.biz').classList.toggle('hidden', !biz);
      renderAvatar();
    }
    function renderAvatar() {
      q('#edAvatar').innerHTML = U.avatar({ id: dr.id, avatarSeed: dr.avatarSeed, name: q('#edName').value || '?', type: dr.type, photo: dr.photo }, 'xl');
      q('#edPhotoDel').classList.toggle('hidden', !dr.photo);
      q('#edPhotoLbl').textContent = dr.photo ? 'Change' : 'Add photo';
    }
    function renderLevels() {
      setOn('[data-disc]', 'disc', dr.disciplines.map(function (x) { return x.id; }));
      q('#edDiscOther').classList.toggle('hidden', !dr.disciplines.some(function (x) { return x.id === 'other'; }));
      q('#edLevels').innerHTML = dr.disciplines.map(function (x) {
        var label = x.id === 'other' ? (dr.disciplineOther || 'Other') : U.byId(C.disciplines, x.id).label;
        var btns = C.levels.map(function (l) { return '<button type="button" class="' + (l.id <= x.level ? 'on' : '') + '" data-lvl="' + x.id + ':' + l.id + '" title="' + l.label + ': ' + l.hint + '"><span></span></button>'; }).join('');
        return '<div class="level-row"><b>' + esc(label) + '</b><span class="level-name">' + U.byId(C.levels, x.level).label + '</span><span class="level-pick">' + btns + '</span></div>';
      }).join('');
    }

    // fill
    q('#edName').value = dr.name; q('#edAbout').value = dr.about; q('#edIg').value = dr.instagram; q('#edWa').value = dr.whatsapp;
    q('#edMail').value = dr.email; q('#edWeb').value = dr.website; q('#edHours').value = dr.hours; q('#edGearOther').value = dr.gearOther; q('#edDiscOther').value = dr.disciplineOther;
    var count = function () { q('#edAboutCount').textContent = q('#edAbout').value.length + '/160'; };
    count(); syncType(); renderLevels();
    setOn('[data-open]', 'open', dr.openFor); setOn('[data-brand]', 'brand', dr.gear); setOn('[data-kit]', 'kit', dr.kit);
    locationPicker(q('#edHome'), function () { return dr.home; }, function (v) { dr.home = v; });

    d.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.dataset.type) { dr.type = t.dataset.type; syncType(); }
      else if (t.dataset.disc) {
        var i = dr.disciplines.findIndex(function (x) { return x.id === t.dataset.disc; });
        if (i >= 0) dr.disciplines.splice(i, 1); else dr.disciplines.push({ id: t.dataset.disc, level: 2 });
        renderLevels();
      } else if (t.dataset.lvl) {
        var p = t.dataset.lvl.split(':');
        dr.disciplines.forEach(function (x) { if (x.id === p[0]) x.level = +p[1]; });
        renderLevels();
      } else if (t.dataset.open) { toggle(dr.openFor, t.dataset.open); t.classList.toggle('on'); }
      else if (t.dataset.kit) { toggle(dr.kit, t.dataset.kit); t.classList.toggle('on'); }
      else if (t.dataset.brand) { toggle(dr.gear, t.dataset.brand); t.classList.toggle('on'); }
      else if (t.id === 'edPhotoDel') { dr.photo = ''; renderAvatar(); }
    });
    q('#edName').addEventListener('input', renderAvatar);
    q('#edAbout').addEventListener('input', count);
    q('#edDiscOther').addEventListener('input', function () { dr.disciplineOther = this.value; });
    q('#edPhoto').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      resizeImage(f).then(function (url) { dr.photo = url; renderAvatar(); }).catch(function () { toast('That image didn\'t work. Try another one.'); });
    });

    q('#edSave').addEventListener('click', function () {
      d.querySelectorAll('[data-err]').forEach(function (x) { x.classList.add('hidden'); });
      var errs = [];
      function err(k, m) { var x = d.querySelector('[data-err="' + k + '"]'); x.textContent = m; x.classList.remove('hidden'); errs.push(x); }

      dr.name = q('#edName').value.trim();
      dr.about = q('#edAbout').value.trim();
      dr.gearOther = q('#edGearOther').value.trim();
      dr.disciplineOther = q('#edDiscOther').value.trim();
      dr.instagram = q('#edIg').value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
      dr.whatsapp = q('#edWa').value.replace(/[\s\-()/]/g, '');
      if (/^00/.test(dr.whatsapp)) dr.whatsapp = '+' + dr.whatsapp.slice(2);
      dr.email = q('#edMail').value.trim();
      dr.website = q('#edWeb').value.trim();
      if (dr.website && !/^https?:\/\//i.test(dr.website)) dr.website = 'https://' + dr.website;
      dr.hours = q('#edHours').value.trim();
      if (dr.type === 'private') { dr.website = ''; dr.hours = ''; }

      if (!dr.name) err('name', 'What should people call you?');
      if (!dr.home) err('home', dr.type === 'private' ? 'Pick your home spot.' : 'Pick your address.');
      if (!dr.disciplines.length) err('disc', 'Pick at least one.');
      if (dr.instagram && !/^[A-Za-z0-9._]{1,30}$/.test(dr.instagram)) err('ig', 'That doesn\'t look like an Instagram handle.');
      if (dr.whatsapp && !/^\+[1-9]\d{6,14}$/.test(dr.whatsapp)) err('wa', 'Please use the international format, e.g. +49 151 2345678.');
      if (dr.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dr.email)) err('mail', 'That email doesn\'t look right.');
      if (dr.website && !/^https:\/\/[^\s]+\.[^\s]+$/i.test(dr.website)) err('web', 'Please use a full https:// address.');
      if (errs.length) { errs[0].closest('.field').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

      var data = Object.assign({}, dr); delete data.id; delete data.mine; delete data.status; delete data.demo;
      if (data.type === 'private') delete data.claimOf;
      var btn = q('#edSave'); btn.disabled = true;
      store.saveMyProfile(data).then(function (p) {
        state.me = p; state.claim = null; d.close();
        toast(p.status === 'pending' ? 'Saved! Your card shows up after a quick check.' : (isNew ? 'You\'re on the map! Welcome to the crew.' : 'Saved.'));
        reload().then(function () {
          openMe();
          if (isNew) { var pl = U.place(p); flyToVisible([pl.lat, pl.lng], 10); }
        });
      }).catch(function (e2) { btn.disabled = false; toast(e2.message || 'Saving failed. Please try again.'); });
    });
  }
  function toggle(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }

  /* ---------- Travel spot ---------- */
  function openAway() {
    var cur = state.me.away ? JSON.parse(JSON.stringify(state.me.away)) : null;
    var d = openDialog(head('Off on a trip?') +
      '<div class="dlg-body"><p class="muted" style="margin-bottom:16px">Set where you\'re staying. Your card moves there, and you can switch back home with one tap.</p>' +
      '<div class="field"><span class="label">Travel spot</span><div id="awPick"></div></div>' +
      '<div class="field"><label for="awUntil">Back home <span class="muted" style="font-weight:600">(optional)</span></label><input class="input" id="awUntil" maxlength="40" placeholder="e.g. in March"></div>' +
      (state.me.away ? '<button class="link-btn" data-remove>' + I.trash + 'Remove travel spot</button>' : '') + '</div>' +
      '<div class="dlg-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn accent" data-save>' + I.plane + 'Move my card</button></div>', 'small');
    d.querySelector('#awUntil').value = cur && cur.until || '';
    locationPicker(d.querySelector('#awPick'), function () { return cur; }, function (v) { cur = v; }, { placeholder: 'e.g. Fuerteventura' });
    d.querySelector('[data-save]').addEventListener('click', function () {
      if (!cur) return toast('Pick a travel spot first.');
      cur.until = d.querySelector('#awUntil').value.trim();
      store.saveMyProfile({ away: cur, atAway: true }).then(function (p) { state.me = p; d.close(); setAway(true); });
    });
    var rm = d.querySelector('[data-remove]');
    if (rm) rm.addEventListener('click', function () {
      store.saveMyProfile({ away: null, atAway: false }).then(function (p) { state.me = p; d.close(); toast('Travel spot removed.'); reload(); });
    });
  }

  /* ---------- Report ---------- */
  function openReport(id) {
    var p = find(id); if (!p) return;
    if (p.demo && store.mode !== 'demo') return toast('This is a made-up demo profile. Nothing to report.');
    var reasons = ['Fake or spam', 'Inappropriate content', 'Commercial advertising', 'Something else'];
    var d = openDialog(head('Report ' + esc(p.name)) +
      '<div class="dlg-body"><p class="muted" style="margin-bottom:16px">Thanks for keeping this place friendly. What\'s wrong?</p>' +
      '<div class="radio-list" style="margin-bottom:16px">' + reasons.map(function (r, i) { return '<label><input type="radio" name="rr" value="' + r + '"' + (i ? '' : ' checked') + '>' + r + '</label>'; }).join('') + '</div>' +
      '<div class="field"><label for="rNote">Anything else? <span class="muted" style="font-weight:600">(optional)</span></label><textarea class="input" id="rNote" maxlength="400"></textarea></div></div>' +
      '<div class="dlg-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn" data-send>' + I.flag + 'Send report</button></div>', 'small');
    d.querySelector('[data-send]').addEventListener('click', function () {
      var r = d.querySelector('input[name=rr]:checked').value;
      store.report(id, r, d.querySelector('#rNote').value.trim()).then(function () { d.close(); toast('Thanks! We\'ll take a look.'); });
    });
  }

  /* ---------- About ---------- */
  function openAbout() {
    var qa = [
      ['What is this?', 'A world map of foilers. Wing, pump, prone, kite, downwind, eFoil and everything in between. When you travel, you can see who rides nearby, and maybe get shown the spot, share a session or borrow a wing.'],
      ['Is it free?', 'Yes. It\'s a non-profit community project, not tied to any brand. No ads, no tracking.'],
      ['Who sees where I live?', 'Nobody sees your address. Private foilers only pick a town or home spot, the pin is moved a little and shown as a soft circle. Schools and shops can show their exact address.'],
      ['Who sees my WhatsApp or email?', 'Only signed-in members. Visitors just see your card and your Instagram, if you add it. Every contact field is optional.'],
      ['How does the travel mode work?', 'Save a travel spot and switch between Home and Away with one tap. Your whole card moves with you.'],
      ['Can I hide or delete my card?', 'Any time. Hide it with one tap, or delete your account and everything is gone for good.'],
      ['Who\'s behind this?', 'A few foilers who like meeting other foilers. Sessions are arranged directly between you. We only make the intro.']
    ];
    openDialog(head('About We Are Foilers') +
      '<div class="dlg-body"><div class="auth-hero"><span class="doodle">' + I.foil + '</span><h3>Find your crew, anywhere.</h3><p>' + esc(quip) + '</p></div>' +
      '<div class="faq">' + qa.map(function (x) { return '<h4>' + x[0] + '</h4><p>' + x[1] + '</p>'; }).join('') + '</div>' + contactLinks() + '</div>' +
      '<div class="dlg-foot"><button class="btn accent" data-close>Got it</button></div>');
  }
  $('btnAbout').addEventListener('click', openAbout);
  $('demoBanner').addEventListener('click', function () { toast('Demo mode: every foiler here is made up.'); });

  /* ---------- Search & locate ---------- */
  $('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = $('searchInput').value.trim(); if (!q) return;
    $('searchInput').blur();
    geoSearch(q, 1).then(function (r) {
      if (!r.length) return toast('Couldn\'t find that place. Try a town or spot name.');
      var bb = r[0].boundingbox.map(Number);
      if (state.view !== 'list') closeProfile();
      if (!desktop.matches) setSize('half');
      map.flyToBounds([[bb[0], bb[2]], [bb[1], bb[3]]], { maxZoom: 10, duration: .9, paddingBottomRight: [0, desktop.matches ? 0 : panel.getBoundingClientRect().height] });
    }).catch(function () { toast('Search is not available right now.'); });
  });
  $('btnLocate').addEventListener('click', function () {
    if (!navigator.geolocation) return toast('Your browser can\'t share a location.');
    navigator.geolocation.getCurrentPosition(function (pos) {
      if (state.view !== 'list') closeProfile();
      if (!desktop.matches) setSize('half');
      flyToVisible([pos.coords.latitude, pos.coords.longitude], 9);
    }, function () { toast('Location is blocked. Search for a place instead.'); }, { timeout: 10000 });
  });

  /* ---------- Data ---------- */
  function reload() {
    var signedIn = !!store.getUser();
    return Promise.all([store.listProfiles(), signedIn ? store.getMyProfile() : null, store.getSettings(),
                        signedIn && store.getMyPartnerRequest ? store.getMyPartnerRequest() : null]).then(function (r) {
      state.profiles = r[0]; state.me = r[1]; state.settings = r[2] || {}; state.partnerRequest = r[3];
      // your own card is always visible to you, even while pending or hidden
      if (state.me && !find(state.me.id)) state.profiles.push(Object.assign({}, state.me, { mine: true }));
      renderMarkers(); renderTopButton(); renderPanel();
    });
  }
  function refresh() { renderChips(); renderMarkers(); if (state.view === 'list') renderList(); }

  map.on('moveend', function () { if (state.view === 'list') renderList(); });
  $('btnMe').addEventListener('click', openMe);

  store.onAuth(function (ev) {
    if (ev === 'PASSWORD_RECOVERY') return openNewPassword();
    reload().then(function () {
      if (ev === 'SIGNED_OUT') { state.view = 'list'; renderList(); toast('Signed out. See you on the water!'); }
      if (ev === 'SIGNED_IN') {
        if (state.claim && state.me) startClaim(state.claim.id);
        else if (state.me) openMe();
        else openEditor();
        afterLogin = null;
      }
    });
  });

  function openNewPassword() {
    var d = openDialog(head('Set a new password') + '<div class="dlg-body"><div class="field"><label for="npw">New password</label>' +
      '<input class="input" id="npw" type="password" minlength="8" autocomplete="new-password"><p class="hint">At least 8 characters.</p></div></div>' +
      '<div class="dlg-foot"><button class="btn accent" data-save>Save password</button></div>', 'small');
    d.querySelector('[data-save]').addEventListener('click', function () {
      var pw = d.querySelector('#npw').value;
      if (pw.length < 8) return toast('At least 8 characters, please.');
      store.updatePassword(pw).then(function () { d.close(); toast('Password saved. You\'re signed in.'); reload(); }).catch(function (e) { toast(e.message); });
    });
  }

  function syncFinderHeight() { panel.style.setProperty('--finder-h', ($('finder').offsetHeight + 4) + 'px'); }
  window.addEventListener('resize', function () { syncFinderHeight(); map.invalidateSize(); });
  desktop.addEventListener('change', function () { syncFinderHeight(); setTimeout(function () { map.invalidateSize(); }, 50); });

  if (store.mode === 'demo') $('demoBanner').classList.remove('hidden');
  renderChips();
  function fromHash() {
    var m = location.hash.match(/^#p=(.+)$/);
    if (m && find(decodeURIComponent(m[1]))) { var p = find(decodeURIComponent(m[1])), pl = U.place(p); map.setView([pl.lat, pl.lng], 11, { animate: false }); openProfile(p.id, { fly: true }); }
    else if (location.hash === '#me') openMe();
  }
  window.addEventListener('hashchange', fromHash);
  store.init().then(reload).then(fromHash);
})();
