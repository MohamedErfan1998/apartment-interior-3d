/* 3D Concept Visualization scene: realistic materials, daylight / evening lighting, shadows, planar mirrors.
   Built from the same APT model as the plans (geometry is never changed here). Three.js r128 + examples/js helpers. */
window.APTRENDER = (function () {
  const A = window.APT;
  let renderer, scene, camera, pmrem, sun, fill, hemi, amb, activeAlt = '';
  const ALT_ROOM = { masterB: 'master', masterC: 'master', kidsB: 'kids', kidsF: 'kids', livingB: 'living', salonPrev: 'salon' };
  const mats = [], roomLights = {}, skyMats = [], ceilMeshes = [], skyMeshes = [];
  const col = h => new THREE.Color(h).convertSRGBToLinear();
  const reg = m => { mats.push(m); return m; };
  const shade = (hex, f) => { const c = new THREE.Color(hex); c.r = Math.min(1, c.r * f); c.g = Math.min(1, c.g * f); c.b = Math.min(1, c.b * f); return '#' + c.getHexString(); };
  const rnd = (seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; })(12345);

  // ---------- procedural textures (1 texture unit = 1 m unless noted)
  function canvasTex(size, draw, linear) { const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); draw(x, size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (!linear) t.encoding = THREE.sRGBEncoding; return t; }
  const T = {};
  function buildTextures() {
    T.wood = canvasTex(1024, (x, s) => { const n = 8, pw = s / n; for (let i = 0; i < n; i++) { const base = shade('#9c7352', 0.86 + rnd() * 0.28); x.fillStyle = base; x.fillRect(0, i * pw, s, pw); for (let g = 0; g < 70; g++) { x.strokeStyle = 'rgba(60,35,20,' + (0.05 + rnd() * 0.14) + ')'; x.lineWidth = 0.6 + rnd() * 1.6; const y0 = i * pw + rnd() * pw; x.beginPath(); x.moveTo(0, y0); for (let k = 1; k <= 8; k++) x.lineTo(k * s / 8, y0 + (rnd() - 0.5) * 6); x.stroke(); } const j = rnd() * s; x.fillStyle = 'rgba(40,25,15,0.55)'; x.fillRect(j, i * pw, 2, pw); x.fillStyle = 'rgba(30,18,10,0.35)'; x.fillRect(0, i * pw, s, 1.5); } });
    T.tile = canvasTex(1024, (x, s) => { x.fillStyle = '#e7dfcf'; x.fillRect(0, 0, s, s); for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(190,170,140,' + (rnd() * 0.12) + ')'; const r = 10 + rnd() * 60; x.beginPath(); x.ellipse(rnd() * s, rnd() * s, r, r * 0.4, rnd() * 3, 0, 6.3); x.fill(); } x.strokeStyle = '#cfc6b4'; x.lineWidth = 3; for (let k = 0; k <= 2; k++) { x.beginPath(); x.moveTo(k * s / 2, 0); x.lineTo(k * s / 2, s); x.stroke(); x.beginPath(); x.moveTo(0, k * s / 2); x.lineTo(s, k * s / 2); x.stroke(); } });
    T.marble = canvasTex(1024, (x, s) => { x.fillStyle = '#f2efe9'; x.fillRect(0, 0, s, s); for (let v = 0; v < 14; v++) { x.strokeStyle = 'rgba(120,115,110,' + (0.08 + rnd() * 0.25) + ')'; x.lineWidth = 0.8 + rnd() * 2.2; x.beginPath(); let px = rnd() * s, py = rnd() * s; x.moveTo(px, py); for (let k = 0; k < 12; k++) { px += (rnd() - 0.4) * 160; py += (rnd() - 0.5) * 160; x.lineTo(px, py); } x.stroke(); } for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(200,196,190,' + rnd() * 0.15 + ')'; x.beginPath(); x.ellipse(rnd() * s, rnd() * s, 20 + rnd() * 80, 10 + rnd() * 30, rnd() * 3, 0, 6.3); x.fill(); } });
    const flute = (hex, n) => canvasTex(512, (x, s) => { const w = s / n; for (let i = 0; i < n; i++) { const g = x.createLinearGradient(i * w, 0, (i + 1) * w, 0); g.addColorStop(0, shade(hex, 0.72)); g.addColorStop(0.3, shade(hex, 1.07)); g.addColorStop(0.6, shade(hex, 0.98)); g.addColorStop(1, shade(hex, 0.66)); x.fillStyle = g; x.fillRect(i * w, 0, w + 1, s); } });
    T.fluteCream = flute('#e9dfcf', 25); T.fluteBeige = flute('#d6c6ae', 25); T.fluteWhite = flute('#f4f1ea', 25);
    T.fluteBump = canvasTex(512, (x, s) => { const n = 25, w = s / n; for (let i = 0; i < n; i++) { const g = x.createLinearGradient(i * w, 0, (i + 1) * w, 0); g.addColorStop(0, '#202020'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#202020'); x.fillStyle = g; x.fillRect(i * w, 0, w + 1, s); } }, true);
    T.fabric = canvasTex(512, (x, s) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s); const d = x.getImageData(0, 0, s, s); for (let i = 0; i < d.data.length; i += 4) { const v = 215 + rnd() * 40; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; } x.putImageData(d, 0, 0); });
    T.fabricBump = canvasTex(256, (x, s) => { x.fillStyle = '#808080'; x.fillRect(0, 0, s, s); const d = x.getImageData(0, 0, s, s); for (let i = 0; i < d.data.length; i += 4) { const v = 96 + rnd() * 64; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; } x.putImageData(d, 0, 0); }, true);
    T.sky = canvasTex(16, (x, s) => { const g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#7fa7cf'); g.addColorStop(0.45, '#bfd4e4'); g.addColorStop(0.8, '#e6ecef'); g.addColorStop(1, '#d9d6cf'); x.fillStyle = g; x.fillRect(0, 0, s, s); }); T.sky.wrapS = T.sky.wrapT = THREE.ClampToEdgeWrapping;
    T.blob = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 20, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.55, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })();
    T.boucle = canvasTex(512, (x, s) => { x.fillStyle = '#ddd3c2'; x.fillRect(0, 0, s, s); for (let i = 0; i < 9000; i++) { const v = 190 + rnd() * 45 | 0; x.fillStyle = 'rgba(' + (v + 12) + ',' + v + ',' + (v - 22) + ',0.55)'; x.beginPath(); x.arc(rnd() * s, rnd() * s, 2 + rnd() * 4, 0, 6.3); x.fill(); } });
    T.rug = canvasTex(1024, (x, s) => { x.fillStyle = '#e4dccb'; x.fillRect(0, 0, s, s); x.strokeStyle = 'rgba(150,130,100,0.55)'; x.lineWidth = 10; x.strokeRect(40, 40, s - 80, s - 80); x.lineWidth = 2; for (let k = 0; k < 14; k++) { x.strokeStyle = 'rgba(160,140,110,' + (0.25 + rnd() * 0.3) + ')'; x.beginPath(); x.moveTo(80, 80 + k * 60); x.bezierCurveTo(s * 0.3, 60 + k * 60 + rnd() * 40, s * 0.7, 100 + k * 60 - rnd() * 40, s - 80, 80 + k * 60); x.stroke(); } for (let i = 0; i < 6000; i++) { x.fillStyle = 'rgba(120,100,80,' + rnd() * 0.12 + ')'; x.fillRect(rnd() * s, rnd() * s, 2, 2); } });
    T.arch = canvasTex(1024, (x, s) => { x.fillStyle = '#ece5d8'; x.fillRect(0, 0, s, s); const g = canvasFlute(x, s, 0, 0, s, s * 0.22, '#d9cdb7', 30); x.fillStyle = '#e9e2d5'; x.fillRect(0, s * 0.22, s, s * 0.78); const door = (cx) => { x.strokeStyle = '#b9ad98'; x.lineWidth = 6; x.beginPath(); x.moveTo(cx - s * 0.16, s * 0.98); x.lineTo(cx - s * 0.16, s * 0.42); x.arc(cx, s * 0.42, s * 0.16, Math.PI, 0); x.lineTo(cx + s * 0.16, s * 0.98); x.stroke(); x.fillStyle = '#b08d3c'; x.beginPath(); x.arc(cx + s * 0.1, s * 0.66, 12, 0, 6.3); x.fill(); }; door(s * 0.26); door(s * 0.74); x.fillStyle = '#f7efd9'; x.fillRect(s * 0.47, s * 0.3, s * 0.06, s * 0.6); x.fillStyle = 'rgba(255,220,160,0.5)'; x.fillRect(s * 0.47, s * 0.3, s * 0.06, s * 0.6); });
  }
  function canvasFlute(x, s, x0, y0, w, h, hex, n) { const fw = w / n; for (let i = 0; i < n; i++) { const g = x.createLinearGradient(x0 + i * fw, 0, x0 + (i + 1) * fw, 0); g.addColorStop(0, shade(hex, 0.72)); g.addColorStop(0.35, shade(hex, 1.07)); g.addColorStop(1, shade(hex, 0.66)); x.fillStyle = g; x.fillRect(x0 + i * fw, y0, fw + 1, h); } }

  // ---------- materials
  const M = {};
  function std(o) { return reg(new THREE.MeshStandardMaterial(o)); }
  function phys(o) { return reg(new THREE.MeshPhysicalMaterial(o)); }
  function buildMaterials() {
    M.wall = std({ color: col('#efe8dc'), roughness: 0.95 }); M.greige = std({ color: col('#c9bcaa'), roughness: 0.95 }); M.ceil = std({ color: col('#faf8f3'), roughness: 0.92 });
    M.floorWood = phys({ map: T.wood, color: col('#c9b5a0'), roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.4 }); M.floorWood.userData.envBase = 0.55; M.floorCream = phys({ map: T.tile, roughness: 0.16, clearcoat: 0.5, clearcoatRoughness: 0.15 }); M.floorCream.userData.envBase = 0.85; M.floorPlain = std({ color: col('#d8d4cb'), roughness: 0.3 });
    M.skirt = std({ color: col('#3b2a1f'), roughness: 0.45 }); M.walnut = std({ map: T.wood, color: col('#8a7664'), roughness: 0.45 }); M.doorWood = std({ color: col('#4a3222'), roughness: 0.5 });
    M.cream = phys({ color: col('#e9dfcf'), roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.8 }); M.white = std({ color: col('#f4f1ea'), roughness: 0.4 });
    M.marble = phys({ map: T.marble, roughness: 0.14, clearcoat: 0.7, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }); M.brass = std({ color: col('#b48f3f'), metalness: 1.0, roughness: 0.24, envMapIntensity: 1.5 }); M.black = std({ color: col('#23201e'), roughness: 0.55 });
    M.chenille = phys({ map: T.fabric, bumpMap: T.fabricBump, bumpScale: 0.0012, color: col('#dbcfbd'), roughness: 0.95, sheen: col('#9a8c7a') }); M.champagne = phys({ map: T.fabric, bumpMap: T.fabricBump, bumpScale: 0.0012, color: col('#d7c49e'), roughness: 0.95, sheen: col('#a08a5a') }); M.boucle = std({ map: T.boucle, bumpMap: T.fabricBump, bumpScale: 0.002, roughness: 1 });
    M.taupe = phys({ map: T.fabric, bumpMap: T.fabricBump, bumpScale: 0.0015, color: col('#bfae9a'), roughness: 0.9, sheen: col('#8e7b66') }); M.bedding = std({ map: T.fabric, bumpMap: T.fabricBump, bumpScale: 0.001, color: col('#f6f2ea'), roughness: 1 }); M.throw = phys({ map: T.fabric, bumpMap: T.fabricBump, bumpScale: 0.0015, color: col('#c8b79e'), roughness: 0.9, sheen: col('#9c8a6c') });
    M.sheer = std({ color: col('#f6f1e8'), roughness: 1, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }); M.drape = std({ map: T.fabric, color: col('#b7a58f'), roughness: 1, side: THREE.DoubleSide }); M.drapeCh = std({ map: T.fabric, color: col('#d2c3a6'), roughness: 1, side: THREE.DoubleSide });
    M.glass = phys({ color: col('#e4eef3'), roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.22, envMapIntensity: 1.0 }); M.screen = std({ color: col('#0a0a0a'), roughness: 0.22, metalness: 0.5 });
    M.pvc = std({ color: col('#f2f2ee'), roughness: 0.4 }); M.plant = std({ color: col('#4d6a3d'), roughness: 0.9 }); M.pot = std({ color: col('#d7cfc1'), roughness: 0.7 }); M.oak = std({ color: col('#c9a878'), roughness: 0.5 });
    M.rug = std({ map: T.rug, roughness: 1 }); M.pebble = std({ color: col('#f1ede5'), roughness: 0.55 }); M.lamp = std({ color: col('#f3e8d6'), roughness: 0.6, emissive: col('#ffd9a0'), emissiveIntensity: 0.0 });
    M.led = reg(new THREE.MeshStandardMaterial({ color: col('#fff1d8'), emissive: col('#ffcf8a'), emissiveIntensity: 0 })); M.ledWhite = reg(new THREE.MeshStandardMaterial({ color: col('#ffffff'), emissive: col('#fff4e0'), emissiveIntensity: 0 }));
    M.sky = new THREE.MeshBasicMaterial({ map: T.sky, color: new THREE.Color('#ffffff') }); skyMats.push(M.sky);
    M.blob = new THREE.MeshBasicMaterial({ map: T.blob, color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false });
  }
  function fluted(tex, rep) { const m = std({ map: tex.clone(), bumpMap: T.fluteBump.clone(), bumpScale: 0.012, roughness: 0.38, envMapIntensity: 0.8 }); m.map.needsUpdate = true; m.bumpMap.needsUpdate = true; m.map.repeat.set(rep, 1); m.bumpMap.repeat.set(rep, 1); return m; }
  function faced(base, face, mat) { const arr = [base, base, base, base, base, base]; arr[face] = mat; return arr; } // faces: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z

  // ---------- geometry helpers (plan X→x, plan Y→z, height→y)
  function mesh(g, m, x, y, z, cast, recv) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = cast !== false; o.receiveShadow = recv !== false; scene.add(o); return o; }
  function box(w, h, d, x, y, z, m, cast, recv) { return mesh(new THREE.BoxGeometry(w, h, d), m, x + w / 2, y + h / 2, z + d / 2, cast, recv); }
  function rbox(w, h, d, x, y, z, m, r) { return mesh(new THREE.RoundedBoxGeometry(w, h, d, 3, r || Math.min(0.05, h / 3)), m, x + w / 2, y + h / 2, z + d / 2); }
  function cyl(rt, rb, h, x, y, z, m, seg) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), m, x, y + h / 2, z); }
  function shapeFromPoly(poly) { const s = new THREE.Shape(); poly.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); return s; }
  function pebbleShape(w, d) { const pts = []; const n = 10; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const r = 0.5 + (rnd() - 0.5) * 0.16; pts.push(new THREE.Vector2(Math.cos(a) * w * r, Math.sin(a) * d * r)); } const s = new THREE.Shape(); s.moveTo(pts[0].x, pts[0].y); s.splineThru(pts.slice(1).concat([pts[0]])); return s; }
  const reflectors = []; let reflectorSize = 1024;
  function mirror(geo, x, y, z, ry, rx) { const r = new THREE.Reflector(geo, { clipBias: 0.003, textureWidth: reflectorSize, textureHeight: reflectorSize, color: 0x9aa4a8 }); r.position.set(x, y, z); if (ry) r.rotation.y = ry; if (rx) r.rotation.x = rx; scene.add(r);
    const fb = new THREE.Mesh(geo, reg(new THREE.MeshStandardMaterial({ color: col('#b9c2c6'), metalness: 1, roughness: 0.04 }))); fb.position.copy(r.position); fb.rotation.copy(r.rotation); fb.visible = false; scene.add(fb); reflectors.push({ r, fb }); return r; }
  function setReflections(on) { for (const { r, fb } of reflectors) { r.visible = on; fb.visible = !on; } }
  function light(room, l) { l.userData.i0 = l.intensity; (roomLights[room] = roomLights[room] || []).push(l); scene.add(l); if (l.target) scene.add(l.target); return l; }
  const shadowCount = {};
  function spotDown(room, x, z, i, shadow) { const s = new THREE.SpotLight(col('#ffd7a8'), i || 1.7, 7, 0.62, 0.55, 2); s.position.set(x, 2.63, z); s.target.position.set(x, 0, z); shadowCount[room] = (shadowCount[room] || 0) + 1; s.userData.shadowOK = !!shadow && room !== 'corridor' && shadowCount[room] <= 6; s.castShadow = s.userData.shadowOK; /* texture-unit budget: ≤ 6 shadow maps per room */ s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; return light(room, s); }
  function roomFill(room, x, z) { const p = new THREE.PointLight(col('#ffd3a0'), 0.9, 8, 2); p.position.set(x, 2.45, z); p.userData.fill = true; return light(room, p); }
  function point(room, x, y, z, i, dist, c) { const p = new THREE.PointLight(col(c || '#ffd3a0'), i, dist || 4, 2); p.position.set(x, y, z); return light(room, p); }
  function rect(room, w, h, x, y, z, tx, ty, tz, i, c) { const r = new THREE.RectAreaLight(col(c || '#ffcf90'), i, w, h); r.position.set(x, y, z); r.lookAt(tx, ty, tz); return light(room, r); }

  // ---------- build
  function build() {
    buildTextures(); buildMaterials();
    box(A.env.w + 1.5, 0.15, A.env.h + 1.5, -0.75, -0.15, -0.75, std({ color: col('#9b9388'), roughness: 1 }), false, true);
    // floors as thin boxes per rectangle so the 1 m texture scale is explicit (box UVs are 0..1 per face)
    const floorRects = { master: [[3.41, 0.25, 8.11, 3.31], [3.41, 3.31, 4.34, 4.03]], salon: [[0.25, 9.78, 7.31, 13.02], [0.25, 8.88, 4.34, 9.78]], kids: [[4.46, 3.42, 8.92, 6.40]], living: [[4.46, 6.56, 8.96, 9.54]], corridor: [[3.36, 4.15, 4.34, 9.78]], kitchen: [[0.28, 6.38, 3.24, 8.71]], bath: [[1.48, 3.43, 3.24, 6.22]], kbalcony: [[0.30, 5.19, 1.30, 6.26]], balcony: [[7.43, 9.78, 8.39, 13.02]] };
    const floorRect = (x0, z0, x1, z1, base) => { const m = base.clone(); if (m.map) { m.map = m.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(x1 - x0, z1 - z0); } m.userData.envBase = base.userData.envBase; reg(m); const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.008, z1 - z0), m); b.position.set((x0 + x1) / 2, 0.004, (z0 + z1) / 2); b.receiveShadow = true; scene.add(b); };
    for (const r of A.rooms) {
      const fm = r.floor === 'wood' ? M.floorWood : r.floor === 'cream' ? M.floorCream : M.floorPlain;
      for (const rc of (floorRects[r.id] || [])) floorRect(rc[0], rc[1], rc[2], rc[3], fm);
      const c = new THREE.Mesh(new THREE.ShapeGeometry(shapeFromPoly(r.poly)), M.ceil); c.rotation.x = Math.PI / 2; c.position.y = 2.65; c.castShadow = true; c.receiveShadow = true; scene.add(c); ceilMeshes.push(c);
      // skirting along each edge (dark tile, as observed)
      if (r.floor === 'wood' || r.floor === 'cream') for (let i = 0; i < r.poly.length; i++) { const a = r.poly[i], b = r.poly[(i + 1) % r.poly.length]; const dx = b[0] - a[0], dz = b[1] - a[1]; const len = Math.hypot(dx, dz); const horiz = Math.abs(dz) < 0.001; const inset = 0.012; const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2; const g = new THREE.BoxGeometry(horiz ? len : 0.012, 0.08, horiz ? 0.012 : len); const m = new THREE.Mesh(g, M.skirt); const nx = -dz / len * inset, nz = dx / len * inset; m.position.set(cx + nx, 0.04, cz + nz); m.receiveShadow = true; scene.add(m); } // polygons run clockwise in plan: interior is to the right of each edge
    }
    // dark border strip 0.45 inside the salon hall and bay (observed inlay)
    const strip = (x0, z0, x1, z1) => box(x1 - x0 || 0.08, 0.002, z1 - z0 || 0.08, x0, 0.006, z0, M.skirt, false, true);
    strip(0.70, 10.23, 6.86, 10.23); strip(0.70, 12.57, 6.86, 12.57); strip(0.70, 10.23, 0.70, 12.65); strip(6.86, 10.23, 6.86, 12.65); strip(0.70, 9.33, 2.91, 9.33); strip(2.91, 9.33, 2.91, 10.31);
    // walls, columns
    for (const w of A.walls) box(w.x1 - w.x0, w.z1 - w.z0, w.y1 - w.y0, w.x0, w.z0, w.y0, M.wall);
    for (const c of A.columns) box(c.x1 - c.x0, 2.65, c.y1 - c.y0, c.x0, 0, c.y0, M.wall);
    // accent plane: greige wall in the dining bay behind the buffet and mirrors
    box(3.11, 2.65, 0.004, 0.25, 0, 8.88, M.greige, false, true);
    // balcony parapet + sky beyond
    { const g = new THREE.BoxGeometry(0.12, 1.05, 3.26); const m = new THREE.Mesh(g, M.wall); m.position.set(8.51, 0.525, 11.40); m.rotation.y = Math.atan2(0.24, 3.24); m.castShadow = m.receiveShadow = true; scene.add(m); box(1.08, 1.05, 0.25, 7.43, 0, 13.02, M.wall); }
    // windows: PVC frames, glass, sky planes outside
    for (const w of A.windows) {
      const vert = (w.y1 - w.y0) > (w.x1 - w.x0); const len = vert ? w.y1 - w.y0 : w.x1 - w.x0; const t = vert ? w.x1 - w.x0 : w.y1 - w.y0;
      const fx = vert ? w.x0 + t / 2 - 0.03 : w.x0, fz = vert ? w.y0 : w.y0 + t / 2 - 0.03;
      const fw = vert ? 0.06 : len, fd = vert ? len : 0.06;
      box(fw, 0.06, fd, fx, 0.95, fz, M.pvc); box(fw, 0.06, fd, fx, 2.09, fz, M.pvc);
      if (vert) { box(0.06, 1.2, 0.06, fx, 0.95, w.y0, M.pvc); box(0.06, 1.2, 0.06, fx, 0.95, w.y1 - 0.06, M.pvc); box(0.06, 1.2, 0.05, fx, 0.95, w.y0 + len / 2 - 0.025, M.pvc); const g = box(0.012, 1.08, len - 0.12, fx + 0.024, 1.01, w.y0 + 0.06, M.glass, false, false); skyMeshes.push(box(0.02, 6.0, len + 6.0, w.x1 + 1.2, -2.0, w.y0 - 3.0, M.sky, false, false)); }
      else { box(0.06, 1.2, 0.06, w.x0, 0.95, fz, M.pvc); box(0.06, 1.2, 0.06, w.x1 - 0.06, 0.95, fz, M.pvc); box(len - 0.12, 1.08, 0.012, w.x0 + 0.06, 1.01, fz + 0.024, M.glass, false, false); if (w.id === 'w-bath') skyMeshes.push(box(len + 1.0, 3.2, 0.02, w.x0 - 0.5, -0.2, w.y0 - 0.6, M.sky, false, false)); else skyMeshes.push(box(len + 6.0, 6.0, 0.02, w.x0 - 3.0, -2.0, w.y0 - 1.2, M.sky, false, false)); } // the bathroom window faces the light well beside the master bedroom: keep its sky plane small
      box(vert ? 0.26 : len, 0.03, vert ? len : 0.26, vert ? w.x0 - 0.01 : w.x0, 0.93, vert ? w.y0 : w.y0 - 0.01, M.marble); // sill
    }
    for (const o of A.openings) { box(0.06, 2.15, 0.06, 7.34, 0, o.y0, M.pvc); box(0.06, 2.15, 0.06, 7.34, 0, o.y1 - 0.06, M.pvc); box(0.06, 0.06, o.y1 - o.y0, 7.34, 2.09, o.y0, M.pvc); box(0.012, 2.05, o.y1 - o.y0 - 0.12, 7.364, 0.02, o.y0 + 0.06, M.glass, false, false); skyMeshes.push(box(0.02, 7.0, 9.0, 9.9, -2.5, 7.0, M.sky, false, false)); }
    // doors: frames + open leaves
    for (const d of A.doors) { const [hx, hz] = d.hinge; const ox = d.open[0], oz = d.open[1]; const g = new THREE.BoxGeometry(d.w, 2.08, 0.045); const m = new THREE.Mesh(g, M.doorWood); m.position.set(hx + ox * d.w / 2, 1.04, hz + oz * d.w / 2); m.rotation.y = Math.atan2(-oz, ox); m.castShadow = m.receiveShadow = true; scene.add(m);
      const hdl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), M.brass); hdl.position.set(hx + ox * (d.w - 0.1), 1.02, hz + oz * (d.w - 0.1) + (ox ? 0.035 : 0)); if (ox === 0) hdl.rotation.y = Math.PI / 2; scene.add(hdl);
      const cx = d.closed[0], cz = d.closed[1]; const fw = d.w + 0.12; const fr = new THREE.BoxGeometry(cx ? fw : 0.08, 2.14, cz ? fw : 0.08); const fm = new THREE.Mesh(fr, M.doorWood); fm.position.set(hx + cx * d.w / 2, 1.07, hz + cz * d.w / 2); scene.add(fm); // jamb frame (solid behind the open leaf, reads as the frame)
      const f2 = new THREE.Mesh(new THREE.BoxGeometry(cx ? fw : 0.09, 0.06, cz ? fw : 0.09), M.doorWood); f2.position.set(hx + cx * d.w / 2, 2.12, hz + cz * d.w / 2); scene.add(f2); }
    // ceiling bands + LED strips + area lights
    for (const b of A.ceiling.bands) { box(b.x1 - b.x0, 0.08, b.y1 - b.y0, b.x0, 2.57, b.y0, M.ceil);
      const horiz = (b.x1 - b.x0) > (b.y1 - b.y0); const nearTop = horiz && wallAt(b.x0 + 0.1, b.y0 - 0.05); const nearLeft = !horiz && wallAt(b.x0 - 0.05, b.y0 + 0.1);
      if (horiz) { const z = nearTop ? b.y1 - 0.03 : b.y0; box(b.x1 - b.x0, 0.015, 0.03, b.x0, 2.645, z, M.led, false, false); rect(b.room, b.x1 - b.x0, 0.05, (b.x0 + b.x1) / 2, 2.63, z + 0.015, (b.x0 + b.x1) / 2, 10, z + 0.015 + (nearTop ? 0.5 : -0.5), 3.5); }
      else { const x = nearLeft ? b.x1 - 0.03 : b.x0; box(0.03, 0.015, b.y1 - b.y0, x, 2.645, b.y0, M.led, false, false); rect(b.room, 0.05, b.y1 - b.y0, x + 0.015, 2.63, (b.y0 + b.y1) / 2, x + 0.015 + (nearLeft ? 0.5 : -0.5), 10, (b.y0 + b.y1) / 2, 3.5); } }
    for (const p of A.ceiling.pockets) box(p.x1 - p.x0, 0.02, p.y1 - p.y0, p.x0, 2.64, p.y0, std({ color: col('#d9d4cb'), roughness: 1 }), false, false);
    // downlights, pendants, sconces
    const dlGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20);
    const altRoomL = ALT_ROOM[activeAlt] || null;
    for (const l of A.lights) {
      if (l.alt && l.alt !== activeAlt) continue; if (l.baseOnly && altRoomL && l.room === altRoomL) continue;
      if (l.type === 'pendant' && l.room === 'master') { cyl(0.004, 0.004, 1.05, l.x, 1.6, l.y, M.brass, 8); const g = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), M.lamp); g.position.set(l.x, 1.52, l.y); scene.add(g); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), M.brass); cap.position.set(l.x, 1.61, l.y); scene.add(cap); point('master', l.x, 1.5, l.y + 0.06, 0.6, 2.6); continue; }
      if (l.type === 'down' || l.type === 'wash') { const m = new THREE.Mesh(dlGeo, M.ledWhite); m.position.set(l.x, 2.643, l.y); scene.add(m); if (l.type === 'down') spotDown(l.room, l.x, l.y, 2.2, true); else { const s = new THREE.SpotLight(col('#ffd7a8'), 2.5, 6, 0.5, 0.6, 2); s.position.set(l.x, 2.63, l.y); const tz = l.aim === 's' ? l.y + 0.5 : l.y - 0.5; s.target.position.set(l.x, 1.2, tz); light(l.room, s); } }
      if (l.type === 'pendant' && l.room === 'salon') { box(0.025, 0.62, 0.025, l.x - 0.6 + 0.3, 2.03, l.y - 0.012, M.brass); box(0.025, 0.62, 0.025, l.x + 0.6 - 0.33, 2.03, l.y - 0.012, M.brass); box(1.2, 0.05, 0.08, l.x - 0.6, 1.98, l.y - 0.04, M.brass); box(1.1, 0.012, 0.05, l.x - 0.55, 1.975, l.y - 0.025, M.led, false, false); rect('salon', 1.1, 0.05, l.x, 1.97, l.y, l.x, 0, l.y, 14); point('salon', l.x, 1.9, l.y, 0.5, 4); }
      if (l.type === 'pendant' && l.room === 'kids') { cyl(0.004, 0.004, 0.75, l.x, 1.88, l.y, M.brass, 8); const sh = cyl(0.09, 0.13, 0.17, l.x, 1.7, l.y, M.lamp); point('kids', l.x, 1.72, l.y, 0.8, 3.5); }
      if (l.type === 'flush') { cyl(0.3, 0.27, 0.2, l.x, 2.43, l.y, std({ color: col('#e9dcc4'), roughness: 0.3, transparent: true, opacity: 0.85 })); cyl(0.3, 0.3, 0.02, l.x, 2.62, l.y, M.brass); point('salon', l.x, 2.3, l.y, 1.4, 6); }
      if (l.type === 'sconce') { const wall = l.wall || 'n'; const n = { n: [0, 1], s: [0, -1], w: [1, 0], e: [-1, 0] }[wall]; const bx = l.x + n[0] * 0.04, bz = l.y + n[1] * 0.04; cyl(0.03, 0.03, 0.28, bx, 1.45, bz, M.brass, 16); cyl(0.045, 0.045, 0.11, bx, 1.58, bz, M.lamp, 16); point(l.room, l.x + n[0] * 0.14, 1.62, l.y + n[1] * 0.14, 0.7, 3); }
    }
    // furniture (base, or the active alternative for its room)
    const altRoom = ALT_ROOM[activeAlt] || null;
    for (const f of A.furniture) { if (f.alt && f.alt !== activeAlt) continue; if (!f.alt && altRoom && f.room === altRoom) continue; buildFurn(f); }
    // one cheap warm fill light per room for the interactive viewer (non-active rooms in evening mode)
    for (const r of A.rooms) if (['master', 'kids', 'living', 'salon', 'corridor', 'kitchen', 'bath'].includes(r.id)) roomFill(r.id, r.label[0], r.label[1]);
    // extras: plants, cushions, objects
    plant(8.55, 8.62, 0.45, 1.1); plant(7.05, 9.98, 0.3, 1.5);
    cushion(5.65, 6.78, 0.45, 'taupe'); cushion(7.55, 6.78, 0.45, 'bedding'); cushion(8.2, 7.9, 0.45, 'taupe');
    cushion(0.5, 9.45, 0.45, 'taupe'); cushion(0.5, 10.95, 0.45, 'bedding');
    vase(5.21, 0.78, 11.02); vase(6.68, 0.42, 8.3); tray(7.06, 0.78, 3.06);
  }
  function wallAt(x, y) { return A.walls.some(w => w.z0 === 0 && x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1); }
  function plant(x, z, r, h) { cyl(r * 0.5, r * 0.4, 0.4, x, 0, z, M.pot); for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(r * (0.35 + rnd() * 0.3), 10, 8), M.plant); s.position.set(x + (rnd() - 0.5) * r * 1.3, 0.5 + rnd() * (h - 0.6), z + (rnd() - 0.5) * r * 1.3); s.castShadow = true; scene.add(s); } }
  function cushion(x, z, y, m) { const c = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.45, 0.45, 0.12, 3, 0.05), M[m]); c.position.set(x, y + 0.2, z); c.rotation.y = (rnd() - 0.5) * 0.5; c.rotation.x = -0.25; c.castShadow = true; scene.add(c); }
  function vase(x, y, z) { const pts = []; for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector2(0.04 + 0.05 * Math.sin(i / 10 * Math.PI), i / 10 * 0.28)); const v = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), M.cream); v.position.set(x, y, z); v.castShadow = true; scene.add(v); }
  function tray(x, y, z) { box(0.32, 0.02, 0.2, x - 0.16, y, z - 0.1, M.brass); cyl(0.03, 0.03, 0.12, x - 0.08, y + 0.02, z, std({ color: col('#e7c7a8'), roughness: 0.2, transparent: true, opacity: 0.8 })); cyl(0.025, 0.025, 0.09, x + 0.04, y + 0.02, z + 0.03, M.white); }

  function contact(x0, z0, x1, z1, k) { const w = x1 - x0, d = z1 - z0; const m = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.6, d + 0.6), k ? new THREE.MeshBasicMaterial({ map: T.blob, color: 0x000000, transparent: true, opacity: k, depthWrite: false }) : M.blob); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.021, (z0 + z1) / 2); m.renderOrder = 1; scene.add(m); }
  function buildFurn(f) {
    const id = f.id, x = f.x, z = f.y, w = f.w, d = f.d, h = f.h, y = f.z || 0;
    if (!y && (f.kind === 'bed' || f.kind === 'sofa' || f.kind === 'wardrobe' || f.kind === 'dresswall' || f.kind === 'chair' || (f.kind === 'table' && h > 0.3) || (f.kind === 'box' && w * d > 0.15 && h > 0.3))) contact(x, z, x + w, z + d, f.kind === 'chair' ? 0.25 : 0.42);
    if (f.kind === 'dresswall') { // shallow built-in opposite the bed: fabric doors | mirror doors | open dressing niche | mirror doors | fabric doors
      const carcass = reg(new THREE.MeshStandardMaterial({ color: col('#d9cfbf'), roughness: 0.6 }));
      const soft = reg(new THREE.MeshStandardMaterial({ map: T.fabric, color: col('#c6b8a4'), roughness: 1 }));
      const gap = reg(new THREE.MeshStandardMaterial({ color: col('#8f8274'), roughness: 0.8 }));
      const bays = [0.55, 0.55, 0.97, 0.55, 0.55]; const nx0 = x + 1.10, nw = 0.97;
      box(1.10, h, d, x, 0, z, carcass); box(1.10, h, d, nx0 + nw, 0, z, carcass); // two closed blocks either side of the niche
      box(nw, 0.12, d, nx0, h - 0.12, z, carcass); box(nw, 0.06, d, nx0, 0, z, carcass); // niche head and plinth
      box(nw, h - 0.18, 0.03, nx0, 0.06, z + d - 0.03, soft, false, true); // niche back panel, greige fabric
      box(nw - 0.04, 0.03, d - 0.05, nx0 + 0.02, 0.76, z + 0.02, M.marble); // marble dressing shelf at 0.76
      box(nw - 0.08, 0.012, 0.02, nx0 + 0.04, h - 0.135, z + 0.03, M.led, false, false); box(nw - 0.08, 0.012, 0.02, nx0 + 0.04, 0.745, z + 0.03, M.led, false, false); // LED under the head and under the shelf
      point('master', nx0 + nw / 2, 2.0, z - 0.12, 0.5, 2.2);
      let ax = x; bays.forEach((b, i) => {
        if (i === 1 || i === 3) mirror(new THREE.PlaneGeometry(b - 0.05, h - 0.3), ax + b / 2, (h - 0.3) / 2 + 0.08, z - 0.004, Math.PI); // mirror doors
        else if (i !== 2) box(b - 0.03, h - 0.1, 0.012, ax + 0.015, 0.05, z - 0.012, soft); // fabric doors, handleless
        if (i === 0 || i === 3) box(0.012, h - 0.04, 0.01, ax + b - 0.006, 0.02, z - 0.01, gap); // shadow gap between the paired doors
        ax += b; });
      box(w, 0.04, 0.03, x, h - 0.04, z - 0.03, M.brass); // slim brass top reveal
      return; }
    if (f.kind === 'wardrobe' && f.face && id !== 'k-wardrobe') { // built-in wardrobe with its door front on the given face
      const skin = f.finish === 'fabric' ? reg(new THREE.MeshStandardMaterial({ map: T.fabric, color: col('#c6b8a4'), roughness: 1 })) : M.cream;
      box(w, h, d, x, 0, z, skin);
      const face = f.face; const horiz = (face === 'n' || face === 's'); const len = horiz ? w : d; const sliding = /sliding/i.test(f.name) || f.mirrorDoor; const n = sliding ? 3 : Math.max(2, Math.round(len / 0.5)); const dw = len / n;
      for (let i = 0; i < n; i++) {
        const a = (horiz ? x : z) + dw * i; const mid = f.mirrorDoor && i === 1;
        if (mid) { const g = new THREE.PlaneGeometry(dw - 0.06, h - 0.3); const cx = horiz ? a + dw / 2 : (face === 'e' ? x + w + 0.004 : x - 0.004); const cz = horiz ? (face === 'n' ? z - 0.004 : z + d + 0.004) : a + dw / 2; mirror(g, cx, (h - 0.3) / 2 + 0.05, cz, { e: Math.PI / 2, w: -Math.PI / 2, n: Math.PI, s: 0 }[face]); continue; }
        // door leaf
        if (horiz) box(dw - 0.03, h - 0.1, 0.012, a + 0.015, 0.05, face === 'n' ? z - 0.012 : z + d, skin); else box(0.012, h - 0.1, dw - 0.03, face === 'e' ? x + w : x - 0.012, 0.05, a + 0.015, skin);
        // pull: sliding = long recessed brass bar near the leaf edge; hinged = short brass handle at mid-height
        const pl = sliding ? 1.3 : 0.14, py = sliding ? 0.85 : 1.0; const off = sliding ? (i === 0 ? dw - 0.08 : 0.065) : dw / 2 - 0.007;
        if (horiz) box(0.014, pl, 0.01, a + off, py, face === 'n' ? z - 0.024 : z + d + 0.012, M.brass); else box(0.01, pl, 0.014, face === 'e' ? x + w + 0.012 : x - 0.024, py, a + off, M.brass);
      }
      return; }
    if (id === 'k-wardrobe') { box(w, h, d, x, 0, z, M.cream); const front = new THREE.Mesh(new THREE.PlaneGeometry(d, h), std({ map: T.arch, roughness: 0.4 })); front.position.set(x - 0.002, h / 2, z + d / 2); front.rotation.y = -Math.PI / 2; front.receiveShadow = true; scene.add(front); box(0.02, 1.6, 0.06, x - 0.02, 0.8, z + d / 2 - 0.03, M.led, false, false); point('kids', x - 0.1, 1.6, z + d / 2, 0.3, 1.5); return; }
    if (id === 'm-headboard' || id === 'B-headboard') { box(w, 0.06, d, x, 0, z, M.taupe); const n = 20, pw = w / n; for (let i = 0; i < n; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(pw / 2, pw / 2, h, 14, 1, false, -Math.PI / 2, Math.PI), M.taupe); c.position.set(x + pw * i + pw / 2, h / 2, z + 0.05); c.castShadow = c.receiveShadow = true; scene.add(c); } return; }
    if (id === 'C-headboard') { const n = 18, pw = d / n; for (let i = 0; i < n; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(pw / 2, pw / 2, h, 14, 1, false, 0, Math.PI), M.taupe); c.position.set(x + 0.05, h / 2, z + pw * i + pw / 2); c.castShadow = c.receiveShadow = true; scene.add(c); } return; }
    if (f.kind === 'soft') { const m = reg(new THREE.MeshStandardMaterial({ map: T.fabric, color: col('#c6b8a4'), roughness: 1 })); box(w, h, d, x, y, z, m, false, true); return; }
    if (f.kind === 'art') { const vert = d > w; box(w, h, d, x, y, z, M.brass); const cm = reg(new THREE.MeshStandardMaterial({ map: T.marble, color: col('#cdbfae'), roughness: 0.8 })); if (vert) box(0.01, h - 0.06, d - 0.06, x + (x < 6 ? w : -0.005), y + 0.03, z + 0.03, cm, false, true); else box(w - 0.06, h - 0.06, 0.01, x + 0.03, y + 0.03, z - 0.008, cm, false, true); return; }
    if (id === 'k-panel') { const m = fluted(T.fluteCream, w); box(w, h, 0.05, x, 0, z, faced(M.cream, 4, m)); box(0.012, h - 0.1, 0.012, x + w * 0.33, 0.05, z + 0.05, M.brass); box(0.012, h - 0.1, 0.012, x + w * 0.67, 0.05, z + 0.05, M.brass); return; }
    if (f.kind === 'bed' && f.axis === 'x') { // bed lying along X, head at the west end
      box(w, 0.26, d, x, 0, z, M.cream); rbox(w - 0.1, 0.24, d - 0.06, x + 0.08, 0.26, z + 0.03, M.bedding, 0.05); rbox(w * 0.55, 0.09, d - 0.04, x + w * 0.42, 0.5, z + 0.02, M.bedding, 0.04); rbox(0.5, 0.05, d - 0.02, x + w * 0.62, 0.54, z + 0.01, M.throw, 0.02);
      const n = d > 1.5 ? 2 : 1; const pw = (d - 0.1 * (n + 1)) / n; for (let i = 0; i < n; i++) rbox(0.42, 0.14, pw, x + 0.1, 0.5, z + 0.1 + i * (pw + 0.1), M.bedding, 0.05); return; }
    if (f.kind === 'bed') { const kids = id.startsWith('k-'); box(w, 0.26, d, x, 0, z, M.cream); rbox(w - 0.06, 0.24, d - 0.1, x + 0.03, 0.26, z + 0.08, M.bedding, 0.05); rbox(w - 0.04, 0.09, d * 0.55, x + 0.02, 0.5, z + d * 0.42, M.bedding, 0.04); rbox(w - 0.02, 0.05, 0.5, x + 0.01, 0.54, z + d * 0.62, M.throw, 0.02);
      const n = w > 1.5 ? 2 : 1; const pw = (w - 0.1 * (n + 1)) / n; for (let i = 0; i < n; i++) rbox(pw, 0.14, 0.42, x + 0.1 + i * (pw + 0.1), 0.5, z + 0.1, M.bedding, 0.05);
      if (kids) { for (let i = 0; i < 3; i++) { const pw2 = (w - 0.08) / 3; const s = new THREE.Shape(); const hw = pw2 / 2 - 0.015, hh = 0.95; s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, hh - hw); s.absarc(0, hh - hw, hw, 0, Math.PI, false); s.lineTo(-hw, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.01, bevelSegments: 2 }); const m = new THREE.Mesh(g, M.taupe); m.position.set(x + 0.04 + pw2 * i + pw2 / 2, 0.1, z + 0.02); m.castShadow = m.receiveShadow = true; scene.add(m); } } return; }
    if (id === 'C-ns1' || id === 'C-ns2') { const m = fluted(T.fluteCream, d); box(w - 0.03, h - 0.12, d, x + 0.03, 0.12, z, faced(M.cream, 0, m)); box(w, 0.025, d + 0.02, x, h - 0.025, z - 0.01, M.marble); for (const [lx, lz] of [[0.04, 0.04], [w - 0.08, 0.04], [0.04, d - 0.08], [w - 0.08, d - 0.08]]) cyl(0.012, 0.02, 0.12, x + lx + 0.02, 0, z + lz + 0.02, M.brass, 10); box(0.012, 0.012, 0.16, x + w - 0.01, 0.3, z + d / 2 - 0.08, M.brass); box(0.012, 0.012, 0.16, x + w - 0.01, 0.5, z + d / 2 - 0.08, M.brass); return; }
    if (id === 'm-ns1' || id === 'm-ns2' || id === 'k-ns' || id === 'B-ns1' || id === 'B-ns2') { const m = fluted(T.fluteCream, w); box(w, h - 0.12, d - 0.03, x, 0.12, z + 0.03, faced(M.cream, 4, m)); box(w + 0.02, 0.025, d, x - 0.01, h - 0.025, z, M.marble); box(w + 0.02, 0.008, d, x - 0.01, h - 0.03, z, M.brass); for (const [lx, lz] of [[0.04, 0.04], [w - 0.08, 0.04], [0.04, d - 0.08], [w - 0.08, d - 0.08]]) cyl(0.012, 0.02, 0.12, x + lx + 0.02, 0, z + lz + 0.02, id === 'k-ns' ? M.oak : M.brass, 10); box(0.16, 0.012, 0.012, x + w / 2 - 0.08, 0.3, z + d - 0.01, M.brass); box(0.16, 0.012, 0.012, x + w / 2 - 0.08, 0.5, z + d - 0.01, M.brass); return; }
    if (id === 'm-vanity') { const m = fluted(T.fluteCream, 0.55); box(0.55, h - 0.1, d - 0.04, x + w - 0.55, 0.1, z + 0.02, faced(M.cream, 5, m)); box(w, 0.03, d, x, h - 0.03, z, M.marble); cyl(0.015, 0.02, h - 0.03, x + 0.05, 0, z + d - 0.05, M.brass, 10); cyl(0.015, 0.02, h - 0.03, x + 0.05, 0, z + 0.05, M.brass, 10); box(w - 0.6, 0.012, 0.03, x + 0.03, 0.08, z + 0.03, M.led, false, false); point('master', x + w / 2, 0.1, z + 0.2, 0.3, 1.2); return; }
    if (id === 'm-mirror') { mirror(new THREE.CircleGeometry(w / 2 - 0.03, 48), x + w / 2, y + w / 2, z + d - 0.012, Math.PI); const ring = new THREE.Mesh(new THREE.TorusGeometry(w / 2, 0.018, 12, 64), M.brass); ring.position.set(x + w / 2, y + w / 2, z + d - 0.015); scene.add(ring); const led = new THREE.Mesh(new THREE.TorusGeometry(w / 2 - 0.02, 0.008, 8, 64), M.led); led.position.set(x + w / 2, y + w / 2, z + d - 0.012); scene.add(led); point('master', x + w / 2, y + w / 2, z + d - 0.2, 0.8, 2.2, '#ffe6c8'); return; }
    if (id === 'm-tall') { box(w, h, d, x, 0, z, M.cream); box(w - 0.08, h - 0.16, 0.012, x + 0.04, 0.08, z, M.glass, false, false); for (let i = 1; i < 5; i++) box(w - 0.08, 0.02, d - 0.06, x + 0.04, i * (h - 0.2) / 5, z + 0.03, M.cream); box(0.012, h - 0.2, 0.012, x + 0.05, 0.1, z + 0.03, M.led, false, false); point('master', x + w / 2, 1.2, z - 0.1, 0.35, 1.5); return; }
    if (id === 'm-stool') { cyl(w / 2, w / 2 * 0.92, 0.42, x + w / 2, 0, z + d / 2, M.white); cyl(w / 2 + 0.01, w / 2 + 0.01, 0.06, x + w / 2, 0.42, z + d / 2, M.white); const back = new THREE.Mesh(new THREE.CylinderGeometry(w / 2 + 0.01, w / 2 + 0.01, 0.3, 24, 1, true, Math.PI * 0.15, Math.PI * 0.7), M.white); back.material = reg(new THREE.MeshStandardMaterial({ color: col('#f4f1ea'), roughness: 0.9, side: THREE.DoubleSide })); back.position.set(x + w / 2, 0.63, z + d / 2); scene.add(back); return; }
    if (f.kind === 'tv') { box(w, h, d, x, y, z, M.screen); box(w + 0.02, h + 0.02, 0.015, x - 0.01, y - 0.01, z + (z > 9 ? 0.015 : 0.04), M.black); return; }
    if (id === 'l-panel') { const m = fluted(T.fluteBeige, w); box(w, h, d, x, 0, z, faced(std({ color: col('#d6c6ae'), roughness: 0.4 }), 5, m)); box(0.03, 2.4, 0.02, 5.65, 0.12, z - 0.01, M.led, false, false); box(0.03, 2.4, 0.02, 7.66, 0.12, z - 0.01, M.led, false, false); rect('living', 0.03, 2.3, 5.66, 1.3, z - 0.02, 5.66, 1.3, z - 2, 1.5); rect('living', 0.03, 2.3, 7.67, 1.3, z - 0.02, 7.67, 1.3, z - 2, 1.5); return; }
    if (id === 'l-console') { box(w, h, d, x, y, z, M.walnut); box(w - 0.04, 0.012, 0.02, x + 0.02, y + h / 2, z - 0.005, M.brass); box(0.22, 0.03, 0.16, x + 0.3, y + h, z + 0.1, M.marble); box(0.12, 0.2, 0.12, x + 1.95, y + h, z + 0.12, M.cream); return; }
    if (f.kind === 'blob') { const sh = pebbleShape(w, d); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.01, bevelSegments: 3 }); const top = new THREE.Mesh(g, M.pebble); top.rotation.x = Math.PI / 2; top.position.set(x + w / 2, h, z + d / 2); top.castShadow = top.receiveShadow = true; scene.add(top); const bm = fluted(T.fluteWhite, 1.0); const base = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.26, w * 0.26, h - 0.04, 32), bm); base.scale.set(1, 1, d / w); base.position.set(x + w / 2, (h - 0.04) / 2, z + d / 2); base.castShadow = true; scene.add(base); return; }
    if (f.kind === 'sofa') {
      const salon = id.startsWith('s-'); const fab = salon ? M.champagne : M.chenille; const t = 0.24;
      if (salon) { box(w, 0.1, d, x, 0.08, z, M.walnut); for (const [lx, lz] of [[0.02, 0.02], [w - 0.07, 0.02], [0.02, d - 0.07], [w - 0.07, d - 0.07]]) box(0.05, 0.08, 0.05, x + lx, 0, z + lz, M.walnut); }
      else for (const [lx, lz] of [[0.04, 0.04], [w - 0.1, 0.04], [0.04, d - 0.1], [w - 0.1, d - 0.1]]) cyl(0.02, 0.025, 0.1, x + lx + 0.03, 0, z + lz + 0.03, M.black, 10);
      box(w, 0.16, d, x, 0.1, z, fab); const b = f.back || 'n';
      const nx = b.includes('n'), sx = b.includes('s'), wx = b.includes('w'), ex = b.includes('e');
      rbox(w - (wx ? t : 0) - (ex ? t : 0), 0.14, d - (nx ? t : 0) - (sx ? t : 0), x + (wx ? t : 0), 0.26, z + (nx ? t : 0), fab, 0.05);
      if (nx) rbox(w, 0.6, t, x, 0.26, z, fab, 0.06); if (sx) rbox(w, 0.6, t, x, 0.26, z + d - t, fab, 0.06); if (wx) rbox(t, 0.6, d, x, 0.26, z, fab, 0.06); if (ex) rbox(t, 0.6, d, x + w - t, 0.26, z, fab, 0.06);
      if (id === 'l-sofa-main') { rbox(0.2, 0.36, d, x, 0.26, z, fab, 0.05); for (let i = 0; i < 3; i++) rbox(0.72, 0.12, 0.2, x + 0.3 + i * 0.78, 0.86, z + 0.02, fab, 0.04); }
      const alongX = (b === 'n' || b === 's'); // arms sit at the two ends perpendicular to the back
      if (id === 's-sofa' || id.startsWith('s-arm') || id.startsWith('SP-')) { const aw = id === 's-sofa' ? 0.2 : 0.18;
        if (alongX) { rbox(aw, 0.36, d, x, 0.26, z, fab, 0.05); rbox(aw, 0.36, d, x + w - aw, 0.26, z, fab, 0.05); if (id === 's-sofa') { box(aw, 0.03, 0.06, x, 0.62, z + d - 0.26, M.walnut); box(aw, 0.03, 0.06, x + w - aw, 0.62, z + d - 0.26, M.walnut); } }
        else { rbox(w, 0.36, aw, x, 0.26, z, fab, 0.05); rbox(w, 0.36, aw, x, 0.26, z + d - aw, fab, 0.05); if (id === 's-sofa') { box(0.06, 0.03, aw, x + 0.84, 0.62, z, M.walnut); box(0.06, 0.03, aw, x + 0.84, 0.62, z + d - aw, M.walnut); } } }
      return; }
    if (f.kind === 'chair') { const face = f.face || 'n'; const cx = x + w / 2, cz = z + d / 2; cyl(w / 2, w / 2 - 0.02, 0.07, cx, 0.42, cz, M.boucle, 24); const sh = new THREE.Mesh(new THREE.CylinderGeometry(w / 2 + 0.01, w / 2 + 0.01, 0.46, 24, 1, true, 0, Math.PI), reg(new THREE.MeshStandardMaterial({ map: T.boucle, roughness: 1, side: THREE.DoubleSide }))); sh.position.set(cx, 0.68, cz); sh.rotation.y = { s: Math.PI / 2, n: -Math.PI / 2, e: Math.PI, w: 0 }[face]; sh.castShadow = sh.receiveShadow = true; scene.add(sh); for (const [lx, lz] of [[0.08, 0.08], [w - 0.08, 0.08], [0.08, d - 0.08], [w - 0.08, d - 0.08]]) cyl(0.014, 0.022, 0.42, x + lx, 0, z + lz, M.oak, 8); return; }
    if (id === 's-dining' || id === 'd-table' || id === 'SP-dining') { const bm = fluted(T.fluteCream, 1.2); const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, h - 0.04, 40), bm); ped.scale.set(1.4, 1, 0.75); ped.position.set(x + w / 2, (h - 0.04) / 2, z + d / 2); ped.castShadow = true; scene.add(ped); rbox(w, 0.04, d, x, h - 0.04, z, M.marble, 0.02); box(w, 0.012, d, x, h - 0.052, z, M.skirt); return; }
    if (f.kind === 'table' && (id === 'k-desk' || id === 'F-desk')) { box(w, 0.035, d, x, h - 0.035, z, M.oak); box(0.02, h - 0.05, d, x + w - 0.02, 0, z, M.cream); box(0.4, 0.5, d - 0.02, x + w - 0.42, h - 0.55, z + 0.01, M.cream); box(0.012, h - 0.05, 0.03, x, 0, z + 0.02, M.cream); box(0.012, h - 0.05, 0.03, x, 0, z + d - 0.05, M.cream); return; }
    if (f.kind === 'table' && id === 's-ct') { box(w, 0.025, d, x, h - 0.025, z, M.marble); box(w - 0.06, 0.05, d - 0.06, x + 0.03, h - 0.08, z + 0.03, M.walnut); for (const [lx, lz] of [[0.03, 0.03], [w - 0.07, 0.03], [0.03, d - 0.07], [w - 0.07, d - 0.07]]) box(0.04, h - 0.08, 0.04, x + lx, 0, z + lz, M.walnut); return; }
    if (f.kind === 'table' && id === 's-console') { box(w, 0.03, d, x, h - 0.03, z, M.marble); box(0.03, h - 0.03, d - 0.02, x + 0.05, 0, z + 0.01, M.walnut); box(0.03, h - 0.03, d - 0.02, x + w - 0.08, 0, z + 0.01, M.walnut); box(w - 0.1, 0.015, 0.015, x + 0.05, 0.12, z + d / 2, M.brass); return; }
    if (id === 's-buffet') { box(w, h, d, x, y, z, M.cream); box(w + 0.02, 0.02, d, x - 0.02, y + h, z, M.marble); box(0.006, 0.014, 0.16, x - 0.004, y + h / 2, z + d * 0.25, M.brass); box(0.006, 0.014, 0.16, x - 0.004, y + h / 2, z + d * 0.75 - 0.16, M.brass); box(0.004, 0.004, d - 0.06, x - 0.002, y + h / 2 - 0.004, z + 0.03, M.skirt); return; }
    if (id === 's-emirror') { mirror(new THREE.PlaneGeometry(w - 0.04, h - 0.04), x + w / 2, y + h / 2, z + 0.02, Math.PI); box(w, h, 0.015, x, y, z + 0.03, M.brass); return; }
    if (id === 's-mirrors' || id === 'd-mirrors') { const specs = [[0.0, 0.42, 0.5, 0.52], [0.9, 0.31, 0.4, 0.5], [1.56, 0.21, 0.27, 0.44]]; const base = 1.12; for (const [ox, rx, ry, cy] of specs) { const sh = pebbleShape(rx * 2, ry * 2); const g = new THREE.ShapeGeometry(sh); const b = new THREE.Mesh(g, M.brass); b.scale.set(1.05, 1.05, 1); b.position.set(x - 0.15 + ox + rx, base + cy, z + 0.012); scene.add(b); mirror(new THREE.ShapeGeometry(sh), x - 0.15 + ox + rx, base + cy, z + 0.02); } return; }
    if (id === 's-panel' || id === 'SP-panel') { if (w > d) { const m = fluted(T.fluteCream, w); box(w, h, d, x, 0, z, faced(M.cream, 4, m)); box(w - 0.6, 1.9, 0.03, x + 0.3, 0.45, z + d, M.taupe); } else { const m = fluted(T.fluteCream, d); box(w, h, d, x, 0, z, faced(M.cream, 0, m)); box(0.03, 1.9, d - 0.6, x + w, 0.45, z + 0.3, M.taupe); } return; }
    if (id === 'd-buffet') { const m = fluted(T.fluteCream, w); box(w, h - 0.1, d - 0.02, x, 0.1, z, faced(M.cream, 4, m)); box(w + 0.02, 0.025, d, x - 0.01, h - 0.025, z, M.marble); box(w, 0.008, d, x, h - 0.03, z, M.brass); for (const [lx, lz] of [[0.05, 0.05], [w - 0.1, 0.05], [0.05, d - 0.1], [w - 0.1, d - 0.1]]) cyl(0.015, 0.02, 0.1, x + lx + 0.02, 0, z + lz + 0.02, M.brass, 10); box(0.16, 0.012, 0.012, x + w * 0.3 - 0.08, 0.5, z + d, M.brass); box(0.16, 0.012, 0.012, x + w * 0.7 - 0.08, 0.5, z + d, M.brass); return; }
    if (id === 'd-vitrine') { box(w, h, d, x, 0, z, M.cream); box(w - 0.08, h - 0.5, 0.012, x + 0.04, 0.42, z + d, M.glass, false, false); for (let i = 1; i < 4; i++) box(w - 0.08, 0.02, d - 0.06, x + 0.04, 0.42 + i * (h - 0.5) / 4, z + 0.03, M.cream); box(0.012, h - 0.6, 0.012, x + 0.05, 0.47, z + d - 0.03, M.led, false, false); box(0.012, h - 0.6, 0.012, x + w - 0.06, 0.47, z + d - 0.03, M.led, false, false); point('salon', x + w / 2, 1.3, z + d + 0.1, 0.3, 1.5); return; }
    if (id === 'd-shelf') { box(w, 0.04, d, x, y, z, M.marble); box(w - 0.1, 0.012, 0.012, x + 0.05, y - 0.012, z + d - 0.012, M.brass); return; }
    if (f.kind === 'wardrobe') { box(w, h, d, x, 0, z, M.cream); return; }
    if (f.kind === 'rug') { const m = reg(new THREE.MeshStandardMaterial({ map: T.rug.clone(), roughness: 1 })); m.map.needsUpdate = true; m.map.repeat.set(1, 1); const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.014, d), m); r.position.set(x + w / 2, 0.011, z + d / 2); r.receiveShadow = true; scene.add(r); return; }
    if (f.kind === 'curtain') { curtain(f); return; }
    if (id === 'C-lamp') { cyl(0.14, 0.14, 0.02, x + w / 2, 0, z + d / 2, M.brass, 24); cyl(0.012, 0.012, 1.3, x + w / 2, 0.02, z + d / 2, M.brass, 8); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.28, 24, 1, true), reg(new THREE.MeshStandardMaterial({ color: col('#f3e8d6'), roughness: 0.8, side: THREE.DoubleSide, emissive: col('#ffd9a0'), emissiveIntensity: 0 }))); sh.position.set(x + w / 2, 1.46, z + d / 2); scene.add(sh); point('master', x + w / 2, 1.4, z + d / 2, 0.8, 3.5); return; }
    if (f.kind === 'round') { cyl(w / 2, w / 2, h - 0.03, x + w / 2, 0, z + d / 2, M.brass, 24); cyl(w / 2 + 0.02, w / 2 + 0.02, 0.03, x + w / 2, h - 0.03, z + d / 2, M.marble, 32); return; }
    if (id === 'k-shelf') { for (let i = 0; i < 3; i++) box(0.3, 0.02, 0.18, 8.62, 1.3 + i * 0.35, 3.44, M.cream); box(0.02, 0.9, 0.18, 8.62, 1.3, 3.44, M.cream); box(0.6, 0.025, 0.2, 8.32, 2.28, 3.60, M.cream); box(0.6, 0.025, 0.2, 8.32, 2.28, 4.6, M.cream); return; }
    if (id === 'k-chair') { const cx = x + w / 2, cz = z + d / 2; cyl(0.22, 0.2, 0.06, cx, 0.44, cz, M.boucle, 20); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 20, 1, true, 0, Math.PI), reg(new THREE.MeshStandardMaterial({ map: T.boucle, roughness: 1, side: THREE.DoubleSide }))); sh.position.set(cx, 0.72, cz); sh.rotation.y = Math.PI; scene.add(sh); cyl(0.02, 0.03, 0.44, cx, 0, cz, M.black, 10); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; box(0.25, 0.02, 0.03, cx, 0, cz, M.black).rotation.y = a; } return; }
    box(w, h, d, x, y, z, M.cream);
  }
  function curtain(f) {
    const vertWall = f.d > f.w; const len = vertWall ? f.d : f.w; const H = 2.6; const px = f.x + f.w / 2, pz = f.y + f.d / 2;
    const make = (L, start, amp, k, m) => { const g = new THREE.PlaneGeometry(L, H, Math.max(8, Math.round(L * 40)), 1); const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) / L + 0.5; pos.setZ(i, Math.sin(u * L * k) * amp); } g.computeVertexNormals(); const mesh = new THREE.Mesh(g, m); mesh.castShadow = false; mesh.receiveShadow = true; if (vertWall) { mesh.rotation.y = Math.PI / 2; mesh.position.set(px, H / 2 + 0.02, f.y + start + L / 2); } else { mesh.position.set(f.x + start + L / 2, H / 2 + 0.02, pz); } scene.add(mesh); };
    make(len, 0, 0.035, 22, M.sheer);
    const drapeN = f.id === 'k-curtain'; const dm = f.id === 's-curtain' ? M.drapeCh : M.drape; const L = Math.min(0.5, len * 0.3);
    make(L, drapeN ? 0.02 : len - L - 0.02, 0.07, 40, dm);
  }

  // ---------- lighting modes: a continuous mix t (0 = day, 1 = evening) so the presentation can cross-fade
  // rooms: rooms whose full lighting (with shadows) is on; others: false = nothing, true = fill light only, 'full' = fill + coves (dollhouse at night)
  const DAY = { sun: 2.0, fill: 0.35, hemi: 0.32, amb: 0.04, env: 0.55, led: 0.15, ledW: 0.1, lamp: 0, exp: 0.82, sky: '#ffffff', bg: '#dfe6ea', hemiSky: '#dfe9f2', hemiGround: '#a89880' };
  const EVE = { sun: 0, fill: 0, hemi: 0.1, amb: 0.14, env: 0.3, led: 2.2, ledW: 2.5, lamp: 1.6, exp: 1.05, sky: '#1a2538', bg: '#0f151c', hemiSky: '#4a4036', hemiGround: '#1a1512' };
  const _c1 = new THREE.Color(), _c2 = new THREE.Color();
  function setMix(t, rooms, others) {
    t = Math.max(0, Math.min(1, t)); const L = (k) => DAY[k] + (EVE[k] - DAY[k]) * t; const C = (k, target) => { _c1.set(DAY[k]); _c2.set(EVE[k]); target.copy(_c1.lerp(_c2, t)); };
    sun.intensity = L('sun'); sun.visible = true; fill.intensity = L('fill'); fill.visible = true;
    hemi.intensity = L('hemi'); C('hemiSky', hemi.color); C('hemiGround', hemi.groundColor); amb.intensity = L('amb');
    for (const m of skyMats) C('sky', m.color); C('bg', scene.background);
    const env = L('env'); for (const m of mats) m.envMapIntensity = env * (m.userData.envBase || 1);
    M.led.emissiveIntensity = L('led'); M.ledWhite.emissiveIntensity = L('ledW'); M.lamp.emissiveIntensity = L('lamp');
    for (const r in roomLights) for (const l of roomLights[r]) {
      const active = rooms.includes(r);
      if (active) { l.visible = !l.userData.fill; if (l.isSpotLight) l.castShadow = !!l.userData.shadowOK; }
      else if (others === 'full') { l.visible = !!(l.userData.fill || l.isRectAreaLight); if (l.isSpotLight) l.castShadow = false; }
      else if (others) { l.visible = !!l.userData.fill; if (l.isSpotLight) l.castShadow = false; }
      else l.visible = false;
      if (l.visible) l.intensity = l.userData.i0 * t;
    }
    renderer.toneMappingExposure = L('exp');
  }
  function setMode(mode, rooms, others) { setMix(mode === 'day' ? 0 : 1, rooms, others); }
  function aimSun(cx, cz, half) { sun.position.set(cx + 9, 7.5, cz + 3.5); sun.target.position.set(cx, 0, cz); fill.position.set(cx - 7, 6, cz - 4); fill.target.position.set(cx, 0.5, cz); sun.shadow.camera.left = -half; sun.shadow.camera.right = half; sun.shadow.camera.top = half; sun.shadow.camera.bottom = -half; sun.shadow.camera.near = 1; sun.shadow.camera.far = 40; sun.shadow.camera.updateProjectionMatrix(); }

  function init(container, w, h, alt, opts) {
    activeAlt = alt || ''; opts = opts || {}; if (opts.reflectorSize) reflectorSize = opts.reflectorSize;
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !opts.interactive }); renderer.setPixelRatio(opts.pixelRatio || (opts.interactive ? Math.min(1.5, window.devicePixelRatio || 1) : 1)); renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    THREE.RectAreaLightUniformsLib.init();
    scene = new THREE.Scene(); scene.background = new THREE.Color('#dfe6ea');
    pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    camera = new THREE.PerspectiveCamera(65, w / h, 0.05, 120);
    hemi = new THREE.HemisphereLight('#dfe9f2', '#b9a98f', 0.55); scene.add(hemi); amb = new THREE.AmbientLight('#ffffff', 0.08); scene.add(amb);
    sun = new THREE.DirectionalLight(col('#fff1dc'), 2.0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.02; scene.add(sun); scene.add(sun.target);
    fill = new THREE.DirectionalLight(col('#dfe8f0'), 0.35); scene.add(fill); scene.add(fill.target); // soft sky bounce from the opposite side, no shadows
    build();
    setMode('day', []); // start from a clean light state so the first compiled programs never see every light at once
  }
  const roomOf = { master: [3.41, 0.25, 8.11, 4.03], kids: [4.46, 3.42, 8.92, 6.40], living: [4.46, 6.56, 8.96, 9.54], salon: [0.25, 8.88, 7.31, 13.02], corridor: [3.36, 4.15, 4.34, 9.78] };
  function capture(shot, w, h) {
    const cam = A.shots.find(c => c.id === shot.cam) || A.cameras.find(c => c.id === shot.cam);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = cam.fov || 65; camera.updateProjectionMatrix();
    camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]); camera.lookAt(cam.target[0], cam.target[1], cam.target[2]);
    const rooms = shot.rooms || [];
    setMode(shot.mode, rooms, shot.others);
    const overview = cam.pos[1] > 5;
    for (const c of ceilMeshes) c.castShadow = !overview; for (const m of skyMeshes) m.visible = !overview;
    if (overview) { aimSun(4.6, 6.6, 9); sun.position.set(4.6 + 6, 16, 6.6 + 4); }
    else { const b = roomOf[rooms[0]] || roomOf.salon; aimSun((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 4.5); }
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/jpeg', 0.9);
  }
  // ---------- interactive API (used by viewer.js)
  function handles() { return { renderer, scene, camera, sun, ceilMeshes, roomOf }; }
  function renderNow() { renderer.render(scene, camera); }
  function resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function setPixelRatio(p) { renderer.setPixelRatio(p); }
  function setShadowsForRoom(roomId, overview) { for (const c of ceilMeshes) c.castShadow = !overview; for (const m of skyMeshes) m.visible = !overview; if (overview) { aimSun(4.6, 6.6, 9); sun.position.set(10.6, 16, 10.6); } else { const b = roomOf[roomId] || roomOf.salon; aimSun((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 4.5); } }
  return { init, capture, handles, renderNow, resize, setMode, setMix, setShadowsForRoom, setReflections, setPixelRatio, roomOf };
})();
