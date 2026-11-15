/*
 * Demo store: runs completely in the browser. Used while config.js has no Supabase keys.
 * All sample foilers, schools and shops below are made up. Your own card, reports and
 * admin decisions are kept in this browser (localStorage) so you can try every flow.
 *
 * store-supabase.js will expose exactly the same interface.
 */
(function () {
  'use strict';

  /* [id, type, name, home [label, lat, lng], disciplines "id:level,...", openFor, gear, about, extra] */
  var SEEDS = [
    ['mara', 'private', 'Mara', ['El Médano, Tenerife', 28.052, -16.528], 'wing:3,prone:2,downwind:1', 'session-buddy,show-spots,lend-gear', 'Axis,Duotone',
      'Dawn patrol person. Will trade coffee for a downwind shuttle.', { ig: 'mara.foils', wa: '+34600000001', away: ['Corralejo, Fuerteventura', 28.715, -13.872, 'in March'] }],
    ['medano-wing-school', 'school', 'Médano Wing School', ['El Médano, Tenerife', 28.0447, -16.5383], 'wing:4,sup:3,efoil:3', 'beginner-tips,lend-gear', 'Duotone,F-One',
      'Lessons for every level. First flight guaranteed, dignity not.', { web: 'https://example.com', hours: 'Daily 10:00 – 18:00', mail: 'hello@example.com', partner: true }],
    ['jonas', 'private', 'Jonas', ['Sylt, Germany', 54.905, 8.322], 'wing:2,kite:3', 'session-buddy,ride-share', 'F-One',
      'North Sea, cold water, warm heart.', { ig: 'jonas_on_foil' }],
    ['lucia', 'private', 'Lucía', ['Tarifa, Spain', 36.031, -5.618], 'kite:4,wing:3,downwind:2', 'show-spots,coffee', 'Duotone,North',
      'Levante or Poniente, I\'m out.', { ig: 'lucia.tarifa', mail: 'lucia@example.com' }],
    ['tarifa-foil-rentals', 'shop', 'Strait Foil Rentals', ['Tarifa, Spain', 36.0128, -5.6031], 'wing:4,kite:4,efoil:3', 'lend-gear,beginner-tips', 'Duotone,Naish,Fliteboard',
      'Wings, boards and foils by the day or week. Wetsuits too, because the Atlantic.', { web: 'https://example.com', hours: 'Mar – Nov, 9:30 – 19:00' }],
    ['matteo', 'private', 'Matteo', ['Torbole, Lake Garda', 45.876, 10.882], 'wing:3,pump:2', 'session-buddy,coffee', 'Sabfoil,Indiana',
      'Ora starts at 1 pm. Espresso at 12:55.', { ig: 'matteo.gardafoil', wa: '+39300000002' }],
    ['garda-foil-center', 'school', 'Lakeside Foil Club', ['Riva del Garda, Italy', 45.884, 10.846], 'wing:4,windfoil:3,efoil:3', 'beginner-tips,lend-gear', 'Sabfoil,Starboard',
      'Wing and windfoil courses on the friendliest wind in the Alps.', { web: 'https://example.com', hours: 'Apr – Oct, 9:00 – 18:00' }],
    ['kai', 'private', 'Kai', ['Kahului, Maui', 20.905, -156.452], 'prone:4,downwind:4,wing:4', 'downwind-shuttle,show-spots', 'Armstrong,Go Foil',
      'Maliko run shuttle on Tuesdays. Bring snacks.', { ig: 'kai.glides' }],
    ['sam', 'private', 'Sam', ['Hood River, Oregon', 45.718, -121.534], 'wing:3,downwind:3', 'downwind-shuttle,ride-share', 'Cabrinha,Slingshot',
      'Gorge downwinders. Swell or no swell.', { ig: 'samgorge', partner: true }],
    ['gorge-board-shack', 'shop', 'Gorge Board Shack', ['Hood River, Oregon', 45.7095, -121.5149], 'wing:4,prone:3,sup:3', 'lend-gear', 'Slingshot,Cabrinha,Armstrong',
      'Demo gear, repairs and very honest advice.', { web: 'https://example.com', hours: 'Daily 9:00 – 18:00' }],
    ['thandi', 'private', 'Thandi', ['Big Bay, Cape Town', -33.795, 18.47], 'kite:3,wing:2,prone:2', 'session-buddy,show-spots', 'North,Duotone',
      'Big Bay regular. The Cape Doctor is my alarm clock.', { ig: 'thandi.flies' }],
    ['pieter', 'private', 'Pieter', ['Brouwersdam, Netherlands', 51.765, 3.875], 'wing:2,windfoil:3', 'session-buddy,coffee', 'Starboard',
      'Flat water, strong opinions about stroopwafels.', {}],
    ['freya', 'private', 'Freya', ['Klitmøller, Denmark', 57.035, 8.495], 'prone:3,wing:3', 'show-spots,coffee', 'Axis',
      'Cold Hawaii, warm coffee.', { ig: 'freya.coldhawaii' }],
    ['tom', 'private', 'Tom', ['Kiel, Germany', 54.36, 10.16], 'pump:3,foil-assist:2', 'session-buddy,beginner-tips', 'Takuma,Unifoil',
      'Dock start addict. Ask me about my 1 km pump.', { ig: 'tom.pumps' }],
    ['ana', 'private', 'Ana', ['Ericeira, Portugal', 38.972, -9.405], 'prone:3,sup:2', 'show-spots', 'Lift,Axis',
      'Surfer gone foil. Still apologising to my old longboard.', {}],
    ['algarve-efoil', 'shop', 'Sunny Side eFoil', ['Lagos, Portugal', 37.098, -8.668], 'efoil:4', 'lend-gear,beginner-tips', 'Fliteboard,Waydoo',
      'eFoil rides and lessons. No wind, no problem.', { web: 'https://example.com', hours: 'Daily 10:00 – 17:00' }],
    ['chloe', 'private', 'Chloé', ['Hyères, France', 43.065, 6.13], 'wing:2,kite:2', 'session-buddy,ride-share', 'F-One',
      'Almanarre crew. Still learning to jibe, still smiling.', { ig: 'chloe.almanarre' }],
    ['marco', 'private', 'Marco', ['Porto Pollo, Sardinia', 41.17, 9.325], 'wing:3,windfoil:3', 'show-spots,lend-gear', 'Gong,Starboard',
      'Mistral season is my favourite season.', {}],
    ['niko', 'private', 'Niko', ['Port de Pollença, Mallorca', 39.86, 3.1], 'pump:2,wing:1', 'session-buddy,coffee', 'Gong',
      'Beginner and proud. Looking for patient people.', { ig: 'niko.learns' }],
    ['bruno', 'private', 'Bruno', ['Jericoacoara, Brazil', -2.795, -40.525], 'kite:4,wing:3', 'show-spots,downwind-shuttle', 'North,Cabrinha',
      'Wind every day. I am not complaining.', { ig: 'bruno.jeri' }],
    ['liam', 'private', 'Liam', ['Manly, Sydney', -33.79, 151.275], 'prone:3,pump:3,downwind:2', 'session-buddy,show-spots', 'Armstrong',
      'Bumps, bluebottles and banter.', { ig: 'liam.manly' }],
    ['mia', 'private', 'Mia', ['Fremantle, Perth', -32.045, 115.765], 'wing:3,downwind:3', 'downwind-shuttle,ride-share', 'Duotone,Code Foils',
      'The Fremantle Doctor arrives at 2. So do I.', {}],
    ['made', 'private', 'Made', ['Sanur, Bali', -8.68, 115.255], 'prone:3,efoil:2', 'show-spots,coffee', 'Lift',
      'Reef breaks at dawn, nasi goreng after.', { ig: 'made.sanur' }],
    ['nina', 'private', 'Nina', ['Konstanz, Lake Constance', 47.675, 9.185], 'wing:2,pump:2', 'session-buddy', 'Indiana',
      'Lake foiler. Waiting for wind since 2021.', {}],
    ['simon', 'private', 'Simon', ['Silvaplana, Switzerland', 46.455, 9.8], 'kite:3,wing:3', 'session-buddy,ride-share', 'Ozone,F-One',
      'Maloja wind, frozen toes, zero regrets.', { ig: 'simon.engadin' }],
    ['lea', 'private', 'Léa', ['Le Morne, Mauritius', -20.46, 57.33], 'kite:4,wing:2', 'show-spots,lend-gear', 'North',
      'One Eye is my backyard. Happy to show you around (from a safe distance).', {}],
    ['hugo', 'private', 'Hugo', ['Santa Cruz, California', 36.955, -122.035], 'prone:4,tow:3,pump:3', 'session-buddy', 'Axis,Go Foil',
      'Kelp dodger. Tow partner wanted.', { ig: 'hugo.cruz' }],
    ['dani', 'private', 'Dani', ['Jupiter, Florida', 26.94, -80.085], 'downwind:3,prone:3', 'downwind-shuttle,coffee', 'Code Foils',
      'Gulf Stream bumps and snacks. Mostly snacks.', {}],
    ['dakhla-camp', 'school', 'Lagoon Foil Camp', ['Dakhla, Morocco', 23.78, -15.935], 'kite:4,wing:4,downwind:3', 'beginner-tips,lend-gear,show-spots', 'Duotone,F-One',
      'Flat lagoon, steady wind, tea with too much sugar.', { web: 'https://example.com', hours: 'All year, 9:00 – 18:00' }],
    ['linh', 'private', 'Linh', ['Mũi Né, Vietnam', 10.955, 108.27], 'kite:3,wing:2', 'session-buddy,show-spots', 'Ozone',
      'Winter wind season = best season.', { ig: 'linh.muine' }],
    ['aroha', 'private', 'Aroha', ['Raglan, New Zealand', -37.805, 174.875], 'prone:3,wing:2', 'show-spots,coffee', 'Lift,Axis',
      'Left-hand point breaks and very long paddle-outs.', {}],
    ['ole', 'private', 'Ole', ['Sotavento, Fuerteventura', 28.14, -14.23], 'wing:3,windfoil:2', 'session-buddy,lend-gear', 'Starboard',
      'Lagoon days and sunset sessions. Spare 5 m wing if you need it.', { ig: 'ole.sotavento' }],
    ['sophie', 'private', 'Sophie', ['Wannsee, Berlin', 52.44, 13.175], 'pump:2,wake:2', 'session-buddy', 'Takuma',
      'City pumper. Lakes count too.', {}],
    ['felix', 'private', 'Felix', ['Hamburg, Germany', 53.56, 9.98], 'wing:2,kite:2', 'session-buddy,ride-share,coffee', 'North',
      'Escaping the Hamburg drizzle.', { away: ['Tarifa, Spain', 36.04, -5.63, 'early December'], ig: 'felix.escapes' }],
    /* Waiting for approval (visible in the admin page only) */
    ['rookie-rick', 'private', 'Rick', ['Brighton, UK', 50.82, -0.14], 'wing:1', 'session-buddy', '',
      'Two sessions in. Mostly swimming. Send help.', { status: 'pending' }],
    ['foil-paradise', 'shop', 'Foil Paradise Store', ['Cabarete, Dominican Republic', 19.755, -70.41], 'kite:4,wing:3', 'lend-gear', 'Cabrinha',
      'Kite and wing gear, lessons, rentals.', { status: 'pending', web: 'https://example.com' }]
  ];

  var K = { user: 'waf.demo.user.v1', mine: 'waf.demo.mine.v1', reports: 'waf.demo.reports.v1', status: 'waf.demo.status.v1', settings: 'waf.demo.settings.v1',
            partner: 'waf.demo.partner.v1', partnerFlags: 'waf.demo.partnerflags.v1' };
  var mem = {};
  function get(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return mem[k] || null; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }
  function del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* Demo gear, derived from what someone rides. Schools and shops also get wetsuits. */
  var KIT_BY_DISC = { wing: ['wings', 'foils', 'boards'], pump: ['foils', 'boards'], prone: ['foils', 'boards'], kite: ['kites', 'foils', 'boards'],
    downwind: ['foils', 'boards'], parawing: ['parawings', 'foils', 'boards'], 'foil-assist': ['foil-drives', 'foils', 'boards'],
    efoil: ['efoils'], sup: ['foils', 'boards'], windfoil: ['sails', 'foils', 'boards'], wake: ['foils', 'boards'], tow: ['foils', 'boards'] };
  function kitFor(disc, type) {
    var out = [];
    disc.split(',').forEach(function (d) { (KIT_BY_DISC[d.split(':')[0]] || []).forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); }); });
    if (type !== 'private') out.push('wetsuits');
    return out;
  }

  function seedProfile(s) {
    var x = s[8] || {};
    var p = {
      id: 'demo-' + s[0], type: s[1], name: s[2],
      home: { label: s[3][0], lat: s[3][1], lng: s[3][2] },
      away: x.away ? { label: x.away[0], lat: x.away[1], lng: x.away[2], until: x.away[3] || '' } : null,
      atAway: !!x.away,
      disciplines: s[4].split(',').map(function (d) { var a = d.split(':'); return { id: a[0], level: +a[1] }; }),
      disciplineOther: '',
      openFor: s[5] ? s[5].split(',') : [],
      gear: s[6] ? s[6].split(',') : [], gearOther: '', kit: kitFor(s[4], s[1]),
      about: s[7], photo: '',
      instagram: x.ig || '', website: x.web || '', hours: x.hours || '',
      whatsapp: x.wa || '', email: x.mail || '',
      isPartner: !!x.partner, visible: true, status: x.status || 'approved', demo: true, createdAt: '2026-11-01'
    };
    return p;
  }

  /* Move a point randomly by up to `meters`, so the real place can't be read off the map. */
  function fuzz(lat, lng, meters) {
    var r = meters * Math.sqrt(Math.random()), a = Math.random() * 2 * Math.PI;
    var dLat = (r * Math.cos(a)) / 111320;
    var dLng = (r * Math.sin(a)) / (111320 * Math.cos(lat * Math.PI / 180));
    return { lat: +(lat + dLat).toFixed(5), lng: +(lng + dLng).toFixed(5) };
  }

  /* The demo foilers are also shown in live mode while the admin switch "Show demo profiles" is on. */
  window.WAF_DEMO = { profiles: function () { return SEEDS.map(seedProfile); } };

  window.createDemoStore = function (cfg) {
    var user = get(K.user);
    var listeners = [];
    function emit(ev) { listeners.forEach(function (cb) { cb(ev, user); }); }

    function settings() { return Object.assign({ manualApproval: !!cfg.manualApproval, showDemo: true, partnerProgram: !!cfg.partnerProgram }, get(K.settings) || {}); }
    function statusOverrides() { return get(K.status) || {}; }

    function allProfiles() {
      var ov = statusOverrides();
      var pf = get(K.partnerFlags) || {};
      var list = SEEDS.map(seedProfile).map(function (p) { if (ov[p.id]) p.status = ov[p.id]; if (p.id in pf) p.isPartner = pf[p.id]; return p; });
      var mine = get(K.mine);
      if (mine) list.push(Object.assign({}, mine, { mine: true, isPartner: !!pf['demo-mine'] }));
      return list.filter(function (p) { return p.status !== 'deleted'; });
    }

    /* What a visitor may see. Contact details only for signed-in members. */
    function publicView(p) {
      var o = clone(p);
      if (!user) { o.contactHidden = !!(o.whatsapp || o.email); o.whatsapp = ''; o.email = ''; }
      return o;
    }

    function login(email) {
      user = { id: 'demo-user', email: email };
      set(K.user, user);
      setTimeout(function () { emit('SIGNED_IN'); }, 0);
      return Promise.resolve({ needsConfirm: false });
    }

    var store = {
      mode: 'demo',
      init: function () { return Promise.resolve(); },
      getUser: function () { return user; },
      onAuth: function (cb) { listeners.push(cb); },
      signUp: login,
      signIn: login,
      signOut: function () { user = null; del(K.user); setTimeout(function () { emit('SIGNED_OUT'); }, 0); return Promise.resolve(); },
      resetPassword: function () { return Promise.resolve(); },
      getSettings: function () { return Promise.resolve(settings()); },

      listProfiles: function () {
        var showDemo = settings().showDemo;
        return Promise.resolve(allProfiles().filter(function (p) {
          return p.status === 'approved' && p.visible && (showDemo || p.mine);
        }).map(publicView));
      },

      getMyProfile: function () {
        var m = user ? get(K.mine) : null;
        if (m) m.isPartner = !!(get(K.partnerFlags) || {})['demo-mine'];
        return Promise.resolve(m);
      },
      requestPartner: function (link) { set(K.partner, { profileId: 'demo-mine', link: link, status: 'requested', at: new Date().toISOString() }); return Promise.resolve(); },
      getMyPartnerRequest: function () { return Promise.resolve(user ? get(K.partner) : null); },

      saveMyProfile: function (data) {
        var old = get(K.mine);
        var p = Object.assign({}, old || {}, data);
        p.id = 'demo-mine';
        if (!old) { p.createdAt = new Date().toISOString().slice(0, 10); p.visible = true; }
        // never store the exact spot of a private person
        ['home', 'away'].forEach(function (k) {
          var loc = data[k];
          if (loc && loc.exact && p.type === 'private') { var f = fuzz(loc.lat, loc.lng, cfg.fuzzMeters); p[k] = { label: loc.label, lat: f.lat, lng: f.lng, until: loc.until || '' }; }
          else if (loc) { p[k] = { label: loc.label, lat: loc.lat, lng: loc.lng, until: loc.until || '' }; }
        });
        if (!old) p.status = settings().manualApproval ? 'pending' : 'approved';
        set(K.mine, p);
        return Promise.resolve(clone(p));
      },

      setAtAway: function (atAway) {
        var p = get(K.mine); if (!p) return Promise.reject(new Error('No card yet'));
        p.atAway = !!atAway && !!p.away; set(K.mine, p); return Promise.resolve(clone(p));
      },
      setVisible: function (v) {
        var p = get(K.mine); if (!p) return Promise.reject(new Error('No card yet'));
        p.visible = !!v; set(K.mine, p); return Promise.resolve(clone(p));
      },
      deleteAccount: function () { del(K.mine); return store.signOut(); },

      report: function (profileId, reason, note) {
        var r = get(K.reports) || [];
        r.push({ id: 'r' + Date.now(), profileId: profileId, reason: reason, note: note || '', at: new Date().toISOString(), open: true });
        set(K.reports, r);
        return Promise.resolve();
      },

      /* Demo: everyone is admin, so the admin page can be tried out. */
      admin: {
        isAdmin: function () { return Promise.resolve(true); },
        overview: function () {
          var pr = get(K.partner);
          return Promise.resolve({ profiles: allProfiles().map(clone), reports: get(K.reports) || [], partners: pr ? [pr] : [], settings: settings() });
        },
        setPartner: function (id, on) {
          var pf = get(K.partnerFlags) || {}; pf[id] = !!on; set(K.partnerFlags, pf);
          var pr = get(K.partner); if (pr && pr.profileId === id) { pr.status = on ? 'verified' : 'rejected'; set(K.partner, pr); }
          return Promise.resolve();
        },
        decide: function (id, status) {
          if (id === 'demo-mine') { var m = get(K.mine); if (m) { m.status = status; set(K.mine, m); } }
          else { var ov = statusOverrides(); ov[id] = status; set(K.status, ov); }
          return Promise.resolve();
        },
        closeReport: function (rid) {
          var r = (get(K.reports) || []).map(function (x) { if (x.id === rid) x.open = false; return x; });
          set(K.reports, r); return Promise.resolve();
        },
        setSetting: function (key, value) {
          var s = get(K.settings) || {}; s[key] = value; set(K.settings, s); return Promise.resolve(settings());
        },
        resetDemo: function () { Object.keys(K).forEach(function (k) { if (k !== 'user') del(K[k]); }); return Promise.resolve(); }
      }
    };
    return store;
  };
})();
