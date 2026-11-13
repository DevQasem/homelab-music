'use strict';
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const audio = $('audio');
const root = document.documentElement;
// The now-playing section sits beside the list as the right-hand panel on
// wide screens (on phones it is a full-screen sheet).
document.querySelector('.app').append($('np'));

// ---------------------------------------------------------------- icons
const ICONS = {
  play: 'M8 5v14l11-7z', pause: 'M6 19h4V5H6zm8-14v14h4V5z',
  next: 'M6 18l8.5-6L6 6zm10-12v12h2V6z', prev: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
  shuffle: 'M10.59 9.17L5.41 4 4 5.41l5.17 5.17zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04z',
  repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z',
  more: 'M12 8a2 2 0 100-4 2 2 0 000 4zm0 2a2 2 0 100 4 2 2 0 000-4zm0 6a2 2 0 100 4 2 2 0 000-4z',
  search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  music: 'M12 3v10.55A4 4 0 1014 17V7h4V3z',
  folder: 'M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8z',
  tune: 'M3 17v2h6v-2zM3 5v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zM7 9v2H3v2h4v2h2V9zm14 4v-2H11v2zm-6-4h2V7h4V5h-4V3h-2z',
  upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z', plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z',
  down: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z',
  left: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  person: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  volume: 'M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z',
  lyrics: 'M3 5h18v2H3zm0 4h12v2H3zm0 4h18v2H3zm0 4h12v2H3z',
  trash: 'M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75z',
  retry: 'M17.65 6.35A8 8 0 1019.73 14h-2.08A6 6 0 1112 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z',
  queue: 'M4 6h12v2H4zm0 4h12v2H4zm0 4h8v2H4zm10 0v6l5-3z',
  minus: 'M19 13H5v-2h14z',
  download: 'M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z',
  heartLine: 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
  history: 'M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 117 7 6.97 6.97 0 01-4.94-2.06l-1.42 1.42A8.95 8.95 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z',
  trending: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  video: 'M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  fullscreen: 'M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z',
  drag: 'M3 15h18v-2H3zm0-6v2h18V9z',
  gear: 'M19.14 12.94a7.07 7.07 0 000-1.88l2.03-1.58a.5.5 0 00.12-.61l-1.92-3.32a.5.5 0 00-.59-.22l-2.39.96a7.03 7.03 0 00-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84a.48.48 0 00-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 00-.59.22L2.74 8.87a.48.48 0 00.12.61l2.03 1.58a7.4 7.4 0 000 1.88l-2.03 1.58a.5.5 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.5.5 0 00-.12-.61zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z',
  palette: 'M12 3a9 9 0 000 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16a5 5 0 005-5c0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3z',
  lock: 'M18 8h-1V6A5 5 0 007 6v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zM9 6a3 3 0 016 0v2H9zm3 11a2 2 0 110-4 2 2 0 010 4z',
};
const svg = n => `<svg viewBox="0 0 24 24"><path d="${ICONS[n]}"/></svg>`;
const paint = (scope = document) => scope.querySelectorAll('i[data-ico]').forEach(i => { i.innerHTML = svg(i.dataset.ico); });
paint();

// ---------------------------------------------------------------- prefs
const ACCENTS = [['#8b5cf6', '#ec4899'], ['#3b82f6', '#06b6d4'], ['#10b981', '#84cc16'], ['#f59e0b', '#ef4444'], ['#ef4444', '#f97316'], ['#ec4899', '#8b5cf6'], ['#14b8a6', '#3b82f6']];
const EQ_F = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass boost': [7, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  'Bass reducer': [-7, -6, -4, -2, 0, 0, 0, 0, 0, 0],
  'Treble boost': [0, 0, 0, 0, 0, 1, 2, 4, 6, 7],
  'Vocal boost': [-2, -3, -2, 1, 4, 5, 4, 2, 0, -1],
  Rock: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
  Pop: [-1, 0, 2, 4, 5, 4, 2, 0, -1, -1],
  'Hip-hop': [6, 5, 2, 3, -1, -1, 1, 0, 2, 3],
  Electronic: [5, 4, 1, 0, -2, 2, 1, 2, 4, 5],
  Jazz: [4, 3, 1, 2, -2, -2, 0, 1, 3, 4],
  Classical: [5, 4, 3, 2, -1, -1, 0, 2, 3, 4],
  Acoustic: [5, 5, 3, 1, 2, 2, 3, 4, 3, 2],
  'Late night': [4, 3, 1, 0, 1, 2, 2, 1, -2, -4],
};
const prefs = Object.assign({ theme: 'dark', accent: ACCENTS[0][0], anim: true, compact: false, speed: 1, eq: EQ_PRESETS.Flat.slice(), eqOn: true, eqPreset: 'Flat', viz: 'bars', ytMode: 'ask', avMode: 'video', resume: true, sort: 'default', volume: 1, panel: true }, load('prefs', {}));
if (!Array.isArray(prefs.eq) || prefs.eq.length !== EQ_F.length) { prefs.eq = EQ_PRESETS.Flat.slice(); prefs.eqPreset = 'Flat'; }
function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
let vizColors = ['#8b5cf6', '#ec4899'];
function applyPrefs() {
  root.dataset.theme = prefs.theme;
  const pair = ACCENTS.find(a => a[0] === prefs.accent);
  root.style.setProperty('--accent', prefs.accent);
  root.style.setProperty('--accent2', pair ? pair[1] : `color-mix(in srgb, ${prefs.accent} 55%, #ff4d8d)`);
  document.body.classList.toggle('anim', prefs.anim);
  document.body.classList.toggle('compact', prefs.compact);
  document.body.classList.toggle('viz-circle', prefs.viz === 'circle');
  document.body.classList.toggle('viz-off', prefs.viz === 'off');
  const cs = getComputedStyle(root);
  vizColors = [cs.getPropertyValue('--accent').trim() || '#8b5cf6', cs.getPropertyValue('--accent2').trim() || '#ec4899'];
  if (!vizColors[1].startsWith('#')) vizColors[1] = vizColors[0];
  applyRemix();
  audio.volume = prefs.volume;
  $('vol').value = prefs.volume; fill($('vol'));
  applyEq();
  save('prefs', prefs);
}

// ---------------------------------------------------------------- state
// Live remix of the song that is playing (set from the Remix tab).
const remix = { speed: 1, bass: 0, reverb: 0, pan: false };
let fx;  // the remix audio nodes, once the audio graph exists
const remixOn = () => remix.speed !== 1 || remix.bass > 0 || remix.reverb > 0 || remix.pan;
function applyRemix() {
  // a remix speed also moves the pitch (like a record); the plain speed setting does not
  audio.preservesPitch = remix.speed === 1;
  audio.playbackRate = remix.speed !== 1 ? remix.speed : prefs.speed;
  if (remixOn()) { ensureEq(); actx?.resume(); }
  if (fx) { fx.bass.gain.value = remix.bass; fx.wet.gain.value = remix.reverb * 0.7; fx.depth.gain.value = remix.pan ? 1 : 0; }
}
const state = {
  view: { type: 'library' }, tracks: [], shown: [], tracksKey: '', filter: '',
  playlists: [], queue: [], index: -1, shuffle: false, repeat: false,
  lastEvent: 0, wasPending: false, sleepTimer: null, sleepMode: 'off', lyricsFor: null,
};
const current = () => state.queue[state.index];
// library tracks have an id; streamed (not downloaded) tracks only a video id
const tkey = t => t.id ?? 'yt:' + t.video_id;
// A song can have both sound and picture: library tracks with a video file,
// uploaded videos, and anything streamed from YouTube.
const canVideo = t => !t.id || t.kind === 'video';
const modeOf = t => !canVideo(t) ? 'audio' : t.id ? prefs.avMode : (t.kind === 'video' ? 'video' : 'audio');
// The video file carries the sound too, so one source serves both modes and
// switching between them never reloads (a stream moves to its video source
// the first time video is asked for, then stays on it).
const srcOf = t => t.id ? `/media/${t.id}${t.vfile ? '?v=1' : ''}`
  : `/api/stream/${t.video_id}${t.vsrc ? '?kind=video' : ''}`;
const showingVideo = () => document.body.classList.contains('is-video');
// A fake anchor so menus can open at the mouse position (right-click).
const at = e => ({ point: true, getBoundingClientRect: () => ({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }) });
const LISTS = {
  library: { kind: 'Your music', title: 'Library', icon: 'music', empty: 'Your library is empty. Search YouTube, paste a YouTube / Spotify link, or upload files from this device.' },
  liked: { kind: 'Favourites', title: 'Liked', icon: 'heart', q: '?view=liked', empty: 'No liked tracks yet. Tap the heart on any track.' },
  recent: { kind: 'History', title: 'Recently played', icon: 'history', q: '?view=recent', empty: 'Nothing played yet.' },
  top: { kind: 'History', title: 'Most played', icon: 'trending', q: '?view=top', empty: 'Nothing played yet.' },
};
const isList = v => v.type === 'playlist' || v.type === 'artist' || v.type in LISTS;
// "A, B & C feat. D" names four artists
const ARTIST_SEP = /(\s*,\s*|\s*&\s*|\s+x\s+|\s+(?:feat|ft)\.?\s+)/i;
const artistsOf = t => (t.artist || '').split(ARTIST_SEP).filter((p, i) => i % 2 === 0 && p.trim()).map(p => p.trim());
// progress of a track that is still downloading, from the last status poll
const dlText = t => { const d = (state.downloads || []).find(x => x.id === t.id); return t.status === 'error' ? 'failed' : d && d.pct != null ? `${d.stage || ''} ${d.pct}%`.trim() : t.status; };

// ---------------------------------------------------------------- utils
const fmt = s => { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const grad = s => `linear-gradient(135deg,hsl(${hue(s)} 65% 48%),hsl(${(hue(s) + 50) % 360} 65% 32%))`;
function placeholder(t) {
  const h = hue(t.title + t.id);
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},65%,48%)"/><stop offset="1" stop-color="hsl(${(h + 50) % 360},65%,30%)"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/><path transform="translate(24 24) scale(2)" fill="rgba(255,255,255,.85)" d="${ICONS.music}"/></svg>`);
}
const coverUrl = t => t.video_id ? `https://i.ytimg.com/vi/${t.video_id}/mqdefault.jpg` : t.source === 'upload' || t.source === 'remix' ? `/api/cover/${t.id}` : placeholder(t);
function setImg(img, t) { img.onerror = () => { img.onerror = null; img.src = placeholder(t); }; img.src = coverUrl(t); }
function fill(r) { const max = +r.max || 1, min = +r.min || 0; r.style.setProperty('--p', ((r.value - min) / (max - min) * 100) + '%'); }

async function api(path, opts = {}) {
  if (opts.body && !(opts.body instanceof Blob)) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(opts.body); }
  const r = await fetch(path, opts);
  if (r.status === 401 && path !== '/api/login') { showLogin(); throw new Error('Login required'); }
  if (!r.ok) { let m = r.statusText; try { m = (await r.json()).detail || m; } catch {} throw new Error(m); }
  return r.json();
}
const post = (p, body) => api(p, { method: 'POST', body });
function toast(msg, level = 'info', ms = 5000) {
  const t = el('div', 'toast ' + level, msg);
  $('toasts').append(t);
  if (ms) setTimeout(() => t.remove(), ms);
  return t;
}

// -------------------------------------------------------------- dialogs
// The app's own boxes for typing a name or confirming, instead of the
// browser's. Resolves to the typed values (or true), or null when cancelled.
function dialog({ title, text, fields = [], ok = 'Save', danger = false }) {
  return new Promise(resolve => {
    const wrap = el('div', 'modal dlg-wrap'), form = el('form', 'dlg');
    form.append(el('h3', null, title));
    if (text) form.append(el('p', null, text));
    const inputs = fields.map(f => {
      const lab = el('label', null, f.label), inp = el('input');
      inp.type = 'text'; inp.value = f.value || ''; inp.placeholder = f.placeholder || ''; inp.autocomplete = 'off';
      lab.append(inp); form.append(lab);
      return inp;
    });
    const row = el('div', 'dlg-act'), cancel = el('button', 'btn ghost', 'Cancel'), go = el('button', 'btn' + (danger ? ' danger' : ''), ok);
    cancel.type = 'button';
    row.append(cancel, go); form.append(row); wrap.append(form); document.body.append(wrap);
    const done = v => { wrap.remove(); resolve(v); };
    cancel.onclick = () => done(null);
    wrap.onpointerdown = e => { if (e.target === wrap) done(null); };
    wrap.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') done(null); };
    form.onsubmit = e => { e.preventDefault(); done(inputs.length ? inputs.map(i => i.value.trim()) : true); };
    (inputs[0] || go).focus(); inputs[0]?.select();
  });
}
const confirmBox = (title, text, ok) => dialog({ title, text, ok, danger: true });

// ---------------------------------------------------------------- menus
function openMenu(anchor, items, title) {
  const menu = $('menu');
  menu.replaceChildren();
  if (title) menu.append(el('h4', null, title));
  for (const it of items) {
    const b = el('button', it.danger ? 'danger' : '');
    b.innerHTML = svg(it.icon || 'music');
    b.append(el('span', null, it.label));
    b.onclick = e => { e.stopPropagation(); closeMenu(); it.fn(anchor); };
    menu.append(b);
  }
  menu.hidden = $('scrim').hidden = false;
  const r = anchor.getBoundingClientRect(), w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = Math.max(8, Math.min(anchor.point ? r.left : r.right - w, innerWidth - w - 8)) + 'px';
  menu.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
}
function closeMenu() { $('menu').hidden = $('scrim').hidden = true; }
$('scrim').onclick = closeMenu;
$('scrim').onpointerdown = e => { if (e.button === 0) closeMenu(); };
// Right-click while a menu is open: close it and open the menu of whatever is
// under the mouse, instead of the browser's own menu.
$('scrim').oncontextmenu = e => {
  e.preventDefault(); closeMenu();
  document.elementFromPoint(e.clientX, e.clientY)?.dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY }));
};
document.addEventListener('contextmenu', e => { if (!e.target.closest?.('input, textarea')) e.preventDefault(); });
addEventListener('blur', closeMenu);
addEventListener('resize', closeMenu);

