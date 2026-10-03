// The scene modules (src/scene/*.js) were written against the classic Three.js global namespace (`THREE.Mesh`, `THREE.Reflector`, …).
// This module builds that namespace from the npm package so everything is bundled, versioned and served from GitHub Pages — no CDN at runtime.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const namespace = Object.assign({}, THREE, { OrbitControls, Reflector, RectAreaLightUniformsLib, RoundedBoxGeometry, RoomEnvironment });
window.THREE = namespace;

export {};
