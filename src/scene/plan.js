/* 2D floor-plan renderer (SVG) used by the floor-plan panel. */
/* 2D plan renderer (SVG). Layers: floor, walls, doors, furniture, ceiling, lights, electrical, dims, circulation. */
window.APTPLAN = (function () {
  const S = 62; // px per metre
  const M = 34; // margin px
  const A = window.APT;
  const NS = 'http://www.w3.org/2000/svg';
  const px = v => (M + v * S).toFixed(1);
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const rect = (p, x, y, w, h, style, extra) => el('rect', Object.assign({ x: px(x), y: px(y), width: (w * S).toFixed(1), height: (h * S).toFixed(1), style }, extra || {}), p);
  const text = (p, x, y, s, cls, extra) => { const t = el('text', Object.assign({ x: px(x), y: px(y), class: cls || 'pl-t' }, extra || {}), p); t.textContent = s; return t; };
  const line = (p, x1, y1, x2, y2, style, extra) => el('line', Object.assign({ x1: px(x1), y1: px(y1), x2: px(x2), y2: px(y2), style }, extra || {}), p);
  const poly = (p, pts, style, extra) => el('polygon', Object.assign({ points: pts.map(q => px(q[0]) + ',' + px(q[1])).join(' '), style }, extra || {}), p);
  const circle = (p, x, y, r, style) => el('circle', { cx: px(x), cy: px(y), r: (r * S).toFixed(1), style }, p);

  function render(container, opts) {
    opts = Object.assign({ furniture: true, ceiling: false, lights: false, electrical: false, dims: true, circulation: false, labels: true, title: '', alt: '', crop: null, names: false, room: null }, opts || {});
    const altRoom = { masterB: 'master', masterC: 'master', kidsB: 'kids', kidsF: 'kids', livingB: 'living', salonPrev: 'salon' }[opts.alt] || null;
    const W = A.env.w * S + 2 * M, H = A.env.h * S + 2 * M;
    const svg = el('svg', { viewBox: `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`, class: 'plan-svg', role: 'img', 'aria-label': opts.title || 'Apartment plan' });
    if (opts.crop) { const c = opts.crop, p = c.pad == null ? 0.4 : c.pad; svg.setAttribute('viewBox', `${(M + (c.x0 - p) * S).toFixed(1)} ${(M + (c.y0 - p) * S).toFixed(1)} ${((c.x1 - c.x0 + 2 * p) * S).toFixed(1)} ${((c.y1 - c.y0 + 2 * p) * S).toFixed(1)}`); svg.classList.add('plan-crop'); }
    const g = {};
    opts_names_active = !!opts.names;
    for (const k of ['floor', 'ceiling', 'walls', 'furniture', 'doors', 'lights', 'electrical', 'dims', 'circ', 'labels']) g[k] = el('g', { class: 'pl-' + k }, svg);
    // floors
    for (const r of A.rooms) poly(g.floor, r.poly, `fill:var(--f-${r.floor});stroke:none`);
    // existing dark tile border in the public zone (observed in video): indicative line 0.45 from walls
    for (const r of A.rooms.filter(r => r.id === 'salon' || r.id === 'corridor')) { /* decorative hint only */ }
    // ceiling bands
    if (opts.ceiling) {
      for (const b of A.ceiling.bands) { rect(g.ceiling, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, 'fill:var(--c-band);stroke:var(--c-band-l);stroke-width:1'); }
      for (const b of A.ceiling.bands) { // LED strip on the inner edge
        const inner = innerEdge(b); line(g.ceiling, inner[0], inner[1], inner[2], inner[3], 'stroke:var(--c-led);stroke-width:2.5;stroke-dasharray:3 3');
      }
      for (const p of A.ceiling.pockets) rect(g.ceiling, p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0, 'fill:none;stroke:var(--c-band-l);stroke-width:1;stroke-dasharray:4 3');
    }
    // walls
    for (const w of A.walls) {
      if (w.z0 === 0 && w.z1 >= 2.6) rect(g.walls, w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0, 'fill:var(--wall);stroke:none');
      else if (w.z0 === 0 && w.z1 < 2.6 && w.z1 > 0.5) { // window sill segment → window symbol
        rect(g.walls, w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0, 'fill:var(--win);stroke:var(--wall);stroke-width:1');
        const horiz = (w.x1 - w.x0) > (w.y1 - w.y0);
        if (horiz) line(g.walls, w.x0, (w.y0 + w.y1) / 2, w.x1, (w.y0 + w.y1) / 2, 'stroke:var(--wall);stroke-width:1');
        else line(g.walls, (w.x0 + w.x1) / 2, w.y0, (w.x0 + w.x1) / 2, w.y1, 'stroke:var(--wall);stroke-width:1');
      }
    }
    for (const c of A.columns) rect(g.walls, c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, 'fill:var(--wall);stroke:none');
    // balcony parapet (slanted outer edge)
    poly(g.walls, [[8.63, 9.78], [8.75, 9.78], [8.51, 13.02], [8.39, 13.02]], 'fill:var(--wall-l);stroke:none');
    rect(g.walls, 7.43, 13.02, 1.08, 0.25, 'fill:var(--wall-l);stroke:none');
    // doors
    for (const d of A.doors) {
      const [hx, hy] = d.hinge, L = d.w;
      const ox = hx + d.open[0] * L, oy = hy + d.open[1] * L, cx = hx + d.closed[0] * L, cy = hy + d.closed[1] * L;
      const cross = d.closed[0] * d.open[1] - d.closed[1] * d.open[0];
      const sweep = cross > 0 ? 1 : 0;
      el('path', { d: `M ${px(cx)} ${px(cy)} A ${(L * S).toFixed(1)} ${(L * S).toFixed(1)} 0 0 ${sweep} ${px(ox)} ${px(oy)}`, style: `fill:var(--swing);stroke:var(--line);stroke-width:0.8;${d.unverified ? 'stroke-dasharray:4 3' : ''}` }, g.doors);
      line(g.doors, hx, hy, ox, oy, 'stroke:var(--line);stroke-width:2.2');
    }
    for (const o of A.openings) { rect(g.doors, o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0, 'fill:var(--win);stroke:var(--line);stroke-width:1'); line(g.doors, (o.x0 + o.x1) / 2, o.y0, (o.x0 + o.x1) / 2, o.y1, 'stroke:var(--line);stroke-width:1'); }
    // furniture
    if (opts.furniture) for (const f of A.furniture) { if (f.alt && f.alt !== opts.alt) continue; if (!f.alt && altRoom && f.room === altRoom) continue; drawFurn(g.furniture, f); if (opts.names && (!opts.room || f.room === opts.room)) drawName(g.furniture, f); }
    // lights
    if (opts.lights) for (const l of A.lights) drawLight(g.lights, l);
    // electrical
    if (opts.electrical && A.electrical) A.electrical.forEach((e, i) => drawElec(g.electrical, e, i + 1));
    // circulation
    if (opts.circulation) drawCirculation(g.circ, altRoom);
    // labels
    if (opts.labels && !opts.crop) for (const r of A.rooms) {
      text(g.labels, r.label[0], r.label[1], r.name, 'pl-room', { 'text-anchor': 'middle' });
      if (opts.dims) text(g.labels, r.label[0], r.label[1] + 0.26, r.dims + ' · ' + r.area + ' m²', 'pl-dim', { 'text-anchor': 'middle' });
    }
    if (opts.dims) drawDims(g.dims, opts);
    // north-ish / orientation note
    if (!opts.crop) text(g.labels, 0.1, 0.18, 'Plan orientation follows the measured drawing (compass orientation not confirmed)', 'pl-note');
    if (container) { container.innerHTML = ''; container.appendChild(svg); }
    return svg;
  }
  function innerEdge(b) { // which edge of the band faces the room: the long edge away from the nearest wall
    const horiz = (b.x1 - b.x0) > (b.y1 - b.y0);
    if (horiz) { const nearTop = isWallAt(b.x0 + 0.1, b.y0 - 0.05); return nearTop ? [b.x0, b.y1, b.x1, b.y1] : [b.x0, b.y0, b.x1, b.y0]; }
    const nearLeft = isWallAt(b.x0 - 0.05, b.y0 + 0.1); return nearLeft ? [b.x1, b.y0, b.x1, b.y1] : [b.x0, b.y0, b.x0, b.y1];
  }
  function isWallAt(x, y) { return A.walls.some(w => w.z0 === 0 && x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1); }
  let opts_names_active = false;
  function drawFurn(p, f) {
    const base = f.optional ? 'stroke-dasharray:4 3;' : '';
    const cls = { style: `fill:${f.kind === 'rug' ? 'var(--rug)' : f.kind === 'curtain' ? 'none' : f.color};stroke:var(--line);stroke-width:${f.kind === 'rug' ? 0.8 : 1};${base}${f.kind === 'rug' ? 'stroke-dasharray:3 2;' : ''}` };
    if (f.kind === 'round') circle(p, f.x + f.w / 2, f.y + f.d / 2, f.w / 2, cls.style);
    else if (f.kind === 'blob') el('ellipse', { cx: px(f.x + f.w / 2), cy: px(f.y + f.d / 2), rx: (f.w / 2 * S).toFixed(1), ry: (f.d / 2 * S).toFixed(1), style: cls.style }, p);
    else if (f.kind === 'curtain') { el('path', { d: wavy(f), style: 'fill:none;stroke:var(--line);stroke-width:1.2' }, p); }
    else rect(p, f.x, f.y, f.w, f.d, cls.style, f.kind === 'mirror' ? {} : {});
    if (f.kind === 'bed' && f.axis === 'x') { // bed lying along X, headboard at the west end
      rect(p, f.x + 0.12, f.y + 0.1, 0.42, f.d - 0.2, 'fill:#fff;stroke:var(--line);stroke-width:0.8', { rx: 4 });
      line(p, f.x + 0.75, f.y, f.x + 0.75, f.y + f.d, 'stroke:var(--line);stroke-width:0.8');
    } else if (f.kind === 'bed') { // pillows + fold line
      const n = f.w > 1.5 ? 2 : 1; const pw = (f.w - 0.1 * (n + 1)) / n;
      for (let i = 0; i < n; i++) rect(p, f.x + 0.1 + i * (pw + 0.1), f.y + 0.12, pw, 0.42, 'fill:#fff;stroke:var(--line);stroke-width:0.8', { rx: 4 });
      line(p, f.x, f.y + 0.75, f.x + f.w, f.y + 0.75, 'stroke:var(--line);stroke-width:0.8');
    }
    if (f.kind === 'sofa') { const t = 0.22; const b = f.back || 'n'; const st = 'fill:none;stroke:var(--line);stroke-width:0.8';
      if (b.includes('n')) rect(p, f.x, f.y, f.w, t, st); if (b.includes('s')) rect(p, f.x, f.y + f.d - t, f.w, t, st);
      if (b.includes('w')) rect(p, f.x, f.y, t, f.d, st); if (b.includes('e')) rect(p, f.x + f.w - t, f.y, t, f.d, st); }
    if (f.kind === 'chair') { const st = 'stroke:var(--line);stroke-width:2'; const fc = f.face || 'n';
      if (fc === 's') line(p, f.x, f.y + 0.04, f.x + f.w, f.y + 0.04, st); if (fc === 'n') line(p, f.x, f.y + f.d - 0.04, f.x + f.w, f.y + f.d - 0.04, st);
      if (fc === 'e') line(p, f.x + 0.04, f.y, f.x + 0.04, f.y + f.d, st); if (fc === 'w') line(p, f.x + f.w - 0.04, f.y, f.x + f.w - 0.04, f.y + f.d, st); }
    if (f.kind === 'tv') rect(p, f.x, f.y, f.w, f.d, 'fill:#1d1d1d;stroke:none');
    if (f.kind === 'dresswall') { const bays = [0.55, 0.55, 0.97, 0.55, 0.55]; let ax = f.x; bays.forEach((b, i) => { if (i === 2) rect(p, ax, f.y + 0.02, b, f.d - 0.02, 'fill:var(--paper);stroke:var(--line);stroke-width:0.6'); else if (i === 1 || i === 3) rect(p, ax, f.y, b, f.d, 'fill:var(--win);stroke:var(--line);stroke-width:0.6'); else line(p, ax + b, f.y, ax + b, f.y + f.d, 'stroke:var(--line);stroke-width:0.6'); ax += b; }); }
    if (f.kind === 'wardrobe') { const horiz = f.w > f.d; const n = Math.max(2, Math.round((horiz ? f.w : f.d) / 0.5));
      for (let i = 1; i < n; i++) { if (horiz) line(p, f.x + i * f.w / n, f.y, f.x + i * f.w / n, f.y + f.d, 'stroke:var(--line);stroke-width:0.6'); else line(p, f.x, f.y + i * f.d / n, f.x + f.w, f.y + i * f.d / n, 'stroke:var(--line);stroke-width:0.6'); }
      if (horiz) line(p, f.x, f.y + f.d, f.x + f.w, f.y, 'stroke:var(--line);stroke-width:0.5'); else line(p, f.x, f.y, f.x + f.w, f.y + f.d, 'stroke:var(--line);stroke-width:0.5'); }
    if (!opts_names_active && f.kind === 'table' && f.w * f.d > 0.5) { const s = f.name.replace(/\(.*\)/, '').trim().split(' ').slice(0, 2).join(' '); text(p, f.x + f.w / 2, f.y + f.d / 2 + 0.06, s, 'pl-f', { 'text-anchor': 'middle' }); }
    if (!opts_names_active && (f.kind === 'bed' || f.kind === 'wardrobe' || f.kind === 'sofa') && f.w * f.d > 1.2) {
      const dimsTxt = f.name.match(/\d\.\d\d\s*×\s*\d\.\d\d/); if (dimsTxt) { const vert = f.d > f.w * 1.6; text(p, f.x + f.w / 2, f.y + f.d / 2 + (f.kind === 'bed' ? 0.5 : 0.06), dimsTxt[0], 'pl-f', { 'text-anchor': 'middle', transform: vert ? `rotate(-90 ${px(f.x + f.w / 2)} ${px(f.y + f.d / 2)})` : '' }); }
    }
  }
  const SHORT = { 'm-dresswall': 'Dressing wall 3.17 × 0.35 (niche + mirror doors)', 'm-wardE': 'Hanging\nwardrobe', 'm-headboard': '', 'm-softwall': '', 'm-bed': 'Bed 160×190', 'm-ns1': 'Night-\nstand', 'm-ns2': 'Night-\nstand', 'm-mirror': '', 'm-art': '', 'm-rug': 'Rug', 'm-curtain': 'Curtain',
    'B-softwall': '', 'B-art': 'Art', 'C-headboard': '', 'C-softwall': '', 'C-ns1': 'NS', 'C-ns2': 'NS', 'C-bed': 'Bed 160', 'C-wardrobe': 'Wardrobe (sliding)', 'C-chair': 'Reading\nchair', 'C-lamp': '', 'C-rug': 'Rug', 'C-curtain': 'Curtain',
    'k-bed1': 'Bed 1', 'k-bed2': 'Bed 2', 'k-ns': '', 'k-panel': '', 'k-desk': 'Desk', 'k-chair': '', 'k-wardrobe': 'Wardrobe', 'k-shelf': '', 'k-rug': 'Rug', 'k-curtain': 'Curtain',
    'l-sofa-main': 'Corner sofa (bed section)', 'l-sofa-chaise': 'Chaise', 'l-ct1': 'Coffee tables', 'l-ct2': '', 'l-console': 'Floating TV console', 'l-panel': '', 'l-tv': 'TV 65″', 'l-side': 'Side', 'l-rug': 'Rug', 'l-curtain': 'Curtain',
    's-sofa': 'Sofa 2.20', 's-arm1': 'Arm-\nchair', 's-arm2': 'Arm-\nchair', 's-ct': 'Centre table', 's-rug': 'Rug', 's-panel': 'Feature panel', 's-emirror': 'Entry mirror', 's-curtain': 'Sheer',
    'd-table': 'Dining table 1.80 × 0.90', 'd-buffet': 'Buffet (to confirm)', 'd-vitrine': 'Vitrine\n(optional)', 'd-mirrors': 'Pebble mirrors', 'd-shelf': 'Entry shelf',
    'SP-sofa': 'Sofa', 'SP-arm1': 'Arm-\nchair', 'SP-arm2': 'Arm-\nchair', 'SP-ct': 'Centre\ntable', 'SP-rug': 'Rug', 'SP-panel': '', 'SP-console': 'Entry console', 'SP-dining': 'Dining 1.80 × 0.90', 'SP-buffet': 'Console', 'SP-mirrors': 'Mirrors', 'SP-curtain': 'Sheer',
    'B-headboard': '', 'B-ns1': 'NS', 'B-ns2': 'NS', 'B-bed': 'Bed', 'B-wardE': 'Wardrobe (hinged)', 'B-wardS': 'Corner', 'B-tv': 'TV', 'B-rug': 'Rug', 'B-curtain': 'Curtain',
    'F-bed': 'Bed 120', 'F-ns': '', 'F-panel': '', 'F-wardN': 'Wardrobe (added)', 'F-wardE': 'Wardrobe', 'F-desk': 'Desk', 'F-chair': '', 'F-rug': 'Rug', 'F-curtain': 'Curtain',
    'KB-bed1': 'Bed 1', 'KB-bed2': 'Bed 2', 'KB-ward': 'Wardrobe 2.60', 'KB-desk': 'Desk', 'KB-chair': '', 'KB-ns': '', 'KB-rug': 'Rug', 'KB-curtain': 'Curtain',
    'LB-chaise': 'Chaise', 'LB-main': 'Corner sofa', 'LB-console': 'TV console', 'LB-panel': '', 'LB-tv': 'TV 65″', 'LB-ct1': 'Coffee tables', 'LB-ct2': '', 'LB-rug': 'Rug', 'LB-curtain': 'Curtain',
    'SB-dining': 'Dining 1.80 × 0.90', 'SB-sofa': 'Sofa', 'SB-arm1': 'Arm-\nchair', 'SB-arm2': 'Arm-\nchair', 'SB-ct': 'Centre table', 'SB-rug': 'Rug', 'SB-mirrors': 'Mirrors', 'SB-console': 'Entry console', 'SB-curtain': 'Sheer' };
  function drawName(p, f) {
    const s = SHORT[f.id] !== undefined ? SHORT[f.id] : (f.kind === 'chair' ? '' : f.name.split(/[\(\d]/)[0].trim());
    if (!s) return;
    const lines = s.split('\n'); const cx = f.x + f.w / 2; let cy = f.y + f.d / 2 - (lines.length - 1) * 0.09;
    const vert = f.kind !== 'rug' && f.kind !== 'curtain' && f.d > f.w * 1.8 && f.w < 0.75;
    const tr = vert ? `rotate(-90 ${px(cx)} ${px(f.y + f.d / 2)})` : '';
    if (f.kind === 'curtain') { text(p, cx + (f.x > 6 ? -0.28 : 0.28), f.y + f.d / 2, s, 'pl-name', { 'text-anchor': 'middle', transform: `rotate(-90 ${px(cx + (f.x > 6 ? -0.28 : 0.28))} ${px(f.y + f.d / 2)})` }); return; }
    if (f.kind === 'rug') { text(p, f.x + 0.12, f.y + f.d - 0.08, s, 'pl-name', { 'text-anchor': 'start' }); return; }
    lines.forEach((ln, i) => text(p, cx, (vert ? f.y + f.d / 2 : cy) + i * 0.18 + 0.05, ln, 'pl-name', { 'text-anchor': 'middle', transform: tr }));
  }
  function wavy(f) { const vert = f.d > f.w; const n = Math.round((vert ? f.d : f.w) / 0.12); let d = ''; for (let i = 0; i <= n; i++) { const t = i / n; const x = vert ? f.x + f.w / 2 + (i % 2 ? 0.05 : -0.05) : f.x + t * f.w; const y = vert ? f.y + t * f.d : f.y + f.d / 2 + (i % 2 ? 0.05 : -0.05); d += (i ? ' L ' : 'M ') + px(x) + ' ' + px(y); } return d; }
  function drawLight(p, l) {
    const r = 0.09;
    if (l.type === 'down') { circle(p, l.x, l.y, r, 'fill:var(--lt);stroke:var(--line);stroke-width:1'); line(p, l.x - r, l.y, l.x + r, l.y, 'stroke:var(--line);stroke-width:0.8'); line(p, l.x, l.y - r, l.x, l.y + r, 'stroke:var(--line);stroke-width:0.8'); }
    else if (l.type === 'wash') { circle(p, l.x, l.y, r, 'fill:var(--lt);stroke:var(--line);stroke-width:1'); el('path', { d: `M ${px(l.x - r)} ${px(l.y + r)} L ${px(l.x + r)} ${px(l.y - r)}`, style: 'stroke:var(--line);stroke-width:1.4' }, p); }
    else if (l.type === 'pendant') { circle(p, l.x, l.y, 0.14, 'fill:var(--lt);stroke:var(--line);stroke-width:1.2'); circle(p, l.x, l.y, 0.04, 'fill:var(--line);stroke:none'); }
    else if (l.type === 'flush') { circle(p, l.x, l.y, 0.24, 'fill:none;stroke:var(--line);stroke-width:1'); circle(p, l.x, l.y, 0.12, 'fill:var(--lt);stroke:var(--line);stroke-width:1'); }
    else if (l.type === 'sconce') { el('path', { d: `M ${px(l.x - 0.1)} ${px(l.y)} A ${(0.1 * S).toFixed(1)} ${(0.1 * S).toFixed(1)} 0 0 1 ${px(l.x + 0.1)} ${px(l.y)} Z`, style: 'fill:var(--lt);stroke:var(--line);stroke-width:1' }, p); }
    else if (l.type === 'mirror') { circle(p, l.x, l.y, 0.08, 'fill:none;stroke:var(--line);stroke-width:1;stroke-dasharray:2 2'); }
  }
  function drawElec(p, e, i) {
    const col = { socket: 'var(--e-s)', switch: 'var(--e-sw)', tv: 'var(--e-tv)', ac: 'var(--e-ac)', light: 'var(--e-l)', driver: 'var(--e-d)', motor: 'var(--e-d)' }[e.type] || 'var(--line)';
    const r = 0.11;
    if (e.type === 'switch') rect(p, e.x - r, e.y - r, 2 * r, 2 * r, `fill:${col};stroke:var(--line);stroke-width:0.8`);
    else if (e.type === 'ac') rect(p, e.x - 0.4, e.y - 0.08, 0.8, 0.16, `fill:${col};stroke:var(--line);stroke-width:0.8`);
    else circle(p, e.x, e.y, r, `fill:${col};stroke:var(--line);stroke-width:0.8`);
    text(p, e.x, e.y + 0.045, String(i), 'pl-en', { 'text-anchor': 'middle' });
  }
  function drawCirculation(p, altRoom) {
    const paths = [
      [[0.85, 12.6], [2.4, 12.4], [3.85, 11.4], [3.85, 9.78], [3.85, 4.4], [3.9, 3.85]],
      [[3.85, 7.1], [4.5, 7.1], [5.0, 7.3]],
      [[3.85, 5.7], [4.5, 5.7], [5.0, 5.6]],
      [[3.85, 8.2], [3.3, 8.2], [2.9, 8.0]],
      [[3.85, 4.65], [3.3, 4.65], [2.9, 4.8]],
      [[3.85, 9.9], [5.2, 10.3], [6.9, 10.3], [7.1, 10.8]],
      [[2.4, 12.4], [3.5, 12.4], [3.5, 10.9]],
    ];
    for (const pts of paths) {
      el('polyline', { points: pts.map(q => px(q[0]) + ',' + px(q[1])).join(' '), style: 'fill:none;stroke:var(--circ);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:.85', 'marker-end': 'url(#arrow)' }, p);
    }
    const defs = el('defs', {}, p); const mk = el('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M 0 0 L 10 5 L 0 10 z', style: 'fill:var(--circ)' }, mk);
    const clear = [[3.85, 7.0, '0.98', 'corridor'], [4.2, 1.5, '1.63', 'master'], [5.925, 2.64, '0.63', 'master'], [7.16, 2.1, '0.70', 'master'], [8.05, 4.1, '0.72', 'kids'], [8.05, 5.3, '0.62', 'kids'], [6.3, 5.95, '0.93', 'kids'], [6.6, 8.85, '0.51', 'living'], [8.45, 9.2, '0.98', 'living'], [4.9, 7.2, '0.94', 'living'], [3.5, 11.95, '0.80', 'salon'], [5.6, 10.3, '0.92', 'salon'], [2.2, 12.45, '1.02', 'salon'], [2.2, 9.6, '1.02', 'salon'], [6.85, 10.85, 'door clear', 'salon'], [5.55, 12.0, '0.32', 'salon']];
    for (const c of clear) { if (altRoom && c[3] === altRoom) continue; text(p, c[0], c[1], c[2] + ' m', 'pl-clear', { 'text-anchor': 'middle' }); }
  }
  function drawDims(p, opts) {
    const dims = [
      { x1: 3.41, x2: 8.11, y: -0.18, t: '4.70' }, { x1: 4.46, x2: 8.92, y: 3.25, t: '4.46', inside: true }, { x1: 4.46, x2: 8.96, y: 6.75, t: '4.50', inside: true },
      { x1: 0.25, x2: 7.31, y: 13.20, t: '7.06' }, { x1: 0.28, x2: 3.24, y: 8.55, t: '2.96', inside: true },
      { y1: 0.25, y2: 3.31, x: 8.55, t: '3.07' }, { y1: 3.42, y2: 6.40, x: 9.40, t: '2.98' }, { y1: 6.56, y2: 9.54, x: 9.40, t: '2.98' }, { y1: 9.78, y2: 13.02, x: -0.15, t: '3.24' }, { y1: 8.88, y2: 13.02, x: -0.15, t: '4.14', off: -0.35 },
      { y1: 4.15, y2: 9.78, x: 3.6, t: '5.63', inside: true },
    ];
    for (const d of dims) {
      if (d.x1 !== undefined) { const y = d.y; line(p, d.x1, y, d.x2, y, 'stroke:var(--dim);stroke-width:0.8'); line(p, d.x1, y - 0.08, d.x1, y + 0.08, 'stroke:var(--dim);stroke-width:0.8'); line(p, d.x2, y - 0.08, d.x2, y + 0.08, 'stroke:var(--dim);stroke-width:0.8'); text(p, (d.x1 + d.x2) / 2, y - 0.06, d.t, 'pl-dimt', { 'text-anchor': 'middle' }); }
      else { const x = d.x + (d.off || 0); line(p, x, d.y1, x, d.y2, 'stroke:var(--dim);stroke-width:0.8'); line(p, x - 0.08, d.y1, x + 0.08, d.y1, 'stroke:var(--dim);stroke-width:0.8'); line(p, x - 0.08, d.y2, x + 0.08, d.y2, 'stroke:var(--dim);stroke-width:0.8'); text(p, x - 0.06, (d.y1 + d.y2) / 2, d.t, 'pl-dimt', { 'text-anchor': 'middle', transform: `rotate(-90 ${px(x - 0.06)} ${px((d.y1 + d.y2) / 2)})` }); }
    }
    // door widths
    for (const d of A.doors) { const [hx, hy] = d.hinge; const mx = hx + d.closed[0] * d.w / 2, my = hy + d.closed[1] * d.w / 2; text(p, mx + (d.closed[0] ? 0 : 0.3), my + (d.closed[1] ? 0 : -0.1), d.w.toFixed(2), 'pl-dimt', { 'text-anchor': 'middle' }); }
    for (const w of A.windows) { const mx = (w.x0 + w.x1) / 2, my = (w.y0 + w.y1) / 2; const vert = (w.y1 - w.y0) > (w.x1 - w.x0); text(p, mx + (vert ? 0.32 : 0), my + (vert ? 0.05 : -0.3), 'W ' + w.w.toFixed(2), 'pl-dimt', { 'text-anchor': 'middle' }); }
  }
  return { render, S, M };
})();
