// Crimson Coast Cover Lab — editor state and UI wiring.
// Owns the cover state, undo/redo history, photo uploads, per-panel crop
// controls, live preview and PNG export. Imports the engine from cover.js.
import { GRADES, LAYOUTS, layoutPanels, renderCover } from './cover.js';

const SAMPLES = [
  { file: 'samples/sample-convertible.jpg', label: 'Convertible' },
  { file: 'samples/sample-rooftop.jpg', label: 'Rooftop' },
  { file: 'samples/sample-neon.jpg', label: 'Neon Street' },
  { file: 'samples/sample-pier.jpg', label: 'Pier' },
];

const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Story 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

// Default panel assignments: the 9-panel grid repeats the four samples
// with different crops, exactly like the winning covers do.
const DEFAULT_PANELS = [
  { photo: 0, zoom: 1.05, dx: 0, dy: 0 },
  { photo: 1, zoom: 1.15, dx: 0.06, dy: 0 },
  { photo: 2, zoom: 1.1, dx: -0.04, dy: 0 },
  { photo: 3, zoom: 1.2, dx: 0, dy: -0.05 },
  { photo: 0, zoom: 1.45, dx: 0.1, dy: -0.08 },
  { photo: 1, zoom: 1.35, dx: -0.08, dy: 0.04 },
  { photo: 2, zoom: 1.3, dx: 0.05, dy: -0.04 },
  { photo: 3, zoom: 1.5, dx: -0.06, dy: 0.06 },
  { photo: 0, zoom: 1.25, dx: -0.1, dy: 0.05 },
];

function freshState() {
  return {
    layout: 'grid9',
    grade: 'ink',
    title: 'GOLDEN COAST',
    subtitle: 'summer nights in Leonida',
    tagline: 'Sunset chasers  •  Neon nights  •  One coast, every story',
    badge: 'LEONIDA 2026',
    photos: [],
    panels: DEFAULT_PANELS.map((p) => ({ ...p })),
    selectedPanel: 0,
  };
}

const state = freshState();
let undoStack = [];
let redoStack = [];
let previewRaf = 0;

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const params = new URLSearchParams(location.search);

function snapshotState() {
  const { photos, ...rest } = state;
  return JSON.stringify({ ...rest, panels: rest.panels });
}

function pushHistory() {
  undoStack.push(snapshotState());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}

function applySnapshot(json) {
  const data = JSON.parse(json);
  const photos = state.photos;
  Object.assign(state, data, { photos });
  syncInputs();
  drawPreview();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshotState());
  applySnapshot(undoStack.pop());
  updateUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshotState());
  applySnapshot(redoStack.pop());
  updateUndoButtons();
}

function updateUndoButtons() {
  $('undoBtn').disabled = undoStack.length === 0;
  $('redoBtn').disabled = redoStack.length === 0;
}

function drawPreview() {
  cancelAnimationFrame(previewRaf);
  previewRaf = requestAnimationFrame(() => {
    const box = canvas.parentElement.getBoundingClientRect();
    const size = params.get('shot') === 'cover'
      ? { w: Number(params.get('w') || 1280), h: Number(params.get('h') || 720) }
      : { w: Math.max(320, Math.floor(box.width)), h: Math.max(240, Math.floor(box.width * 0.66)) };
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d');
    const cover = renderCover(state, size.w, size.h);
    ctx.drawImage(cover, 0, 0);
    document.title = 'Crimson Coast Cover Lab — ready';
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  const loaded = [];
  for (const s of SAMPLES) {
    try { loaded.push(await loadImage(s.file)); }
    catch { loaded.push(null); }
  }
  state.photos = loaded.filter(Boolean);
  drawPreview();
}

function addPhotos(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) return;
  pushHistory();
  let pending = list.length;
  list.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      loadImage(reader.result).then((img) => {
        state.photos.push(img);
        if (--pending === 0) { renderPhotoStrip(); drawPreview(); }
      });
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `Use photo ${i + 1} in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = `Photo ${i + 1}`;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      pushHistory();
      state.panels[state.selectedPanel].photo = i;
      drawPreview();
      renderPanelList();
    });
    strip.appendChild(btn);
  });
  $('photoCount').textContent = `${state.photos.length} photo${state.photos.length === 1 ? '' : 's'}`;
}

function renderPanelList() {
  const list = $('panelList');
  list.innerHTML = '';
  const rects = layoutPanels(state.layout, 100, 100);
  rects.forEach((_, i) => {
    const setting = state.panels[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panelChip' + (state.selectedPanel === i ? ' selected' : '');
    btn.textContent = `Panel ${i + 1} · photo ${(setting.photo ?? 0) + 1}`;
    btn.addEventListener('click', () => {
      state.selectedPanel = i;
      syncPanelControls();
      renderPanelList();
      drawPreview();
    });
    list.appendChild(btn);
  });
}

function syncPanelControls() {
  const setting = state.panels[state.selectedPanel];
  $('zoomRange').value = String(setting.zoom);
  $('zoomVal').textContent = `${Math.round(setting.zoom * 100)}%`;
  $('offsetXRange').value = String(setting.dx);
  $('offsetYRange').value = String(setting.dy);
  $('panelPhotoSelect').value = String(setting.photo);
}

function syncInputs() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('taglineInput').value = state.tagline;
  $('badgeInput').value = state.badge;
  document.querySelectorAll('#layoutPicker button').forEach((b) =>
    b.classList.toggle('selected', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradePicker button').forEach((b) =>
    b.classList.toggle('selected', b.dataset.grade === state.grade));
  renderPanelList();
  syncPanelControls();
}

function buildPickers() {
  const layoutPicker = $('layoutPicker');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = l.id;
    b.textContent = l.name;
    b.addEventListener('click', () => { pushHistory(); state.layout = l.id; syncInputs(); drawPreview(); });
    layoutPicker.appendChild(b);
  });
  const gradePicker = $('gradePicker');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = g.id;
    b.textContent = g.name;
    b.addEventListener('click', () => { pushHistory(); state.grade = g.id; syncInputs(); drawPreview(); });
    gradePicker.appendChild(b);
  });
  const sampleRow = $('sampleRow');
  SAMPLES.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Try ${s.label}`;
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[state.selectedPanel].photo = i;
      drawPreview();
      renderPanelList();
    });
    sampleRow.appendChild(b);
  });
  const exportRow = $('exportRow');
  EXPORT_SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'exportBtn';
    b.textContent = `Export ${s.label}`;
    b.addEventListener('click', () => exportCover(s));
    exportRow.appendChild(b);
  });
}