function trackMenu(t, anchor) {
  if (!t.id) {  // streaming-only track
    const items = [
      { icon: 'queue', label: 'Play next', fn: () => playNext(t) },
      { icon: 'plus', label: 'Add to queue', fn: () => addToQueue(t) },
      { icon: 'folder', label: 'Download to folder…', fn: a => folderPicker([t], a) },
    ];
    if (!t.in_library) items.unshift({ icon: 'download', label: 'Download to library', fn: () => saveStream(t) });
    return openMenu(anchor, items, t.title);
  }
  const items = [];
  if (t.status === 'ready') {
    items.push({ icon: 'play', label: 'Play now', fn: () => { if (state.shown.some(x => x.id === t.id)) playFrom(t.id); else { state.queue = [t]; playIndex(0); } } });
    items.push({ icon: 'queue', label: 'Play next', fn: () => playNext(t) });
    items.push({ icon: 'plus', label: 'Add to queue', fn: () => addToQueue(t) });
    items.push({ icon: t.liked ? 'heart' : 'heartLine', label: t.liked ? 'Remove from Liked' : 'Like', fn: () => toggleLike(t) });
    items.push({ icon: 'lyrics', label: 'Show lyrics', fn: () => { if (!current() || current().id !== t.id) playFrom(t.id); openNp(); } });
  }
  items.push({ icon: 'folder', label: 'Add to folder…', fn: a => folderPicker([t], a) });
  if (state.view.type === 'playlist') items.push({ icon: 'minus', label: 'Remove from this folder', fn: async () => {
    const pid = state.view.id;
    dropFromList(t.id);
    try { await api(`/api/playlists/${pid}/tracks/${t.id}`, { method: 'DELETE' }); } catch (e) { toast(e.message, 'error'); }
    reload(true);
  } });
  if (t.video_id && t.kind !== 'video' && t.status === 'ready') items.push({ icon: 'video', label: 'Download the video too', fn: async () => {
    try { await post('/api/add', { video_id: t.video_id, title: t.title, artist: t.artist, duration: t.duration, kind: 'video' }); state.wasPending = true; toast(`Downloading the video for “${t.title}”`); reload(true); }
    catch (e) { toast(e.message, 'error'); }
  } });
  items.push({ icon: 'edit', label: 'Edit title / artist', fn: () => editTrack(t) });
  if (t.status === 'error') items.push({ icon: 'retry', label: 'Retry download', fn: async () => { await post(`/api/tracks/${t.id}/retry`); state.wasPending = true; reload(true); } });
  items.push({ icon: 'trash', label: 'Delete from library', danger: true, fn: () => deleteTrack(t) });
  openMenu(anchor, items, t.title);
}

// Remove a track from the screen straight away, then confirm with the server.
const gone = new Set();  // ids being deleted: never let a stale response re-add them
function dropFromList(id) {
  reloadSeq++;  // discard any list request already in flight
  state.tracks = state.tracks.filter(x => x.id !== id);
  state.tracksKey = '';
  drawTracks();
}
function dropFromPlayer(id) { removeQueueAt(state.queue.findIndex(x => x.id === id)); }
function removeQueueAt(i) {
  if (i < 0) return;
  const wasPlaying = !audio.paused;
  state.queue.splice(i, 1);
  if (i < state.index) state.index--;
  else if (i === state.index) {
    if (state.queue.length) playIndex(state.index % state.queue.length, wasPlaying);
    else stopPlayer();
  }
  renderQueue();
}
function stopPlayer() {
  state.index = -1; state.queue = []; state.lyricsFor = null;
  audio.pause(); audio.removeAttribute('src'); audio.load();
  $('nowT').textContent = $('npT').textContent = 'Nothing playing';
  $('nowA').textContent = 'Pick a song to start'; $('npA').textContent = '';
  $('art').removeAttribute('src'); $('npArt').removeAttribute('src');
  $('npBg').style.backgroundImage = '';
  $('saveBtn').hidden = $('npSave').hidden = $('likeBtn').hidden = $('npLike').hidden = $('fsBtn').hidden = true;
  document.body.classList.remove('is-video'); $('avTabs').hidden = true;
  document.title = 'Homelab Music';
  renderQueue();
  if (wide()) { $('np').classList.remove('full'); showLyrics(); } else closeNp();
  markCurrent();
}
async function deleteTrack(t) {
  if (!await confirmBox('Delete from library?', `“${t.title}” and its files are removed.`, 'Delete')) return;
  gone.add(t.id);
  dropFromList(t.id);
  dropFromPlayer(t.id);
  lyricsCache.delete(t.id);
  if (load('last', {})?.id === t.id) save('last', null);
  try { await api(`/api/tracks/${t.id}`, { method: 'DELETE' }); toast(`Deleted “${t.title}”`); }
  catch (e) { gone.delete(t.id); toast('Delete failed: ' + e.message, 'error'); }
  await reload(true).catch(() => {});
  gone.delete(t.id);
}
// YouTube items can be played or saved as audio or as video.
function askKind(anchor, title, labels, fn) {
  if (prefs.ytMode !== 'ask') return fn(prefs.ytMode);
  openMenu(anchor, [
    { icon: 'music', label: labels[0], fn: () => fn('audio') },
    { icon: 'video', label: labels[1], fn: () => fn('video') },
  ], title);
}
// Download a streamed song (with its video when there is one), optionally
// straight into a folder.
async function saveStream(t, folder = null, quiet = false) {
  try {
    await post('/api/add', { video_id: t.video_id, title: t.title, artist: t.artist, duration: t.duration, kind: 'video', playlist: folder });
    t.in_library = true; state.wasPending = true;
    if (!quiet) toast(`Downloading “${t.title}” to your library`);
    if (current() && tkey(current()) === tkey(t)) $('saveBtn').hidden = $('npSave').hidden = true;
    $$(`.row[data-key="${tkey(t)}"] .chip`).forEach(b => { b.textContent = '✓ Added'; b.title = 'Show it in your library'; });
    return true;
  } catch (e) { toast(e.message, 'error'); return false; }
}

function folderPicker(list, anchor) {
  const items = state.playlists.map(p => ({ icon: 'folder', label: p.name, fn: () => addToFolder(p, list) }));
  items.push({ icon: 'plus', label: 'New folder…', fn: async () => { const p = await newFolder(); if (p) addToFolder(p, list); } });
  openMenu(anchor, items, 'Add to folder');
}
// Put tracks into a folder; ones that are only being streamed are downloaded.
async function addToFolder(p, list) {
  let added = 0, fetched = 0;
  for (const t of list) {
    if (!t.id) { if (await saveStream(t, p.id, true)) fetched++; continue; }
    try { await post(`/api/playlists/${p.id}/tracks`, { track_id: t.id }); added++; }
    catch (e) { toast(e.message, 'error'); }
  }
  const n = (k, w) => `${k} track${k === 1 ? '' : 's'} ${w}`;
  if (added || fetched) toast([fetched && 'Downloading ' + n(fetched, 'into'), added && (fetched ? 'added ' : 'Added ') + n(added, 'to')].filter(Boolean).join(', ') + ` “${p.name}”`);
  loadPlaylists();
  if (state.view.type === 'playlist' && state.view.id === p.id) reload(true);
}
async function deleteTracks(list) {
  if (!await confirmBox(`Delete ${list.length} tracks?`, 'They are removed from the library along with their files.', 'Delete')) return;
  for (const t of list) { gone.add(t.id); dropFromPlayer(t.id); lyricsCache.delete(t.id); }
  reloadSeq++;
  state.tracks = state.tracks.filter(x => !gone.has(x.id)); state.tracksKey = '';
  drawTracks();
  let ok = 0;
  for (const t of list) {
    try { await api(`/api/tracks/${t.id}`, { method: 'DELETE' }); ok++; }
    catch (e) { toast('Delete failed: ' + e.message, 'error'); }
  }
  if (ok) toast(`Deleted ${ok} track${ok === 1 ? '' : 's'}`);
  await reload(true).catch(() => {});
  for (const t of list) gone.delete(t.id);
}
// Menu for several selected rows at once.
function bulkMenu(list, anchor) {
  const lib = list.filter(t => t.id), ready = list.filter(t => t.status === 'ready'), fresh = list.filter(t => !t.id && !t.in_library);
  const items = [];
  if (ready.length) {
    items.push({ icon: 'play', label: 'Play selected', fn: () => { state.queue = ready.slice(); playIndex(0); } });
    items.push({ icon: 'plus', label: 'Add to queue', fn: () => {
      const idle = !current();
      for (const t of ready) if (!state.queue.some(x => tkey(x) === tkey(t))) state.queue.push(t);
      if (idle) playIndex(0); else { toast(`Added ${ready.length} tracks to the queue`); renderQueue(); }
    } });
  }
  if (fresh.length) items.push({ icon: 'download', label: `Download ${fresh.length} to library`, fn: async () => {
    let ok = 0;
    for (const t of fresh) if (await saveStream(t, null, true)) ok++;
    if (ok) toast(`Downloading ${ok} track${ok === 1 ? '' : 's'} to your library`);
  } });
  items.push({ icon: 'folder', label: lib.length === list.length ? 'Add to folder…' : 'Download to folder…', fn: a => folderPicker(list, a) });
  if (state.view.type === 'playlist' && lib.length) items.push({ icon: 'minus', label: 'Remove from this folder', fn: async () => {
    const pid = state.view.id;
    for (const t of lib) {
      dropFromList(t.id);
      try { await api(`/api/playlists/${pid}/tracks/${t.id}`, { method: 'DELETE' }); } catch (e) { toast(e.message, 'error'); }
    }
    reload(true);
  } });
  if (lib.length) items.push({ icon: 'trash', label: `Delete ${lib.length} from library`, danger: true, fn: () => deleteTracks(lib) });
  openMenu(anchor, items, `${list.length} tracks selected`);
}
async function newFolder() {
  const r = await dialog({ title: 'New folder', fields: [{ label: 'Name', placeholder: 'Folder name' }], ok: 'Create' });
  const name = r && r[0];
  if (!name) return null;
  try { const p = await post('/api/playlists', { name }); await loadPlaylists(); if (state.view.type === 'folders') renderFolders(); return p; }
  catch (e) { toast(e.message, 'error'); return null; }
}
async function editTrack(t) {
  const r = await dialog({ title: 'Edit song', fields: [{ label: 'Title', value: t.title }, { label: 'Artist', value: t.artist || '' }] });
  if (!r) return;
  const [title, artist] = r;
  try { await api(`/api/tracks/${t.id}`, { method: 'PATCH', body: { title, artist } }); }
  catch (e) { return toast(e.message, 'error'); }
  for (const x of state.queue) if (x.id === t.id) { if (title) x.title = title; x.artist = artist; }
  if (current()?.id === t.id) { const c = current(); $('nowT').textContent = $('npT').textContent = c.title; $('nowA').textContent = $('npA').textContent = c.artist || ''; state.lyricsFor = null; }
  lyricsCache.delete(t.id);
  reload(true);
}

// ---------------------------------------------------------------- likes
function paintHeart(b, on) { b.classList.toggle('on', !!on); b.innerHTML = svg(on ? 'heart' : 'heartLine'); b.title = on ? 'Remove from Liked' : 'Like'; }
function paintLikes() {
  const t = current(), show = !!(t && t.id);
  for (const b of [$('likeBtn'), $('npLike')]) { b.hidden = !show; if (show) paintHeart(b, t.liked); }
}
async function toggleLike(t) {
  const liked = t.liked ? 0 : 1;
  for (const x of [...state.tracks, ...state.queue]) if (x.id === t.id) x.liked = liked;
  $$(`.row[data-key="${t.id}"] .heart`).forEach(b => paintHeart(b, liked));
  paintLikes();
  if (state.view.type === 'liked' && !liked) dropFromList(t.id);
  try { await post(`/api/tracks/${t.id}/like`, { liked: !!liked }); } catch (e) { toast(e.message, 'error'); }
  state.tracksKey = '';
}

// ------------------------------------- selection, drag box, drag to folder
// Works like a file manager: drag across the list to draw a selection box,
// Ctrl/Shift-click to add to it, and drag selected tracks (or a track by its
// cover or name) onto a folder in the sidebar.
const picked = new Set();  // keys of the selected rows
let pickAnchor = null, drag = null, dragEnd = 0;
const rowEls = () => [...$$('#main .row')];
const pickedTracks = () => state.shown.filter(t => picked.has(String(tkey(t))));
function paintPicked() { rowEls().forEach(r => r.classList.toggle('sel', picked.has(r.dataset.key))); }
function setPicked(keys) { picked.clear(); for (const k of keys) picked.add(k); paintPicked(); }

document.addEventListener('click', e => {
  if (performance.now() - dragEnd < 100) { e.stopPropagation(); e.preventDefault(); return; }  // the click that ends a drag
  const row = e.target.closest?.('#main .row');
  if (!row || e.target.closest('button')) return;
  const key = row.dataset.key;
  if (e.ctrlKey || e.metaKey) { picked.has(key) ? picked.delete(key) : picked.add(key); pickAnchor = key; }
  else if (e.shiftKey) {
    const keys = rowEls().map(r => r.dataset.key), a = Math.max(0, keys.indexOf(pickAnchor)), b = keys.indexOf(key);
    picked.clear(); for (const k of keys.slice(Math.min(a, b), Math.max(a, b) + 1)) picked.add(k);
  } else { pickAnchor = key; if (picked.size) setPicked([]); return; }
  e.stopPropagation(); e.preventDefault(); paintPicked();
}, true);

// Right-click: on a selected row it acts on the whole selection, otherwise
// the row under the mouse becomes the selection.
$('main').addEventListener('contextmenu', e => {
  const row = e.target.closest('.row');
  if (!row) return;
  if (picked.has(row.dataset.key) && picked.size > 1) { e.preventDefault(); e.stopPropagation(); bulkMenu(pickedTracks(), at(e)); }
  else { pickAnchor = row.dataset.key; setPicked([row.dataset.key]); }
}, true);

