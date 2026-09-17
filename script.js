'use strict';
// Shared controls for the decorative artwork, project cards and navigation.
const body = document.body;
const projects = [...document.querySelectorAll('.project')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let pendingFrame = 0;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const motionAllowed = () => !reducedMotion.matches && !document.hidden;

function renderProjects() {
  pendingFrame = 0;
  if (!motionAllowed()) return;
  for (const project of projects) {
    const box = project.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) continue;
    const relative = clamp((box.top + 120 - window.innerHeight / 2) / window.innerHeight, -1, 1);
    project.style.setProperty('--art-shift', `${relative * 12}px`);
    project.style.setProperty('--art-tilt', `${relative * -3}deg`);
  }
}

function scheduleRender() {
  if (motionAllowed() && !pendingFrame) pendingFrame = window.requestAnimationFrame(renderProjects);
}

function applyMotionPreference() {
  body.classList.toggle('motion-reduced', reducedMotion.matches);
  if (!motionAllowed() && pendingFrame) {
    window.cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
  }
  scheduleRender();
}

body.classList.add('motion-ready');
reducedMotion.addEventListener('change', applyMotionPreference);
document.addEventListener('visibilitychange', applyMotionPreference);
window.addEventListener('scroll', scheduleRender, {passive: true});
window.addEventListener('resize', scheduleRender, {passive: true});

const sectionLinks = new Map([...document.querySelectorAll('.nav-links a[href^="#"]')]
  .map(link => [link.getAttribute('href').slice(1), link]));
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of sectionLinks.values()) link.removeAttribute('aria-current');
      sectionLinks.get(entry.target.id)?.setAttribute('aria-current', 'location');
    }
  }, {rootMargin: '-18% 0px -64% 0px', threshold: 0});
  for (const id of sectionLinks.keys()) {
    const element = document.getElementById(id);
    if (element) observer.observe(element);
  }
}
applyMotionPreference();

// Original interactive fibre artwork; no autonomous animation or scientific simulation.
(() => {
  const canvas = document.querySelector('.fibre-field');
  const context = canvas.getContext('2d');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#main-navigation');
  const band = document.querySelector('.word-band');
  let frame = 0;
  let lastDraw = 0;
  let width = 0;
  let height = 0;
  let phase = .6;
  let targetPhase = .6;
  let pointer = {x: 0, y: 0};
  let follower = {x: 0, y: 0};
  let pointerInside = false;

  body.classList.add('nav-enhanced');
  menuButton.hidden = false;
  menu.hidden = true;
  function closeMenu(returnFocus = false) {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    menuButton.setAttribute('aria-expanded', String(opening));
    if (opening) menu.querySelector('a').focus();
  });
  menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) closeMenu(true); });
  document.addEventListener('click', event => {
    if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  if (!context) return;

  function strokeFibre(cx, cy, scale, angle, strand, time) {
    context.beginPath();
    for (let point = 0; point <= 80; point++) {
      const t = point / 80;
      const envelope = Math.sin(Math.PI * t);
      const twist = t * Math.PI * 2.25 + time;
      const x = Math.sin(twist + strand * .017) * width * .20 * envelope * scale;
      const y = (t - .5) * height * .83 * scale + Math.cos(twist * 1.22 + strand * .028) * height * .075 * envelope;
      const px = cx + x * Math.cos(angle) - y * Math.sin(angle);
      const py = cy + x * Math.sin(angle) + y * Math.cos(angle);
      if (point === 0) context.moveTo(px, py); else context.lineTo(px, py);
    }
    context.stroke();
  }

  function drawArtwork() {
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';
    const groups = [
      {x: .13, y: .48, scale: 1.05, angle: -.38, colours: ['#EFA36D', '#D676AD', '#F1CA7E'], phase: 0},
      {x: .87, y: .45, scale: 1.15, angle: .4, colours: ['#73DBCB', '#5D92CE', '#BDE39D'], phase: 2.2},
      {x: .54, y: .60, scale: .75, angle: 1.0, colours: ['#A88ED5', '#82C7D6', '#E7B8AE'], phase: 4.1}
    ];
    for (const group of groups) {
      const cx = width * group.x + follower.x * width * .10;
      const cy = height * group.y + follower.y * height * .08;
      const gradient = context.createLinearGradient(cx - width * .15, cy - height * .35, cx + width * .18, cy + height * .35);
      gradient.addColorStop(0, group.colours[0]);
      gradient.addColorStop(.55, group.colours[1]);
      gradient.addColorStop(1, group.colours[2]);
      context.strokeStyle = gradient;
      context.globalAlpha = .055;
      context.lineWidth = 22;
      strokeFibre(cx, cy, group.scale, group.angle, 0, phase + group.phase);
      context.globalAlpha = .25;
      context.lineWidth = width < 600 ? .75 : 1.05;
      for (let strand = -18; strand <= 18; strand++) {
        strokeFibre(cx + strand * 1.5, cy, group.scale, group.angle, strand, phase + group.phase);
      }
    }
    if (pointerInside) {
      const x = width * (follower.x + .5);
      const y = height * (follower.y + .5);
      const glow = context.createRadialGradient(x, y, 0, x, y, 150);
      glow.addColorStop(0, '#A9DFD024');
      glow.addColorStop(1, '#A9DFD000');
      context.globalAlpha = .5;
      context.fillStyle = glow;
      context.fillRect(x - 150, y - 150, 300, 300);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }

  function animateArtwork(now) {
    frame = 0;
    if (!motionAllowed()) return;
    if (now - lastDraw < 32) { frame = requestAnimationFrame(animateArtwork); return; }
    follower.x += (pointer.x - follower.x) * .16;
    follower.y += (pointer.y - follower.y) * .16;
    phase += (targetPhase - phase) * .16;
    const unsettled = Math.abs(pointer.x - follower.x) + Math.abs(pointer.y - follower.y) + Math.abs(targetPhase - phase) > .0005;
    if (!unsettled) { follower = {...pointer}; phase = targetPhase; }
    drawArtwork();
    lastDraw = now;
    if (unsettled) frame = requestAnimationFrame(animateArtwork);
  }

  function requestArtwork() {
    if (motionAllowed() && !frame) frame = requestAnimationFrame(animateArtwork);
  }

  function resizeArtwork() {
    width = document.documentElement.clientWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawArtwork();
  }

  function syncPreference() {
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    if (reducedMotion.matches) {
      phase = targetPhase = .6;
      pointer = {x: 0, y: 0};
      follower = {x: 0, y: 0};
      pointerInside = false;
      drawArtwork();
    }
  }

  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !motionAllowed()) return;
    pointer = {x: event.clientX / width - .5, y: event.clientY / height - .5};
    pointerInside = true;
    requestArtwork();
  }, {passive: true});
  document.documentElement.addEventListener('pointerleave', () => {
    pointer = {x: 0, y: 0};
    pointerInside = false;
    requestArtwork();
  });
  window.addEventListener('scroll', () => {
    if (!motionAllowed()) return;
    targetPhase = .6 + window.scrollY * .00025;
    const box = band.getBoundingClientRect();
    if (box.bottom >= 0 && box.top <= innerHeight) band.style.setProperty('--word-shift', `${-70 + (innerHeight / 2 - box.top) * .1}px`);
    requestArtwork();
  }, {passive: true});
  window.addEventListener('resize', resizeArtwork, {passive: true});
  reducedMotion.addEventListener('change', syncPreference);
  document.addEventListener('visibilitychange', syncPreference);
  resizeArtwork();
})();
