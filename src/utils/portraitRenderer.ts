import { AppliedMakeupState, FaceFeatures, MakeupZoneId, ModelProfile } from '../types';

export const PORTRAIT_W = 540;
export const PORTRAIT_H = 640;

export const CX = 270;
export const EYE_Y = 264;
export const EYE_DX = 60;
export const BROW_Y = 230;
export const NOSE_TIP_Y = 336;
export const MOUTH_Y = 398;

export function getModelFeatures(model: ModelProfile): FaceFeatures {
  return model.features;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function mixHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = parseHex(hexA);
  const [r2, g2, b2] = parseHex(hexB);
  const clamp = Math.max(0, Math.min(1, t));
  const r = Math.round(r1 + (r2 - r1) * clamp);
  const g = Math.round(g1 + (g2 - g1) * clamp);
  const b = Math.round(b1 + (b2 - b1) * clamp);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function drawFacePath(ctx: CanvasRenderingContext2D, model: ModelProfile) {
  const f = getModelFeatures(model);
  const fw = f.foreheadWidth;
  const cw = f.cheekWidth;
  const jw = f.jawWidth;
  const chinW = f.chinWidth;
  const fy = f.foreheadY;
  const cy = f.cheekY;
  const jy = f.jawY;
  const chY = f.chinY;

  ctx.beginPath();
  ctx.moveTo(CX, fy);

  if (f.jawCurve === 'angular') {
    // High cheekbones + crisp defined gonial jaw angle + sculpted chin
    ctx.bezierCurveTo(CX + fw, fy + 2, CX + cw, cy - 72, CX + cw, cy);
    ctx.bezierCurveTo(CX + cw - 1, cy + 56, CX + jw + 4, jy - 22, CX + jw, jy);
    ctx.bezierCurveTo(CX + jw - 14, jy + 30, CX + chinW + 18, chY - 6, CX + chinW, chY - 6);
    ctx.bezierCurveTo(CX + 14, chY + 6, CX - 14, chY + 6, CX - chinW, chY - 6);
    ctx.bezierCurveTo(CX - chinW - 18, chY - 6, CX - jw + 14, jy + 30, CX - jw, jy);
    ctx.bezierCurveTo(CX - jw - 4, jy - 22, CX - cw + 1, cy + 56, CX - cw, cy);
    ctx.bezierCurveTo(CX - cw, cy - 72, CX - fw, fy + 2, CX, fy);
  } else if (f.jawCurve === 'diamond') {
    // Narrower forehead, striking wide cheekbones, sharp V-taper to chin
    ctx.bezierCurveTo(CX + fw, fy + 3, CX + cw, cy - 64, CX + cw, cy);
    ctx.bezierCurveTo(CX + cw - 4, cy + 62, CX + jw + 6, jy - 20, CX + jw, jy);
    ctx.bezierCurveTo(CX + jw - 18, jy + 32, CX + chinW + 10, chY - 7, CX + chinW, chY - 7);
    ctx.bezierCurveTo(CX + 12, chY + 8, CX - 12, chY + 8, CX - chinW, chY - 7);
    ctx.bezierCurveTo(CX - chinW - 10, chY - 7, CX - jw + 18, jy + 32, CX - jw, jy);
    ctx.bezierCurveTo(CX - jw - 6, jy - 20, CX - cw + 4, cy + 62, CX - cw, cy);
    ctx.bezierCurveTo(CX - cw, cy - 64, CX - fw, fy + 3, CX, fy);
  } else if (f.jawCurve === 'round') {
    // Soft fuller cheeks & gentle rounded chin contour
    ctx.bezierCurveTo(CX + fw, fy + 2, CX + cw, cy - 68, CX + cw, cy);
    ctx.bezierCurveTo(CX + cw, cy + 62, CX + jw, jy + 18, CX + chinW, chY - 8);
    ctx.bezierCurveTo(CX + 18, chY + 6, CX - 18, chY + 6, CX - chinW, chY - 8);
    ctx.bezierCurveTo(CX - jw, jy + 18, CX - cw, cy + 62, CX - cw, cy);
    ctx.bezierCurveTo(CX - cw, cy - 68, CX - fw, fy + 2, CX, fy);
  } else if (f.jawCurve === 'tapered') {
    // Heart-shaped wider brow/temple tapering smoothly to a petite chin
    ctx.bezierCurveTo(CX + fw, fy + 2, CX + cw, cy - 70, CX + cw, cy);
    ctx.bezierCurveTo(CX + cw - 6, cy + 66, CX + jw, jy + 14, CX + chinW, chY - 6);
    ctx.bezierCurveTo(CX + 11, chY + 6, CX - 11, chY + 6, CX - chinW, chY - 6);
    ctx.bezierCurveTo(CX - jw, jy + 14, CX - cw + 6, cy + 66, CX - cw, cy);
    ctx.bezierCurveTo(CX - cw, cy - 70, CX - fw, fy + 2, CX, fy);
  } else {
    // Classic or soft oval
    ctx.bezierCurveTo(CX + fw, fy + 2, CX + cw, cy - 72, CX + cw, cy);
    ctx.bezierCurveTo(CX + cw, cy + 66, CX + jw, jy + 14, CX + chinW, chY - 7);
    ctx.bezierCurveTo(CX + 14, chY + 7, CX - 14, chY + 7, CX - chinW, chY - 7);
    ctx.bezierCurveTo(CX - jw, jy + 14, CX - cw, cy + 66, CX - cw, cy);
    ctx.bezierCurveTo(CX - cw, cy - 72, CX - fw, fy + 2, CX, fy);
  }

  ctx.closePath();
}

/**
 * Evaluates a point & tangent angle along a quadratic Bezier curve.
 */
function evalQuadPt(
  t: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number
) {
  const mt = 1 - t;
  const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
  const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
  const dx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
  const dy = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
  return { x, y, angle: Math.atan2(dy, dx) };
}

/**
 * Draws realistic interlocking 3-strand chevron plaits with longitudinal fiber sheen,
 * recessed plait crevices, optional knotless tapered root, and tapered spiral curly ends.
 */
function drawWovenBraid(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  width: number,
  hairBase: string,
  hairHighlight: string,
  hairShadow: string,
  withCurlyEnd = false,
  knotlessRoot = false
) {
  const deepDark = mixHex(hairShadow, '#060403', 0.52);
  const midTone = mixHex(hairBase, hairShadow, 0.34);
  const sheen = mixHex(hairHighlight, '#FFF6EE', 0.18);

  const length = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
  const segStep = Math.max(4.8, width * 0.62);
  const count = Math.max(6, Math.floor(length / segStep));

  ctx.save();
  // Soft ambient drop shadow beneath braid
  ctx.strokeStyle = 'rgba(10, 7, 5, 0.22)';
  ctx.lineWidth = width * 1.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + 2.2, y0 + 2.5);
  ctx.quadraticCurveTo(cx + 2.2, cy + 2.5, x1 + 2.2, y1 + 2.5);
  ctx.stroke();

  // Dark inner braid spine groove
  ctx.strokeStyle = deepDark;
  ctx.lineWidth = width * (knotlessRoot ? 0.68 : 0.86);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();

  // Overlapping angled chevron plait locks
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const p = evalQuadPt(t, x0, y0, cx, cy, x1, y1);
    const rootTaper = knotlessRoot && t < 0.14 ? 0.52 + (t / 0.14) * 0.48 : t < 0.06 ? 0.78 + (t / 0.06) * 0.22 : 1;
    const tipTaper = t > 0.84 ? Math.max(0.45, 1 - (t - 0.84) * 3.1) : 1;
    const taper = rootTaper * tipTaper;

    const lockW = width * 0.44 * taper;
    const lockH = segStep * 0.92;
    const side = i % 2 === 0 ? -1 : 1;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle - Math.PI / 2);

    // Almond-shaped plait lock rotated into V-chevron angle
    ctx.save();
    ctx.translate(side * lockW * 0.36, 0);
    ctx.rotate(side * 0.52);

    const lockGrad = ctx.createLinearGradient(-lockW, -lockH * 0.6, lockW, lockH * 0.6);
    lockGrad.addColorStop(0, i % 2 === 0 ? sheen : hairHighlight);
    lockGrad.addColorStop(0.45, i % 2 === 0 ? hairBase : midTone);
    lockGrad.addColorStop(1, deepDark);

    ctx.fillStyle = lockGrad;
    ctx.beginPath();
    ctx.moveTo(0, -lockH);
    ctx.bezierCurveTo(lockW * 1.15, -lockH * 0.45, lockW * 1.05, lockH * 0.55, 0, lockH);
    ctx.bezierCurveTo(-lockW * 0.95, lockH * 0.45, -lockW * 0.95, -lockH * 0.45, 0, -lockH);
    ctx.closePath();
    ctx.fill();

    // Recessed groove border between plaits
    ctx.strokeStyle = hexToRgba(deepDark, 0.65);
    ctx.lineWidth = Math.max(0.75, width * 0.08);
    ctx.stroke();

    // Longitudinal fiber grooves & specular hair-strand glint inside each plait
    ctx.strokeStyle = hexToRgba(sheen, i % 2 === 0 ? 0.38 : 0.22);
    ctx.lineWidth = Math.max(0.7, width * 0.09);
    ctx.beginPath();
    ctx.moveTo(-lockW * 0.22, -lockH * 0.68);
    ctx.quadraticCurveTo(-lockW * 0.05, 0, -lockW * 0.16, lockH * 0.68);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(deepDark, 0.32);
    ctx.lineWidth = Math.max(0.6, width * 0.065);
    ctx.beginPath();
    ctx.moveTo(lockW * 0.24, -lockH * 0.62);
    ctx.quadraticCurveTo(lockW * 0.34, 0, lockW * 0.2, lockH * 0.62);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // Delicate stray wispy fibers along braid body
  ctx.strokeStyle = hexToRgba(hairBase, 0.42);
  ctx.lineWidth = 0.75;
  for (let w = 0; w < 6; w++) {
    const wt = 0.22 + hash01(x0 * 3 + w * 19) * 0.68;
    const pt = evalQuadPt(wt, x0, y0, cx, cy, x1, y1);
    const side = w % 2 === 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(pt.x + side * width * 0.35, pt.y);
    ctx.quadraticCurveTo(
      pt.x + side * (width * 0.85),
      pt.y + 8,
      pt.x + side * (width * 0.55),
      pt.y + 18
    );
    ctx.stroke();
  }

  if (withCurlyEnd) {
    // Realistic tapered boho corkscrew spiral curls at braid end (never round spheres)
    const endPt = evalQuadPt(0.98, x0, y0, cx, cy, x1, y1);
    const curlStrands = 3;
    for (let s = 0; s < curlStrands; s++) {
      const xDrift = (s - 1) * (width * 0.42);
      const curlLen = width * (3.1 + (s % 2) * 0.85);
      const amp = width * (0.48 + (s === 1 ? 0.16 : 0));

      // Dark underside ribbon
      ctx.strokeStyle = s === 1 ? hairBase : deepDark;
      ctx.lineWidth = width * (s === 1 ? 0.42 : 0.28);
      ctx.beginPath();
      ctx.moveTo(endPt.x + xDrift * 0.3, endPt.y - 2);
      ctx.bezierCurveTo(
        endPt.x + xDrift + amp * 1.4,
        endPt.y + curlLen * 0.28,
        endPt.x + xDrift - amp * 1.5,
        endPt.y + curlLen * 0.62,
        endPt.x + xDrift + amp * 0.7,
        endPt.y + curlLen
      );
      ctx.stroke();

      // Glossy highlight ridge along the spiral crest
      ctx.strokeStyle = hexToRgba(sheen, 0.46);
      ctx.lineWidth = Math.max(0.9, width * 0.14);
      ctx.beginPath();
      ctx.moveTo(endPt.x + xDrift * 0.3 - 0.8, endPt.y - 1);
      ctx.bezierCurveTo(
        endPt.x + xDrift + amp * 1.3 - 0.8,
        endPt.y + curlLen * 0.28,
        endPt.x + xDrift - amp * 1.4 - 0.8,
        endPt.y + curlLen * 0.62,
        endPt.x + xDrift + amp * 0.6,
        endPt.y + curlLen * 0.96
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Renders multi-layered fine glossy hair strands over a silhouette region.
 */
function drawStrandTexture(
  ctx: CanvasRenderingContext2D,
  strands: number,
  seedOffset: number,
  hairBase: string,
  hairHighlight: string,
  hairShadow: string,
  getCurve: (i: number, r1: number, r2: number) => [number, number, number, number, number, number, number, number]
) {
  ctx.save();
  ctx.lineCap = 'round';
  const brightSheen = mixHex(hairHighlight, '#FFF8F2', 0.2);
  const deepStrand = mixHex(hairShadow, '#070403', 0.4);

  for (let i = 0; i < strands; i++) {
    const r1 = hash01(seedOffset + i * 3.1);
    const r2 = hash01(seedOffset + i * 7.7 + 19);
    const r3 = hash01(seedOffset + i * 11.3 + 41);
    const [x0, y0, c1x, c1y, c2x, c2y, x1, y1] = getCurve(i, r1, r2);

    if (r3 < 0.34) {
      ctx.strokeStyle = hexToRgba(deepStrand, 0.28 + r1 * 0.24);
      ctx.lineWidth = 1.0 + r2 * 1.35;
    } else if (r3 < 0.72) {
      ctx.strokeStyle = hexToRgba(hairBase, 0.32 + r1 * 0.24);
      ctx.lineWidth = 0.85 + r2 * 1.15;
    } else {
      ctx.strokeStyle = hexToRgba(brightSheen, 0.2 + r1 * 0.26);
      ctx.lineWidth = 0.7 + r2 * 0.95;
    }

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a soft 3D scalp part with dark root-depth shadow flanking a subtle skin groove
 * and fine crossing root hairs so parts never look like painted white stripes.
 */
function drawScalpPart(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  scalpSkin: string,
  deepDark: string,
  width = 1.7
) {
  ctx.save();
  ctx.lineCap = 'round';

  // Flanking root-lift shadow on both sides of part
  ctx.strokeStyle = hexToRgba(deepDark, 0.56);
  ctx.lineWidth = width + 3.2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  // Warm natural skin scalp line
  ctx.strokeStyle = hexToRgba(scalpSkin, 0.8);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  // Subtle cross-over micro root hairs so scalp isn't sterile
  const steps = 6;
  ctx.strokeStyle = hexToRgba(deepDark, 0.38);
  ctx.lineWidth = 0.7;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    const dir = i % 2 === 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(px - dir * 1.8, py - 1);
    ctx.lineTo(px + dir * 2.2, py + 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Feathers the forehead hairline with soft translucent micro-roots and gentle shadow
 * so hair transitions organically out of the skin rather than ending in a hard vector edge.
 */
function drawHairlineFeather(
  ctx: CanvasRenderingContext2D,
  hairBase: string,
  hairShadow: string,
  f: FaceFeatures,
  partX = CX
) {
  const fy = f.foreheadY;
  const cw = f.cheekWidth;
  const wScale = cw / 114;
  const deepDark = mixHex(hairShadow, '#070403', 0.46);

  ctx.save();
  ctx.lineCap = 'round';
  const count = 38;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = CX - cw * 0.94 + t * cw * 1.88;
    const distFromCenter = (x - CX) / (cw * 0.94);
    const edgeY = fy - 1 + Math.pow(Math.abs(distFromCenter), 1.85) * 44;
    const flowDir = x >= partX ? 1 : -1;
    const len = 6 + hash01(2800 + i * 3.3) * 6;

    ctx.strokeStyle = hexToRgba(deepDark, 0.24 + hash01(2850 + i) * 0.18);
    ctx.lineWidth = 0.75 + hash01(2890 + i) * 0.55;
    ctx.beginPath();
    ctx.moveTo(x, edgeY - 3);
    ctx.quadraticCurveTo(x + flowDir * 2.2, edgeY + len * 0.45, x + flowDir * 4.2, edgeY + len * 0.7);
    ctx.stroke();
  }
  // Subtle forehead drop shadow right beneath hairline
  const hlShadow = ctx.createRadialGradient(CX, fy + 8, 12, CX, fy + 6, cw * 1.04);
  hlShadow.addColorStop(0, hexToRgba(deepDark, 0.14));
  hlShadow.addColorStop(1, hexToRgba(deepDark, 0));
  ctx.fillStyle = hlShadow;
  ctx.fillRect(CX - cw - 8, fy - 4, (cw + 8) * 2, 34);
  ctx.restore();
}

/**
 * Draws realistic baby hairs / laid edges along the forehead temples.
 */
function drawBabyHairs(
  ctx: CanvasRenderingContext2D,
  hairBase: string,
  hairShadow: string,
  f: FaceFeatures,
  soft = false
) {
  const fy = f.foreheadY;
  const templeScale = f.cheekWidth / 114;
  const rootColor = mixHex(hairBase, hairShadow, 0.5);
  ctx.save();
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const swoops = [
      { x0: CX + side * 42 * templeScale, y0: fy, cx: CX + side * 56 * templeScale, cy: fy + 13, x1: CX + side * 70 * templeScale, y1: fy + 7, w: 1.35 },
      { x0: CX + side * 72 * templeScale, y0: fy + 8, cx: CX + side * 86 * templeScale, cy: fy + 24, x1: CX + side * 98 * templeScale, y1: fy + 20, w: 1.2 },
      { x0: CX + side * 98 * templeScale, y0: fy + 28, cx: CX + side * 108 * templeScale, cy: fy + 48, x1: CX + side * 110 * templeScale, y1: fy + 62, w: 1.05 },
      { x0: CX + side * 106 * templeScale, y0: fy + 62, cx: CX + side * 112 * templeScale, cy: fy + 80, x1: CX + side * 108 * templeScale, y1: fy + 90, w: 0.9 },
    ];
    for (const s of swoops) {
      ctx.strokeStyle = hexToRgba(rootColor, soft ? 0.3 : 0.44);
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(s.x0, s.y0);
      ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
      ctx.stroke();

      // Feather micro-tip
      ctx.strokeStyle = hexToRgba(rootColor, soft ? 0.18 : 0.28);
      ctx.lineWidth = s.w * 0.55;
      ctx.beginPath();
      ctx.moveTo(s.x0 + side * 2, s.y0 + 1.5);
      ctx.quadraticCurveTo(s.cx + side * 2, s.cy + 1.8, s.x1 + side * 1.5, s.y1 + 1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Draws a sculpted, multi-coil realistic bun at (bx, by) with twisted hair coils,
 * deep tuck shadows, and delicate rim flyaways.
 */
function drawSculptedBun(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  rx: number,
  ry: number,
  hairBase: string,
  hairHighlight: string,
  hairShadow: string,
  messy = false
) {
  const deepDark = mixHex(hairShadow, '#070403', 0.5);
  const brightSheen = mixHex(hairHighlight, '#FFF6EE', 0.18);

  ctx.save();
  // Ambient shadow cast beneath bun onto head/backdrop
  const drop = ctx.createRadialGradient(bx, by + ry * 0.34, rx * 0.25, bx, by + ry * 0.34, rx * 1.24);
  drop.addColorStop(0, 'rgba(12, 8, 6, 0.36)');
  drop.addColorStop(1, 'rgba(12, 8, 6, 0)');
  ctx.fillStyle = drop;
  ctx.beginPath();
  ctx.ellipse(bx, by + ry * 0.34, rx * 1.18, ry * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();

  if (messy) {
    // Tousled layered twist lobes + crossed wrap bands (never smooth balls)
    const lobes = [
      { dx: -rx * 0.44, dy: -ry * 0.08, prx: rx * 0.58, pry: ry * 0.5, rot: -0.35, c: hairShadow },
      { dx: rx * 0.42, dy: -ry * 0.04, prx: rx * 0.56, pry: ry * 0.48, rot: 0.32, c: hairBase },
      { dx: -rx * 0.06, dy: -ry * 0.34, prx: rx * 0.66, pry: ry * 0.52, rot: -0.1, c: hairHighlight },
      { dx: -rx * 0.14, dy: ry * 0.16, prx: rx * 0.72, pry: ry * 0.48, rot: 0.14, c: hairBase },
      { dx: rx * 0.24, dy: ry * 0.2, prx: rx * 0.52, pry: ry * 0.42, rot: -0.22, c: hairShadow },
    ];
    for (const lb of lobes) {
      ctx.save();
      ctx.translate(bx + lb.dx, by + lb.dy);
      ctx.rotate(lb.rot);
      const pg = ctx.createRadialGradient(-lb.prx * 0.22, -lb.pry * 0.32, 3, 0, 0, lb.prx);
      pg.addColorStop(0, brightSheen);
      pg.addColorStop(0.42, lb.c);
      pg.addColorStop(1, deepDark);
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(0, 0, lb.prx, lb.pry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Crossed fiber strand wraps & tucked shadow creases
    for (let i = 0; i < 48; i++) {
      const r1 = hash01(300 + i * 2.3);
      const r2 = hash01(300 + i * 5.9);
      const ang = r1 * Math.PI * 2;
      const radX = rx * (0.28 + r2 * 0.7);
      const radY = ry * (0.26 + r2 * 0.66);
      ctx.strokeStyle =
        i % 3 === 0
          ? hexToRgba(brightSheen, 0.34)
          : i % 2 === 0
          ? hexToRgba(deepDark, 0.44)
          : hexToRgba(hairBase, 0.4);
      ctx.lineWidth = 0.9 + r1 * 1.3;
      ctx.beginPath();
      ctx.ellipse(bx, by, radX, radY, (r1 - 0.5) * 1.1, ang, ang + 1.15);
      ctx.stroke();
    }

    // Feathered wispy tousled ends (fine tapered loops, not thick tubes)
    ctx.lineCap = 'round';
    const wisps = [
      [bx - rx * 0.68, by - ry * 0.22, bx - rx * 1.12, by - ry * 0.72, bx - rx * 0.56, by - ry * 0.98],
      [bx + rx * 0.72, by - ry * 0.14, bx + rx * 1.14, by - ry * 0.56, bx + rx * 0.62, by - ry * 0.9],
      [bx + rx * 0.2, by - ry * 0.74, bx + rx * 0.52, by - ry * 1.12, bx + rx * 0.04, by - ry * 0.96],
      [bx - rx * 0.78, by + ry * 0.2, bx - rx * 1.12, by + ry * 0.44, bx - rx * 0.88, by + ry * 0.66],
      [bx + rx * 0.78, by + ry * 0.16, bx + rx * 1.08, by + ry * 0.36, bx + rx * 0.92, by + ry * 0.58],
    ];
    for (let w = 0; w < wisps.length; w++) {
      const [x0, y0, cx0, cy0, x1, y1] = wisps[w];
      ctx.strokeStyle = hexToRgba(hairBase, 0.82);
      ctx.lineWidth = 1.65;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx0, cy0, x1, y1);
      ctx.stroke();

      ctx.strokeStyle = hexToRgba(brightSheen, 0.38);
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(x0 + 1, y0 - 1);
      ctx.quadraticCurveTo(cx0 + 1, cy0 - 1, x1, y1);
      ctx.stroke();
    }
  } else {
    // Sculpted chignon / ballerina twisted double-coil silhouette
    const coils = [
      { dx: -rx * 0.28, dy: ry * 0.06, prx: rx * 0.72, pry: ry * 0.84, rot: -0.22, tone: hairShadow },
      { dx: rx * 0.28, dy: ry * 0.06, prx: rx * 0.72, pry: ry * 0.84, rot: 0.22, tone: hairBase },
      { dx: 0, dy: -ry * 0.12, prx: rx * 0.84, pry: ry * 0.82, rot: 0, tone: hairHighlight },
    ];
    for (const cl of coils) {
      ctx.save();
      ctx.translate(bx + cl.dx, by + cl.dy);
      ctx.rotate(cl.rot);
      const cg = ctx.createRadialGradient(-cl.prx * 0.18, -cl.pry * 0.34, 4, 0, 0, cl.prx);
      cg.addColorStop(0, brightSheen);
      cg.addColorStop(0.35, cl.tone);
      cg.addColorStop(0.76, hairBase);
      cg.addColorStop(1, deepDark);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(0, 0, cl.prx, cl.pry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Recessed twist seam dividing wrapped hair layers
    ctx.strokeStyle = hexToRgba(deepDark, 0.56);
    ctx.lineWidth = Math.max(2.2, ry * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - rx * 0.72, by + ry * 0.08);
    ctx.quadraticCurveTo(bx, by - ry * 0.22, bx + rx * 0.72, by + ry * 0.08);
    ctx.stroke();

    // Brushed directional silk wrap strands
    for (let i = 0; i < 44; i++) {
      const frac = 0.2 + (i / 44) * 0.78;
      const startA = hash01(500 + i * 4.1) * Math.PI * 2;
      ctx.strokeStyle =
        i % 4 === 0
          ? hexToRgba(brightSheen, 0.32)
          : i % 2 === 0
          ? hexToRgba(deepDark, 0.36)
          : hexToRgba(hairShadow, 0.24);
      ctx.lineWidth = 0.85 + hash01(510 + i) * 1.1;
      ctx.beginPath();
      ctx.ellipse(bx, by, rx * frac, ry * frac, ((i % 3) - 1) * 0.18, startA, startA + Math.PI * 0.78);
      ctx.stroke();
    }

    // Satin top-crown specular sweep
    const topGloss = ctx.createLinearGradient(bx - rx * 0.65, by - ry * 0.75, bx + rx * 0.65, by);
    topGloss.addColorStop(0, 'rgba(255,255,255,0)');
    topGloss.addColorStop(0.5, hexToRgba(brightSheen, 0.32));
    topGloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = topGloss;
    ctx.lineWidth = Math.max(3.5, ry * 0.14);
    ctx.beginPath();
    ctx.ellipse(bx, by - ry * 0.18, rx * 0.62, ry * 0.38, -0.06, Math.PI * 1.14, Math.PI * 1.86);
    ctx.stroke();

    // Fine natural rim flyaways
    ctx.strokeStyle = hexToRgba(hairBase, 0.36);
    ctx.lineWidth = 0.75;
    for (let f = 0; f < 8; f++) {
      const ang = -Math.PI + (f / 7) * Math.PI;
      const sx = bx + Math.cos(ang) * rx * 0.94;
      const sy = by + Math.sin(ang) * ry * 0.92;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + Math.cos(ang) * 6,
        sy + Math.sin(ang) * 5 - 3,
        sx + Math.cos(ang + 0.35) * 9,
        sy + Math.sin(ang + 0.35) * 8
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Draws authentic textured 3B–4C coiled curl clusters using organic scalloped shadow
 * cores and layered spiral S/O-curl strands + perimeter frizz wisps (no smooth bubble spheres).
 */
function drawCurlCluster(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  hairBase: string,
  hairHighlight: string,
  hairShadow: string,
  seed: number
) {
  const deepDark = mixHex(hairShadow, '#060403', 0.54);
  const sheen = mixHex(hairHighlight, '#FFF6EE', 0.18);

  ctx.save();
  // Soft irregular dark shadow under-tuft (never a crisp circle outline)
  const core = ctx.createRadialGradient(cx - r * 0.18, cy - r * 0.22, r * 0.1, cx, cy, r * 0.96);
  core.addColorStop(0, hexToRgba(hairBase, 0.85));
  core.addColorStop(0.58, hexToRgba(hairShadow, 0.78));
  core.addColorStop(0.86, hexToRgba(deepDark, 0.45));
  core.addColorStop(1, hexToRgba(deepDark, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  for (let s = 0; s <= 12; s++) {
    const a = (s / 12) * Math.PI * 2;
    const rad = r * (0.82 + hash01(seed + s * 4.3) * 0.32);
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Dense layered S-coils & micro-ringlets breaking up silhouette and adding depth
  ctx.lineCap = 'round';
  const coilCount = Math.max(7, Math.round(r * 0.42));
  for (let i = 0; i < coilCount; i++) {
    const r1 = hash01(seed + i * 3.7 + 11);
    const r2 = hash01(seed + i * 8.1 + 29);
    const ang = r1 * Math.PI * 2;
    const dist = r * (0.14 + r2 * 0.62);
    const ox = cx + Math.cos(ang) * dist;
    const oy = cy + Math.sin(ang) * dist;
    const cr = r * (0.24 + r1 * 0.28);
    const arcStart = r2 * Math.PI * 2;

    // Deep coil crevice stroke
    ctx.strokeStyle = hexToRgba(deepDark, 0.62);
    ctx.lineWidth = Math.max(1.2, r * 0.13);
    ctx.beginPath();
    ctx.arc(ox + 0.8, oy + 0.9, cr, arcStart, arcStart + Math.PI * 1.35);
    ctx.stroke();

    // Midtone hair coil
    ctx.strokeStyle = i % 2 === 0 ? hexToRgba(hairBase, 0.82) : hexToRgba(hairShadow, 0.72);
    ctx.lineWidth = Math.max(1.0, r * 0.11);
    ctx.beginPath();
    ctx.arc(ox, oy, cr, arcStart, arcStart + Math.PI * 1.4);
    ctx.stroke();

    // Specular curl-crest highlight
    if (i % 2 === 0) {
      ctx.strokeStyle = hexToRgba(sheen, 0.42);
      ctx.lineWidth = Math.max(0.75, r * 0.065);
      ctx.beginPath();
      ctx.arc(ox - 0.8, oy - 0.9, cr * 0.88, arcStart + 0.4, arcStart + Math.PI * 1.05);
      ctx.stroke();
    }
  }

  // Organic coily perimeter flyaways so outer edges read as soft natural hair
  for (let f = 0; f < 4; f++) {
    const a = hash01(seed + 190 + f * 7.1) * Math.PI * 2;
    const bx = cx + Math.cos(a) * r * 0.76;
    const by = cy + Math.sin(a) * r * 0.76;
    const tipX = cx + Math.cos(a + 0.35) * r * 1.18;
    const tipY = cy + Math.sin(a + 0.35) * r * 1.18;
    ctx.strokeStyle = hexToRgba(f % 2 === 0 ? hairBase : sheen, 0.44);
    ctx.lineWidth = Math.max(0.7, r * 0.055);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(
      cx + Math.cos(a - 0.35) * r * 1.08,
      cy + Math.sin(a - 0.35) * r * 1.08,
      tipX,
      tipY
    );
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a tapered, flowing front shoulder lock (used in drawHairFront to drape
 * hair naturally over the clavicles/shoulders without touching face makeup zones).
 */
function drawShoulderDrapeLock(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  x1: number,
  y1: number,
  width: number,
  hairBase: string,
  hairHighlight: string,
  hairShadow: string,
  seed: number,
  wavy = false
) {
  const deepDark = mixHex(hairShadow, '#070403', 0.48);
  const brightSheen = mixHex(hairHighlight, '#FFF6EE', 0.18);

  ctx.save();
  // Soft ambient shadow cast onto skin/shoulders underneath lock
  ctx.strokeStyle = 'rgba(14, 9, 7, 0.22)';
  ctx.lineWidth = width * 0.95;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + 3, y0 + 4);
  ctx.bezierCurveTo(c1x + 3, c1y + 4, c2x + 3, c2y + 4, x1 + 2, y1 + 3);
  ctx.stroke();

  // Main lock body built from dense tapered overlapping strands
  const strands = 14;
  for (let i = 0; i < strands; i++) {
    const frac = (i / (strands - 1)) - 0.5;
    const off = frac * width * 0.85;
    const waveOff = wavy ? Math.sin(i * 1.1 + seed) * 7 : 0;
    const r = hash01(seed + i * 5.1);

    ctx.strokeStyle =
      i % 4 === 0
        ? hexToRgba(brightSheen, 0.42 + r * 0.2)
        : i % 3 === 0
        ? hexToRgba(deepDark, 0.65)
        : hexToRgba(hairBase, 0.86);
    ctx.lineWidth = Math.max(1.1, (width / strands) * (1.7 - Math.abs(frac) * 0.7));
    ctx.beginPath();
    ctx.moveTo(x0 + off * 0.75, y0);
    ctx.bezierCurveTo(
      c1x + off + waveOff,
      c1y,
      c2x + off * 0.9 - waveOff,
      c2y,
      x1 + off * 0.35 + (r - 0.5) * 6,
      y1 - Math.abs(frac) * 14
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawHairBack(ctx: CanvasRenderingContext2D, model: ModelProfile) {
  const { hairBase, hairHighlight, hairShadow } = model.palette;
  const style = model.hairStyle;
  const deepDark = mixHex(hairShadow, '#070403', 0.48);
  const brightSheen = mixHex(hairHighlight, '#FFF6EE', 0.18);

  ctx.save();
  const grad = ctx.createLinearGradient(CX, 75, CX, 625);
  grad.addColorStop(0, hairHighlight);
  grad.addColorStop(0.36, hairBase);
  grad.addColorStop(0.8, hairShadow);
  grad.addColorStop(1, deepDark);
  ctx.fillStyle = grad;

  const drawStraightSilhouette = (widthTop: number, widthBot: number) => {
    // Organic silhouette with gentle inward waist & realistic shoulder flare + feathered ends
    ctx.beginPath();
    ctx.moveTo(CX - widthTop, 210);
    ctx.bezierCurveTo(CX - (widthTop + 14), 335, CX - (widthTop - 2), 442, CX - (widthBot + 16), 542);
    ctx.bezierCurveTo(CX - (widthBot + 24), 582, CX - (widthBot + 12), 614, CX - widthBot, 632);
    ctx.lineTo(CX + widthBot, 632);
    ctx.bezierCurveTo(CX + (widthBot + 12), 614, CX + (widthBot + 24), 582, CX + (widthBot + 16), 542);
    ctx.bezierCurveTo(CX + (widthTop - 2), 442, CX + (widthTop + 14), 335, CX + widthTop, 210);
    ctx.bezierCurveTo(CX + widthTop - 4, 86, CX - widthTop + 4, 86, CX - widthTop, 210);
    ctx.fill();

    // Inner nape occlusion shadow behind the neck
    const napeShadow = ctx.createLinearGradient(CX, 375, CX, 565);
    napeShadow.addColorStop(0, hexToRgba(deepDark, 0.78));
    napeShadow.addColorStop(1, hexToRgba(deepDark, 0.12));
    ctx.fillStyle = napeShadow;
    ctx.fillRect(CX - 82, 375, 164, 230);

    // Deep vertical hair-clump separation shadows so it reads as real layered locks
    for (const side of [-1, 1]) {
      for (const offset of [78, 102, 122]) {
        ctx.strokeStyle = hexToRgba(deepDark, 0.44);
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(CX + side * offset, 215);
        ctx.bezierCurveTo(
          CX + side * (offset + 10),
          360,
          CX + side * (offset + 4),
          485,
          CX + side * (offset + 14),
          628
        );
        ctx.stroke();
      }
    }

    // Rich vertical silk-press strands
    drawStrandTexture(ctx, 96, 100, hairBase, hairHighlight, hairShadow, (i, r1, r2) => {
      const side = i % 2 === 0 ? -1 : 1;
      const frac = r1;
      const xTop = side * (62 + frac * (widthTop - 64));
      const xBot = side * (66 + frac * (widthBot - 62)) + (r2 - 0.5) * 10;
      return [
        CX + xTop,
        148 + r2 * 45,
        CX + xTop + side * 10,
        305,
        CX + xBot - side * 6,
        465,
        CX + xBot + side * 6,
        626,
      ];
    });

    // Subtle outer flyaway wisps
    ctx.strokeStyle = hexToRgba(hairBase, 0.36);
    ctx.lineWidth = 0.85;
    for (const side of [-1, 1]) {
      for (let w = 0; w < 5; w++) {
        const wy = 240 + w * 72;
        ctx.beginPath();
        ctx.moveTo(CX + side * (widthTop + 2), wy);
        ctx.quadraticCurveTo(CX + side * (widthTop + 18), wy + 34, CX + side * (widthBot + 14), wy + 72);
        ctx.stroke();
      }
    }

    // Soft curved silk-press specular sheen bands
    const sheenBand = ctx.createLinearGradient(CX - widthTop, 285, CX + widthTop, 335);
    sheenBand.addColorStop(0, 'rgba(255,255,255,0)');
    sheenBand.addColorStop(0.24, hexToRgba(brightSheen, 0.22));
    sheenBand.addColorStop(0.5, 'rgba(255,255,255,0)');
    sheenBand.addColorStop(0.76, hexToRgba(brightSheen, 0.22));
    sheenBand.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheenBand;
    ctx.fillRect(CX - widthTop - 14, 272, (widthTop + 14) * 2, 74);
  };

  const drawWavySilhouette = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 142, 216);
    ctx.bezierCurveTo(CX - 188, 305, CX - 146, 395, CX - 180, 482);
    ctx.bezierCurveTo(CX - 196, 538, CX - 166, 592, CX - 150, 632);
    ctx.lineTo(CX + 150, 632);
    ctx.bezierCurveTo(CX + 166, 592, CX + 196, 538, CX + 180, 482);
    ctx.bezierCurveTo(CX + 146, 395, CX + 188, 305, CX + 142, 216);
    ctx.bezierCurveTo(CX + 136, 86, CX - 136, 86, CX - 142, 216);
    ctx.fill();

    // Nape shadow
    const napeShadow = ctx.createLinearGradient(CX, 382, CX, 565);
    napeShadow.addColorStop(0, hexToRgba(deepDark, 0.72));
    napeShadow.addColorStop(1, hexToRgba(deepDark, 0.12));
    ctx.fillStyle = napeShadow;
    ctx.fillRect(CX - 84, 382, 168, 220);

    // Deep undulating wave shadow troughs for S-curl dimensionality
    for (const side of [-1, 1]) {
      for (let w = 0; w < 3; w++) {
        const bx = CX + side * (88 + w * 26);
        ctx.strokeStyle = hexToRgba(deepDark, 0.44);
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, 200);
        ctx.bezierCurveTo(bx + side * 24, 310, bx - side * 16, 425, bx + side * 14, 622);
        ctx.stroke();
      }
    }

    // Undulating S-wave strands & highlight ribbons
    drawStrandTexture(ctx, 102, 200, hairBase, hairHighlight, hairShadow, (i, r1, r2) => {
      const side = i % 2 === 0 ? -1 : 1;
      const band = 70 + r1 * 88;
      const sway = 22 + r2 * 18;
      return [
        CX + side * (band - 14),
        162 + r2 * 40,
        CX + side * (band + sway),
        305,
        CX + side * (band - sway * 0.72),
        455,
        CX + side * (band + sway * 0.35),
        624,
      ];
    });
  };

  const drawBraidedLayout = (
    cols: number,
    braidW: number,
    startX: number,
    stepX: number,
    withCurlyEnds = false,
    endBaseY = 602,
    knotlessRoot = false
  ) => {
    // Crown base silhouette
    ctx.beginPath();
    ctx.ellipse(CX, 204, 128, 108, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const side of [-1, 1]) {
      // Back depth braids first, then foreground braids
      for (let col = cols - 1; col >= 0; col--) {
        const bx = CX + side * (startX + col * stepX);
        const y0 = 186 + col * 5;
        const stagger = (hash01(col * 17 + side * 9) - 0.5) * 18;
        const yEnd = withCurlyEnds
          ? endBaseY - 48 + (col % 2) * 14 + stagger
          : endBaseY + (col % 2) * 12 + stagger;
        const cx = bx + side * (16 + col * 3.5);
        const cy = (y0 + yEnd) * 0.5;
        const x1 = bx + side * (col * 3.2 - 2);
        drawWovenBraid(
          ctx,
          bx,
          y0,
          cx,
          cy,
          x1,
          yEnd,
          braidW,
          col % 2 === 0 ? hairBase : hairShadow,
          hairHighlight,
          hairShadow,
          withCurlyEnds,
          knotlessRoot
        );
      }
    }
  };

  if (style === 'afro') {
    // Soft multi-toned organic coily afro silhouette (no crisp geometric circle)
    const afroGrad = ctx.createRadialGradient(CX - 28, 178, 32, CX, 224, 198);
    afroGrad.addColorStop(0, hairHighlight);
    afroGrad.addColorStop(0.55, hairBase);
    afroGrad.addColorStop(0.86, hairShadow);
    afroGrad.addColorStop(1, hexToRgba(deepDark, 0.92));
    ctx.fillStyle = afroGrad;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const rad = 166 + (hash01(860 + i * 3.1) - 0.5) * 18;
      const px = CX + Math.cos(a) * rad;
      const py = 222 + Math.sin(a) * (rad * 0.95);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Interior coily depth clusters
    for (let i = 0; i < 62; i++) {
      const a = hash01(1020 + i) * Math.PI * 2;
      const d = 88 + hash01(1080 + i) * 70;
      const px = CX + Math.cos(a) * d;
      const py = 220 + Math.sin(a) * d;
      if (py > 125 && Math.abs(px - CX) < 108 && py < 420) continue;
      drawCurlCluster(ctx, px, py, 18 + hash01(1140 + i) * 12, hairBase, brightSheen, hairShadow, 1200 + i);
    }

    // Organic perimeter coily tufts + natural halo frizz
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2;
      const wobble = 152 + (hash01(900 + i) - 0.5) * 28;
      const rx = CX + Math.cos(a) * wobble;
      const ry = 222 + Math.sin(a) * (wobble * 0.95);
      const rad = 20 + hash01(950 + i) * 15;
      const isTopRim = Math.sin(a) < -0.2;
      drawCurlCluster(
        ctx,
        rx,
        ry,
        rad,
        isTopRim ? hairHighlight : hairBase,
        brightSheen,
        hairShadow,
        980 + i
      );
    }
  } else if (style === 'curls') {
    ctx.beginPath();
    ctx.moveTo(CX - 156, 218);
    ctx.bezierCurveTo(CX - 204, 320, CX - 190, 485, CX - 148, 598);
    ctx.lineTo(CX + 148, 598);
    ctx.bezierCurveTo(CX + 190, 485, CX + 204, 320, CX + 156, 218);
    ctx.bezierCurveTo(CX + 148, 86, CX - 148, 86, CX - 156, 218);
    ctx.fill();

    // Inner curl depth shadow
    const napeShadow = ctx.createLinearGradient(CX, 380, CX, 560);
    napeShadow.addColorStop(0, hexToRgba(deepDark, 0.72));
    napeShadow.addColorStop(1, hexToRgba(deepDark, 0.14));
    ctx.fillStyle = napeShadow;
    ctx.fillRect(CX - 90, 380, 180, 210);

    for (const side of [-1, 1]) {
      for (let i = 0; i < 14; i++) {
        const y = 165 + i * 33;
        const xOff = 122 + Math.sin(i * 0.72) * 26 + (i % 2) * 10;
        const r = 24 + (i % 3) * 5;
        drawCurlCluster(ctx, CX + side * xOff, y, r, i % 2 === 0 ? hairBase : hairShadow, brightSheen, hairShadow, 1400 + i * 7 + side);
      }
      // Deeper inner layer ringlets
      for (let i = 0; i < 8; i++) {
        const y = 265 + i * 42;
        const xOff = 98 + (i % 2) * 14;
        drawCurlCluster(ctx, CX + side * xOff, y, 22, hairShadow, brightSheen, hairShadow, 1480 + i * 5 + side);
      }
    }
  } else if (style === 'bob') {
    // Sleek jaw-framing angled French/blunt bob with soft undercut volume
    ctx.beginPath();
    ctx.moveTo(CX - 142, 206);
    ctx.bezierCurveTo(CX - 168, 315, CX - 152, 422, CX - 104, 464);
    ctx.quadraticCurveTo(CX, 480, CX + 104, 464);
    ctx.bezierCurveTo(CX + 152, 422, CX + 168, 315, CX + 142, 206);
    ctx.bezierCurveTo(CX + 130, 86, CX - 130, 86, CX - 142, 206);
    ctx.fill();

    // Inner under-bob shadow behind neck
    const underBob = ctx.createLinearGradient(CX, 390, CX, 476);
    underBob.addColorStop(0, hexToRgba(deepDark, 0.8));
    underBob.addColorStop(1, hexToRgba(deepDark, 0.25));
    ctx.fillStyle = underBob;
    ctx.fillRect(CX - 95, 390, 190, 90);

    // Subtle beveled inward bob strands & feathered tips
    drawStrandTexture(ctx, 74, 1500, hairBase, hairHighlight, hairShadow, (i, r1, r2) => {
      const side = i % 2 === 0 ? -1 : 1;
      const xTop = side * (92 + r1 * 44);
      const xBot = side * (76 + r1 * 50);
      return [
        CX + xTop,
        152 + r2 * 35,
        CX + xTop + side * 18,
        290,
        CX + xBot + side * 14,
        400,
        CX + xBot - side * 14,
        462 - r2 * 6,
      ];
    });
  } else if (style === 'quick_weave') {
    // Voluminous salon-feathered layers curving gracefully onto shoulders
    ctx.beginPath();
    ctx.moveTo(CX - 150, 212);
    ctx.bezierCurveTo(CX - 196, 310, CX - 192, 445, CX - 146, 558);
    ctx.bezierCurveTo(CX - 122, 594, CX - 92, 612, CX - 78, 622);
    ctx.lineTo(CX + 78, 622);
    ctx.bezierCurveTo(CX + 92, 612, CX + 122, 594, CX + 146, 558);
    ctx.bezierCurveTo(CX + 192, 445, CX + 196, 310, CX + 150, 212);
    ctx.bezierCurveTo(CX + 138, 86, CX - 138, 86, CX - 150, 212);
    ctx.fill();

    // Layered curl-in blowout ridges
    for (const side of [-1, 1]) {
      for (const tierY of [385, 465, 545]) {
        ctx.strokeStyle = hexToRgba(deepDark, 0.36);
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(CX + side * 165, tierY - 75);
        ctx.quadraticCurveTo(CX + side * 172, tierY, CX + side * 116, tierY + 34);
        ctx.stroke();
      }
    }

    drawStrandTexture(ctx, 96, 1600, hairBase, hairHighlight, hairShadow, (i, r1, r2) => {
      const side = i % 2 === 0 ? -1 : 1;
      const layerDrop = 375 + r2 * 220;
      const flare = 128 + r1 * 50;
      return [
        CX + side * (95 + r1 * 36),
        165 + r2 * 40,
        CX + side * (flare + 24),
        290,
        CX + side * (flare + 12),
        layerDrop - 75,
        CX + side * (flare - 30),
        layerDrop,
      ];
    });
  } else if (style === 'braids') {
    drawBraidedLayout(4, 12.5, 102, 14, false, 608, false);
  } else if (style === 'large_knotless') {
    drawBraidedLayout(3, 18.5, 104, 21, false, 612, true);
  } else if (style === 'smedium_knotless') {
    drawBraidedLayout(6, 9, 98, 10.5, false, 610, true);
  } else if (style === 'jada_wada') {
    // High sculpted crown bun + boho braids with curly ends + curved metallic gold cuffs
    drawSculptedBun(ctx, CX, 70, 50, 38, hairBase, hairHighlight, hairShadow, false);
    drawBraidedLayout(4, 11.5, 102, 14, true, 565, true);

    for (const side of [-1, 1]) {
      for (const [bx, by] of [
        [CX + side * 116, 336],
        [CX + side * 130, 424],
      ]) {
        const cg = ctx.createLinearGradient(bx - 6, by, bx + 6, by);
        cg.addColorStop(0, '#8A6412');
        cg.addColorStop(0.38, '#FCE796');
        cg.addColorStop(0.7, '#D4A838');
        cg.addColorStop(1, '#75530D');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.roundRect(bx - 6.5, by, 13, 6.5, 2.5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,250,220,0.5)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }
  } else if (style === 'fishnet_braids') {
    drawBraidedLayout(5, 10.5, 100, 12.5, false, 608, true);
  } else if (style === 'fulani_flip') {
    // Voluminous wavy/curled flip-over body + accent braided side with metallic cuffs
    drawWavySilhouette();
    for (let col = 0; col < 2; col++) {
      const bx = CX - 108 - col * 15;
      drawWovenBraid(ctx, bx, 195, bx - 16, 385, bx + 6, 602, 10.5, hairBase, hairHighlight, hairShadow, false, true);
      const cy = 356 + col * 58;
      const cg = ctx.createLinearGradient(bx - 7, cy, bx + 7, cy);
      cg.addColorStop(0, '#8A6412');
      cg.addColorStop(0.4, '#FCE796');
      cg.addColorStop(1, '#7A570E');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.roundRect(bx - 6.5, cy, 13, 6.5, 2.5);
      ctx.fill();
    }
  } else if (style === 'messy_bun') {
    ctx.beginPath();
    ctx.ellipse(CX, 168, 118, 74, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    drawSculptedBun(ctx, CX, 74, 62, 46, hairBase, hairHighlight, hairShadow, true);
  } else if (style === 'large_bun') {
    ctx.beginPath();
    ctx.ellipse(CX, 168, 118, 74, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    drawSculptedBun(ctx, CX, 66, 76, 56, hairBase, hairHighlight, hairShadow, false);
  } else if (style === 'low_bun') {
    ctx.beginPath();
    ctx.ellipse(CX, 184, 122, 86, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // Side-swept bun silhouette tucked cleanly behind lower neck/ears
    drawSculptedBun(ctx, CX, 434, 88, 48, hairBase, hairHighlight, hairShadow, false);
  } else if (style === 'ballerina_bun' || style === 'updo') {
    ctx.beginPath();
    ctx.ellipse(CX, 168, 118, 74, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    drawSculptedBun(ctx, CX, 74, 54, 42, hairBase, hairHighlight, hairShadow, false);
  } else if (style === 'half_up_half_down') {
    drawWavySilhouette();
    drawSculptedBun(ctx, CX, 70, 56, 42, hairBase, hairHighlight, hairShadow, false);
  } else if (style === 'fluffy_ponytail') {
    ctx.beginPath();
    ctx.ellipse(CX, 168, 118, 74, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Hair-wrapped ponytail cuff (looks like wrapped hair strands, not a black oval)
    const cuffGrad = ctx.createLinearGradient(CX - 2, 76, CX + 38, 96);
    cuffGrad.addColorStop(0, deepDark);
    cuffGrad.addColorStop(0.5, hairBase);
    cuffGrad.addColorStop(1, deepDark);
    ctx.fillStyle = cuffGrad;
    ctx.beginPath();
    ctx.ellipse(CX + 18, 86, 22, 11, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(brightSheen, 0.35);
    ctx.lineWidth = 1.2;
    for (let w = -2; w <= 2; w++) {
      ctx.beginPath();
      ctx.arc(CX + 18 + w * 4, 86 + w * 1.5, 9, -0.5, 1.4);
      ctx.stroke();
    }

    // Swooping feathered under-plume for ponytail body
    ctx.fillStyle = deepDark;
    ctx.beginPath();
    ctx.moveTo(CX + 16, 78);
    ctx.bezierCurveTo(CX + 112, 62, CX + 172, 152, CX + 178, 290);
    ctx.bezierCurveTo(CX + 184, 390, CX + 166, 466, CX + 136, 494);
    ctx.bezierCurveTo(CX + 114, 424, CX + 106, 260, CX + 28, 92);
    ctx.closePath();
    ctx.fill();

    // Textured coily curl tufts + tapered spiral curls fanning gracefully
    const puffSpots = [
      { x: CX + 34, y: 68, r: 34, c: hairHighlight },
      { x: CX + 72, y: 92, r: 38, c: hairBase },
      { x: CX + 106, y: 136, r: 42, c: hairShadow },
      { x: CX + 130, y: 192, r: 44, c: hairBase },
      { x: CX + 144, y: 256, r: 46, c: hairShadow },
      { x: CX + 148, y: 322, r: 44, c: hairBase },
      { x: CX + 144, y: 388, r: 40, c: hairShadow },
      { x: CX + 134, y: 446, r: 32, c: hairBase },
    ];
    puffSpots.forEach((pt, idx) => {
      drawCurlCluster(ctx, pt.x, pt.y, pt.r, pt.c, brightSheen, hairShadow, 1700 + idx);
    });
  } else if (style === 'sleek' || style === 'straight' || style === 'middle_part') {
    drawStraightSilhouette(134, 134);
  } else if (style === 'side_part') {
    drawStraightSilhouette(138, 142);
  } else {
    drawWavySilhouette();
  }
  ctx.restore();
}

function drawHairFront(ctx: CanvasRenderingContext2D, model: ModelProfile) {
  const { hairBase, hairHighlight, hairShadow } = model.palette;
  const style = model.hairStyle;
  const f = getModelFeatures(model);
  const fy = f.foreheadY;
  const cw = f.cheekWidth;
  const nw = f.neckWidth;
  const wScale = cw / 114;
  const deepDark = mixHex(hairShadow, '#070403', 0.48);
  const brightSheen = mixHex(hairHighlight, '#FFF6EE', 0.18);
  const scalpSkin = mixHex(model.palette.base, model.palette.highlight, 0.3);

  ctx.save();
  const crownGrad = ctx.createLinearGradient(CX, 90, CX, 230);
  crownGrad.addColorStop(0, hairHighlight);
  crownGrad.addColorStop(0.55, hairBase);
  crownGrad.addColorStop(1, deepDark);
  ctx.fillStyle = crownGrad;

  if (
    style === 'braids' ||
    style === 'large_knotless' ||
    style === 'smedium_knotless' ||
    style === 'jada_wada'
  ) {
    ctx.beginPath();
    ctx.moveTo(CX, fy - 2);
    ctx.bezierCurveTo(CX + 46 * wScale, fy, CX + cw * 0.9, fy + 28, CX + cw + 2, 226);
    ctx.bezierCurveTo(CX + cw + 10, 175, CX + 105 * wScale, 112, CX, 102);
    ctx.bezierCurveTo(CX - 105 * wScale, 112, CX - cw - 10, 175, CX - cw - 2, 226);
    ctx.bezierCurveTo(CX - cw * 0.9, fy + 28, CX - 46 * wScale, fy, CX, fy - 2);
    ctx.fill();

    const partOffsets =
      style === 'large_knotless'
        ? [0, -48, 48]
        : style === 'smedium_knotless'
        ? [0, -24, 24, -48, 48, -72, 72]
        : [0, -34, 34, -66, 66];
    for (const dx of partOffsets) {
      drawScalpPart(
        ctx,
        CX + dx * 0.72 * wScale,
        104 + Math.abs(dx) * 0.25,
        CX + dx * wScale,
        fy - 2 + Math.abs(dx) * 0.42,
        scalpSkin,
        deepDark,
        style === 'large_knotless' ? 2.1 : 1.4
      );
    }

    drawStrandTexture(ctx, 38, 2000, hairBase, hairHighlight, hairShadow, (i, r1, r2) => {
      const side = i % 2 === 0 ? -1 : 1;
      const sx = side * (16 + r1 * 86) * wScale;
      return [
        CX + sx * 0.8,
        118 + r1 * 24,
        CX + sx * 0.92,
        138 + r1 * 26,
        CX + sx * 1.05,
        165 + r2 * 28,
        CX + sx * 1.12,
        205 + r2 * 20,
      ];
    });
    drawHairlineFeather(ctx, hairBase, hairShadow, f);
    drawBabyHairs(ctx, hairBase, hairShadow, f);

    // 2 foreground braids draping naturally over the outer shoulders (outside all face makeup zones!)
    const frontBraidW = style === 'large_knotless' ? 14.5 : style === 'smedium_knotless' ? 8.8 : 10.8;
    for (const side of [-1, 1]) {
      drawWovenBraid(
        ctx,
        CX + side * (cw + 12),
        236,
        CX + side * (cw + 22),
        420,
        CX + side * (nw + 66),
        style === 'jada_wada' ? 540 : 596,
        frontBraidW,
        hairBase,
        hairHighlight,
        hairShadow,
        style === 'jada_wada',
        style !== 'braids'
      );
    }
  } else if (style === 'fishnet_braids') {
    ctx.beginPath();
    ctx.moveTo(CX, fy - 2);
    ctx.bezierCurveTo(CX + 50 * wScale, fy, CX + cw * 0.92, fy + 30, CX + cw + 2, 224);
    ctx.bezierCurveTo(CX + cw + 10, 172, CX + 104 * wScale, 108, CX, 98);
    ctx.bezierCurveTo(CX - 104 * wScale, 108, CX - cw - 10, 172, CX - cw - 2, 224);
    ctx.bezierCurveTo(CX - cw * 0.92, fy + 30, CX - 50 * wScale, fy, CX, fy - 2);
    ctx.fill();

    // Diamond skin lattice parts underneath + raised 3D braided cornrow ridges over lattice
    for (let dx = -72; dx <= 72; dx += 24) {
      drawScalpPart(ctx, CX + dx, 102, CX + dx + 26, fy + 4, scalpSkin, deepDark, 1.45);
      drawScalpPart(ctx, CX + dx + 26, 102, CX + dx, fy + 4, scalpSkin, deepDark, 1.45);
    }
    for (let dx = -60; dx <= 60; dx += 24) {
      drawWovenBraid(ctx, CX + dx, 104, CX + dx + 13, (104 + fy + 6) * 0.5, CX + dx + 26, fy + 6, 5.2, hairBase, hairHighlight, hairShadow, false, true);
      drawWovenBraid(ctx, CX + dx + 26, 104, CX + dx + 13, (104 + fy + 6) * 0.5, CX + dx, fy + 6, 5.2, hairBase, hairHighlight, hairShadow, false, true);
    }
    drawHairlineFeather(ctx, hairBase, hairShadow, f);
    drawBabyHairs(ctx, hairBase, hairShadow, f);

    for (const side of [-1, 1]) {
      drawWovenBraid(
        ctx,
        CX + side * (cw + 12),
        236,
        CX + side * (cw + 20),
        420,
        CX + side * (nw + 62),
        594,
        10,
        hairBase,
        hairHighlight,
        hairShadow,
        false,
        true
      );
    }
  } else if (style === 'fulani_flip') {
    // Deep asymmetrical flip-over swoop across the right side + stitched feed-in cornrows on left
    ctx.beginPath();
    ctx.moveTo(CX - 55 * wScale, fy - 6);
    ctx.bezierCurveTo(CX + 20 * wScale, fy - 18, CX + cw * 0.88, fy + 2, CX + cw + 10, 246);
    ctx.bezierCurveTo(CX + cw + 20, 170, CX + 106 * wScale, 94, CX - 12, 92);
    ctx.bezierCurveTo(CX - 98 * wScale, 98, CX - cw - 12, 166, CX - cw - 2, 226);
    ctx.bezierCurveTo(CX - cw * 0.92, fy + 32, CX - 78 * wScale, fy + 2, CX - 55 * wScale, fy - 6);
    ctx.fill();

    // Raised 3D stitched cornrows + scalp parts on left crown
    for (let i = 0; i < 4; i++) {
      const px0 = CX - 46 - i * 14;
      const py0 = 104 + i * 6;
      const pcx = CX - 76 - i * 10;
      const pcy = 136;
      const px1 = CX - cw + 6;
      const py1 = 176 + i * 10;
      drawScalpPart(ctx, px0, py0 - 3, px1, py1 - 3, scalpSkin, deepDark, 1.5);
      drawWovenBraid(ctx, px0, py0, pcx, pcy, px1, py1, 6.2, hairBase, hairHighlight, hairShadow, false, true);
    }

    // Sweeping glossy flip-over strands across right brow/temple
    drawStrandTexture(ctx, 34, 2100, hairBase, hairHighlight, hairShadow, (i, r1) => {
      const yOff = i * 1.1;
      return [
        CX - 34 + r1 * 18,
        112 + yOff * 0.4,
        CX + 26,
        106 + yOff * 0.5,
        CX + cw * 0.86,
        134 + yOff * 0.8,
        CX + cw + 8,
        228 + r1 * 24,
      ];
    });
    drawHairlineFeather(ctx, hairBase, hairShadow, f, CX - 48 * wScale);
    drawBabyHairs(ctx, hairBase, hairShadow, f);

    // Front-draping wavy right lock + left shoulder accent braid
    drawShoulderDrapeLock(
      ctx,
      CX + cw + 8,
      244,
      CX + cw + 28,
      365,
      CX + nw + 88,
      485,
      CX + nw + 70,
      598,
      26,
      hairBase,
      hairHighlight,
      hairShadow,
      3100,
      true
    );
    drawWovenBraid(
      ctx,
      CX - cw - 8,
      238,
      CX - cw - 18,
      410,
      CX - nw - 66,
      588,
      10,
      hairBase,
      hairHighlight,
      hairShadow,
      false,
      true
    );
  } else if (style === 'afro') {
    ctx.beginPath();
    ctx.moveTo(CX - cw * 0.92, 198);
    ctx.bezierCurveTo(CX - 86 * wScale, fy + 2, CX + 86 * wScale, fy + 2, CX + cw * 0.92, 198);
    ctx.bezierCurveTo(CX + cw + 11, 145, CX + 95 * wScale, 92, CX, 88);
    ctx.bezierCurveTo(CX - 95 * wScale, 92, CX - cw - 11, 145, CX - cw * 0.92, 198);
    ctx.fill();

    for (let i = 0; i < 24; i++) {
      const t = i / 23;
      const hx = CX - 96 * wScale + t * 192 * wScale;
      const hy = fy + 2 + Math.pow((t - 0.5) * 2, 2) * 44;
      drawCurlCluster(ctx, hx, hy, 12 + hash01(2200 + i) * 5.5, hairBase, brightSheen, hairShadow, 2240 + i);
    }
    drawHairlineFeather(ctx, hairBase, hairShadow, f);
  } else if (style === 'messy_bun') {
    ctx.beginPath();
    ctx.moveTo(CX, fy - 2);
    ctx.bezierCurveTo(CX + 56 * wScale, fy, CX + cw * 0.88, fy + 34, CX + cw - 4, 232);
    ctx.bezierCurveTo(CX + cw, 172, CX + 96 * wScale, 102, CX, 96);
    ctx.bezierCurveTo(CX - 96 * wScale, 102, CX - cw, 172, CX - cw + 4, 232);
    ctx.bezierCurveTo(CX - cw * 0.88, fy + 34, CX - 56 * wScale, fy, CX, fy - 2);
    ctx.fill();

    drawStrandTexture(ctx, 40, 2300, hairBase, hairHighlight, hairShadow, (i, r1) => {
      const xStart = CX - 90 * wScale + r1 * 180 * wScale;
      return [xStart, fy + 12, xStart * 0.7 + CX * 0.3, fy - 10, CX + (xStart - CX) * 0.35, 108, CX, 96];
    });
    drawHairlineFeather(ctx, hairBase, hairShadow, f);

    // Feathered multi-strand wavy face-framing tendrils (natural tapered wisps, not thick tubes)
    for (const side of [-1, 1]) {
      for (let t = 0; t < 4; t++) {
        const dx = t * 1.4;
        ctx.strokeStyle =
          t === 2 ? hexToRgba(brightSheen, 0.44) : t === 0 ? hexToRgba(deepDark, 0.65) : hexToRgba(hairBase, 0.84);
        ctx.lineWidth = t === 2 ? 0.9 : 1.5 - t * 0.22;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(CX + side * (86 * wScale + dx), 162);
        ctx.bezierCurveTo(
          CX + side * (cw + 4 + dx),
          216,
          CX + side * (cw - 8 + dx * 0.5),
          282,
          CX + side * (cw + 2 + dx),
          346 - t * 8
        );
        ctx.stroke();
      }
    }
    drawBabyHairs(ctx, hairBase, hairShadow, f, true);
  } else if (
    style === 'updo' ||
    style === 'large_bun' ||
    style === 'low_bun' ||
    style === 'ballerina_bun' ||
    style === 'half_up_half_down' ||
    style === 'fluffy_ponytail'
  ) {
    ctx.beginPath();
    ctx.moveTo(CX, fy - 2);
    ctx.bezierCurveTo(CX + 56 * wScale, fy, CX + cw * 0.88, fy + 34, CX + cw - 4, 232);
    ctx.bezierCurveTo(CX + cw, 172, CX + 96 * wScale, 102, CX, 96);
    ctx.bezierCurveTo(CX - 96 * wScale, 102, CX - cw, 172, CX - cw + 4, 232);
    ctx.bezierCurveTo(CX - cw * 0.88, fy + 34, CX - 56 * wScale, fy, CX, fy - 2);
    ctx.fill();

    // Sleek pulled-back brushed tension strands
    drawStrandTexture(ctx, 44, 2400, hairBase, hairHighlight, hairShadow, (i, r1) => {
      const xStart = CX - 98 * wScale + r1 * 196 * wScale;
      return [xStart, fy + 18, CX + (xStart - CX) * 0.72, fy - 8, CX + (xStart - CX) * 0.4, 110, CX, 98];
    });

    if (style === 'low_bun') {
      drawScalpPart(ctx, CX, 97, CX, fy - 2, scalpSkin, deepDark, 1.8);
    }
    drawHairlineFeather(ctx, hairBase, hairShadow, f);
    drawBabyHairs(ctx, hairBase, hairShadow, f);

    if (style === 'half_up_half_down') {
      for (const side of [-1, 1]) {
        drawShoulderDrapeLock(
          ctx,
          CX + side * (cw + 10),
          255,
          CX + side * (cw + 28),
          375,
          CX + side * (nw + 86),
          495,
          CX + side * (nw + 68),
          604,
          24,
          hairBase,
          hairHighlight,
          hairShadow,
          3200 + side,
          true
        );
      }
    }
  } else if (style === 'side_part' || style === 'quick_weave') {
    const partX = CX - 44 * wScale;
    ctx.beginPath();
    ctx.moveTo(partX, fy - 6);
    ctx.bezierCurveTo(CX + 26 * wScale, fy - 2, CX + cw * 0.86, fy + 28, CX + cw + 10, 254);
    ctx.bezierCurveTo(CX + cw + 22, 178, CX + 114 * wScale, 96, CX - 8, 94);
    ctx.bezierCurveTo(CX - 112 * wScale, 100, CX - cw - 20, 182, CX - cw - 6, 256);
    ctx.bezierCurveTo(CX - cw * 0.92, fy + 44, CX - 78 * wScale, fy + 4, partX, fy - 6);
    ctx.fill();

    drawScalpPart(ctx, CX - 42 * wScale, 99, partX, fy - 6, scalpSkin, deepDark, 2.0);

    // Sweeping front strands from the side part
    drawStrandTexture(ctx, 42, 2500, hairBase, hairHighlight, hairShadow, (i, r1) => {
      const toRight = i % 3 !== 0;
      if (toRight) {
        return [
          CX - 42 * wScale,
          104 + r1 * 20,
          CX + 22 * wScale,
          110 + r1 * 18,
          CX + 86 * wScale,
          136 + r1 * 28,
          CX + cw + 8,
          220 + r1 * 38,
        ];
      }
      return [
        CX - 46 * wScale,
        104 + r1 * 20,
        CX - 82 * wScale,
        120 + r1 * 18,
        CX - 110 * wScale,
        156 + r1 * 24,
        CX - cw - 6,
        228 + r1 * 32,
      ];
    });
    drawHairlineFeather(ctx, hairBase, hairShadow, f, partX);

    // Natural front shoulder-draping hair ribbons (heavier on swept right side)
    drawShoulderDrapeLock(
      ctx,
      CX + cw + 9,
      250,
      CX + cw + 28,
      370,
      CX + nw + 88,
      490,
      CX + nw + 68,
      606,
      style === 'quick_weave' ? 28 : 24,
      hairBase,
      hairHighlight,
      hairShadow,
      3300,
      style === 'quick_weave'
    );
    drawShoulderDrapeLock(
      ctx,
      CX - cw - 8,
      252,
      CX - cw - 24,
      370,
      CX - nw - 80,
      485,
      CX - nw - 64,
      598,
      18,
      hairBase,
      hairHighlight,
      hairShadow,
      3320,
      style === 'quick_weave'
    );
  } else if (style === 'curls') {
    ctx.beginPath();
    ctx.moveTo(CX - 4, fy - 2);
    ctx.bezierCurveTo(CX + 58 * wScale, fy + 1, CX + cw * 0.98, fy + 46, CX + cw + 10, 260);
    ctx.bezierCurveTo(CX + cw + 26, 180, CX + 118 * wScale, 96, CX, 92);
    ctx.bezierCurveTo(CX - 118 * wScale, 96, CX - cw - 26, 180, CX - cw - 10, 260);
    ctx.bezierCurveTo(CX - cw * 0.98, fy + 46, CX - 58 * wScale, fy + 1, CX - 4, fy - 2);
    ctx.fill();

    for (const side of [-1, 1]) {
      drawCurlCluster(ctx, CX + side * (cw - 12), 156, 21, hairBase, brightSheen, hairShadow, 2600 + side);
      drawCurlCluster(ctx, CX + side * (cw + 4), 204, 24, hairShadow, brightSheen, hairShadow, 2620 + side);
      drawShoulderDrapeLock(
        ctx,
        CX + side * (cw + 8),
        252,
        CX + side * (cw + 30),
        375,
        CX + side * (nw + 92),
        495,
        CX + side * (nw + 72),
        594,
        24,
        hairBase,
        hairHighlight,
        hairShadow,
        3400 + side,
        true
      );
    }
    drawHairlineFeather(ctx, hairBase, hairShadow, f);
  } else {
    ctx.beginPath();
    ctx.moveTo(CX - 4, fy - 2);
    ctx.bezierCurveTo(CX + 58 * wScale, fy + 1, CX + cw * 0.96, fy + 44, CX + cw + 8, 260);
    ctx.bezierCurveTo(CX + cw + 21, 182, CX + 115 * wScale, 100, CX, 96);
    ctx.bezierCurveTo(CX - 115 * wScale, 100, CX - cw - 21, 182, CX - cw - 8, 260);
    ctx.bezierCurveTo(CX - cw * 0.96, fy + 44, CX - 58 * wScale, fy + 1, CX - 4, fy - 2);
    ctx.fill();

    // Smooth glossy center-parted front strands
    drawStrandTexture(ctx, 48, 2700, hairBase, hairHighlight, hairShadow, (i, r1) => {
      const side = i % 2 === 0 ? -1 : 1;
      const yOff = r1 * 28;
      return [
        CX + side * 6,
        100 + yOff * 0.8,
        CX + side * 48 * wScale,
        108 + yOff,
        CX + side * 98 * wScale,
        142 + yOff,
        CX + side * (cw + 6),
        228 + r1 * 34,
      ];
    });

    if (style === 'middle_part' || style === 'straight' || style === 'sleek' || style === 'waves') {
      drawScalpPart(
        ctx,
        CX,
        97,
        CX,
        fy - 1,
        scalpSkin,
        deepDark,
        style === 'middle_part' ? 2.1 : 1.5
      );
    }
    drawHairlineFeather(ctx, hairBase, hairShadow, f);

    // Front shoulder-draping locks for long styles (bob stops cleanly at jawline!)
    if (style !== 'bob') {
      for (const side of [-1, 1]) {
        drawShoulderDrapeLock(
          ctx,
          CX + side * (cw + 7),
          254,
          CX + side * (cw + 22),
          375,
          CX + side * (nw + 84),
          495,
          CX + side * (nw + 66),
          608,
          22,
          hairBase,
          hairHighlight,
          hairShadow,
          3500 + side,
          style === 'waves'
        );
      }
    }
  }

  // Soft curved studio crown sheen (follows cranial highlight rather than rigid straight strokes)
  if (style !== 'afro') {
    const crownGloss = ctx.createRadialGradient(CX, 126, 12, CX, 146, 110);
    crownGloss.addColorStop(0, hexToRgba(brightSheen, 0.22));
    crownGloss.addColorStop(0.55, hexToRgba(brightSheen, 0.1));
    crownGloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = crownGloss;
    ctx.beginPath();
    ctx.ellipse(CX, 134, 96 * wScale, 32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function compositeMaskedLayer(
  targetCtx: CanvasRenderingContext2D,
  scratchCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement | undefined,
  drawPigment: (sCtx: CanvasRenderingContext2D) => void,
  compositeOp: GlobalCompositeOperation = 'source-over'
) {
  if (!maskCanvas) return;
  const sCtx = scratchCanvas.getContext('2d');
  if (!sCtx) return;

  sCtx.save();
  sCtx.globalCompositeOperation = 'source-over';
  sCtx.clearRect(0, 0, PORTRAIT_W, PORTRAIT_H);
  drawPigment(sCtx);
  sCtx.globalCompositeOperation = 'destination-in';
  sCtx.drawImage(maskCanvas, 0, 0);
  sCtx.restore();

  targetCtx.save();
  targetCtx.globalCompositeOperation = compositeOp;
  targetCtx.drawImage(scratchCanvas, 0, 0);
  targetCtx.restore();
}

function drawTargetZoneHint(
  ctx: CanvasRenderingContext2D,
  zone: MakeupZoneId,
  model: ModelProfile
) {
  const f = getModelFeatures(model);
  ctx.save();
  ctx.strokeStyle = 'rgba(157, 23, 77, 0.45)';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.5;

  if (zone === 'foundation') {
    drawFacePath(ctx, model);
    ctx.stroke();
  } else if (zone === 'concealer') {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(CX + side * f.eyeDx, f.eyeY + 25, 36, 17, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (zone === 'contour') {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(CX + side * (f.cheekWidth - 26), f.cheekY + 76);
      ctx.rotate(side * -0.45);
      ctx.beginPath();
      ctx.ellipse(0, 0, 44, 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (zone === 'blush') {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(CX + side * (f.cheekWidth - 38), f.cheekY + 58);
      ctx.rotate(side * -0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (zone === 'highlighter') {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(CX + side * (f.cheekWidth - 36), f.cheekY + 40);
      ctx.rotate(side * -0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(CX, f.noseTipY - 12, 8, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (zone === 'eyebrows') {
    for (const side of [-1, 1]) {
      const midX = (f.browInnerX + f.browTailX) * 0.5;
      ctx.beginPath();
      ctx.ellipse(CX + side * midX, f.browY - 2, (f.browTailX - f.browInnerX) * 0.52, 12, side * -0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (
    zone === 'eyeshadow_lid' ||
    zone === 'eyeshadow_crease' ||
    zone === 'eyeliner' ||
    zone === 'mascara'
  ) {
    const dy = zone === 'eyeshadow_crease' ? -12 : zone === 'eyeliner' ? -2 : -4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(CX + side * f.eyeDx, f.eyeY + dy, 34, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (zone === 'lipliner' || zone === 'lipstick' || zone === 'lipgloss') {
    ctx.beginPath();
    ctx.ellipse(CX, f.mouthY + 2, f.lipWidth + 4, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function evalCubic1D(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

export function drawModelPortrait(
  ctx: CanvasRenderingContext2D,
  scratchCanvas: HTMLCanvasElement,
  model: ModelProfile,
  makeup: AppliedMakeupState,
  zoneMasks: Partial<Record<MakeupZoneId, HTMLCanvasElement>>,
  activeZoneHighlight?: MakeupZoneId
) {
  const p = model.palette;
  const f = getModelFeatures(model);
  const warmSubsurface = mixHex(p.base, p.undertone, 0.48);

  const fy = f.foreheadY;
  const cw = f.cheekWidth;
  const cy = f.cheekY;
  const jw = f.jawWidth;
  const chY = f.chinY;
  const nw = f.neckWidth;
  const eyeY = f.eyeY;
  const eyeDx = f.eyeDx;
  const browY = f.browY;
  const noseTipY = f.noseTipY;
  const mouthY = f.mouthY;

  // 1. Editorial Studio Backdrop with Soft Key-Light Halo
  const bg = ctx.createRadialGradient(CX, 250, 30, CX, 310, 440);
  bg.addColorStop(0, '#FEFCFA');
  bg.addColorStop(0.55, '#F4EEE7');
  bg.addColorStop(1, '#E2D8CD');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, PORTRAIT_W, PORTRAIT_H);

  // 2. Back Hair
  drawHairBack(ctx, model);

  // 3. Anatomically Modeled Neck, Collarbones & Draped Studio Top
  ctx.save();
  const neckGrad = ctx.createLinearGradient(CX - 85, 415, CX + 95, 635);
  neckGrad.addColorStop(0, p.shadow);
  neckGrad.addColorStop(0.28, p.midtone);
  neckGrad.addColorStop(0.58, p.base);
  neckGrad.addColorStop(0.82, p.midtone);
  neckGrad.addColorStop(1, p.shadow);
  ctx.fillStyle = neckGrad;

  ctx.beginPath();
  ctx.moveTo(CX - nw - 2, 405);
  ctx.lineTo(CX - nw, 474);
  ctx.bezierCurveTo(CX - nw - 25, 510, CX - 172, 524, CX - 224, 562);
  ctx.lineTo(CX - 224, PORTRAIT_H);
  ctx.lineTo(CX + 224, PORTRAIT_H);
  ctx.lineTo(CX + 224, 562);
  ctx.bezierCurveTo(CX + 172, 524, CX + nw + 25, 510, CX + nw, 474);
  ctx.lineTo(CX + nw + 2, 405);
  ctx.closePath();
  ctx.fill();

  // Jawline occlusion shadow cast onto upper neck
  const chinShadow = ctx.createRadialGradient(CX, chY - 2, 12, CX, chY + 14, 74);
  chinShadow.addColorStop(0, hexToRgba(p.deepShadow, 0.65));
  chinShadow.addColorStop(0.55, hexToRgba(p.shadow, 0.34));
  chinShadow.addColorStop(1, hexToRgba(p.deepShadow, 0));
  ctx.fillStyle = chinShadow;
  ctx.beginPath();
  ctx.ellipse(CX, chY + 10, nw + 20, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sternocleidomastoid neck tendon shading & suprasternal notch hollow
  for (const side of [-1, 1]) {
    ctx.strokeStyle = hexToRgba(p.shadow, 0.28);
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CX + side * (nw - 5), 446);
    ctx.quadraticCurveTo(CX + side * (nw * 0.58), 495, CX + side * 12, 540);
    ctx.stroke();

    // Soft shoulder specular highlight
    const shGlow = ctx.createRadialGradient(CX + side * 126, 542, 4, CX + side * 126, 542, 56);
    shGlow.addColorStop(0, hexToRgba(p.highlight, 0.42));
    shGlow.addColorStop(1, hexToRgba(p.highlight, 0));
    ctx.fillStyle = shGlow;
    ctx.fillRect(CX + side * 70 - 50, 505, 110, 75);

    // Modeled collarbone: soft upper highlight ridge + subtle hollow beneath
    ctx.strokeStyle = hexToRgba(p.shadow, 0.32);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(CX + side * 24, 544);
    ctx.quadraticCurveTo(CX + side * 88, 536, CX + side * 148, 550);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(p.highlight, 0.62);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(CX + side * 26, 540);
    ctx.quadraticCurveTo(CX + side * 88, 532, CX + side * 148, 546);
    ctx.stroke();
  }

  const notchShadow = ctx.createRadialGradient(CX, 544, 2, CX, 544, 18);
  notchShadow.addColorStop(0, hexToRgba(p.deepShadow, 0.35));
  notchShadow.addColorStop(1, hexToRgba(p.deepShadow, 0));
  ctx.fillStyle = notchShadow;
  ctx.beginPath();
  ctx.ellipse(CX, 544, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft studio draped neckline top
  const topGrad = ctx.createLinearGradient(CX, 574, CX, PORTRAIT_H);
  topGrad.addColorStop(0, '#2E2725');
  topGrad.addColorStop(0.5, '#1F1A19');
  topGrad.addColorStop(1, '#141110');
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.moveTo(CX - 160, PORTRAIT_H);
  ctx.lineTo(CX - 142, 576);
  ctx.bezierCurveTo(CX - 70, 616, CX + 70, 616, CX + 142, 576);
  ctx.lineTo(CX + 160, PORTRAIT_H);
  ctx.closePath();
  ctx.fill();

  // Subtle fabric rib highlight along neckline edge
  ctx.strokeStyle = 'rgba(255, 248, 240, 0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX - 140, 577);
  ctx.bezierCurveTo(CX - 70, 617, CX + 70, 617, CX + 140, 577);
  ctx.stroke();
  ctx.restore();

  // 4. Anatomically Detailed Ears + Minimalist Pearl/Gold Studs
  for (const side of [-1, 1]) {
    const earX = CX + side * (cw - 1);
    const earY = f.earY;
    ctx.save();
    const earGrad = ctx.createRadialGradient(earX + side * 3, earY - 4, 2, earX, earY, 24);
    earGrad.addColorStop(0, p.base);
    earGrad.addColorStop(0.7, p.midtone);
    earGrad.addColorStop(1, p.shadow);
    ctx.fillStyle = earGrad;
    ctx.beginPath();
    ctx.ellipse(earX, earY, 13, 27, side * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Inner concha hollow & antihelix ridge
    ctx.fillStyle = hexToRgba(p.deepShadow, 0.45);
    ctx.beginPath();
    ctx.ellipse(earX - side * 1.5, earY + 2, 5.5, 14, side * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(p.highlight, 0.42);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(earX + side * 1, earY - 2, 9, side > 0 ? -1.1 : Math.PI - 1.1, side > 0 ? 1.1 : Math.PI + 1.1);
    ctx.stroke();

    // Delicate gold/pearl ear stud
    const studGrad = ctx.createRadialGradient(earX + side * 2 - 1, earY + 19, 0.5, earX + side * 2, earY + 20, 3.8);
    studGrad.addColorStop(0, '#FFFDF7');
    studGrad.addColorStop(0.55, '#F2D785');
    studGrad.addColorStop(1, '#9E7928');
    ctx.fillStyle = studGrad;
    ctx.beginPath();
    ctx.arc(earX + side * 2, earY + 20, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Face Base & Multi-Plane 3D Skin Shading (clipped to face)
  ctx.save();
  drawFacePath(ctx, model);
  ctx.clip();

  // Base 3D studio key-light gradient (off-center slightly high for natural portrait modeling)
  const skinGrad = ctx.createRadialGradient(CX - 8, cy - 3, 22, CX, cy + 28, 192);
  skinGrad.addColorStop(0, p.highlight);
  skinGrad.addColorStop(0.46, p.base);
  skinGrad.addColorStop(0.84, p.midtone);
  skinGrad.addColorStop(1, p.shadow);
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 115, PORTRAIT_W, 365);

  // Foundation (cursor-painted)
  const fnd = makeup.foundation;
  if (fnd) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.foundation, (sCtx) => {
      sCtx.fillStyle = hexToRgba(fnd.hex, fnd.opacity * 0.78);
      sCtx.fillRect(0, 115, PORTRAIT_W, 365);
    });
  }

  // Natural facial sculpting planes (temples, cheekbones, under-cheek hollows, jaw & forehead)
  const cheekSculptAlpha = f.jawCurve === 'angular' || f.jawCurve === 'diamond' ? 0.32 : 0.2;
  for (const side of [-1, 1]) {
    // Temple & lateral forehead depth
    const templeShadow = ctx.createRadialGradient(CX + side * (cw - 8), fy + 78, 5, CX + side * (cw - 8), fy + 84, 66);
    templeShadow.addColorStop(0, hexToRgba(p.shadow, 0.42));
    templeShadow.addColorStop(1, hexToRgba(p.shadow, 0));
    ctx.fillStyle = templeShadow;
    ctx.fillRect(CX - 150, 120, 300, 200);

    // Subtle cheekbone highlight dome
    const cheekBone = ctx.createRadialGradient(CX + side * (cw - 44), cy + 40, 3, CX + side * (cw - 44), cy + 40, 42);
    cheekBone.addColorStop(0, hexToRgba(p.highlight, f.jawCurve === 'diamond' ? 0.44 : 0.34));
    cheekBone.addColorStop(1, hexToRgba(p.highlight, 0));
    ctx.fillStyle = cheekBone;
    ctx.fillRect(CX - 145, 240, 290, 130);

    // Warm subsurface cheek flush
    const cheekGlow = ctx.createRadialGradient(CX + side * (cw - 46), cy + 60, 4, CX + side * (cw - 46), cy + 60, 52);
    cheekGlow.addColorStop(0, hexToRgba(mixHex(p.blushNatural, warmSubsurface, 0.35), 0.18));
    cheekGlow.addColorStop(1, hexToRgba(p.blushNatural, 0));
    ctx.fillStyle = cheekGlow;
    ctx.fillRect(CX - 145, 248, 290, 145);

    // Subtly sculpted lower cheek / jaw hollow
    const jawHollow = ctx.createRadialGradient(CX + side * (jw - 10), f.jawY - 8, 4, CX + side * (jw - 10), f.jawY - 8, 48);
    jawHollow.addColorStop(0, hexToRgba(p.shadow, cheekSculptAlpha));
    jawHollow.addColorStop(1, hexToRgba(p.shadow, 0));
    ctx.fillStyle = jawHollow;
    ctx.fillRect(CX - 145, 305, 290, 140);
  }

  // Unique Natural Complexion Traits: Sun-Kissed Freckles, Cheek Dimples, Beauty Marks
  if (f.freckles) {
    const freckleColor = mixHex(p.shadow, '#9C5B3D', 0.42);
    ctx.save();
    for (let i = 0; i < 38; i++) {
      const r1 = hash01(400 + i * 3.7);
      const r2 = hash01(400 + i * 7.3);
      const r3 = hash01(400 + i * 11.1);
      const isNose = i < 12;
      const fx = isNose
        ? CX + (r1 - 0.5) * 26
        : CX + (i % 2 === 0 ? -1 : 1) * (34 + r1 * 48);
      const fyPos = isNose
        ? noseTipY - 34 + r2 * 28
        : eyeY + 22 + r2 * 28;
      ctx.fillStyle = hexToRgba(freckleColor, 0.22 + r3 * 0.22);
      ctx.beginPath();
      ctx.arc(fx, fyPos, 0.9 + r3 * 0.95, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (f.cheekDimples) {
    ctx.save();
    for (const side of [-1, 1]) {
      const dx = CX + side * (f.lipWidth + 14);
      const dy = mouthY - f.smileLift * 0.45 - 2;
      ctx.strokeStyle = hexToRgba(p.shadow, 0.34);
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(dx, dy, 9, side > 0 ? -0.45 : Math.PI - 0.55, side > 0 ? 0.55 : Math.PI + 0.45);
      ctx.stroke();

      ctx.strokeStyle = hexToRgba(p.highlight, 0.22);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(dx + side * 1.6, dy, 8.5, side > 0 ? -0.4 : Math.PI - 0.5, side > 0 ? 0.5 : Math.PI + 0.4);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (f.beautyMark) {
    const bm = f.beautyMark;
    const r = bm.r ?? 1.8;
    const markColor = mixHex(p.deepShadow, '#24140E', 0.65);
    ctx.save();
    ctx.fillStyle = hexToRgba(markColor, 0.72);
    ctx.beginPath();
    ctx.arc(bm.x, bm.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexToRgba(markColor, 0.25);
    ctx.beginPath();
    ctx.arc(bm.x, bm.y, r * 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Forehead center specular + hairline cast shadow (grounds hair to skin!)
  const foreheadGlow = ctx.createRadialGradient(CX - 6, fy + 44, 4, CX, fy + 48, 54);
  foreheadGlow.addColorStop(0, hexToRgba(p.highlight, 0.35));
  foreheadGlow.addColorStop(1, hexToRgba(p.highlight, 0));
  ctx.fillStyle = foreheadGlow;
  ctx.fillRect(CX - 85, fy - 4, 170, 100);

  const hairlineShadow = ctx.createLinearGradient(CX, fy - 4, CX, fy + 26);
  hairlineShadow.addColorStop(0, hexToRgba(p.deepShadow, 0.34));
  hairlineShadow.addColorStop(1, hexToRgba(p.deepShadow, 0));
  ctx.fillStyle = hairlineShadow;
  ctx.fillRect(CX - 125, fy - 4, 250, 34);

  // Subtle philtrum groove & chin cushion highlight
  const philMidY = (noseTipY + mouthY) * 0.5;
  const philtrum = ctx.createLinearGradient(CX, noseTipY + 14, CX, mouthY - 12);
  philtrum.addColorStop(0, hexToRgba(p.shadow, 0.18));
  philtrum.addColorStop(0.6, hexToRgba(p.shadow, 0.28));
  philtrum.addColorStop(1, hexToRgba(p.shadow, 0));
  ctx.fillStyle = philtrum;
  ctx.beginPath();
  ctx.ellipse(CX, philMidY, 5.5, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexToRgba(p.highlight, 0.34);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(CX - 6, noseTipY + 20);
  ctx.lineTo(CX - 4.5, mouthY - 16);
  ctx.moveTo(CX + 6, noseTipY + 20);
  ctx.lineTo(CX + 4.5, mouthY - 16);
  ctx.stroke();

  const chinHighlight = ctx.createRadialGradient(CX, chY - 14, 2, CX, chY - 14, 24);
  chinHighlight.addColorStop(0, hexToRgba(p.highlight, 0.32));
  chinHighlight.addColorStop(1, hexToRgba(p.highlight, 0));
  ctx.fillStyle = chinHighlight;
  ctx.beginPath();
  ctx.ellipse(CX, chY - 14, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Concealer (cursor-painted)
  const cnc = makeup.concealer;
  if (cnc) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.concealer, (sCtx) => {
      const alpha = cnc.opacity;
      for (const side of [-1, 1]) {
        const cg = sCtx.createRadialGradient(
          CX + side * eyeDx,
          eyeY + 24,
          4,
          CX + side * eyeDx,
          eyeY + 26,
          46
        );
        cg.addColorStop(0, hexToRgba(cnc.hex, alpha * 0.9));
        cg.addColorStop(0.6, hexToRgba(cnc.hex, alpha * 0.4));
        cg.addColorStop(1, hexToRgba(cnc.hex, 0));
        sCtx.fillStyle = cg;
        sCtx.fillRect(CX - 140, eyeY - 8, 280, 90);
      }
      const centerCnc = sCtx.createRadialGradient(CX, fy + 70, 4, CX, fy + 70, 46);
      centerCnc.addColorStop(0, hexToRgba(cnc.hex, alpha * 0.55));
      centerCnc.addColorStop(1, hexToRgba(cnc.hex, 0));
      sCtx.fillStyle = centerCnc;
      sCtx.fillRect(CX - 65, fy + 16, 130, 110);
      const chinCnc = sCtx.createRadialGradient(CX, chY - 14, 2, CX, chY - 14, 26);
      chinCnc.addColorStop(0, hexToRgba(cnc.hex, alpha * 0.48));
      chinCnc.addColorStop(1, hexToRgba(cnc.hex, 0));
      sCtx.fillStyle = chinCnc;
      sCtx.fillRect(CX - 40, chY - 40, 80, 55);
    });
  }

  // Contour & Bronzer (cursor-painted)
  const cnt = makeup.contour;
  if (cnt) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.contour, (sCtx) => {
      const alpha = cnt.opacity;
      for (const side of [-1, 1]) {
        sCtx.save();
        sCtx.translate(CX + side * (cw - 26), cy + 76);
        sCtx.rotate(side * -0.45);
        const cGrad = sCtx.createRadialGradient(0, 0, 4, 0, 0, 50);
        cGrad.addColorStop(0, hexToRgba(cnt.hex, alpha * 0.78));
        cGrad.addColorStop(0.6, hexToRgba(cnt.hex, alpha * 0.36));
        cGrad.addColorStop(1, hexToRgba(cnt.hex, 0));
        sCtx.fillStyle = cGrad;
        sCtx.beginPath();
        sCtx.ellipse(0, 0, 50, 22, 0, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.restore();

        const tGrad = sCtx.createRadialGradient(CX + side * (cw - 18), fy + 42, 5, CX + side * (cw - 18), fy + 42, 62);
        tGrad.addColorStop(0, hexToRgba(cnt.hex, alpha * 0.56));
        tGrad.addColorStop(1, hexToRgba(cnt.hex, 0));
        sCtx.fillStyle = tGrad;
        sCtx.fillRect(CX - 145, fy - 10, 290, 130);

        const jGrad = sCtx.createRadialGradient(CX + side * (jw - 24), chY - 40, 4, CX + side * (jw - 24), chY - 40, 44);
        jGrad.addColorStop(0, hexToRgba(cnt.hex, alpha * 0.48));
        jGrad.addColorStop(1, hexToRgba(cnt.hex, 0));
        sCtx.fillStyle = jGrad;
        sCtx.fillRect(CX - 135, chY - 80, 270, 85);
      }
      const nWall = f.noseBridgeW;
      for (const side of [-1, 1]) {
        const nGrad = sCtx.createLinearGradient(CX + side * (nWall - 2), 280, CX + side * (nWall + 8), 280);
        nGrad.addColorStop(0, hexToRgba(cnt.hex, alpha * 0.38));
        nGrad.addColorStop(1, hexToRgba(cnt.hex, 0));
        sCtx.fillStyle = nGrad;
        sCtx.fillRect(CX + (side > 0 ? nWall - 3 : -(nWall + 9)), 262, 12, 70);
      }
    });
  }

  // Blush (cursor-painted)
  const bls = makeup.blush;
  if (bls) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.blush, (sCtx) => {
      const alpha = bls.opacity;
      for (const side of [-1, 1]) {
        sCtx.save();
        sCtx.translate(CX + side * (cw - 38), cy + 58);
        sCtx.rotate(side * -0.32);
        const bGrad = sCtx.createRadialGradient(0, 0, 4, 0, 0, 46);
        bGrad.addColorStop(0, hexToRgba(bls.hex, alpha * 0.9));
        bGrad.addColorStop(0.58, hexToRgba(bls.hex, alpha * 0.45));
        bGrad.addColorStop(1, hexToRgba(bls.hex, 0));
        sCtx.fillStyle = bGrad;
        sCtx.beginPath();
        sCtx.ellipse(0, 0, 46, 29, 0, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.restore();
      }
    });
  }

  // Highlighter (cursor-painted)
  const hl = makeup.highlighter;
  if (hl) {
    compositeMaskedLayer(
      ctx,
      scratchCanvas,
      zoneMasks.highlighter,
      (sCtx) => {
        const alpha = hl.opacity;
        for (const side of [-1, 1]) {
          sCtx.save();
          sCtx.translate(CX + side * (cw - 36), cy + 40);
          sCtx.rotate(side * -0.32);
          const hGrad = sCtx.createRadialGradient(0, 0, 2, 0, 0, 38);
          hGrad.addColorStop(0, hexToRgba(hl.secondaryHex || hl.hex, alpha * 0.92));
          hGrad.addColorStop(0.48, hexToRgba(hl.hex, alpha * 0.48));
          hGrad.addColorStop(1, hexToRgba(hl.hex, 0));
          sCtx.fillStyle = hGrad;
          sCtx.beginPath();
          sCtx.ellipse(0, 0, 38, 16, 0, 0, Math.PI * 2);
          sCtx.fill();
          sCtx.restore();

          const bbGrad = sCtx.createRadialGradient(
            CX + side * (eyeDx + 6),
            browY + 9,
            1,
            CX + side * (eyeDx + 6),
            browY + 9,
            22
          );
          bbGrad.addColorStop(0, hexToRgba(hl.hex, alpha * 0.58));
          bbGrad.addColorStop(1, hexToRgba(hl.hex, 0));
          sCtx.fillStyle = bbGrad;
          sCtx.fillRect(CX - 135, browY - 12, 270, 44);
        }

        const nTip = sCtx.createRadialGradient(CX, noseTipY - 6, 1, CX, noseTipY - 6, 15);
        nTip.addColorStop(0, hexToRgba(hl.secondaryHex || hl.hex, alpha * 0.88));
        nTip.addColorStop(1, hexToRgba(hl.hex, 0));
        sCtx.fillStyle = nTip;
        sCtx.beginPath();
        sCtx.arc(CX, noseTipY - 6, 15, 0, Math.PI * 2);
        sCtx.fill();

        const nBridge = sCtx.createLinearGradient(CX, 272, CX, noseTipY - 8);
        nBridge.addColorStop(0, hexToRgba(hl.hex, 0));
        nBridge.addColorStop(0.5, hexToRgba(hl.secondaryHex || hl.hex, alpha * 0.6));
        nBridge.addColorStop(1, hexToRgba(hl.hex, 0));
        sCtx.fillStyle = nBridge;
        sCtx.fillRect(CX - 5, 272, 10, noseTipY - 280);

        const cBow = sCtx.createRadialGradient(CX, mouthY - 16, 1, CX, mouthY - 16, 14);
        cBow.addColorStop(0, hexToRgba(hl.secondaryHex || hl.hex, alpha * 0.78));
        cBow.addColorStop(1, hexToRgba(hl.hex, 0));
        sCtx.fillStyle = cBow;
        sCtx.beginPath();
        sCtx.arc(CX, mouthY - 16, 14, 0, Math.PI * 2);
        sCtx.fill();
      },
      'screen'
    );
  }

  ctx.restore(); // end face clip

  // Soft jaw/chin ambient edge (translucent occlusion instead of cartoon outline)
  ctx.save();
  drawFacePath(ctx, model);
  ctx.strokeStyle = hexToRgba(p.shadow, f.jawCurve === 'angular' ? 0.24 : 0.18);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  // Helper for each model's exact eye Bezier endpoints and control points
  const getEyeCurve = (side: -1 | 1) => {
    const ex = CX + side * eyeDx;
    const ey = eyeY;
    const tilt = model.eyeTilt;
    const innerX = ex - side * f.eyeInnerHalf;
    const outerX = ex + side * f.eyeOuterHalf;
    const innerY = ey + (f.eyeShape === 'cat' ? 3.2 : 2);
    const outerY = ey - tilt * 45;

    const upArch = f.eyeUpperArch;
    const lowDrop = f.eyeLowerDrop;
    const c1x = ex - side * (f.eyeInnerHalf * (f.eyeShape === 'round' || f.eyeShape === 'doe' ? 0.55 : 0.45));
    const c1y = ey - upArch;
    const c2x = ex + side * (f.eyeOuterHalf * (f.eyeShape === 'cat' ? 0.38 : 0.46));
    const c2y = outerY - upArch * (f.eyeShape === 'cat' ? 1.05 : 0.94);

    const lc1x = ex + side * (f.eyeOuterHalf * 0.45);
    const lc1y = ey + lowDrop;
    const lc2x = ex - side * (f.eyeInnerHalf * 0.48);
    const lc2y = ey + lowDrop + 1;

    return {
      ex,
      ey,
      innerX,
      innerY,
      outerX,
      outerY,
      c1x,
      c1y,
      c2x,
      c2y,
      lc1x,
      lc1y,
      lc2x,
      lc2y,
      upPointAt: (t: number) => ({
        x: evalCubic1D(t, innerX, c1x, c2x, outerX),
        y: evalCubic1D(t, innerY, c1y, c2y, outerY),
      }),
      lowPointAt: (t: number) => ({
        x: evalCubic1D(t, innerX, lc2x, lc1x, outerX),
        y: evalCubic1D(t, innerY, lc2y, lc1y, outerY),
      }),
    };
  };

  // 6. Eyes: Orbital Socket Shading + Masked Eyeshadow + Realistic Sclera/Iris + Eyeliner & Mascara
  for (const side of [-1, 1]) {
    const ex = CX + side * eyeDx;
    const ey = eyeY;
    const sock = ctx.createRadialGradient(ex - side * 8, ey - 8, 6, ex, ey - 4, 44);
    sock.addColorStop(0, hexToRgba(p.shadow, 0.38));
    sock.addColorStop(0.65, hexToRgba(p.midtone, 0.16));
    sock.addColorStop(1, hexToRgba(p.shadow, 0));
    ctx.fillStyle = sock;
    ctx.beginPath();
    ctx.ellipse(ex, ey - 4, 44, 27, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft under-eye tear-trough transition
    const underEye = ctx.createRadialGradient(ex - side * 6, ey + 14, 2, ex, ey + 15, 28);
    underEye.addColorStop(0, hexToRgba(p.shadow, 0.2));
    underEye.addColorStop(1, hexToRgba(p.shadow, 0));
    ctx.fillStyle = underEye;
    ctx.beginPath();
    ctx.ellipse(ex, ey + 15, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyeshadow Crease (cursor-painted)
  const crs = makeup.eyeshadow_crease;
  if (crs) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.eyeshadow_crease, (sCtx) => {
      const alpha = crs.opacity;
      for (const side of [-1, 1]) {
        const ex = CX + side * eyeDx;
        const ey = eyeY;
        const cg = sCtx.createRadialGradient(
          ex + side * 6,
          ey - 13,
          3,
          ex + side * 4,
          ey - 11,
          38
        );
        cg.addColorStop(0, hexToRgba(crs.hex, alpha * 0.92));
        cg.addColorStop(0.62, hexToRgba(crs.hex, alpha * 0.48));
        cg.addColorStop(1, hexToRgba(crs.hex, 0));
        sCtx.fillStyle = cg;
        sCtx.beginPath();
        sCtx.ellipse(ex + side * 4, ey - 11, 38, 21, side * -(0.1 + model.eyeTilt * 0.6), 0, Math.PI * 2);
        sCtx.fill();
      }
    });
  }

  // Eyeshadow Lid (cursor-painted)
  const lid = makeup.eyeshadow_lid;
  if (lid) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.eyeshadow_lid, (sCtx) => {
      const alpha = lid.opacity;
      for (const side of [-1, 1]) {
        const ex = CX + side * eyeDx;
        const ey = eyeY;
        const lg = sCtx.createRadialGradient(ex, ey - 4, 2, ex, ey - 5, 34);
        lg.addColorStop(0, hexToRgba(lid.hex, alpha * 0.96));
        lg.addColorStop(0.68, hexToRgba(lid.hex, alpha * 0.56));
        lg.addColorStop(1, hexToRgba(lid.hex, 0));
        sCtx.fillStyle = lg;
        sCtx.beginPath();
        sCtx.ellipse(ex, ey - 5, 34, 16, side * -(0.06 + model.eyeTilt * 0.4), Math.PI, Math.PI * 2);
        sCtx.fill();

        if (lid.finish === 'Shimmer' || lid.finish === 'Metallic') {
          const shim = sCtx.createRadialGradient(ex, ey - 6, 1, ex, ey - 6, 18);
          shim.addColorStop(0, hexToRgba(lid.secondaryHex || '#FFFFFF', alpha * 0.78));
          shim.addColorStop(1, hexToRgba(lid.secondaryHex || '#FFFFFF', 0));
          sCtx.fillStyle = shim;
          sCtx.beginPath();
          sCtx.ellipse(ex, ey - 6, 18, 10, 0, 0, Math.PI * 2);
          sCtx.fill();
        }
      }
    });
  }

  // Draw Hyper-Realistic Eye Apertures (Caruncle + Shaded Sclera + Fibrous Iris + Waterline + Lashes)
  for (const side of [-1, 1]) {
    const ec = getEyeCurve(side as -1 | 1);
    const { ex, ey, innerX, innerY, outerX, outerY, c1x, c1y, c2x, c2y, lc1x, lc1y, lc2x, lc2y } = ec;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, outerX, outerY);
    ctx.bezierCurveTo(lc1x, lc1y, lc2x, lc2y, innerX, innerY);
    ctx.closePath();

    ctx.save();
    ctx.clip();

    // Sclera base with eyeball curvature corner shading
    const scleraGrad = ctx.createRadialGradient(ex, ey - 1, 8, ex, ey, 32);
    scleraGrad.addColorStop(0, p.sclera);
    scleraGrad.addColorStop(0.72, mixHex(p.sclera, '#D9CBC5', 0.25));
    scleraGrad.addColorStop(1, mixHex(p.sclera, '#B89E96', 0.55));
    ctx.fillStyle = scleraGrad;
    ctx.fillRect(ex - 36, ey - 24, 72, 44);

    // Subtle rosy tear-duct lacrimal caruncle at inner corner
    ctx.fillStyle = hexToRgba(mixHex(p.naturalLipLower, '#E89B96', 0.5), 0.72);
    ctx.beginPath();
    ctx.ellipse(innerX + side * 2.4, innerY - 0.5, 4.4, 2.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris with limbal ring, fibrous spokes & warm collarette
    const irisY = ey - 1;
    const irisR = f.irisRadius;
    const irisGrad = ctx.createRadialGradient(ex, irisY, 2, ex, irisY, irisR);
    irisGrad.addColorStop(0, p.irisInner);
    irisGrad.addColorStop(0.55, p.irisOuter);
    irisGrad.addColorStop(0.86, mixHex(p.irisOuter, '#100B09', 0.45));
    irisGrad.addColorStop(1, '#120D0B');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(ex, irisY, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Radial iris fibers
    for (let k = 0; k < 28; k++) {
      const ang = (k / 28) * Math.PI * 2;
      const inner = irisR * 0.44;
      const outer = irisR - 1.3;
      ctx.strokeStyle =
        k % 2 === 0 ? hexToRgba(p.irisInner, 0.42) : hexToRgba('#0F0A08', 0.25);
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(ang) * inner, irisY + Math.sin(ang) * inner);
      ctx.lineTo(ex + Math.cos(ang) * outer, irisY + Math.sin(ang) * outer);
      ctx.stroke();
    }

    // Pupil
    ctx.fillStyle = '#0C0908';
    ctx.beginPath();
    ctx.arc(ex, irisY, irisR * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Upper eyelid cast shadow across eyeball & iris
    const lidShade = ctx.createLinearGradient(ex, ey - 18, ex, ey + 2);
    lidShade.addColorStop(0, 'rgba(18, 10, 8, 0.48)');
    lidShade.addColorStop(0.55, 'rgba(18, 10, 8, 0.14)');
    lidShade.addColorStop(1, 'rgba(18, 10, 8, 0)');
    ctx.fillStyle = lidShade;
    ctx.fillRect(ex - 36, ey - 20, 72, 24);

    // Crisp studio softbox catchlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.beginPath();
    ctx.ellipse(ex - 4.2, irisY - 4.2, 2.8, 2.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.56)';
    ctx.beginPath();
    ctx.arc(ex + 4.4, irisY + 3.4, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Realistic upper eyelid crease fold tailored per eye shape
    ctx.strokeStyle = hexToRgba(p.deepShadow, 0.58);
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(innerX + side * 3, ey - 9);
    ctx.quadraticCurveTo(ex, ey + f.lidCreaseOffset, outerX - side * 2, outerY - 7);
    ctx.stroke();

    // Soft skin-toned lower waterline highlight + lower lash rim shadow
    ctx.strokeStyle = hexToRgba(mixHex(p.base, '#F6D8D0', 0.45), 0.7);
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.moveTo(innerX + side * 4, innerY + 1);
    ctx.bezierCurveTo(lc2x, lc2y - 0.5, lc1x, lc1y - 0.5, outerX - side * 2, outerY + 1);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(p.shadow, 0.42);
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(innerX + side * 2, innerY + 1.8);
    ctx.bezierCurveTo(lc2x, lc2y + 1.2, lc1x, lc1y + 1.2, outerX, outerY + 1.2);
    ctx.stroke();

    // Upper lash line root density
    ctx.strokeStyle = p.lashDefault;
    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, outerX, outerY);
    ctx.stroke();

    // Fine bare natural lashes (upper)
    ctx.strokeStyle = hexToRgba(p.lashDefault, 0.58);
    ctx.lineWidth = 0.95;
    for (let i = 0; i < 11; i++) {
      const t = 0.14 + (i / 10) * 0.84;
      const pt = ec.upPointAt(t);
      const len = 4.8 * (0.52 + (i / 10) * 0.58);
      const flare = side * (i / 10 - 0.2) * 11;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.quadraticCurveTo(pt.x + flare * 0.45, pt.y - len * 0.65, pt.x + flare, pt.y - len);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Eyeliner Layer (cursor-painted along each model's exact lash line + wing!)
  const lnr = makeup.eyeliner;
  if (lnr) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.eyeliner, (sCtx) => {
      const style = lnr.style || 'classic';
      const alpha = lnr.opacity;
      sCtx.strokeStyle = hexToRgba(lnr.hex, alpha);
      sCtx.fillStyle = hexToRgba(lnr.hex, alpha);
      sCtx.lineWidth = style === 'natural' ? 2.6 : style === 'classic' ? 3.6 : 4.6;
      sCtx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const ec = getEyeCurve(side as -1 | 1);
        const { innerX, innerY, outerX, outerY, c1x, c1y, c2x, c2y } = ec;

        sCtx.beginPath();
        sCtx.moveTo(innerX + side * 2, innerY - 0.6);
        sCtx.bezierCurveTo(c1x, c1y - 0.6, c2x, c2y - 0.6, outerX, outerY);
        sCtx.stroke();

        if (style === 'classic' || style === 'glam') {
          const wingLen = style === 'glam' ? 20 : 13;
          const wingLift = (style === 'glam' ? 12 : 7) + model.eyeTilt * 20;
          sCtx.beginPath();
          sCtx.moveTo(outerX - side * 4, outerY - 2);
          sCtx.lineTo(outerX + side * wingLen, outerY - wingLift);
          sCtx.lineTo(outerX, outerY + 1);
          sCtx.closePath();
          sCtx.fill();
        }
      }
    });
  }

  // Mascara & Lashes Layer (All 6 lash styles hugging each model's exact eye curvature)
  const msc = makeup.mascara;
  if (msc) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.mascara, (sCtx) => {
      const lashStyle = msc.style || 'classic';
      sCtx.strokeStyle = hexToRgba(msc.hex, msc.opacity);
      sCtx.lineCap = 'round';

      for (const side of [-1, 1]) {
        const ec = getEyeCurve(side as -1 | 1);

        if (lashStyle === 'spider') {
          const spikes = 6;
          for (let i = 0; i < spikes; i++) {
            const frac = i / (spikes - 1);
            const t = 0.15 + frac * 0.8;
            const pt = ec.upPointAt(t);
            const len = 14.5 + (frac > 0.5 ? 2.5 : 0);
            const flare = side * (frac - 0.18) * 11;
            const tipX = pt.x + flare;
            const tipY = pt.y - len;

            sCtx.lineWidth = 2.4;
            for (const spread of [-2.2, 0, 2.2]) {
              sCtx.beginPath();
              sCtx.moveTo(pt.x + spread, pt.y);
              sCtx.quadraticCurveTo(pt.x + flare * 0.5, pt.y - len * 0.65, tipX, tipY);
              sCtx.stroke();
            }
          }
          sCtx.lineWidth = 1.7;
          for (let i = 0; i < 5; i++) {
            const frac = i / 4;
            const pt = ec.lowPointAt(0.22 + frac * 0.68);
            sCtx.beginPath();
            sCtx.moveTo(pt.x - 1.2, pt.y);
            sCtx.lineTo(pt.x + side * (frac * 4), pt.y + 8);
            sCtx.moveTo(pt.x + 1.2, pt.y);
            sCtx.lineTo(pt.x + side * (frac * 4), pt.y + 8);
            sCtx.stroke();
          }
        } else if (lashStyle === 'cat_eyed') {
          const lashCount = 18;
          sCtx.lineWidth = 1.8;
          for (let i = 0; i < lashCount; i++) {
            const frac = i / (lashCount - 1);
            const pt = ec.upPointAt(0.14 + frac * 0.85);
            const len = 5 + Math.pow(frac, 1.45) * 14.5;
            const flare = side * (frac * 17.5 - 1.5);
            sCtx.beginPath();
            sCtx.moveTo(pt.x, pt.y);
            sCtx.quadraticCurveTo(pt.x + flare * 0.48, pt.y - len * 0.55, pt.x + flare, pt.y - len);
            sCtx.stroke();
          }
          sCtx.lineWidth = 1.1;
          for (let i = 0; i < 6; i++) {
            const frac = i / 5;
            const pt = ec.lowPointAt(0.42 + frac * 0.52);
            sCtx.beginPath();
            sCtx.moveTo(pt.x, pt.y);
            sCtx.lineTo(pt.x + side * (2 + frac * 5), pt.y + 4.5 + frac * 2);
            sCtx.stroke();
          }
        } else if (lashStyle === 'wispy') {
          const lashCount = 19;
          for (let i = 0; i < lashCount; i++) {
            const frac = i / (lashCount - 1);
            const pt = ec.upPointAt(0.12 + frac * 0.86);
            const isHeroWisp = i % 3 === 1;
            const len = (isHeroWisp ? 15.5 : 8.5) * (0.65 + frac * 0.45);
            const flare = side * ((frac - 0.18) * 12 + (isHeroWisp ? 1.5 : -1));
            sCtx.lineWidth = isHeroWisp ? 1.8 : 1.1;
            sCtx.beginPath();
            sCtx.moveTo(pt.x, pt.y);
            sCtx.quadraticCurveTo(pt.x + flare * 0.45, pt.y - len * 0.65, pt.x + flare, pt.y - len);
            sCtx.stroke();
          }
          sCtx.lineWidth = 1.0;
          for (let i = 0; i < 7; i++) {
            const frac = i / 6;
            const pt = ec.lowPointAt(0.24 + frac * 0.68);
            sCtx.beginPath();
            sCtx.moveTo(pt.x, pt.y);
            sCtx.lineTo(pt.x + side * (frac * 3), pt.y + (i % 2 === 0 ? 5.5 : 3.5));
            sCtx.stroke();
          }
        } else {
          const lashCount = lashStyle === 'glam' ? 18 : lashStyle === 'classic' ? 14 : 11;
          const maxLen = lashStyle === 'glam' ? 15 : lashStyle === 'classic' ? 11 : 8;
          sCtx.lineWidth = lashStyle === 'glam' ? 2.0 : 1.55;
          for (let i = 0; i < lashCount; i++) {
            const frac = i / (lashCount - 1);
            const pt = ec.upPointAt(0.14 + frac * 0.84);
            const len = maxLen * (0.55 + frac * 0.55);
            const flare = side * (frac - 0.2) * 11;
            sCtx.beginPath();
            sCtx.moveTo(pt.x, pt.y);
            sCtx.quadraticCurveTo(pt.x + flare * 0.45, pt.y - len * 0.65, pt.x + flare, pt.y - len);
            sCtx.stroke();
          }

          sCtx.lineWidth = 1.1;
          for (let i = 0; i < 7; i++) {
            const frac = i / 6;
            const pt = ec.lowPointAt(0.25 + frac * 0.68);
            sCtx.beginPath();
            sCtx.moveTo(pt.x, pt.y);
            sCtx.lineTo(pt.x + side * (frac * 3), pt.y + (lashStyle === 'glam' ? 6 : 4));
            sCtx.stroke();
          }
        }
      }
    });
  }

  // 7. Realistic Hair-by-Hair Eyebrows (+ Cursor-Painted Brow Pencil/Gel)
  const drawBrowStrokes = (
    targetCtx: CanvasRenderingContext2D,
    colorHex: string,
    alpha: number,
    strokeCount: number,
    baseWidth: number
  ) => {
    const bwThick = baseWidth * f.browThickness;
    const isStraight = f.browShape === 'straight_bold';
    const isHighArch = f.browShape === 'high_arch';
    const isFeathered = f.browShape === 'feathered_full';

    for (const side of [-1, 1]) {
      const bx0 = CX + side * f.browInnerX;
      const bxArch = CX + side * f.browArchX;
      const bxTail = CX + side * f.browTailX;
      const archH = (isStraight ? 7.5 : isHighArch ? 15.5 : 11.5) * model.browArch;
      const tailDrop = isStraight ? 0 : 3.5;

      targetCtx.save();
      targetCtx.fillStyle = hexToRgba(colorHex, alpha * (isFeathered || isStraight ? 0.32 : 0.26));
      targetCtx.beginPath();
      targetCtx.moveTo(bx0, browY + 4);
      targetCtx.quadraticCurveTo(bxArch, browY - archH - 3.5 * f.browThickness, bxTail, browY + tailDrop);
      targetCtx.quadraticCurveTo(bxArch, browY - archH + 5.2 * f.browThickness, bx0, browY + 10.8 * f.browThickness);
      targetCtx.closePath();
      targetCtx.fill();

      targetCtx.lineCap = 'round';
      const count = isFeathered ? Math.round(strokeCount * 1.2) : strokeCount;
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const sx = bx0 + (bxTail - bx0) * t;
        const sy = browY + 7 - Math.sin(t * Math.PI) * archH * 0.85 + t * tailDrop * 0.5;
        const headFade = t < 0.14 ? 0.48 + t * 3.5 : t > 0.85 ? 1 - (t - 0.85) * 3 : 1;
        targetCtx.strokeStyle = hexToRgba(colorHex, alpha * headFade * 0.84);
        targetCtx.lineWidth = bwThick * (1 - t * 0.35);
        const angleDx = side * (t < 0.18 ? (isFeathered ? 1.0 : 1.8) : isStraight ? 5.6 : 4.8);
        const angleDy = -(isFeathered ? 8.0 : 6.8) * (1 - t * 0.52);
        targetCtx.beginPath();
        targetCtx.moveTo(sx, sy + 2);
        targetCtx.quadraticCurveTo(sx + angleDx * 0.4, sy + angleDy * 0.5, sx + angleDx, sy + angleDy);
        targetCtx.stroke();
      }
      targetCtx.restore();
    }
  };

  drawBrowStrokes(ctx, p.browDefault, 0.82, 34, 1.05);

  const brw = makeup.eyebrows;
  if (brw) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.eyebrows, (sCtx) => {
      drawBrowStrokes(sCtx, brw.hex, brw.opacity, 36, 1.35);
    });
  }

  // 8. Soft 3D Nose Modeling (Distinct Bridge Width, Tip Geometry & Alar Wing Proportions)
  ctx.save();
  const bridgeMidY = (eyeY + noseTipY) * 0.5 + 2;
  const wallCenter = f.noseBridgeW + 2.5;
  const wallSpread = Math.max(5.5, f.noseBridgeW * 0.72);
  const tipHighlightR =
    f.noseTipStyle === 'button'
      ? 8.5
      : f.noseTipStyle === 'refined'
      ? 7.5
      : f.noseTipStyle === 'broad_rounded'
      ? 12.8
      : 10.5;
  const alarArcR = Math.max(5.5, f.noseAlarW * 0.48);

  for (const side of [-1, 1]) {
    const wallGrad = ctx.createLinearGradient(CX + side * (f.noseBridgeW * 0.45), bridgeMidY, CX + side * (f.noseBridgeW + 9), bridgeMidY + 5);
    wallGrad.addColorStop(0, hexToRgba(p.shadow, 0));
    wallGrad.addColorStop(0.55, hexToRgba(p.shadow, f.noseTipStyle === 'sculpted' || f.noseTipStyle === 'refined' ? 0.36 : 0.28));
    wallGrad.addColorStop(1, hexToRgba(p.shadow, 0));
    ctx.fillStyle = wallGrad;
    ctx.beginPath();
    ctx.ellipse(CX + side * wallCenter, bridgeMidY, wallSpread, (noseTipY - eyeY) * 0.48, side * -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Soft curved alar nostril wing shadow
    ctx.strokeStyle = hexToRgba(p.shadow, 0.4);
    ctx.lineWidth = f.noseTipStyle === 'broad_rounded' ? 2.1 : 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(CX + side * f.noseAlarW, noseTipY + 2.5, alarArcR, side > 0 ? -0.6 : Math.PI - 0.6, side > 0 ? 1.1 : Math.PI + 1.1);
    ctx.stroke();
  }

  // Dorsal nose bridge & tip soft studio specular highlight
  const bridgeLight = ctx.createLinearGradient(CX, eyeY + 4, CX, noseTipY - 4);
  bridgeLight.addColorStop(0, hexToRgba(p.highlight, 0.08));
  bridgeLight.addColorStop(0.65, hexToRgba(p.highlight, 0.34));
  bridgeLight.addColorStop(1, hexToRgba(p.highlight, 0.42));
  ctx.fillStyle = bridgeLight;
  ctx.beginPath();
  ctx.ellipse(CX, bridgeMidY + 2, Math.max(3.2, f.noseBridgeW * 0.44), (noseTipY - eyeY) * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  const tipHighlight = ctx.createRadialGradient(CX - 1, noseTipY - 4, 1, CX, noseTipY - 3, tipHighlightR);
  tipHighlight.addColorStop(0, hexToRgba(p.highlight, 0.45));
  tipHighlight.addColorStop(1, hexToRgba(p.highlight, 0));
  ctx.fillStyle = tipHighlight;
  ctx.beginPath();
  ctx.arc(CX, noseTipY - 3, tipHighlightR, 0, Math.PI * 2);
  ctx.fill();

  // Soft under-nose & columella occlusion shadow
  const underNose = ctx.createRadialGradient(CX, noseTipY + 6, 3, CX, noseTipY + 6, f.noseAlarW + 6);
  underNose.addColorStop(0, hexToRgba(p.deepShadow, 0.48));
  underNose.addColorStop(1, hexToRgba(p.deepShadow, 0));
  ctx.fillStyle = underNose;
  ctx.beginPath();
  ctx.ellipse(CX, noseTipY + 6, f.noseAlarW + 5, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Natural teardrop nostrils
  const nosRx = Math.max(3.8, f.noseAlarW * 0.34);
  for (const side of [-1, 1]) {
    ctx.fillStyle = hexToRgba(p.deepShadow, 0.68);
    ctx.beginPath();
    ctx.ellipse(CX + side * f.nostrilDx, noseTipY + 6.8, nosRx, 2.2 + (f.noseAlarW - 11) * 0.08, side * -0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 9. Realistic Dimensional Lips (Distinct Shape, Bow, Volume & Smile Lift + Makeup)
  const lipW = f.lipWidth;
  const cornerY = mouthY - f.smileLift;
  const lipTopPeak = 10.5 * f.upperLipScale;
  const lipBotDepth = 14.5 * f.lowerLipScale;
  const bowDip = f.cupidsBowDepth;
  const wRatio = lipW / 42;

  const traceUpperLip = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(CX - lipW, cornerY);
    c.bezierCurveTo(
      CX - 22 * wRatio,
      mouthY - lipTopPeak,
      CX - 11 * wRatio,
      mouthY - lipTopPeak - 2,
      CX,
      mouthY - lipTopPeak + bowDip
    );
    c.bezierCurveTo(
      CX + 11 * wRatio,
      mouthY - lipTopPeak - 2,
      CX + 22 * wRatio,
      mouthY - lipTopPeak,
      CX + lipW,
      cornerY
    );
    c.quadraticCurveTo(CX + 15 * wRatio, mouthY + 2, CX, mouthY + 3);
    c.quadraticCurveTo(CX - 15 * wRatio, mouthY + 2, CX - lipW, cornerY);
    c.closePath();
  };

  const traceLowerLip = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(CX - lipW + 1, cornerY);
    c.quadraticCurveTo(CX - 15 * wRatio, mouthY + 2, CX, mouthY + 3);
    c.quadraticCurveTo(CX + 15 * wRatio, mouthY + 2, CX + lipW - 1, cornerY);
    c.bezierCurveTo(
      CX + 28 * wRatio,
      mouthY + lipBotDepth + 3,
      CX + 12 * wRatio,
      mouthY + lipBotDepth + 6,
      CX,
      mouthY + lipBotDepth + 6
    );
    c.bezierCurveTo(
      CX - 12 * wRatio,
      mouthY + lipBotDepth + 6,
      CX - 28 * wRatio,
      mouthY + lipBotDepth + 3,
      CX - lipW + 1,
      cornerY
    );
    c.closePath();
  };

  // Soft shadow beneath lower lip pillow
  const underLip = ctx.createRadialGradient(
    CX,
    mouthY + lipBotDepth + 9,
    2,
    CX,
    mouthY + lipBotDepth + 9,
    28
  );
  underLip.addColorStop(0, hexToRgba(p.deepShadow, 0.38));
  underLip.addColorStop(1, hexToRgba(p.deepShadow, 0));
  ctx.fillStyle = underLip;
  ctx.fillRect(CX - 40, mouthY + lipBotDepth, 80, 24);

  ctx.save();
  // Upper lip gradient (darker toward parting seam, softer at Cupid's bow)
  const upGrad = ctx.createLinearGradient(CX, mouthY - lipTopPeak - 2, CX, mouthY + 3);
  upGrad.addColorStop(0, mixHex(p.naturalLipUpper, p.highlight, 0.14));
  upGrad.addColorStop(0.6, p.naturalLipUpper);
  upGrad.addColorStop(1, mixHex(p.naturalLipUpper, p.lipLine, 0.32));
  traceUpperLip(ctx);
  ctx.fillStyle = upGrad;
  ctx.fill();

  // Lower lip 3D pillow gradient (luminous center cushion, shaded outer border)
  const lowGrad = ctx.createRadialGradient(
    CX,
    mouthY + lipBotDepth * 0.45,
    4,
    CX,
    mouthY + lipBotDepth * 0.55,
    38 * wRatio
  );
  lowGrad.addColorStop(0, mixHex(p.naturalLipLower, '#FFEBE6', 0.24));
  lowGrad.addColorStop(0.62, p.naturalLipLower);
  lowGrad.addColorStop(1, mixHex(p.naturalLipLower, p.lipLine, 0.28));
  traceLowerLip(ctx);
  ctx.fillStyle = lowGrad;
  ctx.fill();

  // Delicate natural vertical lip texture lines + soft lower cushion sheen
  ctx.save();
  traceLowerLip(ctx);
  ctx.clip();
  ctx.strokeStyle = hexToRgba(p.lipLine, 0.18);
  ctx.lineWidth = 0.8;
  for (let i = -5; i <= 5; i++) {
    const lx = CX + i * 5.2 * wRatio;
    ctx.beginPath();
    ctx.moveTo(lx, mouthY + 2);
    ctx.quadraticCurveTo(lx + i * 0.4, mouthY + lipBotDepth * 0.55, lx + i * 0.6, mouthY + lipBotDepth + 4);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 245, 242, 0.18)';
  ctx.beginPath();
  ctx.ellipse(CX, mouthY + lipBotDepth * 0.5, 16 * wRatio, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Lipstick (cursor-painted)
  const lps = makeup.lipstick;
  if (lps) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.lipstick, (sCtx) => {
      traceUpperLip(sCtx);
      sCtx.fillStyle = hexToRgba(lps.hex, lps.opacity * 0.92);
      sCtx.fill();

      traceLowerLip(sCtx);
      sCtx.fillStyle = hexToRgba(lps.hex, lps.opacity);
      sCtx.fill();

      if (lps.finish === 'Satin') {
        const sat = sCtx.createRadialGradient(
          CX,
          mouthY + lipBotDepth * 0.52,
          2,
          CX,
          mouthY + lipBotDepth * 0.52,
          24
        );
        sat.addColorStop(0, 'rgba(255,255,255,0.24)');
        sat.addColorStop(1, 'rgba(255,255,255,0)');
        sCtx.fillStyle = sat;
        traceLowerLip(sCtx);
        sCtx.fill();
      }
    });
  }

  // Lip Liner (cursor-painted)
  const lpl = makeup.lipliner;
  if (lpl) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.lipliner, (sCtx) => {
      sCtx.strokeStyle = hexToRgba(lpl.hex, lpl.opacity);
      sCtx.lineWidth = 3.0;
      sCtx.lineJoin = 'round';
      sCtx.lineCap = 'round';
      sCtx.beginPath();
      sCtx.moveTo(CX - lipW, cornerY);
      sCtx.bezierCurveTo(
        CX - 22 * wRatio,
        mouthY - lipTopPeak,
        CX - 11 * wRatio,
        mouthY - lipTopPeak - 2,
        CX,
        mouthY - lipTopPeak + bowDip
      );
      sCtx.bezierCurveTo(
        CX + 11 * wRatio,
        mouthY - lipTopPeak - 2,
        CX + 22 * wRatio,
        mouthY - lipTopPeak,
        CX + lipW,
        cornerY
      );
      sCtx.stroke();

      sCtx.beginPath();
      sCtx.moveTo(CX - lipW + 1, cornerY);
      sCtx.bezierCurveTo(
        CX - 28 * wRatio,
        mouthY + lipBotDepth + 3,
        CX - 12 * wRatio,
        mouthY + lipBotDepth + 6,
        CX,
        mouthY + lipBotDepth + 6
      );
      sCtx.bezierCurveTo(
        CX + 12 * wRatio,
        mouthY + lipBotDepth + 6,
        CX + 28 * wRatio,
        mouthY + lipBotDepth + 3,
        CX + lipW - 1,
        cornerY
      );
      sCtx.stroke();
    });
  }

  // Lip Gloss (cursor-painted)
  const glz = makeup.lipgloss;
  if (glz) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.lipgloss, (sCtx) => {
      if (glz.hex.toLowerCase() !== '#ffffff') {
        traceUpperLip(sCtx);
        sCtx.fillStyle = hexToRgba(glz.hex, glz.opacity * 0.48);
        sCtx.fill();
        traceLowerLip(sCtx);
        sCtx.fillStyle = hexToRgba(glz.hex, glz.opacity * 0.55);
        sCtx.fill();
      }
      sCtx.fillStyle = 'rgba(255, 255, 255, 0.74)';
      sCtx.beginPath();
      sCtx.ellipse(CX - 11 * wRatio, mouthY + lipBotDepth * 0.52, 9.5, 2.8, -0.1, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.beginPath();
      sCtx.ellipse(CX + 10 * wRatio, mouthY + lipBotDepth * 0.54, 6.5, 2.2, 0.12, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.fillStyle = 'rgba(255, 255, 255, 0.48)';
      sCtx.beginPath();
      sCtx.ellipse(CX - 7 * wRatio, mouthY - lipTopPeak * 0.42, 5, 1.5, -0.2, 0, Math.PI * 2);
      sCtx.fill();
    });
  }

  // Soft lip parting crease + shaded corner commissures
  ctx.strokeStyle = hexToRgba(p.lipLine, 0.76);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CX - lipW + 1, cornerY);
  ctx.quadraticCurveTo(CX - 14 * wRatio, mouthY + 2.5, CX, mouthY + 3.2);
  ctx.quadraticCurveTo(CX + 14 * wRatio, mouthY + 2.5, CX + lipW - 1, cornerY);
  ctx.stroke();

  for (const side of [-1, 1]) {
    ctx.fillStyle = hexToRgba(p.deepShadow, 0.48);
    ctx.beginPath();
    ctx.arc(CX + side * (lipW - 1), cornerY + 0.5, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 10. Front Hair Framing, Scalp Partings & Laid Edges
  drawHairFront(ctx, model);

  // 11. Subtle Active Zone Target Hint (when requested)
  if (activeZoneHighlight) {
    drawTargetZoneHint(ctx, activeZoneHighlight, model);
  }
}