$('main').addEventListener('pointerdown', e => {
  const main = $('main');
  if (e.button !== 0 || e.pointerType !== 'mouse' || !main.querySelector('.row')) return;
  if (e.target.closest('button, input, select, a')) return;
  if (e.clientX >= main.getBoundingClientRect().left + main.clientWidth) return;  // the scrollbar
  const row = e.target.closest('.row'), add = e.ctrlKey || e.metaKey || e.shiftKey;
  drag = {
    x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, top: e.clientY + main.scrollTop, row, add, id: e.pointerId,
    // a selected row, or a track's cover / name, is picked up; anywhere else draws the box
    grab: !!row && !add && (picked.has(row.dataset.key) || !!e.target.closest('img, .t, .a')),
  };
});
addEventListener('pointermove', e => {
  if (!drag) return;
  drag.cx = e.clientX; drag.cy = e.clientY;
  if (!drag.mode) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    drag.mode = drag.grab ? 'move' : 'box';
    try { $('main').setPointerCapture(drag.id); } catch {}
    getSelection()?.removeAllRanges();
    if (drag.mode === 'box') {
      drag.base = drag.add ? new Set(picked) : new Set();
      drag.el = el('div', 'marquee');
      document.body.classList.add('dragsel');
      requestAnimationFrame(boxScroll);
    } else {
      const key = drag.row.dataset.key;
      drag.tracks = picked.has(key) ? pickedTracks() : state.shown.filter(t => String(tkey(t)) === key);
      const one = drag.tracks[0];
      drag.el = el('div', 'drag-ghost', drag.tracks.length === 1 ? one.title + (one.artist ? ' • ' + one.artist : '') : `${drag.tracks.length} tracks`);
      document.body.classList.add('dragsel', 'moving');
      // inside a folder shown in its own order, tracks can also be dropped
      // between rows to rearrange them
      if (state.view.type === 'playlist' && prefs.sort === 'default' && !state.filter.trim() && drag.tracks.every(t => t.id)) {
        drag.line = el('div', 'drop-line'); drag.line.hidden = true; document.body.append(drag.line);
        requestAnimationFrame(boxScroll);
      }
    }
    document.body.append(drag.el);
  }
  if (drag.mode === 'box') return drawBox();
  drag.el.style.left = e.clientX + 14 + 'px'; drag.el.style.top = e.clientY + 12 + 'px';
  const over = dropTarget(e);
  $$('.drop-on').forEach(n => { if (n !== over) n.classList.remove('drop-on'); });
  over?.classList.add('drop-on');
  if (!drag.line) return;
  drag.at = null;
  const rows = rowEls(), m = $('main').getBoundingClientRect();
  if (!over && rows.length && e.clientX > m.left && e.clientX < m.right && e.clientY > m.top && e.clientY < m.bottom) {
    let i = rows.findIndex(r => e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2);
    if (i < 0) i = rows.length;
    drag.at = i;
    const q = rows[Math.min(i, rows.length - 1)].getBoundingClientRect();
    Object.assign(drag.line.style, { left: q.left + 'px', width: q.width + 'px', top: (i < rows.length ? q.top : q.bottom) - 1 + 'px' });
  }
  drag.line.hidden = drag.at == null;
});
// Move tracks to a new place in the folder that is open.
async function reorder(moved, at) {
  const pid = state.view.id, ids = new Set(moved.map(t => t.id)), list = state.shown;
  const next = [...list.slice(0, at).filter(t => !ids.has(t.id)), ...moved, ...list.slice(at).filter(t => !ids.has(t.id))];
  if (next.every((t, i) => t === list[i])) return;
  reloadSeq++;
  state.tracks = next; state.tracksKey = '';
  drawTracks();
  try { await api(`/api/playlists/${pid}/order`, { method: 'PUT', body: { track_ids: next.map(t => t.id) } }); }
  catch (e) { toast(e.message, 'error'); }
  reload(true);
}
function dropTarget(e) { return document.elementFromPoint(e.clientX, e.clientY)?.closest('#pls .nav, .side-h') || null; }
function drawBox() {
  const main = $('main'), m = main.getBoundingClientRect(), y0 = drag.top - main.scrollTop;
  const l = Math.min(drag.x, drag.cx), r = Math.max(drag.x, drag.cx), t = Math.min(y0, drag.cy), b = Math.max(y0, drag.cy);
  const cl = Math.max(l, m.left), ct = Math.max(t, m.top), cr = Math.min(r, m.left + main.clientWidth), cb = Math.min(b, m.bottom);
  Object.assign(drag.el.style, { left: cl + 'px', top: ct + 'px', width: Math.max(0, cr - cl) + 'px', height: Math.max(0, cb - ct) + 'px' });
  const hit = new Set(drag.base);
  for (const row of rowEls()) { const q = row.getBoundingClientRect(); if (q.left < r && q.right > l && q.top < b && q.bottom > t) hit.add(row.dataset.key); }
  setPicked(hit);
}
function boxScroll() {  // keep scrolling while the mouse is held near the top or bottom edge
  if (!drag || !drag.mode) return;
  const main = $('main'), m = main.getBoundingClientRect();
  const step = drag.cy < m.top + 28 ? -16 : drag.cy > m.bottom - 28 ? 16 : 0;
  if (step && drag.cx > m.left && drag.cx < m.right) { main.scrollBy({ top: step, behavior: 'instant' }); if (drag.mode === 'box') drawBox(); }
  requestAnimationFrame(boxScroll);
}
function endDrag(e) {
  const d = drag; drag = null;
  if (!d) return;
  if (!d.mode) {  // a plain click: on empty space it clears the selection
    if (!d.row && !d.add && picked.size) setPicked([]);
    return;
  }
  dragEnd = performance.now();
  d.el.remove(); d.line?.remove();
  document.body.classList.remove('dragsel', 'moving');
  $$('.drop-on').forEach(n => n.classList.remove('drop-on'));
  if (d.mode !== 'move' || e.type !== 'pointerup') return;
  const over = dropTarget(e);
  if (!over) { if (d.at != null) reorder(d.tracks, d.at); return; }
  if (over.matches('.side-h')) newFolder().then(p => { if (p) addToFolder(p, d.tracks); });
  else { const p = state.playlists.find(x => x.id === +over.dataset.id); if (p) addToFolder(p, d.tracks); }
}
addEventListener('pointerup', endDrag);
addEventListener('pointercancel', endDrag);

// ---------------------------------------------------------------- views
function setActive() {
  const v = state.view;
  $$('.side .nav[data-view], .tabs button').forEach(b => b.classList.toggle('active',
    b.dataset.view === v.type || (b.dataset.view === 'folders' && b.closest('.tabs') && ['playlist', 'recent', 'top'].includes(v.type))));
  $$('#pls .nav').forEach(b => b.classList.toggle('active', v.type === 'playlist' && +b.dataset.id === v.id));
}

async function go(view) {
  state.view = view; state.filter = ''; state.tracksKey = '';
  setPicked([]);
  setActive();
  $('main').scrollTop = 0;
  if (isList(view)) { renderTrackShell(); await reload(true); }
  else if (view.type === 'folders') { await loadPlaylists(); renderFolders(); }
  else if (view.type === 'search') renderSearch();
  else if (view.type === 'home') await renderHome();
  else if (view.type === 'remix') await renderRemix();
  else if (view.type === 'spotify') renderSpotify();
}

function hero(kind, title, icon, bg) {
  const h = el('div', 'hero');
  const art = el('div', 'hero-art'); art.innerHTML = svg(icon); if (bg) art.style.background = bg;
  const txt = el('div', 'hero-txt');
  txt.append(el('small', null, kind), el('h1', null, title), Object.assign(el('p'), { id: 'heroSub' }));
  const act = el('div', 'hero-act'); act.id = 'heroAct';
  h.append(art, txt, act);
  return h;
}
function btn(cls, icon, label, fn) { const b = el('button', cls); b.innerHTML = icon ? svg(icon) : ''; if (label) b.append(el('span', null, label)); b.onclick = fn; return b; }

// Fill an artist page's header with their photo and facts (genres, country,
// years active, fans), looked up by the server from Deezer and MusicBrainz.
const compact = n => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
async function showArtistInfo(v, h) {
  let d;
  try { d = await api('/api/artist?name=' + encodeURIComponent(v.name)); } catch { return; }
  if (state.view !== v || !h.isConnected) return;
  if (d.picture) {
    const art = h.querySelector('.hero-art'), img = el('img');
    img.alt = '';
    img.onload = () => { art.replaceChildren(img); art.classList.add('photo'); };
    img.src = d.picture;
  }
  const bits = [
    d.about, d.genres && d.genres.length ? d.genres.join(', ') : null,
    d.type && d.type !== 'Person' ? d.type : null, d.country,
    d.since ? (d.type === 'Person' ? `Born ${d.since}` : d.ended ? `Active from ${d.since}` : `Since ${d.since}`) : null,
    d.fans ? `${compact(d.fans)} fans on Deezer` : null, d.albums ? `${d.albums} albums` : null,
  ].filter(Boolean);
  if (bits.length) h.querySelector('.hero-txt').append(el('p', 'hero-meta', bits.join(' · ')));
}

function renderTrackShell() {
  const v = state.view, main = $('main');
  main.replaceChildren();
  const isPl = v.type === 'playlist';
  const L = v.type === 'artist' ? { kind: 'Artist', title: v.name, icon: 'person' } : LISTS[v.type];
  const h = hero(isPl ? (v.source === 'folder' ? 'Folder' : v.source + ' playlist') : L.kind, isPl ? v.name : L.title, isPl ? 'folder' : L.icon, isPl ? grad(v.name) : null);
  main.append(h);
  if (v.type === 'artist') showArtistInfo(v, h);
  const act = h.querySelector('#heroAct');
  act.append(btn('btn', 'play', 'Play', () => playFrom(null)), btn('btn ghost', 'shuffle', 'Shuffle', () => { setShuffle(true); playFrom(null, true); }));
  if (isPl) act.append(btn('icon-btn', 'more', '', e => openMenu(e.currentTarget, [
    { icon: 'upload', label: 'Upload files into this folder', fn: () => $('file').click() },
    { icon: 'edit', label: 'Rename', fn: async () => { const r = await dialog({ title: 'Rename folder', fields: [{ label: 'Name', value: v.name }] }); const n = r && r[0]; if (!n) return; await api(`/api/playlists/${v.id}`, { method: 'PATCH', body: { name: n } }); v.name = n; await loadPlaylists(); renderTrackShell(); reload(true); } },
    { icon: 'trash', label: 'Delete folder (keeps tracks)', danger: true, fn: async () => { if (!await confirmBox('Delete folder?', `“${v.name}” is removed. Its tracks stay in the library.`, 'Delete')) return; await api(`/api/playlists/${v.id}`, { method: 'DELETE' }); go({ type: 'folders' }); } },
  ], v.name)));
  const tools = el('div', 'tools');
  const f = el('input'); f.placeholder = 'Filter…'; f.type = 'search';
  f.oninput = () => { state.filter = f.value; drawTracks(); };
  const s = el('select');
  for (const [v2, l] of [['default', isPl ? 'Folder order' : v.type === 'library' || v.type === 'liked' ? 'Recently added' : 'Default order'], ['title', 'Title A–Z'], ['artist', 'Artist A–Z'], ['duration', 'Duration']]) s.append(new Option(l, v2));
  s.value = prefs.sort; s.onchange = () => { prefs.sort = s.value; save('prefs', prefs); drawTracks(); };
  tools.append(f, s);
  const rows = el('div'); rows.id = 'rows';
  main.append(tools, rows);
}

let reloadSeq = 0;
async function reload(force) {
  loadPlaylists();
  const v = state.view;
  if (!isList(v)) return;
  // Only the newest request may update the list: an older one that was already
  // in flight (e.g. the background poll) would bring back a deleted track.
  const seq = ++reloadSeq;
  let data = await api('/api/tracks' + (v.type === 'playlist' ? '?playlist=' + v.id : v.type === 'artist' ? '' : LISTS[v.type].q || ''));
  if (v.type === 'artist') data = data.filter(t => artistsOf(t).some(a => a.toLowerCase() === v.name.toLowerCase()));
  if (seq !== reloadSeq) return;
  if (gone.size) data = data.filter(t => !gone.has(t.id));
  const key = JSON.stringify(data);
  if (v !== state.view || (!force && key === state.tracksKey)) return;
  state.tracksKey = key; state.tracks = data;
  drawTracks();
}

function drawTracks() {
  const box = $('rows'); if (!box) return;
  let list = state.tracks;
  const f = state.filter.trim().toLowerCase();
  if (f) list = list.filter(t => (t.title + ' ' + (t.artist || '')).toLowerCase().includes(f));
  const cmp = { title: (a, b) => a.title.localeCompare(b.title), artist: (a, b) => (a.artist || '').localeCompare(b.artist || ''), duration: (a, b) => a.duration - b.duration }[prefs.sort];
  if (cmp) list = [...list].sort(cmp);
  state.shown = list;
  const total = state.tracks.reduce((s, t) => s + (t.duration || 0), 0);
  const sub = $('heroSub'); if (sub) sub.textContent = `${state.tracks.length} track${state.tracks.length === 1 ? '' : 's'}${total ? ' · ' + Math.round(total / 60) + ' min' : ''}`;
  box.replaceChildren();
  if (!list.length) {
    const e = el('div', 'empty'); e.innerHTML = svg('music');
    e.append(el('div', null, f ? 'Nothing matches that filter.' : state.view.type === 'playlist' ? 'This folder is empty. Use ⋯ on any track to add it here, or upload files.' : (LISTS[state.view.type] || { empty: 'No songs by this artist in your library.' }).empty));
    box.append(e); return;
  }
  const cur = current();
  list.forEach((t, i) => {
    const row = el('div', 'row'); row.dataset.key = tkey(t);
    row.style.animationDelay = Math.min(i, 10) * 12 + 'ms';
    const img = el('img'); img.loading = 'lazy'; img.alt = ''; setImg(img, t);
    const meta = el('div');
    const title = el('div', 't', t.title);
    if (t.kind === 'video') title.append(el('span', 'badge', 'VIDEO'));
    let sub = t.artist || (t.source === 'upload' ? 'Uploaded file' : '');
    if (state.view.type === 'top' && t.plays) sub += `${sub ? ' · ' : ''}${t.plays} play${t.plays === 1 ? '' : 's'}`;
    const a = el('div', 'a');
    if (t.artist) { artistLinks(a, t.artist); a.append(sub.slice(t.artist.length)); } else a.textContent = sub;
    meta.append(title, a);
    const tag = el('div');
    if (t.status === 'ready') {
      const h = el('button', 'icon-btn heart'); paintHeart(h, t.liked);
      h.onclick = e => { e.stopPropagation(); toggleLike(t); };
      tag.append(h);
    }
    if (t.status !== 'ready') { const s = el('span', 'tag ' + t.status, dlText(t)); if (t.error) s.title = t.error; tag.append(s); row.classList.add('dim'); }
    const more = btn('icon-btn', 'more', '', e => { e.stopPropagation(); trackMenu(t, e.currentTarget); });
    more.title = 'More';
    if (t.status === 'ready') { row.classList.add('playable'); row.onclick = () => playFrom(tkey(t)); }
    row.oncontextmenu = e => { e.preventDefault(); trackMenu(t, at(e)); };
    if (cur && tkey(cur) === tkey(t)) row.classList.add('current');
    row.append(el('div', 'n', i + 1), img, meta, tag, el('div', 'd', t.duration ? fmt(t.duration) : ''), more);
    box.append(row);
  });
  const keys = new Set(list.map(t => String(tkey(t))));
  for (const k of [...picked]) if (!keys.has(k)) picked.delete(k);
  paintPicked();
}
function markCurrent() {
  const cur = current();
  $$('#main .row').forEach(r => r.classList.toggle('current', !!cur && r.dataset.key === String(tkey(cur))));
}

