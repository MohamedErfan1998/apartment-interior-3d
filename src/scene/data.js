/* The apartment model: rooms, walls, doors, windows, furniture, ceiling, lights and cameras, in metres (plan X right, Y down). Single source of truth for the plans and the 3D scene. */
/* Apartment model. Units: metres. Plan coordinates: X to the right (east in plan), Y downward (south in plan).
   Origin = outer corner of the envelope top-left. Inner faces taken from the measured drawing (مقاسات تفصيلية).
   Exterior wall thickness (0.25) is NOT measured — drawn nominal. */
window.APT = (function () {
  const rooms = [
    { id: 'master', name: 'Master bedroom', ar: 'غرفة 1', floor: 'wood',
      poly: [[3.41, 0.25], [8.11, 0.25], [8.11, 3.31], [4.34, 3.31], [4.34, 4.03], [3.41, 4.03]],
      label: [5.35, 2.72], dims: '4.70 × 3.07 + recess 0.93 × 0.72', area: 15.1 },
    { id: 'kids', name: "Children's bedroom", ar: 'غرفة 2', floor: 'wood',
      poly: [[4.46, 3.42], [8.92, 3.42], [8.92, 6.40], [4.46, 6.40]], label: [6.9, 5.92], dims: '4.46 × 2.98', area: 13.3 },
    { id: 'living', name: 'Living room (TV)', ar: 'غرفة 3', floor: 'wood',
      poly: [[4.46, 6.56], [8.96, 6.56], [8.96, 9.54], [4.46, 9.54]], label: [6.7, 8.7], dims: '4.50 × 2.98', area: 13.4 },
    { id: 'corridor', name: 'Corridor', ar: 'طرقة', floor: 'cream',
      poly: [[3.36, 4.15], [4.34, 4.15], [4.34, 9.78], [3.36, 9.78]], label: [3.85, 7.0], dims: '0.98 × 5.63', area: 5.5 },
    { id: 'kitchen', name: 'Kitchen', ar: 'مطبخ', floor: 'kitchen',
      poly: [[0.28, 6.38], [3.24, 6.38], [3.24, 8.71], [0.28, 8.71]], label: [1.7, 7.6], dims: '2.96 × 2.33', area: 6.9 },
    { id: 'kbalcony', name: 'Kitchen balcony', ar: 'بلكونة المطبخ', floor: 'balcony',
      poly: [[0.30, 5.19], [1.30, 5.19], [1.30, 6.26], [0.30, 6.26]], label: [0.8, 5.75], dims: '1.00 × 1.07', area: 1.1 },
    { id: 'bath', name: 'Bathroom', ar: 'حمام', floor: 'bath',
      poly: [[1.48, 3.43], [3.24, 3.43], [3.24, 6.22], [1.48, 6.22]], label: [2.5, 4.6], dims: '1.76 × 2.79', area: 4.9 },
    { id: 'salon', name: 'Salon + dining', ar: 'صالون', floor: 'cream',
      poly: [[0.25, 8.88], [3.36, 8.88], [3.36, 9.78], [7.31, 9.78], [7.31, 13.02], [0.25, 13.02]],
      label: [2.0, 12.2], dims: '7.06 × 3.24 + bay 3.11 × 0.90', area: 26.6 },
    { id: 'balcony', name: 'Balcony', ar: 'بلكونه', floor: 'balcony',
      poly: [[7.43, 9.78], [8.63, 9.78], [8.39, 13.02], [7.43, 13.02]], label: [7.9, 11.4], dims: '1.08–1.20 × 3.24', area: 3.7 }
  ];

  // Wall boxes {x0,y0,x1,y1,z0,z1}. z default 0..2.65 (finished gypsum height).
  const W = (x0, y0, x1, y1, z0, z1) => ({ x0, y0, x1, y1, z0: z0 ?? 0, z1: z1 ?? 2.65 });
  const walls = [
    // exterior
    W(3.16, 0.00, 8.36, 0.25),                 // north wall of master
    W(3.16, 0.00, 3.41, 3.43),                 // master west wall (exterior; faces the void north of the bathroom)
    W(8.11, 0.00, 8.36, 0.60), W(8.11, 0.60, 8.36, 1.80, 0, 0.95), W(8.11, 0.60, 8.36, 1.80, 2.15, 2.65), W(8.11, 1.80, 8.36, 3.17), // master east + window
    W(8.11, 3.17, 9.17, 3.42),                 // step wall between master and kids (exterior)
    W(8.92, 3.42, 9.17, 3.62), W(8.92, 3.62, 9.17, 4.82, 0, 0.95), W(8.92, 3.62, 9.17, 4.82, 2.15, 2.65), W(8.92, 4.82, 9.17, 6.56), // kids east + window
    W(8.96, 6.56, 9.21, 8.10), W(8.96, 8.10, 9.21, 9.30, 0, 0.95), W(8.96, 8.10, 9.21, 9.30, 2.15, 2.65), W(8.96, 9.30, 9.21, 9.78), // living east + window
    W(4.34, 9.54, 8.63, 9.78),                 // living / salon + balcony north wall (0.24 thick)
    W(8.63, 9.54, 9.21, 9.78),
    W(0.00, 13.02, 0.40, 13.27), W(0.40, 13.02, 1.30, 13.27, 2.10, 2.65), W(1.30, 13.02, 8.39, 13.27), // south wall + entrance door head
    W(0.00, 5.19, 0.25, 13.27),                // west wall
    W(0.00, 4.94, 1.55, 5.19),                 // kitchen balcony north wall
    W(1.23, 3.18, 1.48, 5.19),                 // bathroom west (exterior part)
    W(1.30, 5.19, 1.48, 6.26),                 // kitchen balcony / bathroom
    W(1.23, 3.18, 1.76, 3.43), W(1.76, 3.18, 2.45, 3.43, 0, 1.50), W(1.76, 3.18, 2.45, 3.43, 2.20, 2.65), W(2.45, 3.18, 3.41, 3.43), // bath north + small window
    // interior
    W(0.25, 6.26, 0.41, 6.38), W(0.41, 6.26, 1.18, 6.38, 2.10, 2.65), W(1.18, 6.26, 1.48, 6.38), // kitchen north wall + balcony door
    W(1.48, 6.22, 3.38, 6.38),                 // bathroom / kitchen
    W(0.25, 8.71, 3.36, 8.88),                 // kitchen / salon bay
    W(3.24, 6.38, 3.36, 7.87), W(3.24, 7.87, 3.36, 8.57, 2.10, 2.65), W(3.24, 8.57, 3.36, 8.88), // kitchen east + door
    W(3.24, 3.43, 3.38, 4.30), W(3.24, 4.30, 3.38, 5.00, 2.10, 2.65), W(3.24, 5.00, 3.38, 6.38), // bathroom east + door
    W(3.38, 4.03, 3.49, 4.15), W(3.49, 4.03, 4.30, 4.15, 2.10, 2.65), W(4.30, 4.03, 4.34, 4.15), // master door wall (recess)
    W(4.34, 3.31, 4.46, 5.31), W(4.34, 5.31, 4.46, 6.12, 2.10, 2.65), W(4.34, 6.12, 4.46, 6.72), W(4.34, 6.72, 4.46, 7.53, 2.10, 2.65), W(4.34, 7.53, 4.46, 9.54), // corridor / rooms wall + 2 doors
    W(4.34, 3.31, 8.11, 3.42),                 // master / kids
    W(4.46, 6.40, 9.17, 6.56),                 // kids / living
    W(7.31, 9.78, 7.43, 10.18), W(7.31, 10.18, 7.43, 11.38, 2.15, 2.65), W(7.31, 11.38, 7.43, 13.02), // salon / balcony + glazed door
    W(2.45, 5.41, 2.52, 5.97, 0, 2.00),        // shower screen
  ];
  const columns = [
    { x0: 3.41, y0: 0.25, x1: 3.61, y1: 0.38 }, { x0: 7.84, y0: 0.25, x1: 8.11, y1: 0.37 },
    { x0: 4.46, y0: 3.42, x1: 4.56, y1: 3.80 }, { x0: 8.65, y0: 3.42, x1: 8.92, y1: 3.54 },
    { x0: 4.46, y0: 6.28, x1: 4.71, y1: 6.40 }, { x0: 8.64, y0: 6.26, x1: 8.92, y1: 6.40 },
    { x0: 4.46, y0: 9.16, x1: 4.58, y1: 9.54 }, { x0: 8.68, y0: 9.41, x1: 8.96, y1: 9.54 },
    { x0: 3.03, y0: 6.38, x1: 3.24, y1: 6.50 }
  ];
  // Doors: hinge point, leaf length, closed direction, open direction (unit vectors in plan)
  const doors = [
    { id: 'entrance', name: 'Entrance door', w: 0.90, hinge: [0.40, 13.02], closed: [1, 0], open: [0, -1], note: 'swings into salon, leaf against west wall' },
    { id: 'd-master', name: 'Master door', w: 0.81, hinge: [3.49, 4.03], closed: [1, 0], open: [0, -1], note: 'in recess wall, swings into room' },
    { id: 'd-kids', name: "Children's door", w: 0.81, hinge: [4.46, 6.12], closed: [0, -1], open: [1, 0], note: 'hinge on south jamb, swings into room' },
    { id: 'd-living', name: 'Living door', w: 0.81, hinge: [4.46, 6.72], closed: [0, 1], open: [1, 0], note: 'hinge on north jamb, swings into room' },
    { id: 'd-kitchen', name: 'Kitchen door', w: 0.70, hinge: [3.36, 8.57], closed: [0, -1], open: [-1, 0], note: 'swings into kitchen' },
    { id: 'd-bath', name: 'Bathroom door', w: 0.70, hinge: [3.24, 4.30], closed: [0, 1], open: [-1, 0], note: 'swings into bathroom' },
    { id: 'd-kbal', name: 'Kitchen balcony door', w: 0.77, hinge: [0.41, 6.38], closed: [1, 0], open: [0, 1], unverified: true, note: 'swing direction not confirmed' },
  ];
  const openings = [ // glazed / unverified openings drawn without swing
    { id: 'balcony-door', name: 'Balcony door (salon)', x0: 7.31, y0: 10.18, x1: 7.43, y1: 11.38, w: 1.20, note: 'type (sliding/hinged) not confirmed' }
  ];
  const windows = [
    { id: 'w-master', room: 'master', x0: 8.11, y0: 0.60, x1: 8.36, y1: 1.80, w: 1.20 },
    { id: 'w-kids', room: 'kids', x0: 8.92, y0: 3.62, x1: 9.17, y1: 4.82, w: 1.20 },
    { id: 'w-living', room: 'living', x0: 8.96, y0: 8.10, x1: 9.21, y1: 9.30, w: 1.20 },
    { id: 'w-bath', room: 'bath', x0: 1.76, y0: 3.18, x1: 2.45, y1: 3.43, w: 0.69 }
  ];

  // Furniture boxes: x,y = top-left in plan; w (along X), d (along Y), h height, z base. kind drives 3D shape.
  const F = (o) => Object.assign({ z: 0, kind: 'box' }, o);
  const furniture = [
    // ---- Master bedroom (Rev 05 final: bed ↔ dressing wall opposite; hanging wardrobe on the window wall; no TV)
    F({ id: 'm-headboard', room: 'master', name: 'Scalloped upholstered headboard 2.88 × 1.25 (160 set, DIMENSION TO CONFIRM)', x: 4.485, y: 0.25, w: 2.88, d: 0.08, h: 1.25, color: '#d8ccbc' }),
    F({ id: 'm-softwall', room: 'master', name: 'Soft wall panel above the headboard, greige fabric 2.88 × 1.30', x: 4.485, y: 0.25, w: 2.88, d: 0.03, h: 1.32, z: 1.25, color: '#cfc3b2', kind: 'soft' }),
    F({ id: 'm-bed', room: 'master', name: 'Bed 160×190 (frame 1.78 × 2.00)', x: 5.035, y: 0.33, w: 1.78, d: 2.00, h: 0.52, color: '#e6ddcf', kind: 'bed' }),
    F({ id: 'm-ns1', room: 'master', name: 'Nightstand', x: 4.485, y: 0.33, w: 0.55, d: 0.42, h: 0.55, color: '#efe9df' }),
    F({ id: 'm-ns2', room: 'master', name: 'Nightstand', x: 6.815, y: 0.33, w: 0.55, d: 0.42, h: 0.55, color: '#efe9df' }),
    F({ id: 'm-dresswall', room: 'master', name: 'Dressing wall opposite the bed: built-in 3.17 × 0.35 × 2.57, five bays, central dressing niche, mirror doors', x: 4.34, y: 2.96, w: 3.17, d: 0.35, h: 2.57, color: '#ddd3c3', kind: 'dresswall' }),
    F({ id: 'm-wardE', room: 'master', name: 'Hanging module 1.51 × 0.60 × 2.65 on the window wall: three 0.50 hinged leaves in greige fabric, all hinged on the north edge, opening towards the window', x: 7.51, y: 1.80, w: 0.60, d: 1.51, h: 2.65, color: '#ddd3c3', kind: 'wardrobe', face: 'w', finish: 'fabric', leaves: 3, hingeSide: 'n' }),
    F({ id: 'm-mirror', room: 'master', name: 'Round LED mirror Ø0.60 in the dressing niche', x: 5.625, y: 3.235, w: 0.60, d: 0.04, h: 0.60, z: 1.10, color: '#c9d0d4', kind: 'mirror' }),
    F({ id: 'm-art', room: 'master', name: 'Artwork 0.80 × 1.10 on the west wall', x: 3.41, y: 1.38, w: 0.04, d: 0.80, h: 1.10, z: 0.85, color: '#bfae9a', kind: 'art' }),
    F({ id: 'm-rug', room: 'master', name: 'Rug 2.40 × 1.70', x: 4.725, y: 0.95, w: 2.40, d: 1.70, h: 0.012, color: '#d9cdb9', kind: 'rug' }),
    F({ id: 'm-curtain', room: 'master', name: 'Curtain over the window (pocket 1.43)', x: 8.00, y: 0.37, w: 0.10, d: 1.43, h: 2.60, color: '#e9e2d6', kind: 'curtain' }),
    // ---- Children's bedroom
    F({ id: 'k-bed1', room: 'kids', name: 'Single bed 90×190 (frame 0.95 × 2.05)', x: 5.35, y: 3.42, w: 0.95, d: 2.05, h: 0.50, color: '#e6ddcf', kind: 'bed' }),
    F({ id: 'k-bed2', room: 'kids', name: 'Single bed 90×190 (frame 0.95 × 2.05)', x: 6.75, y: 3.42, w: 0.95, d: 2.05, h: 0.50, color: '#e6ddcf', kind: 'bed' }),
    F({ id: 'k-ns', room: 'kids', name: 'Shared nightstand 0.45', x: 6.30, y: 3.44, w: 0.45, d: 0.42, h: 0.55, color: '#efe9df' }),
    F({ id: 'k-panel', room: 'kids', name: 'Headboard wall panel 2.45 wide', x: 5.30, y: 3.42, w: 2.45, d: 0.06, h: 1.30, color: '#d8ccbc' }),
    F({ id: 'k-desk', room: 'kids', name: 'Study desk 1.20 × 0.50 under window', x: 8.42, y: 3.60, w: 0.50, d: 1.20, h: 0.75, color: '#efe9df', kind: 'table' }),
    F({ id: 'k-chair', room: 'kids', name: 'Desk chair', x: 7.90, y: 3.95, w: 0.48, d: 0.48, h: 0.85, color: '#cdbfae', kind: 'chair', face: 'e' }),
    F({ id: 'k-wardrobe', room: 'kids', name: 'Wardrobe 1.44 × 0.60 hinged (built-in, to ceiling)', x: 8.32, y: 4.82, w: 0.60, d: 1.44, h: 2.65, color: '#ebe4d6', kind: 'wardrobe', face: 'w' }),
    F({ id: 'k-shelf', room: 'kids', name: 'Wall shelves above desk (both sides of window)', x: 8.62, y: 3.44, w: 0.30, d: 0.16, h: 0.9, z: 1.35, color: '#e6dfd3' }),
    F({ id: 'k-rug', room: 'kids', name: 'Rug 2.00 × 1.40', x: 5.40, y: 4.90, w: 2.00, d: 1.40, h: 0.012, color: '#d9cdb9', kind: 'rug' }),
    F({ id: 'k-curtain', room: 'kids', name: 'Curtain over window + 0.20 (pocket)', x: 8.82, y: 3.42, w: 0.10, d: 1.40, h: 2.60, color: '#e9e2d6', kind: 'curtain' }),
    // ---- Living room
    F({ id: 'l-sofa-main', room: 'living', name: 'Corner sofa, main section 2.56 (bed mechanism)', x: 5.40, y: 6.56, w: 2.56, d: 0.98, h: 0.45, color: '#d9cfbf', kind: 'sofa', back: 'n' }),
    F({ id: 'l-sofa-chaise', room: 'living', name: 'Corner sofa, corner + chaise 1.00 × 1.60', x: 7.96, y: 6.56, w: 1.00, d: 1.60, h: 0.45, color: '#d9cfbf', kind: 'sofa', back: 'ne' }),
    F({ id: 'l-ct1', room: 'living', name: 'Coffee table (large) 0.95 × 0.65', x: 6.20, y: 7.98, w: 0.95, d: 0.65, h: 0.40, color: '#f2eee7', kind: 'blob' }),
    F({ id: 'l-ct2', room: 'living', name: 'Coffee table (small) 0.55 × 0.45', x: 7.15, y: 8.25, w: 0.55, d: 0.45, h: 0.34, color: '#f2eee7', kind: 'blob' }),
    F({ id: 'l-console', room: 'living', name: 'Floating TV console 2.40 × 0.40', x: 5.45, y: 9.14, w: 2.40, d: 0.40, h: 0.45, z: 0.25, color: '#b48e68' }),
    F({ id: 'l-panel', room: 'living', name: 'TV wall panel, full height 4.10', x: 4.58, y: 9.48, w: 4.10, d: 0.06, h: 2.65, color: '#d3c3ad' }),
    F({ id: 'l-tv', room: 'living', name: 'TV 65″ (1.45 × 0.83)', x: 5.93, y: 9.42, w: 1.45, d: 0.05, h: 0.83, z: 0.95, color: '#222', kind: 'tv' }),
    F({ id: 'l-side', room: 'living', name: 'Side table Ø0.45', x: 8.40, y: 8.45, w: 0.45, d: 0.45, h: 0.50, color: '#efe9df', kind: 'round', optional: true }),
    F({ id: 'l-rug', room: 'living', name: 'Rug 2.40 × 1.70', x: 5.60, y: 7.30, w: 2.40, d: 1.70, h: 0.012, color: '#d9cdb9', kind: 'rug' }),
    F({ id: 'l-curtain', room: 'living', name: 'Curtain, full wall (pocket)', x: 8.85, y: 6.56, w: 0.10, d: 2.98, h: 2.60, color: '#e9e2d6', kind: 'curtain' }),
    // ---- Salon + dining (Rev 03: zones reversed — dining in the west bay/hall, salon in the east hall by the balcony door)
    F({ id: 'd-table', room: 'salon', name: 'Dining table 1.80 × 0.90 (6 seats)', x: 1.30, y: 10.35, w: 1.80, d: 0.90, h: 0.76, color: '#e9dfcf', kind: 'table' }),
    ...[0, 1, 2].map(i => F({ id: 'd-ch-n' + i, room: 'salon', name: 'Dining chair', x: 1.37 + i * 0.60, y: 9.83, w: 0.48, d: 0.50, h: 0.90, color: '#cdbfae', kind: 'chair', face: 's' })),
    ...[0, 1, 2].map(i => F({ id: 'd-ch-s' + i, room: 'salon', name: 'Dining chair', x: 1.37 + i * 0.60, y: 11.27, w: 0.48, d: 0.50, h: 0.90, color: '#cdbfae', kind: 'chair', face: 'n' })),
    F({ id: 'd-buffet', room: 'salon', name: 'Dining buffet (Rose set) 1.60 × 0.45 — DIMENSION TO CONFIRM', x: 1.45, y: 8.88, w: 1.60, d: 0.45, h: 0.85, color: '#efe6d6' }),
    F({ id: 'd-vitrine', room: 'salon', name: 'Display cabinet (Rose set) 0.80 × 0.45 × 2.00 — optional, DIMENSION TO CONFIRM', x: 0.40, y: 8.88, w: 0.80, d: 0.45, h: 2.00, color: '#efe6d6', optional: true }),
    F({ id: 'd-mirrors', room: 'salon', name: 'Three pebble mirrors over the buffet (0.90 / 0.65 / 0.45)', x: 1.45, y: 8.88, w: 1.60, d: 0.04, h: 1.10, z: 1.15, color: '#c9d0d4', kind: 'mirror' }),
    F({ id: 'd-shelf', room: 'salon', name: 'Entry floating shelf 0.80 × 0.25', x: 1.70, y: 12.77, w: 0.80, d: 0.25, h: 0.05, z: 0.85, color: '#efe6d6' }),
    F({ id: 's-emirror', room: 'salon', name: 'Entry mirror 0.70 × 1.00', x: 1.75, y: 12.97, w: 0.70, d: 0.04, h: 1.00, z: 1.10, color: '#c9d0d4', kind: 'mirror' }),
    F({ id: 's-sofa', room: 'salon', name: 'Salon 3-seater 2.20 × 0.90 (Fusion set)', x: 4.20, y: 12.12, w: 2.20, d: 0.90, h: 0.45, color: '#d9c7a6', kind: 'sofa', back: 's' }),
    F({ id: 's-arm1', room: 'salon', name: 'Armchair 0.85 × 0.85', x: 3.90, y: 10.70, w: 0.85, d: 0.85, h: 0.45, color: '#d9c7a6', kind: 'sofa', back: 'w' }),
    F({ id: 's-arm2', room: 'salon', name: 'Armchair 0.85 × 0.85', x: 6.40, y: 11.42, w: 0.85, d: 0.85, h: 0.45, color: '#d9c7a6', kind: 'sofa', back: 'e' }),
    F({ id: 's-ct', room: 'salon', name: 'Centre table 1.10 × 0.50', x: 5.00, y: 11.30, w: 1.10, d: 0.50, h: 0.42, color: '#efe6d6', kind: 'table' }),
    F({ id: 's-rug', room: 'salon', name: 'Rug 2.40 × 1.70', x: 4.35, y: 10.95, w: 2.40, d: 1.70, h: 0.012, color: '#d9cdb9', kind: 'rug' }),
    F({ id: 's-panel', room: 'salon', name: 'Feature panel on the north wall 2.70 × 2.65', x: 4.40, y: 9.78, w: 2.70, d: 0.05, h: 2.65, color: '#cfbfa8' }),
    F({ id: 's-curtain', room: 'salon', name: 'Curtain at balcony door (pocket 1.80)', x: 7.20, y: 9.90, w: 0.10, d: 1.80, h: 2.60, color: '#e9e2d6', kind: 'curtain' }),
    // ---- Salon, previous arrangement (Rev 02, before the zones were reversed) — kept for comparison, plan only
    F({ id: 'SP-sofa', alt: 'salonPrev', room: 'salon', name: 'Salon 3-seater 2.20 × 0.90', x: 0.25, y: 9.10, w: 0.90, d: 2.20, h: 0.45, color: '#d9c7a6', kind: 'sofa', back: 'w' }),
    F({ id: 'SP-arm1', alt: 'salonPrev', room: 'salon', name: 'Armchair', x: 2.45, y: 8.95, w: 0.85, d: 0.85, h: 0.45, color: '#d9c7a6', kind: 'sofa', back: 'e' }),
    F({ id: 'SP-arm2', alt: 'salonPrev', room: 'salon', name: 'Armchair', x: 2.45, y: 10.55, w: 0.85, d: 0.85, h: 0.45, color: '#d9c7a6', kind: 'sofa', back: 'e' }),
    F({ id: 'SP-ct', alt: 'salonPrev', room: 'salon', name: 'Centre table 1.10 × 0.50', x: 1.60, y: 9.65, w: 0.50, d: 1.10, h: 0.42, color: '#efe6d6', kind: 'table' }),
    F({ id: 'SP-rug', alt: 'salonPrev', room: 'salon', name: 'Rug 1.70 × 2.40', x: 1.00, y: 8.95, w: 1.70, d: 2.40, h: 0.012, color: '#d9cdb9', kind: 'rug' }),
    F({ id: 'SP-panel', alt: 'salonPrev', room: 'salon', name: 'Feature panel', x: 0.25, y: 8.90, w: 0.05, d: 2.80, h: 2.65, color: '#cfbfa8' }),
    F({ id: 'SP-console', alt: 'salonPrev', room: 'salon', name: 'Entry console 1.00 × 0.30', x: 1.60, y: 12.72, w: 1.00, d: 0.30, h: 0.85, color: '#efe6d6', kind: 'table' }),
    F({ id: 'SP-dining', alt: 'salonPrev', room: 'salon', name: 'Dining table 1.80 × 0.90', x: 4.31, y: 10.57, w: 1.80, d: 0.90, h: 0.76, color: '#e9dfcf', kind: 'table' }),
    ...[0, 1, 2].map(i => F({ id: 'SP-ch-n' + i, alt: 'salonPrev', room: 'salon', name: 'Dining chair', x: 4.42 + i * 0.60, y: 10.05, w: 0.48, d: 0.50, h: 0.90, color: '#cdbfae', kind: 'chair', face: 's' })),
    ...[0, 1, 2].map(i => F({ id: 'SP-ch-s' + i, alt: 'salonPrev', room: 'salon', name: 'Dining chair', x: 4.42 + i * 0.60, y: 11.49, w: 0.48, d: 0.50, h: 0.90, color: '#cdbfae', kind: 'chair', face: 'n' })),
    F({ id: 'SP-buffet', alt: 'salonPrev', room: 'salon', name: 'Floating console 1.20 × 0.40', x: 6.91, y: 11.50, w: 0.40, d: 1.20, h: 0.35, z: 0.55, color: '#efe6d6' }),
    F({ id: 'SP-mirrors', alt: 'salonPrev', room: 'salon', name: 'Pebble mirrors', x: 4.41, y: 9.78, w: 1.60, d: 0.04, h: 1.10, z: 1.15, color: '#c9d0d4', kind: 'mirror' }),
    F({ id: 'SP-curtain', alt: 'salonPrev', room: 'salon', name: 'Curtain', x: 7.20, y: 9.90, w: 0.10, d: 1.80, h: 2.60, color: '#e9e2d6', kind: 'curtain' }),
    // ---- Children, future layout F (one grown-up child; plan only)
    F({ id: 'F-bed', alt: 'kidsF', room: 'kids', name: 'Bed 120×200 (frame 1.25 × 2.15)', x: 5.35, y: 3.42, w: 1.25, d: 2.15, h: 0.50, color: '#e6ddcf', kind: 'bed' }),
    F({ id: 'F-ns', alt: 'kidsF', room: 'kids', name: 'Nightstand 0.45', x: 6.60, y: 3.44, w: 0.45, d: 0.42, h: 0.55, color: '#efe9df' }),
    F({ id: 'F-panel', alt: 'kidsF', room: 'kids', name: 'Headboard panel 1.75', x: 5.30, y: 3.42, w: 1.75, d: 0.06, h: 1.30, color: '#d8ccbc' }),
    F({ id: 'F-wardN', alt: 'kidsF', room: 'kids', name: 'Wardrobe hinged 1.25 × 0.60 (added later)', x: 7.05, y: 3.42, w: 1.25, d: 0.60, h: 2.65, color: '#ebe4d6', kind: 'wardrobe', face: 's' }),
    F({ id: 'F-wardE', alt: 'kidsF', room: 'kids', name: 'Wardrobe 1.44 × 0.60 (existing from phase 1)', x: 8.32, y: 4.82, w: 0.60, d: 1.44, h: 2.65, color: '#ebe4d6', kind: 'wardrobe', face: 'w' }),
    F({ id: 'F-desk', alt: 'kidsF', room: 'kids', name: 'Desk 1.10 × 0.50 (moved to south wall)', x: 6.60, y: 5.90, w: 1.10, d: 0.50, h: 0.75, color: '#efe9df', kind: 'table' }),
    F({ id: 'F-chair', alt: 'kidsF', room: 'kids', name: 'Desk chair', x: 6.95, y: 5.38, w: 0.48, d: 0.48, h: 0.85, color: '#cdbfae', kind: 'chair', face: 's' }),
    F({ id: 'F-rug', alt: 'kidsF', room: 'kids', name: 'Rug 2.00 × 1.40', x: 5.45, y: 4.30, w: 2.00, d: 1.40, h: 0.012, color: '#d9cdb9', kind: 'rug' }),
    F({ id: 'F-curtain', alt: 'kidsF', room: 'kids', name: 'Curtain over window (pocket 1.40)', x: 8.82, y: 3.42, w: 0.10, d: 1.40, h: 2.60, color: '#e9e2d6', kind: 'curtain' }),
    // ---- Children, Option B: L-arrangement (bed 1 along north wall, bed 2 along window wall, big wardrobe on south wall)
    F({ id: 'KB-bed1', alt: 'kidsB', room: 'kids', name: 'Single bed along north wall (0.95 × 2.05)', x: 4.62, y: 3.42, w: 2.05, d: 0.95, h: 0.50, color: '#e6ddcf', kind: 'bed', axis: 'x' }),
    F({ id: 'KB-bed2', alt: 'kidsB', room: 'kids', name: 'Single bed along window wall (0.95 × 2.05)', x: 7.97, y: 4.20, w: 0.95, d: 2.05, h: 0.50, color: '#e6ddcf', kind: 'bed' }),
    F({ id: 'KB-ward', alt: 'kidsB', room: 'kids', name: 'Wardrobe 2.60 × 0.60 on south wall', x: 5.30, y: 5.80, w: 2.60, d: 0.60, h: 2.65, color: '#ebe4d6', kind: 'wardrobe', face: 'n' }),
    F({ id: 'KB-desk', alt: 'kidsB', room: 'kids', name: 'Desk 0.90 × 0.50 on west wall', x: 4.46, y: 4.40, w: 0.50, d: 0.90, h: 0.75, color: '#efe9df', kind: 'table' }),
    F({ id: 'KB-chair', alt: 'kidsB', room: 'kids', name: 'Desk chair', x: 5.00, y: 4.61, w: 0.48, d: 0.48, h: 0.85, color: '#cdbfae', kind: 'chair', face: 'w' }),
    F({ id: 'KB-ns', alt: 'kidsB', room: 'kids', name: 'Nightstand', x: 6.72, y: 3.44, w: 0.42, d: 0.42, h: 0.55, color: '#efe9df' }),
    F({ id: 'KB-rug', alt: 'kidsB', room: 'kids', name: 'Rug 1.60 × 1.20', x: 5.60, y: 4.45, w: 1.60, d: 1.20, h: 0.012, color: '#d9cdb9', kind: 'rug' }),
    F({ id: 'KB-curtain', alt: 'kidsB', room: 'kids', name: 'Curtain (behind bed 2)', x: 8.82, y: 3.42, w: 0.10, d: 1.60, h: 2.60, color: '#e9e2d6', kind: 'curtain' }),
    // ---- Living, Option B: TV on north wall, sofa on south wall with chaise on the west
    F({ id: 'LB-chaise', alt: 'livingB', room: 'living', name: 'Corner + chaise 1.00 × 1.60 (west)', x: 4.58, y: 7.94, w: 1.00, d: 1.60, h: 0.45, color: '#d9cfbf', kind: 'sofa', back: 'sw' }),
    F({ id: 'LB-main', alt: 'livingB', room: 'living', name: 'Sofa main section 2.56 × 0.98', x: 5.58, y: 8.56, w: 2.56, d: 0.98, h: 0.45, color: '#d9cfbf', kind: 'sofa', back: 's' }),
    F({ id: 'LB-console', alt: 'livingB', room: 'living', name: 'Floating TV console 2.40 × 0.40', x: 5.66, y: 6.56, w: 2.40, d: 0.40, h: 0.45, z: 0.25, color: '#b48e68' }),
    F({ id: 'LB-panel', alt: 'livingB', room: 'living', name: 'TV wall panel 4.50', x: 4.46, y: 6.56, w: 4.50, d: 0.06, h: 2.65, color: '#d3c3ad' }),
    F({ id: 'LB-tv', alt: 'livingB', room: 'living', name: 'TV 65″', x: 6.14, y: 6.62, w: 1.45, d: 0.05, h: 0.83, z: 0.95, color: '#222', kind: 'tv' }),
    F({ id: 'LB-ct1', alt: 'livingB', room: 'living', name: 'Coffee table 0.95 × 0.65', x: 6.30, y: 7.45, w: 0.95, d: 0.65, h: 0.40, color: '#f2eee7', kind: 'blob' }),
    F({ id: 'LB-ct2', alt: 'livingB', room: 'living', name: 'Coffee table 0.55 × 0.45', x: 7.25, y: 7.60, w: 0.55, d: 0.45, h: 0.34, color: '#f2eee7', kind: 'blob' }),
    F({ id: 'LB-rug', alt: 'livingB', room: 'living', name: 'Rug 2.40 × 1.70', x: 5.75, y: 7.10, w: 2.40, d: 1.70, h: 0.012, color: '#d9cdb9', kind: 'rug' }),
    F({ id: 'LB-curtain', alt: 'livingB', room: 'living', name: 'Curtain, full wall', x: 8.85, y: 6.56, w: 0.10, d: 2.98, h: 2.60, color: '#e9e2d6', kind: 'curtain' }),

  ];

  // Ceiling: all rooms flat gypsum at 2.65. Cove bands = perimeter strips dropped 0.08 (to 2.57), LED strip facing up.
  const ceiling = {
    bands: [ // {x0,y0,x1,y1} band boxes at z 2.57..2.65, LED on the inner edge
      // Rev 02: bands stop 0.15 short of every curtain pocket; no band on the salon balcony wall (pocket + AC there)
      { room: 'salon', x0: 0.25, y0: 8.88, x1: 0.60, y1: 13.02 }, { room: 'salon', x0: 0.25, y0: 8.88, x1: 3.36, y1: 9.23 },
      { room: 'salon', x0: 0.25, y0: 12.67, x1: 7.16, y1: 13.02 },
      { room: 'salon', x0: 4.34, y0: 9.78, x1: 7.16, y1: 10.13 },
      { room: 'master', x0: 3.61, y0: 0.25, x1: 7.84, y1: 0.60 }, { room: 'master', x0: 4.34, y0: 2.96, x1: 7.96, y1: 3.31 },
      { room: 'kids', x0: 4.46, y0: 3.42, x1: 8.77, y1: 3.77 },
      { room: 'living', x0: 4.46, y0: 6.56, x1: 8.81, y1: 6.91 },
    ],
    pockets: [ // curtain pockets: recess in gypsum 0.15 wide along the window walls
      { x0: 7.96, y0: 0.25, x1: 8.11, y1: 3.31 }, { x0: 8.77, y0: 3.42, x1: 8.92, y1: 4.82 }, { x0: 8.81, y0: 6.56, x1: 8.96, y1: 9.54 }, { x0: 7.16, y0: 9.78, x1: 7.31, y1: 11.60 }
    ]
  };
  const lights = [
    // downlights (recessed 3000K)
    ...[[1.0, 9.75], [2.5, 9.75], [1.0, 11.45], [2.5, 11.45], [1.6, 12.45], [3.2, 12.45], [4.9, 12.45], [6.5, 12.45], [6.9, 10.6], [3.85, 9.3]].map(p => ({ type: 'down', room: 'salon', x: p[0], y: p[1] })),
    ...[[3.95, 1.5], [7.65, 1.25], [5.0, 2.62], [6.85, 2.62]].map(p => ({ type: 'down', room: 'master', x: p[0], y: p[1] })),
    ...[[5.0, 4.5], [7.0, 4.5], [5.0, 5.9], [7.0, 5.9], [8.35, 5.4]].map(p => ({ type: 'down', room: 'kids', x: p[0], y: p[1] })),
    ...[[5.2, 7.4], [6.7, 7.4], [8.3, 7.4], [5.2, 8.9], [8.3, 8.9]].map(p => ({ type: 'down', room: 'living', x: p[0], y: p[1] })),
    ...[[3.85, 4.9], [3.85, 6.3], [3.85, 7.7], [3.85, 9.1]].map(p => ({ type: 'down', room: 'corridor', x: p[0], y: p[1] })),
    ...[[1.0, 7.1], [2.4, 7.1], [1.0, 8.2], [2.4, 8.2]].map(p => ({ type: 'down', room: 'kitchen', x: p[0], y: p[1] })),
    ...[[2.4, 4.3], [2.4, 5.6]].map(p => ({ type: 'down', room: 'bath', x: p[0], y: p[1] })),
    { type: 'down', room: 'balcony', x: 7.9, y: 11.4 }, { type: 'down', room: 'kbalcony', x: 0.8, y: 5.75 },
    // wall-washers (adjustable) for focal walls
    ...[[6.0, 9.05], [7.0, 9.05]].map(p => ({ type: 'wash', room: 'living', x: p[0], y: p[1], aim: 's', note: 'TV wall' })),
    ...[[4.8, 10.1], [5.6, 10.1]].map(p => ({ type: 'wash', room: 'salon', x: p[0], y: p[1], aim: 'n', note: 'feature panel' })),
    ...[[1.9, 9.35], [2.6, 9.35]].map(p => ({ type: 'wash', room: 'salon', x: p[0], y: p[1], aim: 'n', note: 'mirror wall over the buffet' })),
    // pendants / semi-flush
    { type: 'pendant', room: 'salon', x: 2.20, y: 10.80, note: 'Linear pendant 1.20 over the dining table, bottom at 1.90 m' },
    { type: 'flush', room: 'salon', x: 5.55, y: 11.55, note: 'Semi-flush fixture Ø0.60 over the salon centre table, max 0.30 drop' },
    { type: 'pendant', room: 'kids', x: 6.52, y: 3.72, note: 'Small pendant over nightstand, bottom 1.70 m' },
    // sconces / reading
    { type: 'pendant', room: 'master', x: 4.76, y: 0.62, note: 'bedside pendant over the nightstand, globe bottom at 1.45 m' }, { type: 'pendant', room: 'master', x: 7.09, y: 0.62, note: 'bedside pendant over the nightstand, globe bottom at 1.45 m' },
    { type: 'sconce', room: 'salon', x: 5.05, y: 9.85, wall: 'n', note: 'sconce on feature panel' }, { type: 'sconce', room: 'salon', x: 6.45, y: 9.85, wall: 'n', note: 'sconce on feature panel' },
    { type: 'sconce', room: 'kids', x: 8.86, y: 3.50, wall: 'e', note: 'wall light over desk' }, { type: 'sconce', room: 'salon', x: 2.1, y: 12.95, wall: 's', note: 'entry mirror light' },
    { type: 'mirror', room: 'master', x: 5.925, y: 3.27, note: 'LED mirror in the dressing niche' },
  ];
  const cameras = [
    { id: 'overview', name: 'Overview (dollhouse)', pos: [4.6, 13.5, 15.5], target: [4.6, 0, 6.6] },
    { id: 'entrance', name: 'From the entrance', pos: [0.95, 1.55, 12.55], target: [2.6, 1.0, 9.4] },
    { id: 'salon', name: 'Salon seating', pos: [3.6, 1.5, 10.2], target: [5.9, 0.8, 12.4] },
    { id: 'dining', name: 'Dining + mirror wall', pos: [3.85, 1.5, 12.7], target: [1.7, 1.0, 9.4] },
    { id: 'corridor', name: 'Corridor', pos: [3.85, 1.5, 9.6], target: [3.85, 1.2, 4.3] },
    { id: 'living', name: 'Living room (TV wall)', pos: [4.75, 1.5, 7.0], target: [7.2, 0.9, 9.4] },
    { id: 'living2', name: 'Living room (sofa)', pos: [6.4, 1.45, 9.3], target: [7.4, 0.6, 6.7] },
    { id: 'master', name: 'Master bedroom', pos: [4.5, 1.5, 2.7], target: [6.8, 0.95, 0.5] },
    { id: 'master2', name: 'Master dressing wall', pos: [3.62, 1.55, 0.48], target: [6.5, 0.9, 3.05] },
    { id: 'kids', name: "Children's room", pos: [4.6, 1.5, 5.9], target: [7.0, 0.8, 3.7] },
    { id: 'kids2', name: "Children's desk + wardrobe", pos: [5.0, 1.5, 4.0], target: [8.6, 0.9, 5.2] },
  ];
  // Fixed viewpoints used for the still 3D views in the design presentation (eye height 1.50 m unless noted)
  const shots = [
    { id: 'overview', name: 'Whole apartment, dollhouse view', pos: [4.6, 12.6, 14.9], target: [4.6, 0, 6.0], fov: 50 },
    { id: 'entrance', name: 'Standing inside the entrance door', pos: [1.0, 1.5, 12.55], target: [2.6, 0.95, 9.3], fov: 70 },
    { id: 'salon-group', name: 'Salon: the seating group from the corridor mouth', pos: [3.6, 1.5, 10.15], target: [5.9, 0.75, 12.5], fov: 72 },
    { id: 'salon-panel', name: 'Salon: feature panel and balcony door from the sofa', pos: [5.4, 1.45, 12.0], target: [5.9, 1.15, 9.78], fov: 64 },
    { id: 'dining-table', name: 'Dining: table, buffet and mirror wall from the channel', pos: [3.85, 1.5, 12.7], target: [1.7, 0.95, 9.4], fov: 68 },
    { id: 'master-b2w', name: 'Master — Bed to Wardrobe', pos: [3.66, 1.5, 0.55], target: [6.3, 0.95, 3.0], fov: 62 },
    { id: 'master-w2b', name: 'Master — Wardrobe to Bed', pos: [5.925, 1.5, 2.8], target: [5.925, 0.9, 0.3], fov: 58 },
    { id: 'corridor', name: 'Corridor looking towards the master bedroom', pos: [3.85, 1.5, 9.7], target: [3.85, 1.0, 4.3], fov: 60 },
    { id: 'living-tv', name: 'Living room: TV wall from the door', pos: [4.7, 1.5, 7.05], target: [7.3, 0.9, 9.45], fov: 70 },
    { id: 'living-sofa', name: 'Living room: sofa and window from the TV side', pos: [5.0, 1.45, 9.35], target: [7.8, 0.6, 6.9], fov: 68 },
    { id: 'master-bed', name: 'Master bedroom: from the door', pos: [4.45, 1.5, 2.75], target: [6.7, 0.95, 0.5], fov: 62 },
    { id: 'master-niche', name: 'Master bedroom: dressing niche and window wardrobe', pos: [7.3, 1.5, 1.5], target: [5.7, 1.05, 3.3], fov: 58 },
    { id: 'kids-beds', name: "Children's room: beds from the door", pos: [4.6, 1.5, 5.85], target: [6.6, 0.8, 3.7], fov: 70 },
    { id: 'kids-desk', name: "Children's room: desk and wardrobe from the bed side", pos: [5.0, 1.5, 3.9], target: [8.7, 0.9, 5.1], fov: 68 },
    // family presentation cameras (main + secondary per screen)
    { id: 'fam-overview', name: 'Apartment from above', pos: [4.6, 13.2, 14.2], target: [4.6, 0, 6.4], fov: 46 },
    { id: 'fam-overview-2', name: 'Apartment from the south-east', pos: [15.0, 9.5, 16.0], target: [4.9, 0.4, 6.9], fov: 42 },
    { id: 'fam-master', name: 'Master: bed facing the wardrobe wall', pos: [3.56, 1.42, 1.30], target: [7.6, 0.85, 1.95], fov: 58 },
    { id: 'fam-master-2', name: 'Master: from the bedside to the wardrobe', pos: [3.70, 1.5, 0.55], target: [6.3, 0.95, 3.0], fov: 56 },
    { id: 'fam-master-3', name: 'Master: from the wardrobe to the bed', pos: [5.925, 1.5, 2.8], target: [5.925, 0.9, 0.3], fov: 56 },
    { id: 'fam-kids', name: "Children: beds and headboard wall", pos: [4.72, 1.45, 5.7], target: [7.0, 0.85, 3.65], fov: 60 },
    { id: 'fam-kids-2', name: "Children: desk, window and wardrobe", pos: [4.95, 1.5, 3.85], target: [8.7, 0.9, 5.2], fov: 58 },
    { id: 'fam-living', name: 'Living: sofa and TV wall', pos: [4.66, 1.45, 6.95], target: [7.4, 0.9, 9.45], fov: 58 },
    { id: 'fam-living-2', name: 'Living: the L-sofa by the window', pos: [5.0, 1.45, 9.35], target: [7.9, 0.6, 6.9], fov: 58 },
    { id: 'fam-salon', name: 'Salon: from the balcony door, across to the dining', pos: [6.9, 1.5, 12.55], target: [2.4, 0.9, 10.2], fov: 56 },
    { id: 'fam-salon-2', name: 'Salon: the feature panel from the sofa', pos: [5.3, 1.45, 12.35], target: [5.75, 1.1, 9.78], fov: 58 },
    { id: 'fam-dining', name: 'Dining: table, buffet and mirrors', pos: [3.9, 1.5, 12.75], target: [1.7, 0.95, 9.4], fov: 58 },
    { id: 'fam-dining-2', name: 'Dining: from the entrance door', pos: [1.0, 1.5, 12.55], target: [2.8, 0.95, 9.3], fov: 58 },
    { id: 'fam-night-2', name: 'Evening: across the salon to the dining', pos: [6.9, 1.5, 12.55], target: [2.4, 0.9, 10.2], fov: 56 },
  ];
  const floorColors = { cream: '#e8e0d1', wood: '#a37a57', kitchen: '#dcd8cf', bath: '#d7d4cc', balcony: '#cfc9bd' };
  return { env: { w: 9.21, h: 13.27 }, rooms, walls, columns, doors, openings, windows, furniture, ceiling, lights, cameras, shots, floorColors };
})();
