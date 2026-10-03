/* Family Presentation: a guided, touch-friendly 3D walkthrough of the approved design.
   Runs on the realistic scene (render.js) and the same APT data as the plans. Modes: tour (default) and explore (free camera). */
window.APTFAM = (function () {
  const A = window.APT; let R, H, cam, controls, root, view, labelsEl, planEl, planSvg, planHL, planCam, status;
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const shotById = id => A.shots.find(s => s.id === id);
  const SCREENS = [
    { id: 'overview', n: '01', title: 'Apartment Overview', sub: 'Three bedrooms · salon and dining', desc: 'The whole apartment seen from above with every piece of furniture in its place. Ceilings are 2.65 m throughout; the existing floors are kept.', cams: ['fam-overview', 'fam-overview-2'], rooms: [], others: 'full', ic: '🏠', short: 'Overview', overview: true },
    { id: 'master', n: '02', title: 'Master Bedroom', sub: 'Bed + Wardrobe + Dressing Wall', desc: 'A 160 × 190 bed with its scalloped headboard, a nightstand and pendant on each side, and the full-height dressing wall with mirror doors directly opposite. Hanging wardrobe beside the window. No television.', cams: ['fam-master', 'fam-master-2', 'fam-master-3'], rooms: ['master'], others: true, ic: '🛏', short: 'Master' },
    { id: 'kids', n: '03', title: "Children's Bedroom", sub: 'Two Beds + Desk + Wardrobe', desc: 'Two beds on the headboard wall with a shared nightstand, a desk under the window, the arched-door wardrobe beside it and a soft rug between.', cams: ['fam-kids', 'fam-kids-2'], rooms: ['kids'], others: true, ic: '🧸', short: 'Children' },
    { id: 'living', n: '04', title: 'Living Room', sub: 'L-Sofa + TV Wall + Coffee Table', desc: 'The L-sofa along the wall with its chaise at the window, pebble coffee tables, and the fluted TV wall with its floating walnut console.', cams: ['fam-living', 'fam-living-2'], rooms: ['living'], others: true, ic: '🛋', short: 'Living' },
    { id: 'salon', n: '05', title: 'Salon', sub: 'Sofa + Armchairs + Feature Panel', desc: 'The champagne sofa and two armchairs around the marble centre table, facing the fluted feature panel with its sconces, next to the balcony door.', cams: ['fam-salon', 'fam-salon-2'], rooms: ['salon'], others: true, ic: '🛋', short: 'Salon' },
    { id: 'dining', n: '06', title: 'Dining', sub: 'Table for Six + Buffet + Mirrors', desc: 'The pedestal table with six boucle chairs, the buffet in the bay with three pebble mirrors above it, and the entry mirror and shelf by the door.', cams: ['fam-dining', 'fam-dining-2'], rooms: ['salon'], others: true, ic: '🍽', short: 'Dining' },
    { id: 'night', n: '07', title: 'Evening Apartment', sub: 'The apartment at night', desc: 'Warm 2700 K light only: ceiling coves, downlights, pendants and bedside lamps. Every room glows from its own lighting.', cams: ['fam-overview', 'fam-night-2'], rooms: [], others: 'full', ic: '🌙', short: 'Evening', overview: true, forceMode: 'evening' },
  ];
  const PRESETS = [
    { name: 'Apartment Overview', screen: 0, cam: 'fam-overview' },
    { name: 'Entrance', screen: 5, cam: 'fam-dining-2', title: 'Entrance', sub: 'Front door, dining and the corridor', desc: 'Standing inside the front door: the dining table and buffet ahead, the entry mirror and shelf beside you, the corridor to the bedrooms on the right.' },
    { name: 'Master Bedroom', screen: 1, cam: 'fam-master' },
    { name: 'Master — Bed to Wardrobe', screen: 1, cam: 'fam-master-2' },
    { name: 'Master — Wardrobe to Bed', screen: 1, cam: 'fam-master-3' },
    { name: "Children's Bedroom", screen: 2, cam: 'fam-kids' },
    { name: 'Living Room', screen: 3, cam: 'fam-living' },
    { name: 'Salon', screen: 4, cam: 'fam-salon' },
    { name: 'Dining', screen: 5, cam: 'fam-dining' },
  ];
  const LABELS = { 'm-bed': 'Bed 160 × 190', 'm-ns1': 'Nightstand', 'm-ns2': 'Nightstand', 'm-dresswall': 'Wardrobe · dressing wall', 'm-wardE': 'Hanging wardrobe', 'm-mirror': 'Mirror', 'm-rug': 'Rug', 'm-curtain': 'Curtains', 'm-art': 'Artwork', 'm-headboard': 'Headboard',
    'k-bed1': 'Bed', 'k-bed2': 'Bed', 'k-ns': 'Nightstand', 'k-desk': 'Desk', 'k-wardrobe': 'Wardrobe', 'k-shelf': 'Shelves', 'k-rug': 'Rug', 'k-panel': 'Headboard wall',
    'l-sofa-main': 'L-sofa', 'l-sofa-chaise': 'Chaise', 'l-ct1': 'Coffee table', 'l-console': 'TV console', 'l-tv': 'TV', 'l-panel': 'TV wall', 'l-side': 'Side table', 'l-rug': 'Rug',
    'd-table': 'Dining table', 'd-buffet': 'Buffet', 'd-mirrors': 'Mirrors', 'd-vitrine': 'Display cabinet', 's-emirror': 'Entry mirror', 'd-shelf': 'Entry shelf', 'd-ch-n1': 'Dining chairs',
    's-sofa': 'Sofa', 's-arm1': 'Armchair', 's-arm2': 'Armchair', 's-ct': 'Centre table', 's-panel': 'Feature panel', 's-rug': 'Rug', 's-curtain': 'Curtains' };
  const ANCHOR_Y = { 'm-mirror': 1.3, 'm-dresswall': 2.05, 'm-wardE': 2.2, 'm-curtain': 2.15, 'm-art': 2.0, 'm-headboard': 1.45, 'k-panel': 1.5, 'k-wardrobe': 2.15, 'k-curtain': 2.15, 'k-shelf': 2.35, 'l-panel': 2.3, 'l-tv': 1.15, 'l-curtain': 2.15, 's-panel': 2.3, 's-curtain': 2.15, 'd-mirrors': 1.55, 's-emirror': 1.65, 'd-vitrine': 2.1 };
  const ROOM_LABELS = [['Master bedroom', 5.76, 1.6], ["Children's bedroom", 6.69, 4.9], ['Living room', 6.71, 8.05], ['Salon', 5.8, 11.4], ['Dining', 2.2, 11.4], ['Kitchen', 1.76, 7.55], ['Bathroom', 2.36, 4.8], ['Corridor', 3.85, 7.0], ['Balcony', 7.9, 11.4], ['Entrance', 1.0, 12.6]];
  const ZONES = { master: null, kids: null, living: null, salon: [[4.34, 9.78], [7.31, 9.78], [7.31, 13.02], [4.34, 13.02]], dining: [[0.25, 8.88], [3.36, 8.88], [3.36, 9.78], [4.34, 9.78], [4.34, 13.02], [0.25, 13.02]] };

  const state = { started: false, screen: 0, view: 0, userMode: 'day', mix: 0, mixTarget: 0, labels: false, plan: false, explore: false, fast: false, eye: false, views: false, override: null };
  let tween = null, lightTween = null, running = false, needRender = true, controlsUntil = 0, lastFrame = 0;
  const weak = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 8) <= 4;

  // ---------- boot
  function init(rootEl, opts) {
    root = rootEl; view = root.querySelector('.fam-view'); labelsEl = root.querySelector('.fam-labels'); planEl = root.querySelector('.fam-plan'); status = root.querySelector('.fam-status');
    state.fast = weak;
    const w = view.clientWidth || 960, h = view.clientHeight || 540;
    R = window.APTRENDER; R.init(view, w, h, '', { interactive: true, reflectorSize: weak ? 256 : 512, pixelRatio: pixelRatioFor(w, h) });
    H = R.handles(); cam = H.camera;
    controls = new THREE.OrbitControls(cam, H.renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.09; controls.rotateSpeed = 0.55; controls.enablePan = false; controls.screenSpacePanning = true;
    controls.addEventListener('start', () => { controlsUntil = Infinity; animate(); });
    controls.addEventListener('end', () => { controlsUntil = performance.now() + 1500; });
    controls.addEventListener('change', () => { needRender = true; });
    buildUI(); bindInput();
    new ResizeObserver(onResize).observe(view);
    document.addEventListener('fullscreenchange', onFull); document.addEventListener('webkitfullscreenchange', onFull);
    // title screen: slow drift around the overview
    applyScreen(0, 0, true); controls.autoRotate = true; controls.autoRotateSpeed = 0.35; animate();
    say('');
    root.classList.add('ready');
    prewarm();
  }
  function prewarm() { const cfgs = [['master', true], ['kids', true], ['living', true], ['salon', true], [null, 'full']]; let i = 0; const step = () => { if (i >= cfgs.length) { applyMix(); needRender = true; animate(); return; } const [room, others] = cfgs[i++]; R.setMix(0.5, room ? [room] : [], others); H.renderer.compile(H.scene, cam); setTimeout(step, 30); }; setTimeout(step, 400); }
  function pixelRatioFor(w, h) { const dpr = window.devicePixelRatio || 1; const cap = weak ? 1.5 : 2; return Math.max(1, Math.min(dpr, cap, Math.sqrt((weak ? 2.6e6 : 4.6e6) / Math.max(1, w * h)))); }
  function onResize() { const w = view.clientWidth, h = view.clientHeight; if (!w || !h) return; R.setPixelRatio(pixelRatioFor(w, h)); R.resize(w, h); needRender = true; animate(); }
  function say(t) { if (status) status.textContent = t || ''; }

  // ---------- animation loop (render on demand; continuous only while something moves)
  function animate() { if (!running) { running = true; requestAnimationFrame(loop); } }
  function loop(now) {
    const dt = Math.min(0.1, (now - (lastFrame || now)) / 1000); lastFrame = now;
    let busy = false;
    if (tween) { busy = true; stepTween(now); }
    if (lightTween) { busy = true; stepLight(now); }
    if (!state.started && controls.autoRotate) { busy = true; }
    if (now < controlsUntil || controls.autoRotate) { controls.update(); busy = true; }
    if (busy || needRender) { H.renderer.render(H.scene, cam); needRender = false; updateOverlays(); }
    if (busy) requestAnimationFrame(loop); else { running = false; lastFrame = 0; }
  }

  // ---------- camera
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function flyTo(shotId, dur, instant) {
    const s = shotById(shotId); if (!s) return;
    const portrait = cam.aspect < 1; const to = { p: V3(s.pos), t: V3(s.target), fov: portrait ? Math.min(78, (s.fov || 58) * 1.3) : Math.min(s.fov || 58, 62) };
    if (instant) { cam.position.copy(to.p); controls.target.copy(to.t); cam.fov = to.fov; cam.updateProjectionMatrix(); controls.update(); tween = null; needRender = true; animate(); return; }
    tween = { from: { p: cam.position.clone(), t: controls.target.clone(), fov: cam.fov }, to, t0: performance.now(), dur: dur || 1900 };
    controls.enabled = false; animate();
  }
  function stepTween(now) {
    const k = Math.min(1, (now - tween.t0) / tween.dur), e = ease(k);
    cam.position.lerpVectors(tween.from.p, tween.to.p, e); controls.target.lerpVectors(tween.from.t, tween.to.t, e);
    cam.fov = tween.from.fov + (tween.to.fov - tween.from.fov) * e; cam.updateProjectionMatrix(); cam.lookAt(controls.target);
    if (k >= 1) { tween = null; controls.enabled = true; controls.update(); }
  }
  function limitsFor(sc) {
    if (sc.overview) { controls.minDistance = 6; controls.maxDistance = 34; controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.25; controls.enableZoom = true; }
    else { controls.minDistance = 0.5; controls.maxDistance = 7; controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.6; controls.enableZoom = true; }
  }

  // ---------- lighting
  function lightTo(target, dur) { lightTween = { from: state.mix, to: target, t0: performance.now(), dur: dur || 1400 }; animate(); }
  function stepLight(now) {
    const k = Math.min(1, (now - lightTween.t0) / lightTween.dur), e = ease(k);
    state.mix = lightTween.from + (lightTween.to - lightTween.from) * e; applyMix();
    if (k >= 1) { state.mix = lightTween.to; lightTween = null; applyMix(); }
  }
  function applyMix() { const sc = SCREENS[state.screen]; R.setMix(state.mix, state.explore ? exploreRooms() : sc.rooms, state.explore ? true : sc.others); }
  function effectiveMode() { const sc = SCREENS[state.screen]; return (!state.explore && sc.forceMode) ? sc.forceMode : state.userMode; }
  function syncLighting(instant) { const target = effectiveMode() === 'evening' ? 1 : 0; if (instant) { state.mix = target; lightTween = null; applyMix(); } else if (Math.abs(target - state.mix) > 0.001) lightTo(target); else applyMix(); }

  // ---------- screens
  function applyScreen(i, v, instant, override) {
    state.screen = (i + SCREENS.length) % SCREENS.length; state.view = v || 0; state.override = override || null; const sc = SCREENS[state.screen]; if (state.views) { state.views = false; root.classList.remove('views'); }
    R.setShadowsForRoom(sc.rooms[0] || 'salon', !!sc.overview); R.setReflections(!sc.overview && !state.fast);
    limitsFor(sc); flyTo(sc.cams[state.view], 1900, instant); syncLighting(instant);
    renderCard(override ? Object.assign({}, sc, override) : sc); markUI(); updatePlanHL();
  }
  function goPreset(i) { const p = PRESETS[i]; if (!p) return; if (state.explore) leaveExplore(); if (!state.started) start(); const v = Math.max(0, SCREENS[p.screen].cams.indexOf(p.cam)); applyScreen(p.screen, v, false, p.title ? { title: p.title, sub: p.sub, desc: p.desc } : null); }
  function toggleViews(on) { state.views = on == null ? !state.views : on; root.classList.toggle('views', state.views); markUI(); }
  function goScreen(i) { if (state.explore) leaveExplore(); if (!state.started) start(); applyScreen(i, 0); }
  function next() { goScreen(state.screen + 1); } function prev() { goScreen(state.screen - 1); }
  function nextView() { const sc = SCREENS[state.screen]; applyScreen(state.screen, (state.view + 1) % sc.cams.length); }
  function start() { if (state.started) return; state.started = true; controls.autoRotate = false; root.classList.add('started'); applyScreen(0, 0); hint(cam.aspect < 0.8 ? 'Turn your phone sideways for the best view · swipe to move on' : 'Use the arrows or swipe to walk through the rooms'); }
  function setMode(m) { state.userMode = m; syncLighting(); markUI(); }
  function toggleLabels(on) { state.labels = on == null ? !state.labels : on; labelsEl.innerHTML = ''; markUI(); needRender = true; animate(); }
  function togglePlan(on) { state.plan = on == null ? !state.plan : on; root.classList.toggle('split', state.plan); if (state.plan && !planSvg) buildPlan(); markUI(); setTimeout(onResize, 30); }
  function hint(t) { const h = root.querySelector('.fam-hint'); if (!h) return; h.textContent = t; h.classList.add('show'); clearTimeout(hint.tm); hint.tm = setTimeout(() => h.classList.remove('show'), 4500); }

  // ---------- full screen
  function toggleFull() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl || root.classList.contains('pseudo')) { if (fsEl) (document.exitFullscreen || document.webkitExitFullscreen).call(document); root.classList.remove('pseudo'); markUI(); setTimeout(onResize, 60); return; }
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    const pseudo = () => { root.classList.add('pseudo'); markUI(); setTimeout(onResize, 60); };
    if (req) { try { const p = req.call(root); if (p && p.catch) p.catch(pseudo); } catch (e) { pseudo(); } } else pseudo();
  }
  function onFull() { markUI(); setTimeout(onResize, 60); }

  // ---------- explore mode (free camera, technical views)
  function exploreRooms() { const sc = SCREENS[state.screen]; return sc.rooms; }
  function enterExplore() { state.explore = true; root.classList.add('explore'); controls.enablePan = true; controls.minDistance = 0.3; controls.maxDistance = 40; controls.minPolarAngle = 0.05; controls.maxPolarAngle = 1.6; R.setReflections(!state.fast); syncLighting(); markUI(); }
  function leaveExplore() { state.explore = false; state.eye = false; root.classList.remove('explore'); controls.enablePan = false; applyScreen(state.screen, state.view); }
  function exploreView(id) { const s = shotById(id); if (!s) return; state.eye = false; const sc = SCREENS.find(x => x.rooms[0] && (id.startsWith(x.rooms[0]) || id.includes(x.id))); if (sc) { const i = SCREENS.indexOf(sc); state.screen = i; renderCard(sc); R.setShadowsForRoom(sc.rooms[0], false); } R.setReflections(!state.fast); flyTo(id, 1500); syncLighting(); updatePlanHL(); }
  function eyeLevel() { state.eye = true; const d = new THREE.Vector3().subVectors(controls.target, cam.position); d.y = 0; d.normalize(); cam.position.y = 1.5; controls.target.copy(cam.position).addScaledVector(d, 0.8); controls.target.y = 1.42; controls.minDistance = 0.8; controls.maxDistance = 0.8; controls.enableZoom = false; controls.update(); needRender = true; animate(); hint('Eye level: drag to look around, W A S D or arrow keys to walk'); }
  function walk(dx, dz) { if (!state.eye) return; const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)); const mv = new THREE.Vector3().addScaledVector(fwd, dz * 0.25).addScaledVector(right, dx * 0.25); const nx = Math.min(8.9, Math.max(0.3, cam.position.x + mv.x)), nz = Math.min(13.0, Math.max(0.3, cam.position.z + mv.z)); const ddx = nx - cam.position.x, ddz = nz - cam.position.z; cam.position.x = nx; cam.position.z = nz; controls.target.x += ddx; controls.target.z += ddz; controls.update(); needRender = true; animate(); }

  // ---------- overlays: furniture labels + floor-plan camera marker
  const _v = new THREE.Vector3();
  function updateOverlays() {
    if (state.labels) drawLabels();
    if (state.plan && planCam) drawPlanCam();
  }
  function labelItems() {
    const sc = SCREENS[state.screen];
    if (sc.overview || (state.explore && cam.position.y > 5)) return ROOM_LABELS.map(([t, x, z]) => ({ t, x, y: 1.3, z }));
    const room = sc.rooms[0]; const out = [];
    for (const f of A.furniture) { if (f.alt || f.room !== room) continue; const t = LABELS[f.id]; if (!t) continue; if (sc.id === 'dining' && !/^d-|s-emirror/.test(f.id)) continue; if (sc.id === 'salon' && !/^s-/.test(f.id)) continue; if (f.id === 's-emirror' && sc.id === 'salon') continue;
      const top = ANCHOR_Y[f.id] != null ? ANCHOR_Y[f.id] : Math.min((f.z || 0) + f.h, 1.75) + 0.12; out.push({ t, x: f.x + f.w / 2, y: top, z: f.y + f.d / 2 }); }
    return out;
  }
  function drawLabels() {
    const items = labelItems(); const W = view.clientWidth, Hh = view.clientHeight;
    const key = items.map(i => i.t).join('|'); if (labelsEl.dataset.key !== key) { labelsEl.dataset.key = key; labelsEl.innerHTML = ''; for (const it of items) { const d = document.createElement('div'); d.className = 'fam-label'; d.textContent = it.t; labelsEl.appendChild(d); } }
    const kids = labelsEl.children;
    for (let i = 0; i < items.length; i++) { const it = items[i]; _v.set(it.x, it.y, it.z).project(cam); const el = kids[i];
      const dist = cam.position.distanceTo(new THREE.Vector3(it.x, it.y, it.z));
      if (_v.z > 1 || Math.abs(_v.x) > 0.98 || Math.abs(_v.y) > 0.98 || dist < 0.9 || dist > 11 || (dist > 7.5 && !SCREENS[state.screen].overview)) { el.style.display = 'none'; continue; }
      el.style.display = ''; el.style.transform = 'translate(' + ((_v.x + 1) / 2 * W).toFixed(1) + 'px,' + ((1 - _v.y) / 2 * Hh).toFixed(1) + 'px) translate(-50%, -100%)'; el.style.opacity = dist > 6 ? 0.7 : 1; }
  }
  function buildPlan() {
    const host = planEl.querySelector('.fam-plan-svg'); window.APTPLAN.render(host, { furniture: true, dims: false, labels: true, circulation: false, names: false, title: 'Floor plan' });
    planSvg = host.querySelector('svg'); const NS = 'http://www.w3.org/2000/svg'; const P = window.APTPLAN; const px = v => (P.M + v * P.S).toFixed(1);
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'fam-plan-overlay'); planSvg.appendChild(g);
    planHL = document.createElementNS(NS, 'polygon'); planHL.setAttribute('class', 'fam-hl'); g.appendChild(planHL);
    // clickable rooms
    const zones = [['master', A.rooms.find(r => r.id === 'master').poly], ['kids', A.rooms.find(r => r.id === 'kids').poly], ['living', A.rooms.find(r => r.id === 'living').poly], ['salon', ZONES.salon], ['dining', ZONES.dining]];
    for (const [id, poly] of zones) { const p = document.createElementNS(NS, 'polygon'); p.setAttribute('points', poly.map(q => px(q[0]) + ',' + px(q[1])).join(' ')); p.setAttribute('class', 'fam-zone'); p.addEventListener('click', () => goScreen(SCREENS.findIndex(s => s.id === id))); g.appendChild(p); }
    planCam = document.createElementNS(NS, 'g'); planCam.setAttribute('class', 'fam-cam'); planCam.innerHTML = '<path class="cone" d=""/><circle r="7" cx="0" cy="0"/>'; g.appendChild(planCam);
    updatePlanHL(); drawPlanCam();
  }
  function updatePlanHL() { if (!planHL) return; const sc = SCREENS[state.screen]; const P = window.APTPLAN; const px = v => (P.M + v * P.S).toFixed(1); const poly = sc.overview ? null : (ZONES[sc.id] || (A.rooms.find(r => r.id === sc.rooms[0]) || {}).poly); if (!poly) { planHL.setAttribute('points', ''); return; } planHL.setAttribute('points', poly.map(q => px(q[0]) + ',' + px(q[1])).join(' ')); }
  function drawPlanCam() { const P = window.APTPLAN; const x = P.M + cam.position.x * P.S, y = P.M + cam.position.z * P.S; const d = new THREE.Vector3(); cam.getWorldDirection(d); const ang = Math.atan2(d.z, d.x); const half = (cam.fov * Math.PI / 180) * cam.aspect / 2 * 0.5; const L = 1.3 * P.S; const high = cam.position.y > 4; planCam.style.display = high ? 'none' : ''; planCam.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'); planCam.querySelector('.cone').setAttribute('d', 'M0 0 L' + (Math.cos(ang - half) * L).toFixed(1) + ' ' + (Math.sin(ang - half) * L).toFixed(1) + ' A' + L.toFixed(1) + ' ' + L.toFixed(1) + ' 0 0 1 ' + (Math.cos(ang + half) * L).toFixed(1) + ' ' + (Math.sin(ang + half) * L).toFixed(1) + ' Z'); }

  // ---------- UI
  const ui = {};
  function btn(cls, html, on, title) { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html; if (title) b.title = title; b.addEventListener('click', on); return b; }
  function buildUI() {
    const top = root.querySelector('.fam-top'), bottom = root.querySelector('.fam-bottom');
    // top bar
    const brand = document.createElement('div'); brand.className = 'fam-brand'; brand.textContent = 'Our apartment · 3D'; top.appendChild(brand);
    const tools = document.createElement('div'); tools.className = 'fam-tools'; top.appendChild(tools);
    const seg = document.createElement('div'); seg.className = 'fam-seg'; ui.day = btn('', '☀️ <span class="t">Day</span>', () => setMode('day'), 'Daylight'); ui.eve = btn('', '🌙 <span class="t">Evening</span>', () => setMode('evening'), 'Evening lighting'); seg.append(ui.day, ui.eve); tools.appendChild(seg);
    ui.views = btn('fam-btn', '📷 <span class="t">Views</span>', () => toggleViews(), 'Camera views'); tools.appendChild(ui.views);
    ui.plan = btn('fam-btn', '🗺 <span class="t">Floor plan</span>', () => togglePlan(), 'Show the floor plan beside the 3D view'); tools.appendChild(ui.plan);
    ui.labels = btn('fam-btn', '🏷 <span class="t">Labels</span>', () => toggleLabels(), 'Show furniture labels'); tools.appendChild(ui.labels);
    ui.full = btn('fam-btn', '⛶ <span class="t">Full screen</span>', toggleFull, 'Full screen'); tools.appendChild(ui.full);
    ui.explore = btn('fam-btn fam-more', '✦ <span class="t">Explore</span>', () => state.explore ? leaveExplore() : enterExplore(), 'Free camera and all views'); tools.appendChild(ui.explore);
    // bottom bar
    ui.prev = btn('fam-arrow prev', '‹', prev, 'Previous'); ui.next = btn('fam-arrow next', '›', next, 'Next'); root.appendChild(ui.prev); root.appendChild(ui.next);
    const rooms = document.createElement('div'); rooms.className = 'fam-rooms'; bottom.appendChild(rooms); ui.rooms = [];
    SCREENS.forEach((sc, i) => { if (sc.id === 'night') return; const b = btn('fam-room', '<span class="ic">' + sc.ic + '</span><span>' + sc.short + '</span>', () => goScreen(i)); b.dataset.i = i; rooms.appendChild(b); ui.rooms[i] = b; });
    ui.angle = btn('fam-btn fam-angle', '↻ <span class="t">Another angle</span>', nextView, 'Switch to another view of this room'); root.appendChild(ui.angle);
    ui.progress = document.createElement('div'); ui.progress.className = 'fam-progress'; bottom.appendChild(ui.progress);
    // camera views panel
    const vp = document.createElement('div'); vp.className = 'fam-views'; const vl = document.createElement('div'); vl.className = 'fam-exl'; vl.textContent = 'Camera views'; vp.appendChild(vl); ui.presets = PRESETS.map((p, i) => { const b = btn('fam-btn sm', p.name + ' <span class="k">' + (i + 1) + '</span>', () => goPreset(i)); vp.appendChild(b); return b; }); root.appendChild(vp);
    // title screen
    root.querySelector('.fam-start').addEventListener('click', start);
    // explore panel
    const ex = root.querySelector('.fam-explore'); ex.innerHTML = '';
    const grp = (label, items) => { const g = document.createElement('div'); g.className = 'fam-exg'; const l = document.createElement('div'); l.className = 'fam-exl'; l.textContent = label; g.appendChild(l); for (const it of items) g.appendChild(btn('fam-btn sm', it.name, it.on)); ex.appendChild(g); };
    ex.appendChild(btn('fam-btn gold', '◀ Family presentation', leaveExplore));
    grp('Rooms', SCREENS.filter(s => s.id !== 'night').map((s, i) => ({ name: s.ic + ' ' + s.short, on: () => { state.screen = SCREENS.indexOf(s); renderCard(s); R.setShadowsForRoom(s.rooms[0] || 'salon', !!s.overview); state.eye = false; controls.enableZoom = true; controls.minDistance = 0.3; controls.maxDistance = 40; flyTo(s.cams[0], 1500); syncLighting(); updatePlanHL(); } })));
    grp('Camera', [{ name: 'Eye level (1.50 m)', on: eyeLevel }, { name: 'Free orbit', on: () => { state.eye = false; controls.enableZoom = true; controls.minDistance = 0.3; controls.maxDistance = 40; controls.update(); } }]);
    grp('All views', A.shots.filter(s => !s.id.startsWith('fam-')).map(s => ({ name: s.name, on: () => exploreView(s.id) })));
    grp('Performance', [{ name: 'Mirrors on', on: () => { state.fast = false; R.setReflections(true); needRender = true; animate(); } }, { name: 'Fast (no mirrors)', on: () => { state.fast = true; R.setReflections(false); needRender = true; animate(); } }]);
    markUI();
  }
  function renderCard(sc) { const c = root.querySelector('.fam-card'); c.classList.remove('in'); void c.offsetWidth; c.querySelector('.n').textContent = sc.n + ' / 07'; c.querySelector('h2').textContent = sc.title.toUpperCase(); c.querySelector('.sub').textContent = sc.sub; c.querySelector('.desc').textContent = sc.desc; c.classList.add('in'); }
  function markUI() {
    const sc = SCREENS[state.screen]; const mode = effectiveMode();
    ui.day.classList.toggle('on', mode === 'day'); ui.eve.classList.toggle('on', mode === 'evening');
    ui.plan.classList.toggle('on', state.plan); ui.labels.classList.toggle('on', state.labels); ui.explore.classList.toggle('on', state.explore); ui.views.classList.toggle('on', state.views);
    if (ui.presets) { const cur = sc.cams[state.view]; ui.presets.forEach((b, i) => { const p = PRESETS[i]; b.classList.toggle('on', !state.explore && p.screen === state.screen && p.cam === cur && (!!p.title === !!state.override)); }); }
    const fs = !!(document.fullscreenElement || document.webkitFullscreenElement) || root.classList.contains('pseudo'); ui.full.innerHTML = (fs ? '⤡ <span class="t">Exit full screen</span>' : '⛶ <span class="t">Full screen</span>');
    ui.rooms.forEach((b, i) => { if (b) b.classList.toggle('on', i === state.screen && !state.explore); });
    ui.angle.innerHTML = '↻ <span class="t">Another angle</span> <span class="k">' + (state.view + 1) + '/' + sc.cams.length + '</span>'; ui.angle.style.display = state.explore ? 'none' : '';
    ui.progress.innerHTML = SCREENS.map((s, i) => '<i class="' + (i === state.screen ? 'on' : '') + '" title="' + s.title + '"></i>').join('');
  }

  // ---------- input: keys, swipe
  function bindInput() {
    root.tabIndex = 0;
    H.renderer.domElement.addEventListener('pointerdown', () => root.focus({ preventScroll: true }));
    root.addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = e.key;
      if (state.eye && ({ w: 1, a: 1, s: 1, d: 1 })[k.toLowerCase()]) { e.preventDefault(); const m = { w: [0, 1], s: [0, -1], a: [-1, 0], d: [1, 0] }[k.toLowerCase()]; walk(m[0], m[1]); return; }
      if (state.eye && /^Arrow/.test(k)) { e.preventDefault(); const m = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k]; walk(m[0], m[1]); return; }
      if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') { e.preventDefault(); next(); } else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
      else if (k === 'Escape') { if (state.explore) leaveExplore(); else if (root.classList.contains('pseudo')) toggleFull(); }
      else if (k.toLowerCase() === 'f') toggleFull(); else if (k.toLowerCase() === 'l') toggleLabels(); else if (k.toLowerCase() === 'p') togglePlan(); else if (k.toLowerCase() === 'n') setMode('evening'); else if (k.toLowerCase() === 'd') setMode('day'); else if (k.toLowerCase() === 'v') nextView(); else if (k === 'Enter' && !state.started) start(); else if (/^[1-9]$/.test(k) && !state.explore) goPreset(parseInt(k, 10) - 1); });
    // quick horizontal flick on touch = next / previous
    let p0 = null; const el = H.renderer.domElement;
    el.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; p0 = { x: e.clientX, y: e.clientY, t: performance.now(), n: 1 }; });
    el.addEventListener('pointermove', e => { if (p0 && e.pointerType === 'touch' && e.isPrimary === false) p0.n = 2; });
    el.addEventListener('pointerup', e => { if (!p0 || e.pointerType !== 'touch') return; const dx = e.clientX - p0.x, dy = e.clientY - p0.y, dt = performance.now() - p0.t; const one = p0.n === 1; p0 = null; if (one && state.started && !state.explore && dt < 320 && Math.abs(dx) > 70 && Math.abs(dy) < 60) { if (dx < 0) next(); else prev(); } });
  }
  return { init, start, goScreen, goPreset, next, prev, nextView, setMode, toggleLabels, togglePlan, toggleViews, toggleFull, enterExplore, leaveExplore, SCREENS, PRESETS };
})();