async function loadPlaylists() {
  let list;
  try { list = await api('/api/playlists'); } catch { return; }
  if (plDrag) return;  // a folder is being dragged: do not redraw under it
  state.playlists = list;
  const box = $('pls'); box.replaceChildren();
  for (const p of state.playlists) {
    const b = el('button', 'nav'); b.dataset.id = p.id;
    b.innerHTML = svg('folder'); b.append(el('span', null, p.name), el('small', null, p.count));
    b.onclick = () => go({ type: 'playlist', id: p.id, name: p.name, source: p.source });
    b.onpointerdown = e => folderDrag(e, b);
    box.append(b);
  }
  setActive();
}
// Drag a folder up or down in the sidebar to put the folders in any order.
let plDrag = false;
function folderDrag(e, b) {
  if (e.button !== 0 || e.pointerType !== 'mouse') return;
  const box = $('pls'), y0 = e.clientY;
  let moved = false;
  b.setPointerCapture(e.pointerId);
  const move = ev => {
    if (!moved) {
      if (Math.abs(ev.clientY - y0) < 6) return;
      moved = plDrag = true; b.classList.add('lifting');
    }
    const before = [...box.children].find(c => c !== b && ev.clientY < c.getBoundingClientRect().top + c.offsetHeight / 2);
    box.insertBefore(b, before || null);
  };
  const up = async () => {
    b.removeEventListener('pointermove', move); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
    if (!moved) return;
    b.classList.remove('lifting');
    dragEnd = performance.now();  // the click that ends the drag must not open the folder
    const ids = [...box.children].map(c => +c.dataset.id);
    state.playlists.sort((x, y) => ids.indexOf(x.id) - ids.indexOf(y.id));
    try { await api('/api/playlists/order', { method: 'PUT', body: { ids } }); }
    catch (err) { toast(err.message, 'error'); }
    plDrag = false;
    await loadPlaylists();
    if (state.view.type === 'folders') renderFolders();
  };
  b.addEventListener('pointermove', move); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
}

function renderFolders() {
  const main = $('main'); main.replaceChildren();
  const h = hero('Organise', 'Folders', 'folder');
  main.append(h);
  $('heroSub').textContent = `${state.playlists.length} folder${state.playlists.length === 1 ? '' : 's'} & playlists`;
  const grid = el('div', 'grid');
  const add = el('button', 'card new');
  const tile = el('div', 'tile'); tile.innerHTML = svg('plus');
  add.append(tile, el('b', null, 'New folder'), el('small', null, 'Group your tracks'));
  add.onclick = newFolder;
  for (const k of ['liked', 'recent', 'top']) {
    const c = el('button', 'card'), t = el('div', 'tile');
    t.style.background = 'linear-gradient(135deg,var(--accent),var(--accent2))'; t.innerHTML = svg(LISTS[k].icon);
    c.append(t, el('b', null, LISTS[k].title), el('small', null, LISTS[k].kind));
    c.onclick = () => go({ type: k });
    grid.append(c);
  }
  grid.append(add);
  state.playlists.forEach((p, i) => {
    const c = el('button', 'card'); c.style.animationDelay = i * 25 + 'ms';
    const t = el('div', 'tile'); t.style.background = grad(p.name); t.innerHTML = svg(p.source === 'folder' ? 'folder' : 'music');
    c.append(t, el('b', null, p.name), el('small', null, `${p.count} track${p.count === 1 ? '' : 's'}${p.source === 'folder' ? '' : ' · ' + p.source}`));
    c.onclick = () => go({ type: 'playlist', id: p.id, name: p.name, source: p.source });
    grid.append(c);
  });
  main.append(grid);
}

// Each artist name in a line of text opens that artist's page.
function artistLinks(box, artist) {
  artist.split(ARTIST_SEP).forEach((p, i) => {
    if (i % 2 || !p.trim()) return box.append(p);
    const s = el('span', 'artist-link', p);
    s.title = 'Show songs by ' + p.trim();
    s.onclick = e => { e.stopPropagation(); go({ type: 'artist', name: p.trim() }); };
    box.append(s);
  });
}
$('npA').onclick = () => {
  const a = current() && artistsOf(current())[0];
  if (!a) return;
  $('np').classList.remove('full'); if (!wide()) closeNp();
  go({ type: 'artist', name: a });
};

// ------------------------------------------------------------------ home
const sectionHead = (title, more) => {
  const h = el('div', 'sec-h'); h.append(el('h2', null, title));
  if (more) { const b = el('button', 'chip', 'Show all'); b.onclick = () => go(more); h.append(b); }
  return h;
};
function trackTile(t, list) {
  const c = el('button', 'card'), img = el('img', 'tile');
  img.loading = 'lazy'; img.alt = ''; setImg(img, t);
  c.append(img, el('b', null, t.title), el('small', null, t.artist || ' '));
  c.onclick = () => { state.queue = list.slice(); playIndex(list.indexOf(t)); };
  c.oncontextmenu = e => { e.preventDefault(); trackMenu(t, at(e)); };
  return c;
}
async function renderHome() {
  const view = state.view, main = $('main');
  main.replaceChildren(hero('Welcome back', 'Home', 'home'));
  state.shown = [];
  let all, recent, top;
  try { [all, recent, top] = await Promise.all([api('/api/tracks'), api('/api/tracks?view=recent'), api('/api/tracks?view=top'), loadPlaylists()]); }
  catch (e) { if (state.view === view) main.append(el('div', 'empty', e.message)); return; }
  state.home = { all };
  if (state.view !== view) return;
  $('heroSub').textContent = `${all.length} song${all.length === 1 ? '' : 's'} in your library`;
  if (!all.length) return main.append(el('div', 'empty', LISTS.library.empty));
  const ready = l => l.filter(t => t.status === 'ready');
  const section = (title, list, more) => {
    if (!list.length) return;
    const grid = el('div', 'grid');
    list.forEach(t => grid.append(trackTile(t, list)));
    main.append(sectionHead(title, more), grid);
  };
  section('Jump back in', ready(recent).slice(0, 6), { type: 'recent' });
  section('Recently added', ready(all).slice(0, 12), { type: 'library' });
  section('Most played', ready(top).slice(0, 6), { type: 'top' });
  const byArtist = new Map();
  for (const t of all) for (const a of artistsOf(t)) {
    const k = a.toLowerCase(), c = byArtist.get(k) || { name: a, n: 0, t };
    c.n++; byArtist.set(k, c);
  }
  const artists = [...byArtist.values()].sort((a, b) => b.n - a.n).slice(0, 12);
  if (artists.length) {
    const grid = el('div', 'grid');
    for (const a of artists) {
      const c = el('button', 'card artist'), img = el('img', 'tile');
      img.loading = 'lazy'; img.alt = '';
      img.onerror = () => setImg(img, a.t);  // no artist photo found: use a cover of theirs
      img.src = '/api/artist/picture?name=' + encodeURIComponent(a.name);
      c.append(img, el('b', null, a.name), el('small', null, `${a.n} song${a.n === 1 ? '' : 's'}`));
      c.onclick = () => go({ type: 'artist', name: a.name });
      grid.append(c);
    }
    main.append(sectionHead('Your artists'), grid);
  }
  if (state.playlists.length) {
    const grid = el('div', 'grid');
    for (const p of state.playlists) {
      const c = el('button', 'card'), t = el('div', 'tile');
      t.style.background = grad(p.name); t.innerHTML = svg(p.source === 'folder' ? 'folder' : 'music');
      c.append(t, el('b', null, p.name), el('small', null, `${p.count} track${p.count === 1 ? '' : 's'}`));
      c.onclick = () => go({ type: 'playlist', id: p.id, name: p.name, source: p.source });
      grid.append(c);
    }
    main.append(sectionHead('Folders', { type: 'folders' }), grid);
  }
}

// The AI jobs that are waiting or running, shown on the Remix tab.
function paintAi() {
  const box = $('aiJobs');
  if (box) box.textContent = (state.ai || []).map(j => `${j.state === 'working' ? 'Working on' : 'Waiting:'} ${j.kind === 'split' ? 'splitting' : 'creating'} “${j.label}”`).join(' · ');
}
// Called after every status poll: shows each downloading row's progress.
function paintDownloads() {
  for (const d of state.downloads || []) $$(`#main .row[data-key="${d.id}"] .tag`).forEach(s => { s.textContent = dlText(d); });
}

// ----------------------------------------------------------------- remix
// Change the song that is playing (speed, bass, reverb, 8D) and hear it
// live; "Save" renders the same thing on the server as a new song.
const REMIX_PRESETS = [
  ['Original', { speed: 1, bass: 0, reverb: 0, pan: false }],
  ['Slowed + Reverb', { speed: 0.85, bass: 2, reverb: 0.5, pan: false }],
  ['Super slowed', { speed: 0.75, bass: 3, reverb: 0.65, pan: false }],
  ['Sped up', { speed: 1.2, bass: 0, reverb: 0, pan: false }],
  ['Nightcore', { speed: 1.3, bass: 0, reverb: 0.1, pan: false }],
  ['Bass boosted', { speed: 1, bass: 10, reverb: 0, pan: false }],
  ['8D audio', { speed: 1, bass: 2, reverb: 0.3, pan: true }],
];
const samePreset = v => v.speed === remix.speed && v.bass === remix.bass && v.reverb === remix.reverb && v.pan === remix.pan;
function remixLabel() {
  const p = REMIX_PRESETS.find(([, v]) => samePreset(v));
  if (p) return p[0];
  return [remix.speed < 1 ? 'Slowed' : remix.speed > 1 ? 'Sped up' : '', remix.reverb ? 'Reverb' : '', remix.bass ? 'Bass boosted' : '', remix.pan ? '8D' : ''].filter(Boolean).join(' + ') || 'Remix';
}
let paintRemix = null, remixNamed = false;
function resetRemix() {
  Object.assign(remix, REMIX_PRESETS[0][1]);
  remixNamed = false;
  applyRemix();
  if (state.view.type === 'remix' && paintRemix) paintRemix();
}
async function renderRemix() {
  const view = state.view, main = $('main');
  main.replaceChildren(hero('Studio', 'Remix', 'tune'));
  $('heroSub').textContent = 'Change a song and hear it live, then save the result as a new song. The original stays as it is.';
  state.shown = [];
  let all = [];
  try { all = await api('/api/tracks'); } catch (e) { toast(e.message, 'error'); }
  if (state.view !== view) return;
  const songs = all.filter(t => t.status === 'ready');
  const wrap = el('div', 'set remix');
  wrap.innerHTML = `
  <div class="box"><h3>Song</h3>
    <div class="field"><div><b id="rxNow"></b><small>Pick the song to remix. It starts playing so you can hear every change.</small></div><select id="rxSong"></select></div>
  </div>
  <div class="box"><h3>Style</h3>
    <div class="field"><div class="rx-presets" id="rxPresets"></div></div>
    <div class="field"><div><b>Speed</b><small id="rxSpeedL"></small></div><input type="range" id="rxSpeed" min="0.5" max="1.5" step="0.01"></div>
    <div class="field"><div><b>Bass</b><small id="rxBassL"></small></div><input type="range" id="rxBass" min="0" max="15" step="0.5"></div>
    <div class="field"><div><b>Reverb</b><small id="rxRevL"></small></div><input type="range" id="rxRev" min="0" max="1" step="0.05"></div>
    <div class="field"><div><b>8D</b><small>The sound circles slowly from ear to ear (best with headphones)</small></div>${sw('rxPan')}</div>
  </div>
  <div class="box"><h3>Save</h3>
    <div class="field"><div><label for="rxName">Name of the new song</label></div><input type="text" id="rxName" autocomplete="off"></div>
    <div class="field"><div><small>Saved as a new song in your library. Synced lyrics are re-timed to the new speed.</small></div><button class="btn" id="rxSave">Save as new song</button></div>
  </div>
  <div class="box"><h3>AI tools</h3>
    <div class="field"><div><b>Status</b><small id="aiState">Checking…</small><small id="aiJobs"></small></div></div>
    <div class="field"><div><b>Split vocals and music</b><small>Makes two new songs from the chosen one: an instrumental and a vocals-only version</small></div><button class="btn ghost" id="aiSplit" disabled>Split with AI</button></div>
    <div class="field"><div><label for="aiPrompt">Create music from a description</label><small>An instrumental clip, for example “dark phonk beat with heavy cowbell, 140 bpm”</small></div><input type="text" id="aiPrompt" placeholder="Describe the music" autocomplete="off"></div>
    <div class="field"><div><b>Length</b><small id="aiLenL"></small></div><input type="range" id="aiLen" min="5" max="30" step="1" value="20"></div>
    <div class="field"><div></div><button class="btn ghost" id="aiGen" disabled>Create with AI</button></div>
  </div>`;
  main.append(wrap);
  // AI add-on: an optional second container on the server
  const lenLabel = () => { $('aiLenL').textContent = $('aiLen').value + ' seconds'; fill($('aiLen')); };
  $('aiLen').oninput = lenLabel; lenLabel();
  api('/api/ai').then(a => {
    if (!$('aiState')) return;
    $('aiState').textContent = a.available
      ? `Ready on ${a.gpu || a.device}${a.vram_mb ? ` (${Math.round(a.vram_mb / 1024)} GB)` : ''}`
      : 'The AI add-on is not running. Start it on the server with: docker compose --profile ai up -d --build';
    $('aiSplit').disabled = $('aiGen').disabled = !a.available;
    state.ai = a.jobs; paintAi();
  }).catch(() => {});
  $('aiSplit').onclick = async () => {
    const t = song();
    if (!t) return toast('Pick a song from your library first');
    try { await post('/api/ai/split', { track_id: t.id }); state.wasPending = true; toast(`Splitting “${t.title}” — the two new songs appear in your library when it is done`); }
    catch (e) { toast(e.message, 'error', 9000); }
  };
  $('aiGen').onclick = async () => {
    const prompt = $('aiPrompt').value.trim();
    if (!prompt) return toast('Describe the music first');
    try { await post('/api/ai/generate', { prompt, seconds: +$('aiLen').value }); state.wasPending = true; toast('Creating your music — it appears in your library when it is done'); }
    catch (e) { toast(e.message, 'error', 9000); }
  };
  const sel = $('rxSong');
  sel.append(new Option('Choose a song…', ''));
  for (const t of songs) sel.append(new Option(t.title + (t.artist ? ' — ' + t.artist : ''), t.id));
  sel.onchange = () => { const t = songs.find(x => x.id === +sel.value); if (t) { state.queue = [t]; playIndex(0); } };
  for (const [name, v] of REMIX_PRESETS) {
    const b = el('button', 'chip', name);
    b.onclick = () => change(() => Object.assign(remix, v));
    $('rxPresets').append(b);
  }
  const song = () => { const t = current(); return t && t.id ? t : null; };
  // every control goes through here: apply, then redraw the controls
  const change = fn => {
    if (!song()) return toast('Pick a song from your library first');
    fn(); applyRemix(); paintRemix();
  };
  $('rxSpeed').oninput = e => change(() => { remix.speed = +e.target.value; });
  $('rxBass').oninput = e => change(() => { remix.bass = +e.target.value; });
  $('rxRev').oninput = e => change(() => { remix.reverb = +e.target.value; });
  $('rxPan').onchange = e => change(() => { remix.pan = e.target.checked; });
  $('rxName').oninput = () => { remixNamed = true; };
  $('rxSave').onclick = async () => {
    const t = song();
    if (!t) return toast('Pick a song from your library first');
    if (!remixOn()) return toast('Change something first — it is still the original');
    const b = $('rxSave'); b.disabled = true;
    const note = toast('Saving the remix…', 'info', 0);
    try {
      const r = await post('/api/remix', { track_id: t.id, name: $('rxName').value.trim(), ...remix });
      toast(`Saved “${r.title}” to your library`);
      state.tracksKey = '';
    } catch (e) { toast(e.message, 'error'); }
    note.remove(); b.disabled = false;
  };
  paintRemix = () => {
    if (!$('rxSong')) return;
    const t = song(), cur = current();
    $('rxNow').textContent = t ? t.title : cur ? 'This song is not downloaded' : 'No song chosen';
    sel.value = t && songs.some(x => x.id === t.id) ? t.id : '';
    $('rxSpeed').value = remix.speed; $('rxBass').value = remix.bass; $('rxRev').value = remix.reverb; $('rxPan').checked = remix.pan;
    [$('rxSpeed'), $('rxBass'), $('rxRev')].forEach(fill);
    $('rxSpeedL').textContent = remix.speed === 1 ? 'Normal' : `${Math.round(remix.speed * 100)}% — ${remix.speed < 1 ? 'slower and deeper' : 'faster and higher'}`;
    $('rxBassL').textContent = remix.bass ? `+${remix.bass} dB` : 'Off';
    $('rxRevL').textContent = remix.reverb ? `${Math.round(remix.reverb * 100)}%` : 'Off';
    [...$('rxPresets').children].forEach((b, i) => b.classList.toggle('sel', samePreset(REMIX_PRESETS[i][1])));
    if (!remixNamed) $('rxName').value = t ? `${t.title} (${remixLabel()})` : '';
  };
  paintRemix();
}

