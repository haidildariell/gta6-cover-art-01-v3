// Crimson Coast Cover Lab — cover rendering engine.
// Draws a multi-panel GTA-style poster cover onto a 2D canvas: photo panels
// with per-panel crop, sunset/neon grades, a real halftone Poster Ink
// treatment, giant gradient title, neon script subtitle, badge and tagline.
// All coordinates are fractions of the canvas size so one layout works at
// every export size.

export const LAYOUTS = [
  { id: 'grid9', name: 'Photo Grid 9', panels: 9 },
  { id: 'hero3', name: 'Hero + Three', panels: 4 },
  { id: 'fullbleed', name: 'Full Bleed', panels: 1 },
  { id: 'tilted', name: 'Tilted Snapshots', panels: 4 },
  { id: 'grid4', name: 'Grid 4', panels: 4 },
  { id: 'split2', name: 'Split 2', panels: 2 },
];

export const GRADES = [
  { id: 'sunset', name: 'Sunset' },
  { id: 'neon', name: 'Neon Nights' },
  { id: 'teal', name: 'Teal Noir' },
  { id: 'rose', name: 'Rose Gold' },
  { id: 'mono', name: 'Mono Poster' },
  { id: 'ink', name: 'Poster Ink' },
];

// Panel rectangles as fractions of [width, height]. The title block sits in
// the bottom band (y 0.70..1.00) for every layout except fullbleed, where the
// title floats over a dark band at the bottom of the photo.
export function layoutPanels(layoutId, W, H) {
  const g = 0.012; // gutter, as a fraction of width
  const top = 0.70; // photo area ends here; title block below
  const R = (x, y, w, h, rot = 0) => ({ x: x * W, y: y * H, w: w * W, h: h * H, rot });
  switch (layoutId) {
    case 'grid9': {
      const cw = (1 - g * 4) / 3, ch = (top - g * 4) / 3, out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
        out.push(R(g + c * (cw + g), g + r * (ch + g), cw, ch));
      return out;
    }
    case 'hero3': {
      const rw = 0.36, rh = (top - g * 4) / 3;
      return [
        R(g, g, 0.62 - g * 1.5, top - g * 2),
        R(0.62, g, rw, rh), R(0.62, g * 2 + rh, rw, rh), R(0.62, g * 3 + rh * 2, rw, rh),
      ];
    }
    case 'fullbleed':
      return [R(0, 0, 1, 1)];
    case 'tilted': {
      const bw = 0.52, bh = 0.42;
      return [
        R(0, 0, 1, 1), // background photo, full frame
        R(0.05, 0.05, bw, bh, -0.10),
        R(0.44, 0.10, bw, bh, 0.07),
        R(0.24, 0.30, bw, bh, -0.03),
      ];
    }
    case 'grid4': {
      const cw = (1 - g * 3) / 2, ch = (top - g * 3) / 2, out = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++)
        out.push(R(g + c * (cw + g), g + r * (ch + g), cw, ch));
      return out;
    }
    case 'split2':
    default: {
      const cw = (1 - g * 3) / 2;
      return [R(g, g, cw, top - g * 2), R(g * 2 + cw, g, cw, top - g * 2)];
    }
  }
}

export function titleBlockRect(layoutId, W, H) {
  if (layoutId === 'fullbleed') return { x: 0, y: H * 0.66, w: W, h: H * 0.34 };
  return { x: 0, y: H * 0.70, w: W, h: H * 0.30 };
}

// Deterministic speckles: a tiny seeded generator so two exports match.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

// One pixel through a grade's colour curve. Poster grades quantise the
// luminance first, then remap it through a duotone ramp.
function gradePixel(r, g, b, grade) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  switch (grade) {
    case 'neon': {
      const s = 1.55;
      const nr = clamp255(((r - lum) * s + lum) * 1.05 + 18);
      const ng = clamp255(((g - lum) * s + lum) * 0.92);
      const nb = clamp255(((b - lum) * s + lum) * 1.12 + 22);
      return [nr, ng, nb];
    }
    case 'teal': {
      const d = 0.72;
      return [clamp255(lum * 0.55 + r * 0.25 * d), clamp255(lum * 0.9 + g * 0.3 * d), clamp255(lum * 1.05 + b * 0.45 * d)];
    }
    case 'rose': {
      return [clamp255(r * 1.12 + 14), clamp255(g * 0.92 + 6), clamp255(b * 0.95 + 10)];
    }
    case 'mono': {
      const q = Math.round(lum / 64) * 64;
      return [q, q, q * 0.98];
    }
    case 'ink': {
      // Poster Ink: 5-step posterize, then a hot gradient map
      // ink black -> magenta -> orange -> pale gold.
      const q = Math.min(4, Math.floor(lum / 51.2));
      const ramp = [[12, 8, 24], [120, 16, 110], [235, 41, 117], [255, 122, 26], [255, 226, 130]];
      return ramp[q];
    }
    case 'sunset':
    default: {
      const c = 1.12;
      return [
        clamp255(((r - 128) * c + 128) * 1.14 + 10),
        clamp255(((g - 128) * c + 128) * 1.0),
        clamp255(((b - 128) * c + 128) * 0.82),
      ];
    }
  }
}

