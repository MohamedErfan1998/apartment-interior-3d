# Our Apartment — 3D Interior Design

An interactive 3D presentation of a three-bedroom apartment's interior design, made to be shared with family: open the link, press **START 3D TOUR**, and walk through the rooms by day and by night. No 3D knowledge needed.

**Live site:** https://mohamederfan1998.github.io/apartment-interior-3d/

## What it shows

- The approved design, to scale, from one data model: master bedroom (bed facing the dressing/wardrobe wall, two nightstands, no TV), children's bedroom, living room with the L-sofa and TV wall, salon, dining.
- Seven guided screens: Apartment Overview, Master Bedroom, Children's Bedroom, Living Room, Salon, Dining, Evening Apartment.
- Camera views: Apartment Overview, Entrance, Master Bedroom, Master — Bed to Wardrobe, Master — Wardrobe to Bed, Children's Bedroom, Living Room, Salon, Dining — with smooth transitions at about 1.50 m eye height.
- ☀️ Day / 🌙 Evening lighting cross-fade, optional floor plan beside the 3D view, optional furniture labels, full screen, touch (tap, swipe, pinch zoom), keyboard (arrows, 1–9 for views, F for full screen).
- Room names in English and Arabic (buttons, room cards, camera views, overview labels and the floor plan), and a WhatsApp share button on the title screen and in the toolbar that opens a ready-made message with the site link.

Honest label: this is a real-time 3D concept visualization, not a photo-real render.

## Technology

- [Three.js](https://threejs.org/) r128 (WebGL), bundled from npm — physically based materials, soft shadows, planar mirrors, RectArea lights.
- [Vite](https://vitejs.dev/) 5 and TypeScript 5 for the application shell, type-checked build and production bundling.
- The scene modules in `src/scene/` are plain ES modules that share one global namespace:
  - `data.js` — the apartment model (rooms, walls, doors, windows, furniture, lighting, cameras) in metres.
  - `render.js` — the realistic scene builder, procedural textures and the day/evening lighting mix.
  - `plan.js` — the SVG floor-plan renderer.
  - `fam.js` — the family presentation (title screen, tour, controls, labels, floor plan, full screen).
- No external assets at runtime: all textures are generated procedurally; fonts come from Google Fonts with system fallbacks.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL (http://localhost:5173/apartment-interior-3d/).

## Build

```bash
npm run build      # type-checks, then builds to dist/
npm run preview    # serves the production build at http://localhost:4173/apartment-interior-3d/
```

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`: it installs dependencies, type-checks, builds with Vite and publishes `dist/` to GitHub Pages through `actions/deploy-pages`. The repository's Pages source is "GitHub Actions".

`vite.config.ts` sets `base` to `/apartment-interior-3d/` so every asset resolves under the repository path on GitHub Pages. For a user site or a custom domain, build with `BASE_PATH=/`.

## Browser support

Any current desktop or mobile browser with WebGL. On a slow device, open **Explore → Fast (no mirrors)**.