// ------------------------------------------------------- spotify preview
// A Spotify link is shown as a wall of covers first, to check it is the
// right playlist and leave songs out, before anything is downloaded.
async function previewSpotify(url) {
  const s = state.spotify = { url, data: null, error: null, skip: new Set() };
  go({ type: 'spotify' });
  try { s.data = await api('/api/spotify/preview?url=' + encodeURIComponent(url)); }
  catch (e) { s.error = e.message; }
  if (state.spotify === s && state.view.type === 'spotify') renderSpotify();
}
function renderSpotify() {
  const s = state.spotify, main = $('main'), d = s && s.data;
  if (!s) return go({ type: 'home' });
  main.replaceChildren(hero('Spotify ' + (d ? d.kind : 'link'), d ? d.name : 'Reading Spotify…', 'music', 'linear-gradient(135deg,#1db954,#0f7a36)'));
  state.shown = [];
  if (s.error) return main.append(el('div', 'empty', s.error));
  if (!d) return main.append(el('div', 'empty', 'Reading the link…'));
  const chosen = () => d.tracks.filter(t => !s.skip.has(t.id));
  const dl = btn('btn', 'download', 'Download', async () => {
    try {
      await post('/api/import', { url: s.url, kind: 'video', skip: [...s.skip] });
      toast(`Downloading ${chosen().length} song(s) from “${d.name}”`);
      state.wasPending = true; state.spotify = null;
      go({ type: 'library' });
    } catch (e) { toast(e.message, 'error'); }
  });
  const label = () => { const n = chosen().length; dl.querySelector('span').textContent = n === d.tracks.length ? `Download all ${n}` : `Download ${n} of ${d.tracks.length}`; dl.disabled = !n; };
  $('heroAct').append(dl, btn('btn ghost', 'close', 'Not this', () => { state.spotify = null; go({ type: 'home' }); }));
  $('heroSub').textContent = `${d.tracks.length} song${d.tracks.length === 1 ? '' : 's'} — is this the right one? Click a cover to leave that song out.`;
  const grid = el('div', 'grid');
  for (const t of d.tracks) {
    const c = el('button', 'card sp' + (s.skip.has(t.id) ? ' off' : '')), img = el('img', 'tile');
    img.loading = 'lazy'; img.alt = '';
    img.onerror = () => { img.onerror = null; img.src = placeholder(t); };
    img.src = t.cover || `/api/spotify/cover/${t.id}`;
    c.append(img, el('b', null, t.title), el('small', null, (t.in_library ? '✓ in library · ' : '') + (t.artist || '')));
    c.onclick = () => { s.skip.has(t.id) ? s.skip.delete(t.id) : s.skip.add(t.id); c.classList.toggle('off', s.skip.has(t.id)); label(); };
    grid.append(c);
  }
  main.append(grid);
  label();
}

// ------------------------------------------------------ search / import
$('form').onsubmit = async e => {
  e.preventDefault();
  const q = $('q').value.trim();
  if (!q) return;
  $('q').blur();
  if (/open\.spotify\.com\//i.test(q)) { $('q').value = ''; return previewSpotify(/^https?:/i.test(q) ? q : 'https://' + q); }
  if (/^https?:\/\//i.test(q)) {
    try {
      await post('/api/import', { url: q, kind: 'video' });
      toast('Importing… tracks appear as they download');
      $('q').value = ''; state.wasPending = true;
      if (state.view.type !== 'library') go({ type: 'library' });
    } catch (err) { toast(err.message, 'error'); }
    return;
  }
  // The search and its results are kept, so the Search tab can be left and
  // come back to without searching again.
  const s = state.search = { q, res: null, error: null };
  go({ type: 'search' });
  try { s.res = await api('/api/search?q=' + encodeURIComponent(q)); s.res.forEach(t => { t.status = 'ready'; t.stream = true; }); }
  catch (err) { s.error = err.message; }
  if (state.search === s && state.view.type === 'search') renderSearch();
};
function renderSearch() {
  const s = state.search, main = $('main');
  main.replaceChildren(hero('YouTube search', s ? s.q : 'Search', 'search'));
  const box = el('div'); main.append(box);
  state.shown = [];
  if (!s) return box.append(el('div', 'empty', 'Type in the box at the top to search YouTube. Your results stay here while you look around.'));
  if (s.error) return box.append(el('div', 'empty', 'Search failed: ' + s.error));
  if (!s.res) return box.append(el('div', 'empty', 'Searching YouTube…'));
  const res = s.res;
  {
    $('heroSub').textContent = `${res.length} results — tap one to listen or watch without downloading, ⬇ to keep it, or drag it onto a folder`;
    box.replaceChildren();
    if (!res.length) box.append(el('div', 'empty', 'No results.'));
    res.forEach(t => { t.status = 'ready'; t.stream = true; });
    state.shown = res;
    const cur = current();
    res.forEach((t, i) => {
      const row = el('div', 'row playable'); row.style.animationDelay = i * 18 + 'ms';
      row.dataset.key = tkey(t);
      row.oncontextmenu = e => { e.preventDefault(); trackMenu(t, at(e)); };
      if (cur && tkey(cur) === tkey(t)) row.classList.add('current');
      row.onclick = () => askKind(row, t.title, ['Listen (audio only)', 'Watch video'], kind => {
        state.queue = res.map(x => ({ ...x, kind }));
        playIndex(res.indexOf(t));
      });
      const img = el('img'); img.loading = 'lazy'; img.alt = ''; setImg(img, t);
      const meta = el('div'); meta.append(el('div', 't', t.title), el('div', 'a', t.artist));
      const b = el('button', 'chip', t.in_library ? '✓ Added' : '⬇ Download');
      if (t.in_library) b.title = 'Show it in your library';
      b.onclick = e => { e.stopPropagation(); t.in_library ? locate(t) : saveStream(t); };
      row.append(el('div', 'n', i + 1), img, meta, el('div'), el('div', 'd', t.duration ? fmt(t.duration) : ''), el('div'));
      row.children[3].append(b);
      box.append(row);
    });
  }
}
// Open the place a downloaded song is kept (its folder, else the library)
// and point at it.
async function locate(t) {
  let w;
  try { w = await api('/api/where/' + t.video_id); }
  catch { return toast('That song is not in your library any more', 'error'); }
  await go(w.playlist ? { type: 'playlist', ...w.playlist } : { type: 'library' });
  const row = document.querySelector(`#main .row[data-key="${w.id}"]`);
  if (!row) return;
  pickAnchor = String(w.id); setPicked([pickAnchor]);
  row.scrollIntoView({ block: 'center', behavior: 'instant' });
}

// ---------------------------------------------------------------- upload
$('uploadBtn').onclick = () => $('file').click();
$('file').onchange = () => { uploadFiles([...$('file').files]); $('file').value = ''; };
async function uploadFiles(files) {
  files = files.filter(f => f.size);
  if (!files.length) return;
  const pl = state.view.type === 'playlist' ? state.view.id : null;
  const t = toast('', 'info', 0);
  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    t.textContent = `Uploading ${i + 1}/${files.length}: ${files[i].name}`;
    try {
      await api(`/api/upload?name=${encodeURIComponent(files[i].name)}${pl ? '&playlist=' + pl : ''}`, { method: 'POST', body: files[i] });
      ok++;
    } catch (err) { toast(err.message, 'error'); }
  }
  t.remove();
  if (ok) toast(`Added ${ok} file${ok === 1 ? '' : 's'}${pl ? ' to “' + state.view.name + '”' : ' to your library'}`);
  if (state.view.type === 'library' || state.view.type === 'playlist') reload(true); else go({ type: 'library' });
  state.tracksKey = '';
}
let dragDepth = 0;
addEventListener('dragenter', e => { if (e.dataTransfer?.types.includes('Files')) { dragDepth++; document.body.classList.add('dragging'); } });
addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => { e.preventDefault(); dragDepth = 0; document.body.classList.remove('dragging'); if (e.dataTransfer?.files.length) uploadFiles([...e.dataTransfer.files]); });

// -------------------------------------------------------------- playback
function playFrom(id, random = false) {
  const q = state.shown.filter(t => t.status === 'ready');
  if (!q.length) return toast('Nothing downloaded to play here yet');
  state.queue = q.slice();
  let i = q.findIndex(t => tkey(t) === id);
  if (i < 0) i = random ? Math.floor(Math.random() * q.length) : 0;
  playIndex(i);
}
function playNext(t) {
  if (!current()) { state.queue = [t]; return playIndex(0); }
  const cur = current();
  if (tkey(cur) === tkey(t)) return;
  state.queue = state.queue.filter(x => tkey(x) !== tkey(t));
  state.index = state.queue.indexOf(cur);
  state.queue.splice(state.index + 1, 0, t);
  toast(`“${t.title}” plays next`);
  renderQueue();
}
function addToQueue(t) {
  if (!current()) { state.queue = [t]; return playIndex(0); }
  if (state.queue.some(x => tkey(x) === tkey(t))) return toast('Already in the queue');
  state.queue.push(t);
  toast(`Added “${t.title}” to the queue`);
  renderQueue();
}
function playIndex(i, autoplay = true, startAt = 0) {
  state.index = i;
  const t = state.queue[i];
  if (!t.id && t.kind === 'video') t.vsrc = true;
  resetRemix();  // a remix preview belongs to the song it was made on
  audio.src = srcOf(t);
  applyRemix();
  if (startAt) audio.addEventListener('loadedmetadata', () => { audio.currentTime = startAt; }, { once: true });
  if (autoplay) audio.play().catch(() => {});
  $('nowT').textContent = $('npT').textContent = t.title;
  $('npA').textContent = t.artist || '';
  $('nowA').textContent = t.id ? (t.artist || '') : `${t.artist ? t.artist + ' · ' : ''}streaming, not downloaded`;
  $('saveBtn').hidden = $('npSave').hidden = !!t.id || !!t.in_library;
  const isVideo = modeOf(t) === 'video';
  paintMode(t);
  t.counted = false;
  paintLikes(); renderQueue();
  if (isVideo && autoplay && !wide()) openNp();
  setImg($('art'), t); setImg($('npArt'), t);
  $('npBg').style.backgroundImage = `url("${coverUrl(t)}")`;
  document.title = `${t.title} · Homelab Music`;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || '', artwork: [{ src: coverUrl(t), sizes: '320x180' }] });
  }
  markCurrent();
  if ($('np').classList.contains('open')) showLyrics();
}
function paintMode(t) {
  const mode = modeOf(t), video = mode === 'video';
  document.body.classList.toggle('is-video', video);
  $('fsBtn').hidden = !video;
  $('avTabs').hidden = !canVideo(t);
  $('avTabs').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.m === mode));
  if (!video) vizStart();
}
// Switch the current song between sound only and video, keeping the position.
function setMode(mode) {
  const t = current();
  if (!t || !canVideo(t) || modeOf(t) === mode) return;
  const before = srcOf(t), time = audio.currentTime, playing = !audio.paused;
  if (t.id) { prefs.avMode = mode; save('prefs', prefs); } else { t.kind = mode; if (mode === 'video') t.vsrc = true; }
  const after = srcOf(t);
  if (after !== before) {  // only a stream's first switch to video
    audio.src = after; applyRemix();
    audio.addEventListener('loadedmetadata', () => { audio.currentTime = time; }, { once: true });
    if (playing) audio.play().catch(() => {});
  }
  paintMode(t);
}
$('avTabs').onclick = e => { const m = e.target.closest('button')?.dataset.m; if (m) setMode(m); };

