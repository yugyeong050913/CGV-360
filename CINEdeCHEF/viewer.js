import * as THREE from 'three';
import { buildAuditorium, seating, screenTarget } from './auditorium.js';

const viewer = document.querySelector('#viewer');
const canvas = document.querySelector('#canvas');
const loading = document.querySelector('#loading');
const seats = document.querySelector('#seat-track');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, 1, 0.035, 130);
camera.rotation.order = 'YXZ';
let renderer;
let ready = false;
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
  camera.lookAt(...screenTarget);
  invalidate();
}

function selectSeat(seat, immediate = false) {
  if (!ready || seat === selectedSeat) return;
  selectedSeat = seat;
  const center = seating.indexOf(seat);
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

function openCinema() {
  buildAuditorium(scene, renderer.capabilities.getMaxAnisotropy());
  const defaultSeat = seating.find(({ id }) => id === 'C03');
  const buttons = seating.map((seat) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = seat.id;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => selectSeat(seat));
    return button;
  });
  seats.replaceChildren(document.createElement('span'), ...buttons, document.createElement('span'));
  ready = true;
  selectSeat(defaultSeat, true);
  faceScreen();
  requestAnimationFrame(() => seats.classList.add('is-ready'));
  loading.hidden = true;
}

function rotate(dx, dy) {
  camera.rotation.y -= dx;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy, -Math.PI / 2, Math.PI / 2);
  invalidate();
}

canvas.addEventListener('pointerdown', (event) => {
  if (!ready || pointer || event.button !== 0) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerId !== pointer?.id || !ready) return;
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
  if (!ready || !Object.hasOwn(directions, event.key)) return;
  event.preventDefault();
  rotate(...directions[event.key]);
});

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  new ResizeObserver(resize).observe(viewer);
  openCinema();
} catch (error) {
  console.error(error);
  loading.textContent = '3D 화면을 열 수 없습니다. WebGL 2를 지원하는 브라우저에서 다시 열어 주세요.';
}