// Paint one photo into a panel rect, cover-fit, with the panel's zoom and
// drag offsets. `photo` is a loaded HTMLImageElement (or null for a blank).
export function paintPanelPhoto(ctx, photo, rect, setting) {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  if (rect.rot) ctx.rotate(rect.rot);
  ctx.beginPath();
  ctx.rect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.clip();
  if (photo && photo.naturalWidth > 0) {
    const zoom = setting?.zoom ?? 1;
    const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * zoom;
    const dw = photo.naturalWidth * scale, dh = photo.naturalHeight * scale;
    const dx = (setting?.dx ?? 0) * rect.w, dy = (setting?.dy ?? 0) * rect.h;
    ctx.drawImage(photo, -dw / 2 + dx, -dh / 2 + dy, dw, dh);
  } else {
    const grad = ctx.createLinearGradient(-rect.w / 2, -rect.h / 2, rect.w / 2, rect.h / 2);
    grad.addColorStop(0, '#ff7a18'); grad.addColorStop(1, '#af3dff');
    ctx.fillStyle = grad;
    ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  }
  ctx.restore();
  // White poster border + thin ink outline around the panel.
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  if (rect.rot) ctx.rotate(rect.rot);
  ctx.lineWidth = Math.max(2, rect.w * 0.008);
  ctx.strokeStyle = '#fff8ef';
  ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.lineWidth = Math.max(1, rect.w * 0.003);
  ctx.strokeStyle = 'rgba(20,8,20,0.85)';
  ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.restore();
}