function next(auto = false) {
  const n = state.queue.length;
  if (!n) return;
  let i;
  if (state.shuffle && n > 1) { do { i = Math.floor(Math.random() * n); } while (i === state.index); }
  else i = state.index + 1;
  if (i >= n) { if (auto && !state.repeat) return; i = 0; }
  playIndex(i);
}
function prev() {
  if (audio.currentTime > 3 || state.index <= 0) { audio.currentTime = 0; return; }
  playIndex(state.index - 1);
}
function toggle() {
  if (!current()) return playFrom(null);
  audio.paused ? audio.play() : audio.pause();
}
function setShuffle(v) { state.shuffle = v; $$('.js-shuf').forEach(b => b.classList.toggle('on', v)); }
function setRepeat(v) { state.repeat = v; $$('.js-rep').forEach(b => b.classList.toggle('on', v)); }

audio.onended = () => {
  if (state.sleepMode === 'end') { setSleep('off'); toast('Sleep timer: stopped after this track'); return; }
  next(true);
};
audio.onerror = () => { const t = current(); if (t) toast(t.id ? 'Could not play this track' : 'Could not stream this track from YouTube', 'error'); };
$('saveBtn').onclick = $('npSave').onclick = () => { const t = current(); if (t && !t.id) saveStream(t); };
$('likeBtn').onclick = $('npLike').onclick = () => { const t = current(); if (t && t.id) toggleLike(t); };
$('fsBtn').onclick = () => { (audio.requestFullscreen || audio.webkitEnterFullscreen || (() => {})).call(audio); };
audio.ondblclick = () => $('fsBtn').onclick();
document.addEventListener('fullscreenchange', () => { audio.controls = document.fullscreenElement === audio; });
audio.onclick = () => toggle();
audio.onplay = audio.onpause = () => {
  $$('.js-play').forEach(b => { b.innerHTML = svg(audio.paused ? 'play' : 'pause'); });
  document.body.classList.toggle('playing', !audio.paused);
  if (!audio.paused) { ensureEq(); actx?.resume(); vizStart(); lyLoop(); }
};
let seeking = false, lastSave = 0;
audio.ontimeupdate = () => {
  const t = audio.currentTime, d = isFinite(audio.duration) ? audio.duration : 0;
  if (!seeking) $$('.js-seek').forEach(s => { s.value = t; fill(s); });
  $$('.js-cur').forEach(e => { e.textContent = fmt(t); });
  $('pbar').style.width = (d ? t / d * 100 : 0) + '%';
  syncLyrics(t);
  const cur = current();
  if (cur && cur.id && !cur.counted && t > 10) { cur.counted = true; post(`/api/tracks/${cur.id}/played`).catch(() => {}); state.tracksKey = ''; }
  if (prefs.resume && current()?.id && Date.now() - lastSave > 4000) { lastSave = Date.now(); save('last', { id: current().id, time: t }); }
};
audio.ondurationchange = () => {
  const d = isFinite(audio.duration) ? audio.duration : 0;
  $$('.js-seek').forEach(s => { s.max = d || 1; fill(s); });
  $$('.js-dur').forEach(e => { e.textContent = fmt(d); });
};
$$('.js-seek').forEach(s => {
  s.oninput = () => { seeking = true; fill(s); $$('.js-cur').forEach(e => { e.textContent = fmt(s.value); }); };
  s.onchange = () => { audio.currentTime = s.value; seeking = false; };
});
$('vol').oninput = () => { prefs.volume = audio.volume = +$('vol').value; fill($('vol')); save('prefs', prefs); };
$$('.js-play').forEach(b => { b.onclick = toggle; });
$$('.js-next').forEach(b => { b.onclick = () => next(); });
$$('.js-prev').forEach(b => { b.onclick = prev; });
$$('.js-shuf').forEach(b => { b.onclick = () => setShuffle(!state.shuffle); });
$$('.js-rep').forEach(b => { b.onclick = () => setRepeat(!state.repeat); });

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => audio.play());
  ms.setActionHandler('pause', () => audio.pause());
  ms.setActionHandler('nexttrack', () => next());
  ms.setActionHandler('previoustrack', prev);
  try { ms.setActionHandler('seekto', e => { audio.currentTime = e.seekTime; }); } catch {}
}
addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { if (rowEls().length) { e.preventDefault(); setPicked(rowEls().map(r => r.dataset.key)); } return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape' && picked.size && $('menu').hidden) return setPicked([]);
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  else if (e.code === 'ArrowRight') audio.currentTime += 5;
  else if (e.code === 'ArrowLeft') audio.currentTime -= 5;
  else if (e.key === 'n') next();
  else if (e.key === 'p') prev();
  else if (e.key === 'l') $('np').classList.contains('open') ? closeNp() : openNp();
  else if (e.key === 'q') toggleQueue();
  else if (e.key === 'Escape' && !$('settings').hidden) closeSettings();
  else if (e.key === 'Escape') { closeMenu(); if ($('queue').classList.contains('open')) toggleQueue(false); else if (!wide() || $('np').classList.contains('full')) closeNp(); }
  else if (e.key === '/') { e.preventDefault(); $('q').focus(); }
});

// Audio graph: source -> 10-band EQ -> analyser -> speakers. It is created
// only once the EQ or the visualizer is actually needed.
let actx, eqNodes, analyser;
const npOpen = () => $('np').classList.contains('open');
function ensureEq() {
  const wantEq = prefs.eqOn && prefs.eq.some(g => g), wantViz = prefs.viz !== 'off' && npOpen() && !!current();
  if (actx || !(wantEq || wantViz || remixOn())) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    let node = actx.createMediaElementSource(audio);
    eqNodes = EQ_F.map((f, i) => {
      const n = actx.createBiquadFilter();
      n.type = i === 0 ? 'lowshelf' : i === EQ_F.length - 1 ? 'highshelf' : 'peaking';
      n.frequency.value = f; n.Q.value = 1.4;
      node.connect(n); node = n;
      return n;
    });
    analyser = actx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = .8;
    // remix stage: bass shelf -> slow auto-pan -> dry signal + reverb
    const bass = actx.createBiquadFilter(), pan = actx.createStereoPanner(), verb = actx.createConvolver();
    const wet = actx.createGain(), lfo = actx.createOscillator(), depth = actx.createGain();
    bass.type = 'lowshelf'; bass.frequency.value = 110; bass.gain.value = 0;
    const len = Math.floor(actx.sampleRate * 2.6), ir = actx.createBuffer(2, len, actx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
    verb.buffer = ir; wet.gain.value = 0; depth.gain.value = 0; lfo.frequency.value = 0.09;
    lfo.connect(depth); depth.connect(pan.pan); lfo.start();
    node.connect(bass); bass.connect(pan); pan.connect(analyser); pan.connect(verb); verb.connect(wet); wet.connect(analyser);
    analyser.connect(actx.destination);
    fx = { bass, wet, depth };
    if (remixOn()) applyRemix();
    applyEq();
    if (!audio.paused) actx.resume();
  } catch { actx = null; }
}
function applyEq() { if (eqNodes) eqNodes.forEach((n, i) => { n.gain.value = prefs.eqOn ? prefs.eq[i] : 0; }); }

// Visualizer for audio tracks: bars, wave or a ring around the cover.
let vizRaf = 0, vizBuf;
function vizStart() {
  if (vizRaf || prefs.viz === 'off' || !npOpen() || audio.paused || showingVideo()) return;
  ensureEq();
  if (!analyser) return;
  actx.resume();
  vizBuf = vizBuf || new Uint8Array(analyser.frequencyBinCount);
  const step = () => {
    vizRaf = 0;
    const c = $('viz'), g = c.getContext('2d');
    if (prefs.viz === 'off' || !npOpen() || audio.paused || showingVideo()) { g.clearRect(0, 0, c.width, c.height); return; }
    drawViz(c, g);
    vizRaf = requestAnimationFrame(step);
  };
  vizRaf = requestAnimationFrame(step);
}
function drawViz(c, g) {
  const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
  if (!w || !h) return;
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  g.clearRect(0, 0, w, h);
  const [c1, c2] = vizColors;
  if (prefs.viz === 'wave') {
    analyser.getByteTimeDomainData(vizBuf);
    const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    g.lineWidth = 3 * dpr; g.strokeStyle = grad; g.lineJoin = 'round'; g.shadowColor = c1; g.shadowBlur = 12 * dpr;
    g.beginPath();
    const n = vizBuf.length;
    for (let i = 0; i < n; i += 2) { const x = i / (n - 1) * w, y = h * .55 + (vizBuf[i] - 128) / 128 * h * .42; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.shadowBlur = 0;
    return;
  }
  analyser.getByteFrequencyData(vizBuf);
  if (prefs.viz === 'circle') {
    const n = 72, cx = w / 2, cy = h / 2, r0 = w / 2.8 + 4 * dpr, max = w / 2 - r0;
    g.lineWidth = Math.max(2, w / 190); g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const k = i < n / 2 ? i : n - 1 - i;            // mirror so the ring is symmetric
      const v = vizBuf[2 + Math.floor(k * 1.6)] / 255, a = i / n * Math.PI * 2 - Math.PI / 2;
      const len = 3 * dpr + v * v * max;
      g.strokeStyle = i % 2 ? c1 : c2; g.globalAlpha = .45 + v * .55;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)); g.stroke();
    }
    g.globalAlpha = 1;
    return;
  }
  const n = 40, gap = w * .012, bw = (w - gap * (n + 1)) / n;
  const grad = g.createLinearGradient(0, h, 0, 0); grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  g.fillStyle = grad;
  for (let i = 0; i < n; i++) {
    const v = vizBuf[1 + Math.floor(i * 2.2)] / 255, bh = Math.max(2 * dpr, v * v * h * .95), x = gap + i * (bw + gap);
    g.globalAlpha = .55 + v * .45;
    g.beginPath(); g.roundRect ? g.roundRect(x, h - bh, bw, bh, bw / 2) : g.rect(x, h - bh, bw, bh); g.fill();
  }
  g.globalAlpha = 1;
}

// Queue panel
function toggleQueue(open) {
  const q = $('queue'); open = open ?? !q.classList.contains('open');
  q.classList.toggle('open', open); q.setAttribute('aria-hidden', String(!open));
  if (open) renderQueue();
}
function renderQueue() {
  const list = $('qList');
  if (!$('queue').classList.contains('open')) return;
  list.replaceChildren();
  if (!state.queue.length) { list.append(el('div', 'dr-empty', 'The queue is empty. Play something, or use ⋯ → Add to queue.')); return; }
  state.queue.forEach((t, i) => {
    const it = el('div', 'q-item' + (i === state.index ? ' current' : i < state.index ? ' done' : '')); it.dataset.i = i;
    const handle = el('button', 'icon-btn q-drag'); handle.innerHTML = svg('drag'); handle.title = 'Drag to reorder';
    const img = el('img'); img.alt = ''; img.loading = 'lazy'; setImg(img, t);
    const meta = el('div'); meta.append(el('div', 't', t.title), el('div', 'a', t.artist || ''));
    const rm = btn('icon-btn', 'close', '', e => { e.stopPropagation(); removeQueueAt(i); }); rm.title = 'Remove from queue';
    it.onclick = () => playIndex(i);
    it.oncontextmenu = e => { e.preventDefault(); trackMenu(t, at(e)); };
    handle.onclick = e => e.stopPropagation();
    handle.onpointerdown = e => {
      e.preventDefault(); handle.setPointerCapture(e.pointerId); it.classList.add('dragging');
      const move = ev => {
        const before = [...list.children].find(c => c !== it && ev.clientY < c.getBoundingClientRect().top + c.offsetHeight / 2);
        list.insertBefore(it, before || null);
      };
      const up = () => {
        handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up);
        const cur = current();
        state.queue = [...list.children].map(c => state.queue[+c.dataset.i]);
        state.index = state.queue.indexOf(cur);
        renderQueue();
      };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    };
    it.append(handle, img, meta, rm);
    list.append(it);
  });
  list.querySelector('.current')?.scrollIntoView({ block: 'nearest' });
}
$('queueBtn').onclick = $('npQueue').onclick = () => toggleQueue();
$('qClose').onclick = () => toggleQueue(false);
$('qClear').onclick = () => { const cur = current(); state.queue = cur ? [cur] : []; state.index = cur ? 0 : -1; renderQueue(); };

