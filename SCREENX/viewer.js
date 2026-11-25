import * as THREE from 'three';
import { GLTFLoader } from '../2D/vendor/GLTFLoader.js';
import { cinemas } from './cinemas.js';
import { applyWallProjection, loadPanorama } from './side-screens.js';
import { expandAuditorium } from './auditorium.js';

const viewer = document.querySelector('#viewer');
const canvas = document.querySelector('#canvas');
const loading = document.querySelector('#loading');
const seats = document.querySelector('#seat-track');
const hallPicker = document.querySelector('#hall');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, 1, 0.035, 130);
camera.rotation.order = 'YXZ';
scene.background = new THREE.Color(0x160c14);
scene.add(new THREE.HemisphereLight(0xffedf0, 0x97808d, 1.75));
const fill = new THREE.DirectionalLight(0xfff3e9, 1.15);
fill.position.set(14, 13, -3);
scene.add(fill);

let renderer;
let cinema;
let model;
let loadId = 0;
let motion;
let pointer;
let selectedSeat;
let frame = 0;

function render(time) {
  frame = 0;
  if (motion) {
    const progress = Math.min(Math.max((time - motion.start) / 640, 0), 1);
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(motion.from, motion.to, eased);
    if (progress === 1) motion = undefined;
  }
  renderer.render(scene, camera);
  if (motion) invalidate();
}

function invalidate() {
  if (!frame) frame = requestAnimationFrame(render);
}

function resize() {
  const { clientWidth: width, clientHeight: height } = canvas;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(
    Math.tan(THREE.MathUtils.degToRad(32)) / Math.min(camera.aspect, 1),
  ));
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  invalidate();
}

function faceScreen() {
  const screen = model.getObjectByName('Screen_Screen_0');
  const center = new THREE.Box3().setFromObject(screen, true).getCenter(new THREE.Vector3());
  camera.lookAt(center);
  invalidate();
}

function selectSeat(seat, immediate = false) {
  if (!model || seat === selectedSeat) return;
  selectedSeat = seat;
  const center = cinema.seats.indexOf(seat);
  seats.style.setProperty('--seat-index', center);
  for (const [index, item] of Array.from(seats.children).entries()) {
    item.inert = Math.abs(index - center - 1) > 1;
    if (item instanceof HTMLButtonElement) {
      item.setAttribute('aria-pressed', String(index === center + 1));
    }
  }
  const destination = new THREE.Vector3(...seat.eye);
  if (immediate || reducedMotion.matches) {
    motion = undefined;
    camera.position.copy(destination);
  } else {
    motion = { start: performance.now(), from: camera.position.clone(), to: destination };
  }
  invalidate();
}

function disposeModel(root) {
  const resources = new Set();
  root.traverse((object) => {
    if (!object.isMesh) return;
    resources.add(object.geometry);
    for (const material of [].concat(object.material)) {
      resources.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) resources.add(value);
      }
    }
  });
  for (const resource of resources) resource.dispose();
}

async function openCinema(config) {
  const request = ++loadId;
  cinema = config;
  motion = undefined;
  selectedSeat = undefined;
  const defaultSeat = config.seats.find((seat) => seat.id === config.defaultSeat) ?? config.seats[0];
  seats.classList.remove('is-ready');
  seats.style.setProperty('--seat-index', config.seats.indexOf(defaultSeat));
  const neighbors = [config.adjacentSeats?.before, config.adjacentSeats?.after].map((id) => {
    const label = document.createElement('span');
    label.textContent = id ?? '';
    return label;
  });
  const buttons = config.seats.map((seat) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = seat.id;
    button.disabled = true;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => selectSeat(seat));
    return button;
  });
  seats.replaceChildren(neighbors[0], ...buttons, neighbors[1]);
  if (model) {
    scene.remove(model);
    disposeModel(model);
    model = undefined;
  }
  invalidate();
  loading.hidden = false;
  loading.textContent = 'SCREENX 모델 불러오는 중…';
  try {
    const gltf = await new GLTFLoader().loadAsync(config.model, (event) => {
      if (request === loadId && event.lengthComputable) {
        loading.textContent = `SCREENX 모델 불러오는 중… ${Math.round(100 * event.loaded / event.total)}%`;
      }
    });
    if (request !== loadId) {
      disposeModel(gltf.scene);
      return;
    }
    let panorama;
    try {
      panorama = await loadPanorama();
    } catch (error) {
      disposeModel(gltf.scene);
      throw error;
    }
    if (request !== loadId) {
      panorama.dispose();
      disposeModel(gltf.scene);
      return;
    }
    try {
      const extension = expandAuditorium(gltf.scene);
      applyWallProjection(extension, panorama);
    } catch (error) {
      panorama.dispose();
      disposeModel(gltf.scene);
      throw error;
    }
    model = gltf.scene;
    scene.add(model);
    selectSeat(defaultSeat, true);
    faceScreen();
    for (const button of buttons) button.disabled = false;
    seats.classList.add('is-ready');
    loading.hidden = true;
  } catch (error) {
    if (request !== loadId) return;
    console.error(error);
    loading.textContent = 'SCREENX 모델을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
  }
}

function rotate(dx, dy) {
  camera.rotation.y -= dx;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy, -Math.PI / 2, Math.PI / 2);
  invalidate();
}

canvas.addEventListener('pointerdown', (event) => {
  if (!model || pointer || event.button !== 0) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerId !== pointer?.id || !model) return;
  const radiansPerPixel = THREE.MathUtils.degToRad(64) / Math.min(canvas.clientWidth, canvas.clientHeight);
  rotate((event.clientX - pointer.x) * radiansPerPixel, (event.clientY - pointer.y) * radiansPerPixel);
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(type, (event) => {
    if (event.pointerId === pointer?.id) pointer = undefined;
  });
}
canvas.addEventListener('keydown', (event) => {
  const directions = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] };
  if (!model || !Object.hasOwn(directions, event.key)) return;
  event.preventDefault();
  rotate(...directions[event.key]);
});

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  new ResizeObserver(resize).observe(viewer);
  hallPicker.replaceChildren(...cinemas.map(({ id, label }) => new Option(label, id)));
  hallPicker.hidden = cinemas.length < 2;
  hallPicker.addEventListener('change', () => openCinema(cinemas.find(({ id }) => id === hallPicker.value)));
  openCinema(cinemas[0]);
} catch (error) {
  console.error(error);
  loading.textContent = '3D 화면을 열 수 없습니다. WebGL 2를 지원하는 브라우저에서 다시 열어 주세요.';
}