function exportCover(size) {
  const cover = renderCover(state, size.w, size.h);
  cover.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `golden-coast-cover-${size.id}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    $('exportStatus').textContent = `Exported ${size.label} PNG.`;
  }, 'image/png');
}

// Presets: one click to a finished look.
function applyPreset(name) {
  pushHistory();
  if (name === 'hero') {
    state.layout = 'hero3'; state.grade = 'sunset';
    state.title = 'GOLDEN COAST'; state.subtitle = 'summer nights in Leonida';
  } else if (name === 'neon') {
    state.layout = 'grid4'; state.grade = 'neon';
    state.title = 'NEON TIDE'; state.subtitle = 'after dark on the coast';
  } else {
    state.layout = 'grid9'; state.grade = 'ink';
    state.title = 'GOLDEN COAST'; state.subtitle = 'summer nights in Leonida';
  }
  syncInputs();
  drawPreview();
}

// Drag on the preview to move the selected panel's photo.
function bindCanvasDrag() {
  let dragging = false;
  let lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const rects = layoutPanels(state.layout, 1, 1);
    const hit = rects.findIndex((r) => fx >= r.x && fx <= r.x + r.w && fy >= r.y && fy <= r.y + r.h);
    if (hit >= 0) { state.selectedPanel = hit; syncPanelControls(); renderPanelList(); }
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const setting = state.panels[state.selectedPanel];
    setting.dx += (e.clientX - lastX) / rect.width;
    setting.dy += (e.clientY - lastY) / rect.height;
    setting.dx = Math.max(-0.5, Math.min(0.5, setting.dx));
    setting.dy = Math.max(-0.5, Math.min(0.5, setting.dy));
    lastX = e.clientX; lastY = e.clientY;
    syncPanelControls();
    drawPreview();
  });
  canvas.addEventListener('pointerup', () => {
    if (dragging) { pushHistory(); drawPreview(); }
    dragging = false;
  });
}

function bindInputs() {
  $('uploadInput').addEventListener('change', (e) => addPhotos(e.target.files));
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; drawPreview(); });
  $('titleInput').addEventListener('change', pushHistory);
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; drawPreview(); });
  $('subtitleInput').addEventListener('change', pushHistory);
  $('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; drawPreview(); });
  $('taglineInput').addEventListener('change', pushHistory);
  $('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; drawPreview(); });
  $('badgeInput').addEventListener('change', pushHistory);
  $('zoomRange').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].zoom = Number(e.target.value);
    $('zoomVal').textContent = `${Math.round(Number(e.target.value) * 100)}%`;
    drawPreview();
  });
  $('zoomRange').addEventListener('change', pushHistory);
  $('offsetXRange').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].dx = Number(e.target.value); drawPreview();
  });
  $('offsetXRange').addEventListener('change', pushHistory);
  $('offsetYRange').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].dy = Number(e.target.value); drawPreview();
  });
  $('offsetYRange').addEventListener('change', pushHistory);
  $('panelPhotoSelect').addEventListener('change', (e) => {
    pushHistory();
    state.panels[state.selectedPanel].photo = Number(e.target.value);
    drawPreview();
    renderPanelList();
  });
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('presetPhoto').addEventListener('click', () => applyPreset('photo'));
  $('presetHero').addEventListener('click', () => applyPreset('hero'));
  $('presetNeon').addEventListener('click', () => applyPreset('neon'));
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
  window.addEventListener('resize', drawPreview);
}

async function init() {
  // Shot mode (used for the entry screenshots): a bare cover fills the
  // window, or the editor shows with a photo loaded. Driven by ?shot=.
  if (params.get('shot') === 'cover') {
    document.body.classList.add('shotCover');
    const size = params.get('size');
    if (size === '1080x1350') { state.layout = 'grid9'; }
    if (size === '1080x1080') { state.layout = 'grid4'; }
  }
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('layout')) state.layout = params.get('layout');
  buildPickers();
  bindInputs();
  bindCanvasDrag();
  try {
    await document.fonts.load('400 80px Anton');
    await document.fonts.load('400 40px Pacifico');
  } catch { /* fall back to system fonts */ }
  await loadSamples();
  renderPhotoStrip();
  syncInputs();
  updateUndoButtons();
  drawPreview();
  // Handle for automated checks and screenshot runs.
  window.__coverLab = {
    state,
    renderCover,
    exportPng(sizeId) {
      const size = EXPORT_SIZES.find((s) => s.id === sizeId) || EXPORT_SIZES[0];
      return renderCover(state, size.w, size.h).toDataURL('image/png');
    },
  };
}

init();