// Graphic EQ: a response curve whose band handles are dragged up and down.
function buildEq(host, onChange) {
  const W = 600, H = 250, L = 34, R = 12, T = 18, B = 34, n = EQ_F.length, cw = (W - L - R) / n;
  const X = i => L + cw * (i + .5), Y = g => T + (12 - g) / 24 * (H - T - B);
  const label = f => f >= 1000 ? f / 1000 + 'k' : String(f);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="eq" role="group" aria-label="Equaliser"><defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.5"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient><linearGradient id="eql" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent2)"/></linearGradient></defs>`;
  for (const db of [12, 6, 0, -6, -12]) s += `<line class="eq-grid${db ? '' : ' zero'}" x1="${L}" x2="${W - R}" y1="${Y(db)}" y2="${Y(db)}"/><text class="eq-db" x="${L - 8}" y="${Y(db) + 4}" text-anchor="end">${db > 0 ? '+' : ''}${db}</text>`;
  s += '<path class="eq-fill" fill="url(#eqg)"/><path class="eq-line" stroke="url(#eql)"/>';
  EQ_F.forEach((f, i) => {
    s += `<line class="eq-track" x1="${X(i)}" x2="${X(i)}" y1="${T}" y2="${H - B}"/><text class="eq-f" x="${X(i)}" y="${H - 10}" text-anchor="middle">${label(f)}</text><circle class="eq-dot" cx="${X(i)}" r="7" data-i="${i}" tabindex="0" role="slider" aria-label="${f} Hz" aria-valuemin="-12" aria-valuemax="12"/><rect class="eq-hit" data-i="${i}" x="${X(i) - cw / 2}" y="0" width="${cw}" height="${H - B + 8}"/>`;
  });
  host.innerHTML = s + '</svg>';
  const el2 = host.firstChild, line = el2.querySelector('.eq-line'), area = el2.querySelector('.eq-fill'), dots = [...el2.querySelectorAll('.eq-dot')];
  const update = () => {
    const pts = prefs.eq.map((g, i) => [X(i), Y(g)]);
    const P = [[L, pts[0][1]], ...pts, [W - R, pts[n - 1][1]]];
    const cl = y => Math.max(T, Math.min(H - B, y));
    let d = `M${P[0]}`;
    for (let k = 0; k < P.length - 1; k++) {
      const p0 = P[k - 1] || P[k], p1 = P[k], p2 = P[k + 1], p3 = P[k + 2] || p2;
      d += `C${p1[0] + (p2[0] - p0[0]) / 6},${cl(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${cl(p2[1] - (p3[1] - p1[1]) / 6)} ${p2}`;
    }
    line.setAttribute('d', d);
    area.setAttribute('d', `${d}L${W - R},${H - B}L${L},${H - B}Z`);
    dots.forEach((c, i) => { c.setAttribute('cy', Y(prefs.eq[i])); c.setAttribute('aria-valuenow', prefs.eq[i]); });
    el2.classList.toggle('off', !prefs.eqOn);
  };
  const set = (i, g) => { prefs.eq[i] = Math.max(-12, Math.min(12, Math.round(g))); update(); onChange(i); };
  let drag = -1;
  const fromEvent = e => { const r = el2.getBoundingClientRect(); set(drag, 12 - ((e.clientY - r.top) / r.height * H - T) / (H - T - B) * 24); };
  el2.addEventListener('pointerdown', e => {
    const i = e.target.dataset?.i; if (i == null) return;
    drag = +i; el2.setPointerCapture(e.pointerId); dots[drag].classList.add('drag'); fromEvent(e); e.preventDefault();
  });
  el2.addEventListener('pointermove', e => { if (drag >= 0) fromEvent(e); });
  const end = () => { if (drag >= 0) dots[drag].classList.remove('drag'); drag = -1; };
  el2.addEventListener('pointerup', end); el2.addEventListener('pointercancel', end);
  el2.addEventListener('dblclick', e => { const i = e.target.dataset?.i; if (i != null) set(+i, 0); });
  el2.addEventListener('keydown', e => {
    const i = e.target.dataset?.i; if (i == null) return;
    const step = { ArrowUp: 1, ArrowDown: -1 }[e.key]; if (!step) return;
    e.preventDefault(); e.stopPropagation(); set(+i, prefs.eq[+i] + step);
  });
  update();
  return update;
}

// sleep timer
function setSleep(mode) {
  clearTimeout(state.sleepTimer); state.sleepMode = mode;
  if (+mode) state.sleepTimer = setTimeout(() => { audio.pause(); state.sleepMode = 'off'; toast('Sleep timer: playback paused'); const s = $('setSleep'); if (s) s.value = 'off'; }, mode * 60000);
}

// ---------------------------------------------------- now playing/lyrics
const lyricsCache = new Map();
let lyLines = [], lyActive = -1;
// On wide screens this is the right-hand panel: open, collapsed to a strip
// with an arrow, or expanded over the whole window ("full").
const wideMq = matchMedia('(min-width:1001px)');
const wide = () => wideMq.matches;
function openNp(full = false) {
  const np = $('np');
  np.classList.add('open'); np.classList.toggle('full', full === true && wide());
  np.setAttribute('aria-hidden', 'false');
  if (wide() && !prefs.panel) { prefs.panel = true; save('prefs', prefs); }
  showLyrics(); vizStart(); lyLoop();
}
function closeNp() {
  const np = $('np');
  if (np.classList.contains('full')) { np.classList.remove('full'); return; }  // back to the side panel
  np.classList.remove('open'); np.setAttribute('aria-hidden', 'true');
  np.style.removeProperty('--npw');  // a resized panel reopens at its normal size
  if (wide() && prefs.panel) { prefs.panel = false; save('prefs', prefs); }
}
// Drag the panel's left edge to make it wider or narrower (double-click: normal).
{
  const np = $('np'), grip = el('div', 'np-grip');
  grip.title = 'Drag to resize';
  np.append(grip);
  grip.onpointerdown = e => {
    if (e.button !== 0) return;
    e.preventDefault(); grip.setPointerCapture(e.pointerId); np.classList.add('resizing');
    const move = ev => np.style.setProperty('--npw', Math.max(260, Math.min(innerWidth - ev.clientX, innerWidth - 620)) + 'px');
    const up = () => { np.classList.remove('resizing'); grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up); };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
  };
  grip.ondblclick = () => np.style.removeProperty('--npw');
}
$('openNp').onclick = () => npOpen() && wide() ? $('np').classList.toggle('full') : openNp();
$('lyricsBtn').onclick = () => npOpen() ? closeNp() : openNp();
$('npRail').onclick = () => openNp();
$('npFull').onclick = () => $('np').classList.toggle('full');
wideMq.addEventListener('change', () => {
  $('np').classList.remove('full', 'open');
  if (wide() && prefs.panel) openNp();
});
$('closeNp').onclick = closeNp;
$('npMore').onclick = e => { const t = current(); if (t) trackMenu(t, e.currentTarget); };
$('lyRefetch').onclick = () => showLyrics(true);
$('lySave').onclick = () => {
  const t = current(), d = t && lyricsCache.get(tkey(t));
  if (!d || !d.lyrics) return toast('No lyrics to save');
  const a = el('a'); a.href = URL.createObjectURL(new Blob([d.lyrics], { type: 'text/plain' }));
  a.download = `${t.artist ? t.artist + ' - ' : ''}${t.title}.${d.state === 'synced' ? 'lrc' : 'txt'}`.replace(/[\\/:*?"<>|]/g, '_');
  a.click(); URL.revokeObjectURL(a.href);
};

async function showLyrics(refresh = false) {
  const t = current(), box = $('lyrics');
  if (!t) { box.className = 'lyrics'; box.replaceChildren(el('p', 'msg', 'Play something to see its lyrics.')); return; }
  const key = tkey(t);
  if (!refresh && state.lyricsFor === key) return;
  state.lyricsFor = key; lyLines = []; lyActive = -1; lyOffset = 0; paintOffset();
  box.className = 'lyrics'; box.replaceChildren(el('p', 'msg', 'Looking for lyrics…'));
  let d = !refresh && lyricsCache.get(key);
  if (!d) {
    const url = t.id ? `/api/tracks/${t.id}/lyrics${refresh ? '?refresh=1' : ''}`
      : `/api/lyrics/lookup?title=${encodeURIComponent(t.title)}&artist=${encodeURIComponent(t.artist || '')}&duration=${t.duration || 0}`;
    try { d = await api(url); lyricsCache.set(key, d); }
    catch (err) { if (state.lyricsFor === key) { state.lyricsFor = null; box.replaceChildren(el('p', 'msg', err.message)); } return; }
  }
  if (state.lyricsFor !== key) return;
  lyOffset = d.offset || 0;
  box.replaceChildren(); box.scrollTop = 0;
  if (!d.lyrics) {
    box.append(el('p', 'msg', 'No lyrics found for this track. If the title or artist looks wrong, fix it with ⋯ → Edit title / artist, then Re-fetch.'));
    return;
  }
  if (d.state === 'synced') {
    box.classList.add('synced');
    // LRC files may carry an [offset:ms] tag, several time stamps on one
    // line, and word-level <mm:ss.xx> stamps; handle all three.
    let tagOffset = 0;
    const rows = [];
    for (const line of d.lyrics.split('\n')) {
      const off = line.match(/^\[offset:\s*([+-]?\d+)\]/i);
      if (off) { tagOffset = -off[1] / 1000; continue; }
      const stamps = [...line.matchAll(/\[(\d+):(\d+(?:[.:]\d+)?)\]/g)];
      if (!stamps.length) continue;
      const text = line.replace(/\[\d+:\d+(?:[.:]\d+)?\]/g, '').replace(/<\d+:\d+(?:\.\d+)?>/g, '').replace(/\s+/g, ' ').trim();
      for (const m of stamps) rows.push({ time: m[1] * 60 + parseFloat(m[2].replace(':', '.')) + tagOffset, text });
    }
    rows.sort((a, b) => a.time - b.time);
    for (const r of rows) {
      const p = el('p', null, r.text || '♪');
      p.onclick = () => { audio.currentTime = Math.max(0, r.time + lyOffset); audio.play(); };
      box.append(p); lyLines.push({ time: r.time, p });
    }
    paintOffset();
    syncLyrics(audio.currentTime); lyLoop();
  } else {
    box.classList.add('plain');
    for (const line of d.lyrics.split('\n')) box.append(el('p', null, line || ' '));
  }
}
let lyOffset = 0, lyRaf = 0, lyOffTimer;
function syncLyrics(t) {
  if (!lyLines.length || !npOpen()) return;
  let i = -1;
  for (let k = 0; k < lyLines.length && lyLines[k].time + lyOffset <= t + 0.1; k++) i = k;
  if (i === lyActive) return;
  if (lyActive >= 0 && lyLines[lyActive]) lyLines[lyActive].p.classList.remove('on');
  lyActive = i;
  if (i < 0) return;
  const p = lyLines[i].p, box = $('lyrics');
  p.classList.add('on');
  // Scroll only the lyrics box (scrollIntoView would also move the whole sheet).
  box.scrollTo({ top: p.offsetTop - box.clientHeight / 2 + p.offsetHeight / 2, behavior: 'smooth' });
}
// timeupdate only fires a few times a second; follow the song every frame instead.
function lyLoop() {
  if (lyRaf) return;
  const step = () => {
    lyRaf = 0;
    if (!npOpen() || audio.paused || !lyLines.length) return;
    syncLyrics(audio.currentTime);
    lyRaf = requestAnimationFrame(step);
  };
  lyRaf = requestAnimationFrame(step);
}
function paintOffset() {
  $('lySync').hidden = !lyLines.length;
  $('lyOff').textContent = (lyOffset > 0 ? '+' : '') + lyOffset.toFixed(1) + 's';
}
function nudgeLyrics(d) {
  const t = current(); if (!t) return;
  lyOffset = Math.max(-30, Math.min(30, Math.round((lyOffset + d) * 10) / 10));
  paintOffset(); syncLyrics(audio.currentTime);
  const c = lyricsCache.get(tkey(t)); if (c) c.offset = lyOffset;
  if (t.id) { clearTimeout(lyOffTimer); lyOffTimer = setTimeout(() => api(`/api/tracks/${t.id}/lyrics`, { method: 'PUT', body: { offset: lyOffset } }).catch(() => {}), 500); }
}
$('lyEarlier').onclick = () => nudgeLyrics(-0.5);
$('lyLater').onclick = () => nudgeLyrics(0.5);
$('lyUpload').onclick = () => { if (!current()) return toast('Play a song first'); $('lyFile').click(); };
$('lyFile').onchange = async () => {
  const f = $('lyFile').files[0], t = current(); $('lyFile').value = '';
  if (!f || !t) return;
  if (f.size > 500000) return toast('That file is too large to be lyrics', 'error');
  try {
    const text = (await f.text()).replace(/\r\n/g, '\n').trim();
    const d = t.id ? await api(`/api/tracks/${t.id}/lyrics`, { method: 'PUT', body: { lyrics: text } })
      : { state: /^\[\d+:\d+/m.test(text) ? 'synced' : 'plain', lyrics: text, offset: 0 };
    lyricsCache.set(tkey(t), d); state.lyricsFor = null; showLyrics();
    toast(d.state === 'synced' ? 'Synced lyrics added' : 'Lyrics added (no time stamps, so they will not scroll)');
  } catch (e) { toast(e.message, 'error'); }
};

// -------------------------------------------------------------- settings
const bytes = n => n > 1e9 ? (n / 1e9).toFixed(2) + ' GB' : (n / 1e6).toFixed(1) + ' MB';
const sw = id => `<span class="switch"><input type="checkbox" id="${id}"><i></i></span>`;
const SET_CATS = [
  ['appearance', 'Appearance', 'palette', 'How the player looks on this device.'],
  ['playback', 'Playback', 'play', 'How music plays on this device.'],
  ['equaliser', 'Equaliser', 'tune', 'Shape the sound. Saved on this device.'],
  ['downloads', 'Downloads', 'download', 'What gets saved to the server from YouTube and Spotify.'],
  ['lyrics', 'Lyrics', 'lyrics', 'Where lyrics come from.'],
  ['accounts', 'Accounts & security', 'lock', 'Spotify access and the password lock.'],
  ['library', 'Library', 'music', 'What is stored on the server.'],
];
function openSettings(cat) {
  if (cat) state.setCat = cat;
  $('settings').hidden = false;
  renderSettings();
}
function closeSettings() { $('settings').hidden = true; }
$('setBtn').onclick = () => openSettings();
$('setClose').onclick = closeSettings;
$('settings').onclick = e => { if (e.target === $('settings')) closeSettings(); };
function showSetCat(cat) {
  state.setCat = cat;
  const info = SET_CATS.find(c => c[0] === cat);
  $$('#setNav button').forEach(b => b.classList.toggle('sel', b.dataset.cat === cat));
  $$('#setPane [data-cat]').forEach(b => { b.hidden = b.dataset.cat !== cat; });
  $('catTitle').textContent = info[1]; $('catSub').textContent = info[3];
  $('setPane').scrollTop = 0;
}
async function renderSettings() {
  const pane = $('setPane'), nav = $('setNav');
  pane.replaceChildren(); nav.replaceChildren();
  for (const [id, label, icon] of SET_CATS) {
    const b = el('button'); b.dataset.cat = id; b.innerHTML = svg(icon); b.append(el('span', null, label));
    b.onclick = () => showSetCat(id); nav.append(b);
  }
  const wrap = el('div', 'set');
  wrap.innerHTML = `
  <div><h2 class="cat-title" id="catTitle"></h2><p class="cat-sub" id="catSub"></p></div>
  <div class="box" data-cat="appearance"><h3>Theme</h3>
    <div class="field"><div><b>Mode</b></div><div class="seg" id="setTheme"><button data-v="dark">Dark</button><button data-v="light">Light</button><button data-v="amoled">Black</button></div></div>
    <div class="field"><div><b>Accent colour</b></div><div class="swatches" id="setAccent"></div></div>
  </div>
  <div class="box" data-cat="appearance"><h3>Layout &amp; effects</h3>
    <div class="field"><div><b>Animated background</b><small>Slow drifting colour glow</small></div>${sw('setAnim')}</div>
    <div class="field"><div><b>Compact rows</b><small>Fit more tracks on screen</small></div>${sw('setCompact')}</div>
    <div class="field"><div><b>Visualizer</b><small>Sound effect shown for audio in Now Playing</small></div><div class="seg" id="setViz"><button data-v="bars">Bars</button><button data-v="circle">Ring</button><button data-v="wave">Wave</button><button data-v="off">Off</button></div></div>
  </div>
  <div class="box" data-cat="playback"><h3>Listening</h3>
    <div class="field"><div><b>Speed</b><small id="spdLbl"></small></div><input type="range" id="setSpeed" min="0.5" max="2" step="0.05"></div>
    <div class="field"><div><b>Sleep timer</b><small>Pause playback automatically</small></div><select id="setSleep"><option value="off">Off</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="end">End of this track</option></select></div>
    <div class="field"><div><b>Resume where I left off</b><small>Reopen the last track and position</small></div>${sw('setResume')}</div>
  </div>
  <div class="box" data-cat="playback"><h3>Keyboard &amp; mouse</h3>
    <div class="field"><div><small><kbd>Space</kbd> play/pause · <kbd>←</kbd> <kbd>→</kbd> seek 5s · <kbd>N</kbd> next · <kbd>P</kbd> previous · <kbd>L</kbd> lyrics · <kbd>Q</kbd> queue · <kbd>/</kbd> search · right-click a track for its menu · drag across the list to select, <kbd>Ctrl</kbd>/<kbd>Shift</kbd>-click to add, <kbd>Ctrl</kbd>+<kbd>A</kbd> for all · drag tracks onto a folder to put them there</small></div></div>
  </div>
  <div class="box" data-cat="equaliser"><h3>10-band equaliser</h3>
    <div class="field"><div><b>Enable equaliser</b><small id="eqRead">Drag the points up or down · double-tap a point to reset it</small></div>${sw('eqOn')}</div>
    <div class="eq-bar"><select id="eqPreset" aria-label="Preset"></select><button class="chip" id="eqReset">Reset</button></div>
    <div id="eqBox" class="eq-box"></div>
  </div>
  <div class="box" data-cat="downloads"><h3>YouTube</h3>
    <div class="field"><div><b>Downloads</b><small>Always saved with the video when there is one (sound only otherwise), so you can switch any time</small></div></div>
    <div class="field"><div><b>Playing a search result</b><small>What a tap does before the song is downloaded</small></div><select id="setYt"><option value="ask">Ask every time</option><option value="audio">Listen (audio)</option><option value="video">Watch (video)</option></select></div>
    <div class="field"><div><b>Audio format</b><small>Applies to new downloads</small></div><select id="setFormat"><option value="best">Best — YouTube's top stream, untouched</option><option value="m4a">M4A / AAC — plays everywhere</option><option value="mp3">MP3 — most compatible, larger</option><option value="opus">Opus — smallest, newer devices</option></select></div>
  </div>
  <div class="box" data-cat="downloads"><h3>Maintenance</h3>
    <div class="field"><div><b>Retry failed downloads</b><small id="failLbl"></small></div><button class="btn ghost" id="retryAll">Retry</button></div>
    <div class="field"><div><b>Upgrade old songs</b><small>Downloads again every song that was saved below the best quality. A song is unavailable for the few seconds it is being replaced; if its download fails, the old file is kept.</small></div><button class="btn ghost" id="upAll">Upgrade</button></div>
  </div>
  <div class="box" data-cat="downloads"><h3>Song names</h3>
    <div class="field"><div><b>Tidy names of new downloads</b><small>Drops clutter such as “(Official Video)”, “| lyrics” and #tags from YouTube titles, and reads “Artist - Title”. Version notes like (Remix) or (Slowed) stay.</small></div>${sw('setClean')}</div>
    <div class="field"><div><b>Songs already in the library</b><small>Tidy them the same way, or put back the names they were downloaded with</small></div><button class="btn ghost" id="restoreNames">Restore originals</button><button class="btn ghost" id="cleanAll">Tidy now</button></div>
  </div>
  <div class="box" data-cat="lyrics"><h3>Automatic lyrics</h3>
    <div class="field"><div><b>Download lyrics automatically</b><small>Looks up each new track on LRCLIB</small></div>${sw('setAutoLy')}</div>
    <div class="field"><div><b>Fetch missing lyrics</b><small>For tracks already in the library</small></div><button class="btn ghost" id="lyAll">Fetch now</button></div>
  </div>
  <div class="box" data-cat="lyrics"><h3>Your own lyrics</h3>
    <div class="field"><div><small>Open a song's Now Playing screen and press <b style="display:inline">Upload</b> to use a .lrc or .txt file from this device. If lyrics run early or late, the − and + buttons there shift them; the shift is remembered per song.</small></div></div>
  </div>
  <div class="box" data-cat="accounts"><h3>Spotify</h3>
    <div class="field"><div><b>API credentials (optional)</b><small>Only needed for playlists over 100 tracks. Create an app at developer.spotify.com/dashboard.</small></div></div>
    <div class="field"><div><label for="spId">Client ID</label></div><input type="text" id="spId" autocomplete="off"></div>
    <div class="field"><div><label for="spSecret">Client secret</label></div><input type="password" id="spSecret" autocomplete="new-password"></div>
    <div class="field"><div></div><button class="btn" id="spSave">Save</button></div>
  </div>
  <div class="box" data-cat="accounts"><h3>Password lock</h3>
    <div class="field"><div><b>Status</b><small id="pwState">Checking…</small></div></div>
    <div class="field"><div><label for="pwNew">New password</label><small>At least 4 characters. Other devices are signed out when it changes.</small></div><input type="password" id="pwNew" autocomplete="new-password"></div>
    <div class="field"><div></div><button class="btn ghost" id="pwRemove" hidden>Remove password</button><button class="btn ghost" id="logout" hidden>Log out</button><button class="btn" id="pwSave">Save password</button></div>
  </div>
  <div class="box" data-cat="library"><h3>Storage</h3><div class="stats" id="stats"></div></div>`;
  pane.append(wrap);
  showSetCat(state.setCat || 'appearance');

  // appearance
  const seg = $('setTheme');
  const paintSeg = () => seg.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === prefs.theme));
  seg.onclick = e => { const v = e.target.dataset.v; if (!v) return; prefs.theme = v; applyPrefs(); paintSeg(); };
  paintSeg();
  const sws = $('setAccent');
  const paintSw = () => sws.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.c === prefs.accent));
  for (const [c, c2] of ACCENTS) { const b = el('button'); b.dataset.c = c; b.style.background = `linear-gradient(135deg,${c},${c2})`; b.title = c; b.onclick = () => { prefs.accent = c; applyPrefs(); paintSw(); }; sws.append(b); }
  const custom = el('input'); custom.type = 'color'; custom.value = prefs.accent; custom.title = 'Custom colour';
  custom.oninput = () => { prefs.accent = custom.value; applyPrefs(); paintSw(); };
  sws.append(custom); paintSw();
  const bind = (id, key) => { const c = $(id); c.checked = prefs[key]; c.onchange = () => { prefs[key] = c.checked; applyPrefs(); }; };
  bind('setAnim', 'anim'); bind('setCompact', 'compact'); bind('setResume', 'resume');
  const vz = $('setViz');
  const paintVz = () => vz.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === prefs.viz));
  vz.onclick = e => { const v = e.target.dataset.v; if (!v) return; prefs.viz = v; applyPrefs(); paintVz(); vizStart(); };
  paintVz();
  $('setYt').value = prefs.ytMode; $('setYt').onchange = e => { prefs.ytMode = e.target.value; applyPrefs(); };

  // playback
  const spd = $('setSpeed'); spd.value = prefs.speed;
  const spdLbl = () => { $('spdLbl').textContent = (+spd.value).toFixed(2) + '×'; fill(spd); };
  spd.oninput = () => { prefs.speed = +spd.value; applyPrefs(); spdLbl(); }; spdLbl();
  const preset = $('eqPreset');
  for (const name of [...Object.keys(EQ_PRESETS), 'Custom']) preset.append(new Option(name, name));
  const eqCommit = () => { preset.value = prefs.eqPreset; $('eqOn').checked = prefs.eqOn; ensureEq(); applyPrefs(); };
  const eqDraw = buildEq($('eqBox'), i => {
    prefs.eqPreset = 'Custom'; prefs.eqOn = true; eqCommit(); eqDraw();
    const f = EQ_F[i], g = prefs.eq[i];
    $('eqRead').textContent = `${f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz'}  ${g > 0 ? '+' : ''}${g} dB`;
  });
  const usePreset = name => { prefs.eq = EQ_PRESETS[name].slice(); prefs.eqPreset = name; eqCommit(); eqDraw(); };
  preset.onchange = () => { if (EQ_PRESETS[preset.value]) { prefs.eqOn = true; usePreset(preset.value); } };
  $('eqReset').onclick = () => usePreset('Flat');
  $('eqOn').onchange = e => { prefs.eqOn = e.target.checked; eqCommit(); eqDraw(); };
  eqCommit();
  $('setSleep').value = state.sleepMode;
  $('setSleep').onchange = e => { setSleep(e.target.value); if (e.target.value !== 'off') toast('Sleep timer set'); };

  // server settings
  let s;
  try { s = await api('/api/settings'); } catch (err) { return toast(err.message, 'error'); }
  if ($('settings').hidden) return;
  const put = body => api('/api/settings', { method: 'PUT', body }).then(() => toast('Saved')).catch(e => toast(e.message, 'error'));
  $('setFormat').value = s.format; $('setFormat').onchange = e => put({ format: e.target.value });
  $('setAutoLy').checked = s.auto_lyrics; $('setAutoLy').onchange = e => put({ auto_lyrics: e.target.checked });
  $('spId').value = s.spotify_client_id || '';
  $('spSecret').placeholder = s.spotify_secret_set ? '•••••••• (saved)' : '';
  $('spSave').onclick = () => { const body = { spotify_client_id: $('spId').value }; if ($('spSecret').value) body.spotify_client_secret = $('spSecret').value; put(body); $('spSecret').value = ''; };
  const pwUi = on => { $('pwState').textContent = on ? 'On — a password is required to open this library.' : 'Off — anyone on your network can open this library.'; $('pwRemove').hidden = $('logout').hidden = !on; };
  pwUi(s.password_set);
  const setPw = async password => {
    try { const r = await api('/api/password', { method: 'PUT', body: { password } }); $('pwNew').value = ''; pwUi(r.password_set); toast(r.password_set ? 'Password saved' : 'Password removed'); }
    catch (e) { toast(e.message, 'error'); }
  };
  $('pwSave').onclick = () => { const v = $('pwNew').value; if (v.length < 4) return toast('Password must be at least 4 characters', 'error'); setPw(v); };
  $('pwRemove').onclick = async () => { if (await confirmBox('Remove the password?', 'Anyone on your network will be able to open this library.', 'Remove')) setPw(''); };
  $('logout').onclick = async () => { await post('/api/logout'); location.reload(); };
  $('failLbl').textContent = `${s.stats.failed} failed track${s.stats.failed === 1 ? '' : 's'}`;
  $('setClean').checked = s.clean_names; $('setClean').onchange = e => put({ clean_names: e.target.checked });
  const after = () => { state.tracksKey = ''; lyricsCache.clear(); if (isList(state.view)) reload(true); };
  $('upAll').onclick = async () => { try { await post('/api/upgrade'); state.wasPending = true; toast('Checking which songs can be upgraded…'); } catch (e) { toast(e.message, 'error'); } };
  $('cleanAll').onclick = async () => { try { const r = await post('/api/clean-names'); toast(r.count ? `Tidied ${r.count} name(s)` : 'Every name is already tidy'); after(); } catch (e) { toast(e.message, 'error'); } };
  $('restoreNames').onclick = async () => { try { const r = await post('/api/restore-names'); toast(r.count ? `Restored ${r.count} name(s)` : 'Nothing to restore'); after(); } catch (e) { toast(e.message, 'error'); } };
  $('retryAll').onclick = async () => { const r = await post('/api/retry-failed'); state.wasPending = true; toast(`Retrying ${r.count} track(s)`); };
  $('lyAll').onclick = async () => { const r = await post('/api/lyrics/all'); toast(r.count ? `Looking up lyrics for ${r.count} track(s) in the background` : 'Every track has already been checked'); };
  const st = $('stats');
  for (const [v, l] of [[s.stats.tracks, 'Tracks'], [s.stats.folders, 'Folders'], [s.stats.lyrics, 'With lyrics'], [bytes(s.stats.bytes), 'Storage used']]) { const d = el('div'); d.append(el('b', null, v), el('small', null, l)); st.append(d); }
}

// ----------------------------------------------------------------- login
function showLogin() {
  if (!$('login').hidden) return;
  audio.pause(); $('login').hidden = false; $('loginPw').focus();
}
$('loginForm').onsubmit = async e => {
  e.preventDefault(); $('loginErr').textContent = '';
  try { await post('/api/login', { password: $('loginPw').value }); location.reload(); }
  catch (err) { $('loginErr').textContent = err.message; $('loginPw').select(); }
};

// ------------------------------------------------------------ navigation
$$('.side .nav[data-view], .tabs button').forEach(b => { b.onclick = () => b.dataset.view === 'settings' ? openSettings() : go({ type: b.dataset.view }); });
$('newFolder').onclick = newFolder;

// ------------------------------------------------------------------ poll
let firstPoll = true;
async function poll() {
  try {
    const s = await api('/api/status');
    for (const ev of s.events) if (ev.id > state.lastEvent) { state.lastEvent = ev.id; if (!firstPoll) toast(ev.msg, ev.level); }
    state.downloads = (s.downloads || []).filter(d => !gone.has(d.id));
    paintDownloads();
    state.ai = s.ai || []; paintAi();
    if (s.pending || state.wasPending) await reload();
    state.wasPending = s.pending > 0;
  } catch {}
  firstPoll = false;
  setTimeout(poll, state.wasPending ? 1000 : 2500);  // faster while something downloads
}

// ------------------------------------------------------------------ init
applyPrefs();
$$('input[type=range]').forEach(fill);
if (wide() && prefs.panel) openNp();
(async () => {
  try { const a = await api('/api/auth'); if (a.required && !a.authed) return showLogin(); } catch {}
  await go({ type: 'home' });
  const last = prefs.resume && load('last', null);
  if (last) {
    const q = (state.home?.all || []).filter(t => t.status === 'ready');
    const i = q.findIndex(t => t.id === last.id);
    if (i >= 0) { state.queue = q; playIndex(i, false, last.time || 0); }
  }
  poll();
})();