// Grade + halftone + grain + vignette over a finished photo layer.
export function finishPhotoLayer(photoCanvas, grade, W, H) {
  const ctx = photoCanvas.getContext('2d');
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = gradePixel(d[i], d[i + 1], d[i + 2], grade);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);

  if (grade === 'ink' || grade === 'mono') {
    // Real halftone: black dots sized by the darkness of each cell.
    const cell = Math.max(7, Math.round(W / 160));
    const snap = ctx.getImageData(0, 0, W, H).data;
    ctx.fillStyle = 'rgba(10,6,18,0.9)';
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        const idx = ((Math.min(H - 1, y + (cell >> 1)) * W) + Math.min(W - 1, x + (cell >> 1))) * 4;
        const lum = 0.299 * snap[idx] + 0.587 * snap[idx + 1] + 0.114 * snap[idx + 2];
        const radius = (cell * 0.52) * (1 - lum / 255);
        if (radius < 0.6) continue;
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Warm sun wash across the top for sunset / rose grades.
  if (grade === 'sunset' || grade === 'rose') {
    const wash = ctx.createLinearGradient(0, 0, W, H * 0.5);
    wash.addColorStop(0, 'rgba(255,190,80,0.20)');
    wash.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, Math.ceil(H * 0.5));
  }

  // Film grain (seeded, so exports are stable) and a vignette.
  const rnd = seededRandom(20261119);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < W * H / 260; i++) {
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let i = 0; i < W * H / 420; i++) {
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  vig.addColorStop(0, 'rgba(10,4,16,0)');
  vig.addColorStop(1, 'rgba(10,4,16,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function starburst(ctx, cx, cy, outer, inner, points, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(2, outer * 0.05);
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function fitFont(ctx, text, maxWidth, startSize, family, weight) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

// The title block: giant gradient title, neon script subtitle, badge, tagline.
export function paintTitleBlock(ctx, state, W, H) {
  const tb = titleBlockRect(state.layout, W, H);
  const pad = W * 0.03;
  // Deep ink band behind the lettering (translucent on fullbleed).
  ctx.fillStyle = state.layout === 'fullbleed' ? 'rgba(12,4,20,0.72)' : '#160a24';
  ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
  const topLine = ctx.createLinearGradient(tb.x, tb.y, tb.x + tb.w, tb.y);
  topLine.addColorStop(0, '#ffd319'); topLine.addColorStop(0.5, '#ff2975'); topLine.addColorStop(1, '#8c1eff');
  ctx.fillStyle = topLine;
  ctx.fillRect(tb.x, tb.y, tb.w, Math.max(3, H * 0.006));

  const title = (state.title || 'GOLDEN COAST').toUpperCase();
  // Badge size first: the title must stop short of the starburst.
  const badgeR = Math.min(tb.w, tb.h) * 0.34;
  const badgeDiam = badgeR * 2.1;
  const titleSize = fitFont(ctx, title, tb.w - pad * 2 - badgeDiam, Math.min(H * 0.17, W * 0.17), 'Anton, "Arial Black", sans-serif', 400);
  const titleY = tb.y + tb.h * 0.52;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const grad = ctx.createLinearGradient(pad, titleY - titleSize, pad, titleY + titleSize * 0.6);
  grad.addColorStop(0, '#fff3b0');
  grad.addColorStop(0.35, '#ffd319');
  grad.addColorStop(0.7, '#ff2975');
  grad.addColorStop(1, '#b537f2');
  ctx.font = `400 ${titleSize}px Anton, "Arial Black", sans-serif`;
  ctx.lineWidth = Math.max(3, titleSize * 0.07);
  ctx.strokeStyle = '#14081f';
  ctx.strokeText(title, pad, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title, pad, titleY);
  ctx.restore();

  // Neon script subtitle, glowing pink.
  const sub = state.subtitle || 'summer nights in Leonida';
  const subSize = fitFont(ctx, sub, tb.w - pad * 2, H * 0.055, 'Pacifico, cursive', 400);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${subSize}px Pacifico, cursive`;
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = Math.max(6, subSize * 0.45);
  ctx.fillStyle = '#ffe9f4';
  ctx.fillText(sub, pad, tb.y + tb.h * 0.74);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff5da2';
  ctx.fillText(sub, pad, tb.y + tb.h * 0.74);
  ctx.restore();

  // Starburst badge, top right of the title block.
  const bx = tb.x + tb.w - pad - badgeR * 0.95;
  const by = tb.y + tb.h * 0.30;
  starburst(ctx, bx, by, badgeR, badgeR * 0.72, 12, '#ffd319', '#14081f');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#14081f';
  const badgeText = (state.badge || 'LEONIDA 2026').split(' ');
  const bSize = fitFont(ctx, badgeText[0] || '', badgeR * 1.3, badgeR * 0.34, 'Anton, "Arial Black", sans-serif', 400);
  ctx.font = `400 ${bSize}px Anton, "Arial Black", sans-serif`;
  badgeText.forEach((line, i) => ctx.fillText(line, bx, by + (i - (badgeText.length - 1) / 2) * bSize * 1.05));
  ctx.restore();

  // Tagline strip at the very bottom (measured in the uppercase form it is drawn in).
  const tag = (state.tagline || 'Sunset chasers  •  Neon nights  •  One coast, every story').toUpperCase();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c9b8e8';
  const tSize = fitFont(ctx, tag, tb.w - pad * 2, H * 0.024, '"Arial Narrow", Arial, sans-serif', 700);
  ctx.font = `700 ${tSize}px "Arial Narrow", Arial, sans-serif`;
  ctx.fillText(tag, tb.x + tb.w / 2, tb.y + tb.h - H * 0.022);
  ctx.restore();

  // Eyebrow above the title.
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffd319';
  const eSize = Math.max(10, H * 0.024);
  ctx.font = `700 ${eSize}px Arial, sans-serif`;
  ctx.fillText('W E L C O M E   T O', pad, tb.y + tb.h * 0.16);
  ctx.restore();
}

// Full render: photo layer (panels + grade + halftone) then the title block.
export function renderCover(state, W, H) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const photoLayer = document.createElement('canvas');
  photoLayer.width = W; photoLayer.height = H;
  const pctx = photoLayer.getContext('2d');
  pctx.fillStyle = '#160a24';
  pctx.fillRect(0, 0, W, H);
  const rects = layoutPanels(state.layout, W, H);
  const settings = state.panels || [];
  rects.forEach((rect, i) => {
    const setting = settings[i] || { photo: i % (state.photos?.length || 1), zoom: 1, dx: 0, dy: 0 };
    const photo = state.photos?.[setting.photo] ?? null;
    paintPanelPhoto(pctx, photo, rect, setting);
  });
  finishPhotoLayer(photoLayer, state.grade, W, H);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(photoLayer, 0, 0);
  paintTitleBlock(ctx, state, W, H);
  return canvas;
}
