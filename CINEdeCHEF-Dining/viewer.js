import * as THREE from 'three';
import { buildAuditorium, seating } from './auditorium.js';

const viewer = document.querySelector('#viewer');
const canvas = document.querySelector('#canvas');
const loading = document.querySelector('#loading');
import { menu, setTable } from './courses.js';
const title = document.querySelector('#course');
const description = document.querySelector('#description');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, 1, 0.035, 130);
camera.rotation.order = 'YXZ';
let renderer;
let ready = false;
let dishes;
let current = 0;
let requested = 0;
let opacity = 1;
let lastFrame;
let pointer;
let frame = 0;

function displayCourse() {
  title.textContent = menu[current][0];
  description.textContent = menu[current][1];
}

function render(time) {
  frame = 0;
  const delta = reducedMotion.matches ? 1 : Math.min(1, (time - (lastFrame ?? time)) / 200);
  lastFrame = time;
  if (requested !== current) {
    opacity = Math.max(0, opacity - delta);
    if (!opacity) {
      dishes[current].visible = false;
      current = requested;
      dishes[current].visible = true;
      displayCourse();
    }
  } else {
    opacity = Math.min(1, opacity + delta);
  }
  dishes[current].traverse(({ material }) => {
    if (!material) return;
    material.transparent = opacity < 1 || material.userData.translucent;
    material.opacity = material.userData.alpha * opacity;
  });
  renderer.render(scene, camera);
  if (requested !== current || opacity < 1) invalidate();
  else lastFrame = undefined;
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

function openCinema() {
  buildAuditorium(scene, renderer.capabilities.getMaxAnisotropy());
  const setting = setTable(scene);
  dishes = setting.dishes;
  for (const dish of dishes) dish.traverse(({ material }) => {
    if (material) {
      material.userData.alpha = material.opacity;
      material.userData.translucent = material.transparent;
    }
  });
  camera.position.fromArray(seating.find(({ id }) => id === 'C03').eye);
  camera.lookAt(setting.target);
  displayCourse();
  for (const button of document.querySelectorAll('[data-step]')) {
    button.addEventListener('click', () => {
      requested = (requested + Number(button.dataset.step) + menu.length) % menu.length;
      invalidate();
    });
  }
  ready = true;
  loading.hidden = true;
  invalidate();
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
