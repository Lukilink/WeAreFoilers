/* Inline SVG icons. Simple strokes, 24px grid, use currentColor. */
(function () {
  var s = function (body, w) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };
  window.ICONS = {
    heart:   s('<path d="M12 20s-7-4.4-9-8.6C1.4 8 3.6 4.5 7 4.5c2.2 0 3.6 1.3 5 3.2 1.4-1.9 2.8-3.2 5-3.2 3.4 0 5.6 3.5 4 6.9C19 15.6 12 20 12 20z"/>'),
    board:   s('<path d="M17.5 3.5c3 3-1 11-6 15.5-2.6 2.3-5.4 2.6-6.6 1.4S4.3 16.4 6.6 13.8C11 8.8 14.5.5 17.5 3.5z"/><path d="M16 6 7 17.5"/>', 1.8),
    foil:    s('<path d="M3 7.5c3-1.2 15-1.2 18 0"/><path d="M12 7.3v9"/><path d="M5.5 16.5c4 2.2 9 2.2 13 0"/><path d="M15 16.6l2 1.8"/>', 1.8),
    wave:    s('<path d="M2 14c2.5-3 4.5-3 7 0s4.5 3 7 0 4-3 6-1"/><path d="M2 19c2.5-3 4.5-3 7 0s4.5 3 7 0 4-3 6-1" opacity=".5"/>', 1.8),
    pin:     s('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
    home:    s('<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>'),
    plane:   s('<path d="M2.5 13.5 21 6l-4.5 13-4.2-5.2z"/><path d="M12.3 13.8 21 6"/>'),
    search:  s('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
    lock:    s('<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
    ig:      s('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>'),
    chat:    s('<path d="M4 19.5 5.3 16A7.5 7.5 0 1 1 8 18.7z"/><path d="M9.5 9.5c0 2.5 2.5 5 5 5l1-1.4-1.8-1-1 .7c-.8-.4-1.6-1.2-2-2l.7-1-1-1.8z" stroke-width="1.4"/>'),
    mail:    s('<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m4 7.5 8 6 8-6"/>'),
    globe:   s('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>'),
    clock:   s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    flag:    s('<path d="M5 21V4.5"/><path d="M5 4.5c4-2 7 2 14 0v9c-7 2-10-2-14 0"/>'),
    close:   s('<path d="M6 6l12 12M18 6 6 18"/>'),
    back:    s('<path d="M15 5l-7 7 7 7"/>'),
    filter:  s('<path d="M4 7h16M7 12h10M10 17h4"/>'),
    list:    s('<path d="M8 7h12M8 12h12M8 17h12"/><circle cx="4" cy="7" r=".8" fill="currentColor"/><circle cx="4" cy="12" r=".8" fill="currentColor"/><circle cx="4" cy="17" r=".8" fill="currentColor"/>'),
    locate:  s('<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/><circle cx="12" cy="12" r="7"/>'),
    people:  s('<circle cx="9" cy="8.5" r="3"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M15 14.3c2.5-.3 4.8 1.2 5.5 4.2"/>'),
    map:     s('<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>'),
    van:     s('<path d="M2.5 16.5V8a2 2 0 0 1 2-2H15l4.5 4.5 2 1V16.5h-2"/><path d="M2.5 16.5h3M10 16.5h5"/><circle cx="7.7" cy="16.8" r="2"/><circle cx="17.2" cy="16.8" r="2"/><path d="M14.5 6v4.5h5"/>'),
    car:     s('<path d="M4 16.5V12l2-5h12l2 5v4.5"/><path d="M3 12h18"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>'),
    sparkle: s('<path d="M12 3c.6 4.3 2.4 6.3 7 7-4.6.7-6.4 2.7-7 7-.6-4.3-2.4-6.3-7-7 4.6-.7 6.4-2.7 7-7z"/><path d="M19 16.5c.2 1.4.8 2 2.2 2.2-1.4.2-2 .8-2.2 2.2-.2-1.4-.8-2-2.2-2.2 1.4-.2 2-.8 2.2-2.2z" stroke-width="1.4"/>'),
    coffee:  s('<path d="M4.5 9.5h12v4.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 11h1.3a2.2 2.2 0 0 1 0 4.4h-1.6"/><path d="M8.5 3.5c-.8 1 .8 2-.1 3M12 3.5c-.8 1 .8 2-.1 3"/>'),
    sun:     s('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
    edit:    s('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
    eye:     s('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff:  s('<path d="M4 4l16 16"/><path d="M10 6c.6-.3 1.3-.5 2-.5 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.7 0 3.2-.5 4.5-1.3"/>'),
    check:   s('<path d="M5 12.5 10 17l9-10"/>'),
    plus:    s('<path d="M12 5v14M5 12h14"/>'),
    camera:  s('<path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4z"/><circle cx="12" cy="13" r="3.3"/>'),
    trash:   s('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
    logout:  s('<path d="M14 4.5h4.5v15H14"/><path d="M10 8l-4 4 4 4M6 12h10"/>'),
    shield:  s('<path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6z"/><path d="m9 12 2 2 4-4"/>'),
    chevron: s('<path d="m9 6 6 6-6 6"/>'),
    link:    s('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>'),
    copy:    s('<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>'),
    robot:   s('<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4.5V8M9 13h.01M15 13h.01M9.5 16.5h5"/>'),
    /* partner badge: filled blue circle with a white check */
    verified: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2F80ED"/><path d="M7 12.4l3.2 3.1L17 8.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
})();
