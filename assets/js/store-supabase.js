/*
 * Supabase store: same interface as store-demo.js, talks to the real database.
 * Used as soon as config.js has supabaseUrl + supabaseAnonKey.
 * All writes go through the database functions in supabase/schema.sql.
 */
(function () {
  'use strict';

  var PUBLIC_COLS = 'id,type,name,avatar_seed,photo_path,home_label,home_lat,home_lng,away_label,away_lat,away_lng,away_until,at_away,' +
    'disciplines,discipline_other,open_for,gear,gear_other,kit,about,instagram,website,hours,is_partner,is_auto,has_contact,created_at';
  var MEMBER_COLS = PUBLIC_COLS + ',whatsapp,email';

  window.createSupabaseStore = function (cfg) {
    var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    var user = null, listeners = [], explicitLogin = false, settingsCache = null;
    function emit(ev) { listeners.forEach(function (cb) { cb(ev, user); }); }
    function fail(r) { if (r.error) throw new Error(friendly(r.error.message)); return r.data; }
    function friendly(m) {
      if (/Invalid login/i.test(m)) return 'Email or password is wrong.';
      if (/Email not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox.';
      if (/already registered/i.test(m)) return 'This email already has an account. Try signing in.';
      if (/rate limit/i.test(m)) return 'Too many attempts. Please wait a moment.';
      return m;
    }

    function photoUrl(path) { return path ? sb.storage.from('photos').getPublicUrl(path).data.publicUrl : ''; }

    function fromRow(r) {
      return {
        id: r.id, type: r.type, name: r.name, avatarSeed: r.avatar_seed || '', photoPath: r.photo_path || '', photo: photoUrl(r.photo_path),
        home: { label: r.home_label, lat: r.home_lat, lng: r.home_lng },
        away: r.away_lat != null ? { label: r.away_label, lat: r.away_lat, lng: r.away_lng, until: r.away_until || '' } : null,
        atAway: !!r.at_away, disciplines: r.disciplines || [], disciplineOther: r.discipline_other || '',
        openFor: r.open_for || [], gear: r.gear || [], gearOther: r.gear_other || '', kit: r.kit || [], about: r.about || '',
        instagram: r.instagram || '', website: r.website || '', hours: r.hours || '',
        whatsapp: r.whatsapp || '', email: r.email || '', contactHidden: !user && !!r.has_contact,
        isPartner: !!r.is_partner, isAuto: !!r.is_auto, sourceUrl: r.source_url || '',
        visible: r.visible !== false, status: r.status || 'approved', claimOf: r.claim_of || null,
        createdAt: (r.created_at || '').slice(0, 10)
      };
    }

    function getSettings() {
      return sb.from('settings').select('key,value').then(function (r) {
        var s = { manualApproval: true, showDemo: false, partnerProgram: !!cfg.partnerProgram };
        (fail(r) || []).forEach(function (x) {
          if (x.key === 'manual_approval') s.manualApproval = x.value === true;
          if (x.key === 'show_demo') s.showDemo = x.value === true;
          if (x.key === 'partner_program') s.partnerProgram = x.value === true;
        });
        settingsCache = s; return s;
      });
    }

    function demoProfiles() {
      return (window.WAF_DEMO ? window.WAF_DEMO.profiles() : []).filter(function (p) { return p.status === 'approved'; })
        .map(function (p) { if (!user) { p.contactHidden = !!(p.whatsapp || p.email); p.whatsapp = ''; p.email = ''; } return p; });
    }

    /* Resize happens in the browser (app.js). Here: upload data URL to photos/<uid>/<time>.jpg */
    function uploadPhoto(dataUrl) {
      return fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (blob) {
        var path = user.id + '/' + Date.now() + '.jpg';
        return sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false }).then(function (r) { fail(r); return path; });
      });
    }
    function removePhoto(path) { return path ? sb.storage.from('photos').remove([path]).then(function () {}) : Promise.resolve(); }

    function rpcOne(fn, args) {
      return sb.rpc(fn, args).then(function (r) { var d = fail(r); var row = Array.isArray(d) ? d[0] : d; return row ? fromRow(row) : null; });
    }

    var store = {
      mode: 'live',
      init: function () {
        sb.auth.onAuthStateChange(function (ev, session) {
          var before = user && user.id;
          user = session ? session.user : null;
          if (ev === 'PASSWORD_RECOVERY') return emit('PASSWORD_RECOVERY');
          if (ev === 'SIGNED_OUT') return emit('SIGNED_OUT');
          if (ev === 'SIGNED_IN' && (explicitLogin || !before) && user) {
            // explicit sign-in, or arriving from the confirmation email
            var fromEmail = /type=(signup|magiclink|invite)/.test(location.hash) || /code=/.test(location.search);
            if (explicitLogin || fromEmail) { explicitLogin = false; return emit('SIGNED_IN'); }
          }
          if (ev === 'USER_UPDATED') emit('CHANGED');
        });
        return sb.auth.getSession().then(function (r) { user = r.data.session ? r.data.session.user : null; });
      },
      getUser: function () { return user; },
      onAuth: function (cb) { listeners.push(cb); },
      signUp: function (email, password) {
        return sb.auth.signUp({ email: email, password: password, options: { emailRedirectTo: location.origin + location.pathname } })
          .then(function (r) { var d = fail(r); if (d.session) { explicitLogin = true; user = d.session.user; emit('SIGNED_IN'); return { needsConfirm: false }; } return { needsConfirm: true }; });
      },
      signIn: function (email, password) {
        explicitLogin = true;
        return sb.auth.signInWithPassword({ email: email, password: password }).then(function (r) { if (r.error) explicitLogin = false; fail(r); return { needsConfirm: false }; });
      },
      signOut: function () { return sb.auth.signOut().then(function () {}); },
      resetPassword: function (email) { return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(fail); },
      updatePassword: function (pw) { return sb.auth.updateUser({ password: pw }).then(fail); },
      getSettings: getSettings,

      listProfiles: function () {
        return Promise.all([sb.from('profiles').select(user ? MEMBER_COLS : PUBLIC_COLS).limit(5000), settingsCache ? Promise.resolve(settingsCache) : getSettings()])
          .then(function (r) {
            var list = (fail(r[0]) || []).map(fromRow);
            return r[1].showDemo ? list.concat(demoProfiles()) : list;
          });
      },

      getMyProfile: function () { return user ? rpcOne('my_profile') : Promise.resolve(null); },

      saveMyProfile: function (data) {
        var d = Object.assign({}, data);
        return store.getMyProfile().then(function (cur) {
          var oldPath = cur && cur.photoPath;
          var step = Promise.resolve();
          if (typeof d.photo === 'string' && d.photo.indexOf('data:') === 0) {
            step = uploadPhoto(d.photo).then(function (path) { d.photoPath = path; if (oldPath) removePhoto(oldPath); });
          } else if (d.photo === '' && oldPath) {
            d.photoPath = ''; step = removePhoto(oldPath);
          }
          return step.then(function () {
            delete d.photo; delete d.contactHidden; delete d.isPartner; delete d.isAuto; delete d.status; delete d.visible; delete d.createdAt;
            ['home', 'away'].forEach(function (k) { if (d[k] && !d[k].exact) delete d[k].exact; });
            return rpcOne('save_my_profile', { p: d });
          });
        });
      },
      setAtAway: function (on) { return rpcOne('save_my_profile', { p: { atAway: !!on } }); },
      setVisible: function (v) { return rpcOne('set_my_visible', { v: !!v }); },
      deleteAccount: function () {
        return store.getMyProfile().then(function (p) { return p && p.photoPath ? removePhoto(p.photoPath) : null; })
          .then(function () { return sb.rpc('delete_my_account'); }).then(fail)
          .then(function () { return sb.auth.signOut(); }).then(function () {});
      },

      report: function (id, reason, note) {
        if (/^demo-/.test(id)) return Promise.resolve();
        return sb.rpc('report_profile', { pid: id, reason: reason, note: note || '' }).then(fail);
      },

      requestPartner: function (link) { return sb.rpc('request_partner', { link: link }).then(fail); },
      getMyPartnerRequest: function () {
        return user ? sb.rpc('my_partner_request').then(function (r) { var d = fail(r); return d && d[0] ? { link: d[0].link, status: d[0].status } : null; }) : Promise.resolve(null);
      },

      admin: {
        isAdmin: function () { return user ? sb.rpc('is_admin').then(fail) : Promise.resolve(false); },
        overview: function () {
          return sb.rpc('admin_overview').then(fail).then(function (o) {
            var s = o.settings || {};
            return {
              profiles: (o.profiles || []).map(fromRow),
              reports: (o.reports || []).map(function (r) { return { id: r.id, profileId: r.profile_id, reason: r.reason, note: r.note, at: r.created_at, open: r.open }; }),
              partners: (o.partners || []).map(function (x) { return { profileId: x.profile_id, link: x.link, status: x.status, at: x.created_at }; }),
              settings: { manualApproval: s.manual_approval === true, showDemo: s.show_demo === true, partnerProgram: s.partner_program === true }
            };
          });
        },
        decide: function (id, status) { return sb.rpc('admin_decide', { pid: id, new_status: status }).then(fail); },
        setPartner: function (id, on) { return sb.rpc('admin_set_partner', { pid: id, on_off: !!on }).then(fail); },
        closeReport: function (rid) { return sb.rpc('admin_close_report', { rid: rid }).then(fail); },
        setSetting: function (key, value) {
          var k = { manualApproval: 'manual_approval', showDemo: 'show_demo', partnerProgram: 'partner_program' }[key];
          return sb.rpc('admin_set_setting', { k: k, v: value }).then(fail).then(getSettings);
        }
      }
    };
    return store;
  };
})();
