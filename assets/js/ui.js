/* Shared render helpers for the map page and the admin page. */
(function () {
  'use strict';
  var C = window.CATALOG, I = window.ICONS;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }

  /* Soft gradient "avatars" for cards without a photo. */
  var GRADIENTS = [
    ['#FFD27A', '#5FD3C6', '#18B2A2'],
    ['#B9E6FF', '#C9B6FF', '#7C93F5'],
    ['#FFC9A8', '#FFE08A', '#FF9466'],
    ['#C7F0DB', '#9AD9F5', '#3BA9C9'],
    ['#FFE29A', '#FFB8CB', '#EE8BB0'],
    ['#A8E6CF', '#FFD3B6', '#3FB8AF'],
    ['#D7F2A6', '#8FDCCB', '#2E9E8F']
  ];
  function gradient(id) {
    var g = GRADIENTS[hash(id || 'x') % GRADIENTS.length];
    return 'radial-gradient(circle at 28% 22%, ' + g[0] + ', transparent 58%), radial-gradient(circle at 78% 82%, ' + g[1] + ', transparent 62%), ' + g[2];
  }
  function initial(name) { var n = String(name || '?').trim(); return esc((Array.from(n)[0] || '?').toUpperCase()); }

  function avatar(p, size) {
    var cls = 'avatar t-' + p.type + (size ? ' ' + size : '');
    var check = p.isPartner ? '<i class="verified" title="We Are Foilers partner">' + I.verified + '</i>' : '';
    if (p.photo) return '<span class="' + cls + '" style="background-image:url(\'' + esc(String(p.photo).replace(/['"()\\\s]/g, '')) + '\')">' + check + '</span>';
    return '<span class="' + cls + '" style="background:' + gradient(p.avatarSeed || p.id) + '">' + initial(p.name) + check + '</span>';
  }

  function place(p) { return p.atAway && p.away ? p.away : p.home; }
  function typeLabel(p) { var t = byId(C.types, p.type); return t ? t.label : ''; }

  function dots(level) {
    var out = '';
    for (var i = 1; i <= 4; i++) out += '<span class="dot' + (i <= level ? ' on' : '') + '"></span>';
    return out;
  }
  function discLabel(d, p) {
    if (d.id === 'other') return esc(p.disciplineOther || 'Other');
    var x = byId(C.disciplines, d.id); return x ? x.label : esc(d.id);
  }
  function levelLabel(l) { var x = byId(C.levels, l); return x ? x.label : ''; }

  function openTag(id) {
    var o = byId(C.openFor, id); if (!o) return '';
    return '<span class="tag">' + (I[o.icon] || '') + o.label + '</span>';
  }

  function locLine(p) {
    var here = place(p);
    if (p.atAway && p.away) {
      return '<p class="loc travel">' + I.plane + '<span>Now in ' + esc(p.away.label) + '</span></p>' +
        '<p class="loc">' + I.home + '<span>Home: ' + esc(p.home.label) + (p.away.until ? ' · back ' + esc(p.away.until.replace(/^back\s+/i, '')) : '') + '</span></p>';
    }
    return '<p class="loc">' + I.pin + esc(here.label) + '</p>';
  }

  function waLink(n) { return 'https://wa.me/' + String(n).replace(/[^\d]/g, ''); }
  function igLink(h) { return 'https://instagram.com/' + encodeURIComponent(String(h).replace(/^@/, '')); }

  /* The full "quartet card". opts: { own: bool } */
  function card(p, opts) {
    opts = opts || {};
    var pill = p.atAway && p.away ? '<span class="pill away">' + I.plane + 'Traveling</span>'
      : '<span class="pill t-' + p.type + '">' + (p.type === 'private' ? 'Local' : typeLabel(p)) + '</span>';
    var h = '<article class="card" data-id="' + esc(p.id) + '">';
    h += '<div class="card-top">' + avatar(p, 'lg') + '<div class="who"><div class="name-row"><h3>' + esc(p.name) + '</h3>' + pill + '</div>' + locLine(p) + '</div></div>';

    if (p.disciplines && p.disciplines.length) {
      h += '<div class="stats">';
      p.disciplines.forEach(function (d) {
        h += '<div class="stat"><span>' + discLabel(d, p) + '</span><span class="lvl"><small>' + levelLabel(d.level) + '</small>' + dots(d.level) + '</span></div>';
      });
      h += '</div>';
    }
    if (p.openFor && p.openFor.length) h += '<div class="tags">' + p.openFor.map(openTag).join('') + '</div>';

    var kit = (p.kit || []).map(function (id) { var k = byId(C.kit, id); return k ? k.label : id; });
    if (kit.length) h += '<p class="gear">' + I.board + '<span>' + ({ private: 'Gear: ', school: 'Rents ', shop: 'Sells & rents ' }[p.type] || '') +
      esc((p.type === 'private' ? kit.join(' · ') : kit.join(' · ').toLowerCase().replace(/efoils/, 'eFoils'))) + '</span></p>';
    var gear = (p.gear || []).slice(); if (p.gearOther) gear.push(p.gearOther);
    if (gear.length) h += '<p class="gear">' + I.foil + '<span>' + (p.type === 'private' ? 'Rides ' : 'Brands: ') + gear.map(esc).join(' · ') + '</span></p>';
    if (p.about) h += p.isAuto ? '<p class="about">' + esc(p.about) + '</p>' : '<p class="about">“' + esc(p.about) + '”</p>';
    if (p.type !== 'private' && p.hours) h += '<p class="gear">' + I.clock + '<span>' + esc(p.hours) + '</span></p>';

    var a = '';
    if (p.instagram) a += '<a class="btn" href="' + igLink(p.instagram) + '" target="_blank" rel="noopener">' + I.ig + 'Instagram</a>';
    if (p.website) a += '<a class="btn ghost" href="' + esc(p.website) + '" target="_blank" rel="noopener">' + I.globe + 'Website</a>';
    if (p.whatsapp) a += '<a class="btn ghost" href="' + waLink(p.whatsapp) + '" target="_blank" rel="noopener">' + I.chat + 'WhatsApp</a>';
    if (p.email) a += '<a class="btn ghost" href="mailto:' + esc(p.email) + '">' + I.mail + 'Email</a>';
    if (p.contactHidden) a += '<button class="btn ghost locked" data-action="join">' + I.lock + 'WhatsApp & email for members</button>';
    if (a) h += '<div class="actions">' + a + '</div>';

    if (p.isAuto) {
      h += '<div class="auto-note">' + I.robot + '<span>Added automatically from public info, so travellers can find this ' + (p.type === 'school' ? 'school' : 'shop') +
        '. <button class="link-btn strong" data-action="claim" data-id="' + esc(p.id) + '">Is this yours? Claim it</button></span></div>';
    }
    if (!opts.own) {
      var tagLeft = p.demo ? '<span class="demo-tag">Demo profile</span>' : p.isPartner ? '<span class="partner-tag">' + I.verified + 'Partner</span>' : '<span></span>';
      h += '<div class="card-foot">' + tagLeft +
        '<button class="link-btn" data-action="report" data-id="' + esc(p.id) + '">' + I.flag + 'Report</button></div>';
    }
    return h + '</article>';
  }

  /* Compact row for lists */
  function row(p) {
    var here = place(p);
    var discs = (p.disciplines || []).slice(0, 3).map(function (d) { return discLabel(d, p); }).join(' · ');
    return '<button class="row" data-id="' + esc(p.id) + '">' + avatar(p, 'sm') +
      '<span class="row-main"><span class="row-name">' + esc(p.name) +
      (p.atAway && p.away ? '<span class="mini-badge">' + I.plane + '</span>' : '') +
      (p.type !== 'private' ? '<span class="mini-pill t-' + p.type + '">' + typeLabel(p) + '</span>' : '') +
      '</span><span class="row-sub">' + esc(here.label) + '</span><span class="row-disc">' + discs + '</span></span>' +
      '<span class="row-icons">' + (p.openFor || []).slice(0, 3).map(function (id) { var o = byId(C.openFor, id); return o ? '<i title="' + o.label + '">' + I[o.icon] + '</i>' : ''; }).join('') + '</span></button>';
  }

  window.UI = { esc: esc, byId: byId, avatar: avatar, gradient: gradient, initial: initial, card: card, row: row, place: place, typeLabel: typeLabel, dots: dots };
})();
