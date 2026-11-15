/*
 * Site settings.
 *
 * While supabaseUrl and supabaseAnonKey are empty, the site runs in DEMO MODE:
 * made-up sample foilers, simulated login, your own card is stored in this browser only.
 *
 * For production: create a Supabase project, run supabase/schema.sql and put the URL and
 * the "publishable"/anon key here. That key is meant for the browser and may live in the repo.
 * Security comes from the Row Level Security rules in schema.sql. Never put secrets here.
 */
window.WAF_CONFIG = {
  siteName: 'We Are Foilers',
  siteUrl: 'https://wearefoilers.com',     // used for the partner share link
  supabaseUrl: 'https://lbehkomudrhnwmkfiysz.supabase.co',
  supabaseAnonKey: 'sb_publishable_zY22HgBtv480sLtSojTogg_AwIBLIlg',   // publishable key, safe in the repo

  contactEmail: 'mail@wearefoilers.com',   // shown in the footer and About, empty = hidden
  instagram: 'wearefoilers',               // our own account, empty = hidden

  /* Feature switches. manualApproval, showDemo and partnerProgram are switched live on the admin page
     (stored in the database); the values here are only defaults for demo mode. */
  manualApproval: true,
  partnerProgram: true,
  shareCard: false,         // shareable card image (phase 2)

  /* Private foilers are never shown exactly: their pin is moved by up to this many meters
     when they save, and the map shows a soft circle instead of a point. */
  fuzzMeters: 1500,

  /* Map. OpenFreeMap: free, no API key, no usage limits, based on OpenStreetMap
     (https://openfreemap.org). Vector map, drawn by MapLibre, recolored to our design in app.js.
     If mapStyle is empty, the raster tiles below are used instead. */
  mapStyle: 'https://tiles.openfreemap.org/styles/positron',
  mapAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',

  defaultCenter: [33, -12],
  defaultZoom: 3
};
