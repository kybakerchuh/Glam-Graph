import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { BookmarkPlus, Eye, RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  AppliedMakeupState,
  BrushSize,
  MakeupToolMode,
  MakeupZoneId,
  ModelProfile,
} from '../types';

export interface RealisticModelCanvasHandle {
  exportFigureSnapshot: () => {
    thumbnailDataUrl: string;
    zoneMasks: Record<string, string>;
  };
  loadSavedMasks: (zoneMasks: Record<string, string>) => Promise<void>;
}

interface Props {
  model: ModelProfile;
  makeup: AppliedMakeupState;
  activeZone: MakeupZoneId;
  activeShadeHex: string;
  brushSize: BrushSize;
  toolMode: MakeupToolMode;
  showGuide: boolean;
  onToggleGuide: () => void;
  onStrokeApplied: (zone: MakeupZoneId, hasAnyPixels: boolean) => void;
  onClearZone: (zone: MakeupZoneId) => void;
  onSaveLookClick?: () => void;
  clearAllSignal: number;
  clearZoneSignal: { zone: MakeupZoneId; seq: number } | null;
}

const W = 540;
const H = 640;

const CX = 270;
const EYE_Y = 264;
const EYE_DX = 60;
const BROW_Y = 230;
const NOSE_TIP_Y = 336;
const MOUTH_Y = 398;

const ALL_ZONES: MakeupZoneId[] = [
  'foundation',
  'concealer',
  'contour',
  'blush',
  'highlighter',
  'eyebrows',
  'eyeshadow_lid',
  'eyeshadow_crease',
  'eyeliner',
  'mascara',
  'lipliner',
  'lipstick',
  'lipgloss',
];

const ZONE_GUIDE_POINTS: { zone: MakeupZoneId; label: string; x: number; y: number }[] = [
  { zone: 'foundation', label: 'Foundation (All-Over)', x: 270, y: 158 },
  { zone: 'eyebrows', label: 'Eyebrows', x: 184, y: 214 },
  { zone: 'eyeshadow_crease', label: 'Eye Crease', x: 348, y: 244 },
  { zone: 'eyeshadow_lid', label: 'Eyelid', x: 210, y: 256 },
  { zone: 'eyeliner', label: 'Lash Line / Wing', x: 356, y: 268 },
  { zone: 'mascara', label: 'Lashes (Mascara)', x: 196, y: 274 },
  { zone: 'concealer', label: 'Under-Eye Concealer', x: 332, y: 292 },
  { zone: 'highlighter', label: 'Cheekbone Highlight', x: 162, y: 306 },
  { zone: 'blush', label: 'Cheek Blush', x: 368, y: 326 },
  { zone: 'contour', label: 'Cheek Hollow Contour', x: 168, y: 352 },
  { zone: 'lipliner', label: 'Lip Liner / Cupid’s Bow', x: 270, y: 378 },
  { zone: 'lipstick', label: 'Lipstick', x: 270, y: 406 },
  { zone: 'lipgloss', label: 'Lip Gloss', x: 318, y: 416 },
];

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getBrushRadiusPx(zone: MakeupZoneId, size: BrushSize): number {
  const scale = size === 'fine' ? 0.68 : size === 'fluffy' ? 1.4 : 1.0;
  switch (zone) {
    case 'foundation':
      return Math.round(44 * scale);
    case 'concealer':
    case 'contour':
    case 'blush':
      return Math.round(32 * scale);
    case 'highlighter':
      return Math.round(24 * scale);
    case 'eyeshadow_lid':
    case 'eyeshadow_crease':
      return Math.round(19 * scale);
    case 'eyebrows':
    case 'mascara':
    case 'lipstick':
    case 'lipgloss':
      return Math.round(16 * scale);
    case 'eyeliner':
    case 'lipliner':
      return Math.round(13 * scale);
  }
}

function isZoneHardEdge(zone: MakeupZoneId): boolean {
  return zone === 'eyeliner' || zone === 'lipliner' || zone === 'mascara' || zone === 'eyebrows';
}

function createOffscreenCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

function drawFacePath(ctx: CanvasRenderingContext2D, model: ModelProfile) {
  const jawWidth =
    model.faceShape === 'round' ? 112 : model.faceShape === 'oval' ? 102 : model.faceShape === 'heart' ? 100 : 104;
  const cheekWidth =
    model.faceShape === 'round' ? 120 : model.faceShape === 'sculpted' ? 116 : 114;
  const chinSharp = model.faceShape === 'heart' ? 28 : model.faceShape === 'round' ? 40 : 34;

  ctx.beginPath();
  ctx.moveTo(CX, 134);
  ctx.bezierCurveTo(CX + 78, 134, CX + cheekWidth, 180, CX + cheekWidth, 260);
  ctx.bezierCurveTo(CX + cheekWidth, 326, CX + jawWidth, 385, CX + chinSharp, 434);
  ctx.bezierCurveTo(CX + 14, 448, CX - 14, 448, CX - chinSharp, 434);
  ctx.bezierCurveTo(CX - jawWidth, 385, CX - cheekWidth, 326, CX - cheekWidth, 260);
  ctx.bezierCurveTo(CX - cheekWidth, 180, CX - 78, 134, CX, 134);
  ctx.closePath();
}

function drawHairBack(ctx: CanvasRenderingContext2D, model: ModelProfile) {
  const { hairBase, hairHighlight, hairShadow } = model.palette;
  ctx.save();
  const grad = ctx.createLinearGradient(CX, 70, CX, 620);
  grad.addColorStop(0, hairHighlight);
  grad.addColorStop(0.45, hairBase);
  grad.addColorStop(1, hairShadow);
  ctx.fillStyle = grad;

  if (model.hairStyle === 'afro') {
    ctx.beginPath();
    ctx.arc(CX, 226, 178, 0, Math.PI * 2);
    ctx.fill();
    for (let a = 0; a < Math.PI * 2; a += 0.34) {
      const rx = CX + Math.cos(a) * 165;
      const ry = 225 + Math.sin(a) * 160;
      ctx.beginPath();
      ctx.arc(rx, ry, 34, 0, Math.PI * 2);
      ctx.fillStyle = a % 0.68 < 0.34 ? hairBase : hairShadow;
      ctx.fill();
    }
  } else if (model.hairStyle === 'curls') {
    ctx.beginPath();
    ctx.moveTo(CX - 165, 220);
    ctx.bezierCurveTo(CX - 205, 320, CX - 190, 480, CX - 150, 590);
    ctx.lineTo(CX + 150, 590);
    ctx.bezierCurveTo(CX + 190, 480, CX + 205, 320, CX + 165, 220);
    ctx.bezierCurveTo(CX + 155, 85, CX - 155, 85, CX - 165, 220);
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      const y = 180 + i * 44;
      ctx.fillStyle = i % 2 === 0 ? hairShadow : hairBase;
      ctx.beginPath();
      ctx.arc(CX - 138 - (i % 2) * 12, y, 30, 0, Math.PI * 2);
      ctx.arc(CX + 138 + (i % 2) * 12, y, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (model.hairStyle === 'bob') {
    ctx.beginPath();
    ctx.moveTo(CX - 140, 210);
    ctx.bezierCurveTo(CX - 165, 320, CX - 148, 435, CX - 102, 465);
    ctx.lineTo(CX + 102, 465);
    ctx.bezierCurveTo(CX + 148, 435, CX + 165, 320, CX + 140, 210);
    ctx.bezierCurveTo(CX + 130, 88, CX - 130, 88, CX - 140, 210);
    ctx.fill();
  } else if (model.hairStyle === 'braids') {
    ctx.beginPath();
    ctx.ellipse(CX, 200, 128, 108, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const side of [-1, 1]) {
      for (let col = 0; col < 4; col++) {
        const bx = CX + side * (104 + col * 14);
        ctx.strokeStyle = col % 2 === 0 ? hairBase : hairShadow;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, 185 + col * 8);
        ctx.quadraticCurveTo(bx + side * 8, 390, bx - side * 4, 610);
        ctx.stroke();

        // Subtle woven braid highlight notches
        ctx.strokeStyle = hexToRgba(hairHighlight, 0.35);
        ctx.lineWidth = 2;
        for (let y = 240; y < 590; y += 26) {
          ctx.beginPath();
          ctx.moveTo(bx - 4, y);
          ctx.lineTo(bx + 4, y + 7);
          ctx.stroke();
        }
      }
    }
  } else if (model.hairStyle === 'updo') {
    // High top-knot bun with sleek pulled-back crown
    ctx.beginPath();
    ctx.ellipse(CX, 165, 118, 72, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Sculpted high bun above crown
    const bunGrad = ctx.createRadialGradient(CX - 14, 60, 8, CX, 74, 64);
    bunGrad.addColorStop(0, hairHighlight);
    bunGrad.addColorStop(0.55, hairBase);
    bunGrad.addColorStop(1, hairShadow);
    ctx.fillStyle = bunGrad;
    ctx.beginPath();
    ctx.ellipse(CX, 74, 58, 46, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(hairShadow, 0.55);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(CX, 74, 42, 24, -0.15, 0.2, Math.PI * 1.45);
    ctx.stroke();
  } else if (model.hairStyle === 'sleek') {
    // Smooth glass-straight silhouette with glossy vertical sheen
    ctx.beginPath();
    ctx.moveTo(CX - 134, 215);
    ctx.bezierCurveTo(CX - 146, 355, CX - 146, 515, CX - 134, 625);
    ctx.lineTo(CX + 134, 625);
    ctx.bezierCurveTo(CX + 146, 515, CX + 146, 355, CX + 134, 215);
    ctx.bezierCurveTo(CX + 130, 88, CX - 130, 88, CX - 134, 215);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(hairHighlight, 0.28);
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(CX + side * 124, 240);
      ctx.lineTo(CX + side * 128, 600);
      ctx.stroke();
    }
  } else {
    // Soft S-curved cascading waves
    ctx.beginPath();
    ctx.moveTo(CX - 144, 218);
    ctx.bezierCurveTo(CX - 186, 305, CX - 145, 395, CX - 178, 480);
    ctx.bezierCurveTo(CX - 190, 535, CX - 160, 585, CX - 146, 624);
    ctx.lineTo(CX + 146, 624);
    ctx.bezierCurveTo(CX + 160, 585, CX + 190, 535, CX + 178, 480);
    ctx.bezierCurveTo(CX + 145, 395, CX + 186, 305, CX + 144, 218);
    ctx.bezierCurveTo(CX + 138, 88, CX - 138, 88, CX - 144, 218);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(hairHighlight, 0.24);
    ctx.lineWidth = 3.2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(CX + side * 134, 260);
      ctx.bezierCurveTo(
        CX + side * 165,
        340,
        CX + side * 128,
        420,
        CX + side * 155,
        540
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHairFront(ctx: CanvasRenderingContext2D, model: ModelProfile) {
  const { hairBase, hairHighlight, hairShadow } = model.palette;
  ctx.save();
  const crownGrad = ctx.createLinearGradient(CX, 90, CX, 220);
  crownGrad.addColorStop(0, hairHighlight);
  crownGrad.addColorStop(0.6, hairBase);
  crownGrad.addColorStop(1, hairShadow);
  ctx.fillStyle = crownGrad;

  if (model.hairStyle === 'braids') {
    ctx.beginPath();
    ctx.moveTo(CX, 132);
    ctx.bezierCurveTo(CX + 46, 134, CX + 102, 162, CX + 116, 226);
    ctx.bezierCurveTo(CX + 124, 175, CX + 105, 112, CX, 102);
    ctx.bezierCurveTo(CX - 105, 112, CX - 124, 175, CX - 116, 226);
    ctx.bezierCurveTo(CX - 102, 162, CX - 46, 134, CX, 132);
    ctx.fill();
  } else if (model.hairStyle === 'afro') {
    ctx.beginPath();
    ctx.moveTo(CX - 105, 198);
    ctx.bezierCurveTo(CX - 86, 136, CX + 86, 136, CX + 105, 198);
    ctx.bezierCurveTo(CX + 125, 145, CX + 95, 92, CX, 88);
    ctx.bezierCurveTo(CX - 95, 92, CX - 125, 145, CX - 105, 198);
    ctx.fill();
  } else if (model.hairStyle === 'updo') {
    // Sleek pulled-back hairline revealing ears & face contour
    ctx.beginPath();
    ctx.moveTo(CX, 132);
    ctx.bezierCurveTo(CX + 56, 134, CX + 100, 168, CX + 110, 232);
    ctx.bezierCurveTo(CX + 114, 172, CX + 96, 102, CX, 96);
    ctx.bezierCurveTo(CX - 96, 102, CX - 114, 172, CX - 110, 232);
    ctx.bezierCurveTo(CX - 100, 168, CX - 56, 134, CX, 132);
    ctx.fill();
  } else if (model.hairStyle === 'curls') {
    ctx.beginPath();
    ctx.moveTo(CX - 4, 132);
    ctx.bezierCurveTo(CX + 58, 135, CX + 112, 180, CX + 124, 260);
    ctx.bezierCurveTo(CX + 140, 180, CX + 118, 96, CX, 92);
    ctx.bezierCurveTo(CX - 118, 96, CX - 140, 180, CX - 124, 260);
    ctx.bezierCurveTo(CX - 112, 180, CX - 58, 135, CX - 4, 132);
    ctx.fill();
    for (const side of [-1, 1]) {
      ctx.fillStyle = hairBase;
      ctx.beginPath();
      ctx.arc(CX + side * 102, 160, 20, 0, Math.PI * 2);
      ctx.arc(CX + side * 116, 204, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(CX - 4, 132);
    ctx.bezierCurveTo(CX + 58, 135, CX + 110, 178, CX + 122, 260);
    ctx.bezierCurveTo(CX + 135, 182, CX + 115, 100, CX, 96);
    ctx.bezierCurveTo(CX - 115, 100, CX - 135, 182, CX - 122, 260);
    ctx.bezierCurveTo(CX - 110, 178, CX - 58, 135, CX - 4, 132);
    ctx.fill();
  }

  ctx.strokeStyle = hexToRgba(hairHighlight, 0.32);
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + side * 22, 114);
    ctx.quadraticCurveTo(CX + side * 85, 132, CX + side * 112, 218);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Helper to draw a full-zone makeup pigment onto a scratch canvas, mask it by the user's
 * physical brush strokes in `maskCanvas`, and composite onto the main canvas.
 */
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
  sCtx.clearRect(0, 0, W, H);
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
      ctx.ellipse(CX + side * EYE_DX, EYE_Y + 25, 36, 17, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (zone === 'contour') {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(CX + side * 86, 336);
      ctx.rotate(side * -0.45);
      ctx.beginPath();
      ctx.ellipse(0, 0, 44, 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (zone === 'blush') {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(CX + side * 74, 320);
      ctx.rotate(side * -0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (zone === 'highlighter') {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(CX + side * 76, 300);
      ctx.rotate(side * -0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(CX, NOSE_TIP_Y - 12, 8, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (zone === 'eyebrows') {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(CX + side * 62, BROW_Y - 2, 38, 12, side * -0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (zone === 'eyeshadow_lid' || zone === 'eyeshadow_crease' || zone === 'eyeliner' || zone === 'mascara') {
    const dy = zone === 'eyeshadow_crease' ? -12 : zone === 'eyeliner' ? -2 : -4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(CX + side * EYE_DX, EYE_Y + dy, 34, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (zone === 'lipliner' || zone === 'lipstick' || zone === 'lipgloss') {
    ctx.beginPath();
    ctx.ellipse(CX, MOUTH_Y + 2, 46, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawModelPortrait(
  ctx: CanvasRenderingContext2D,
  scratchCanvas: HTMLCanvasElement,
  model: ModelProfile,
  makeup: AppliedMakeupState,
  zoneMasks: Partial<Record<MakeupZoneId, HTMLCanvasElement>>,
  activeZoneHighlight?: MakeupZoneId
) {
  const p = model.palette;

  // 1. Studio Backdrop
  const bg = ctx.createRadialGradient(CX, 270, 40, CX, 320, 440);
  bg.addColorStop(0, '#FDFBF9');
  bg.addColorStop(0.65, '#F3EDE6');
  bg.addColorStop(1, '#E6DDD3');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 2. Hair Back
  drawHairBack(ctx, model);

  // 3. Neck & Shoulders
  ctx.save();
  const neckGrad = ctx.createLinearGradient(CX, 415, CX, 640);
  neckGrad.addColorStop(0, p.shadow);
  neckGrad.addColorStop(0.22, p.midtone);
  neckGrad.addColorStop(0.55, p.base);
  neckGrad.addColorStop(1, p.midtone);
  ctx.fillStyle = neckGrad;

  ctx.beginPath();
  ctx.moveTo(CX - 54, 405);
  ctx.lineTo(CX - 52, 476);
  ctx.bezierCurveTo(CX - 76, 512, CX - 168, 526, CX - 220, 560);
  ctx.lineTo(CX - 220, H);
  ctx.lineTo(CX + 220, H);
  ctx.lineTo(CX + 220, 560);
  ctx.bezierCurveTo(CX + 168, 526, CX + 76, 512, CX + 52, 476);
  ctx.lineTo(CX + 54, 405);
  ctx.closePath();
  ctx.fill();

  const chinShadow = ctx.createRadialGradient(CX, 434, 8, CX, 448, 68);
  chinShadow.addColorStop(0, hexToRgba(p.deepShadow, 0.55));
  chinShadow.addColorStop(1, hexToRgba(p.deepShadow, 0));
  ctx.fillStyle = chinShadow;
  ctx.fillRect(CX - 75, 420, 150, 70);

  ctx.strokeStyle = hexToRgba(p.highlight, 0.55);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(CX - 34, 540);
  ctx.quadraticCurveTo(CX - 95, 536, CX - 150, 548);
  ctx.moveTo(CX + 34, 540);
  ctx.quadraticCurveTo(CX + 95, 536, CX + 150, 548);
  ctx.stroke();

  const topGrad = ctx.createLinearGradient(CX, 578, CX, H);
  topGrad.addColorStop(0, '#2B2523');
  topGrad.addColorStop(1, '#171413');
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.moveTo(CX - 155, H);
  ctx.lineTo(CX - 138, 576);
  ctx.quadraticCurveTo(CX, 616, CX + 138, 576);
  ctx.lineTo(CX + 155, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. Ears
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.fillStyle = p.midtone;
    ctx.beginPath();
    ctx.ellipse(CX + side * 116, 286, 13, 28, side * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexToRgba(p.shadow, 0.6);
    ctx.beginPath();
    ctx.ellipse(CX + side * 115, 288, 6, 16, side * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Face Base & Skin Layers (clipped to face)
  ctx.save();
  drawFacePath(ctx, model);
  ctx.clip();

  const skinGrad = ctx.createRadialGradient(CX, 270, 20, CX, 285, 185);
  skinGrad.addColorStop(0, p.highlight);
  skinGrad.addColorStop(0.52, p.base);
  skinGrad.addColorStop(0.86, p.midtone);
  skinGrad.addColorStop(1, p.shadow);
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 120, W, 360);

  // Foundation (painted where cursor brushed)
  const fnd = makeup.foundation;
  if (fnd) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.foundation, (sCtx) => {
      sCtx.fillStyle = hexToRgba(fnd.hex, fnd.opacity * 0.78);
      sCtx.fillRect(0, 120, W, 360);
    });
  }

  // Natural facial sculpting
  for (const side of [-1, 1]) {
    const templeShadow = ctx.createRadialGradient(CX + side * 105, 215, 5, CX + side * 105, 220, 62);
    templeShadow.addColorStop(0, hexToRgba(p.shadow, 0.38));
    templeShadow.addColorStop(1, hexToRgba(p.shadow, 0));
    ctx.fillStyle = templeShadow;
    ctx.fillRect(CX - 150, 130, 300, 200);

    const cheekGlow = ctx.createRadialGradient(CX + side * 66, 316, 4, CX + side * 66, 316, 52);
    cheekGlow.addColorStop(0, hexToRgba(p.blushNatural, 0.16));
    cheekGlow.addColorStop(1, hexToRgba(p.blushNatural, 0));
    ctx.fillStyle = cheekGlow;
    ctx.fillRect(CX - 140, 250, 280, 140);
  }

  // Concealer (cursor-painted)
  const cnc = makeup.concealer;
  if (cnc) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.concealer, (sCtx) => {
      const alpha = cnc.opacity;
      for (const side of [-1, 1]) {
        const cg = sCtx.createRadialGradient(CX + side * EYE_DX, EYE_Y + 24, 4, CX + side * EYE_DX, EYE_Y + 26, 46);
        cg.addColorStop(0, hexToRgba(cnc.hex, alpha * 0.9));
        cg.addColorStop(0.6, hexToRgba(cnc.hex, alpha * 0.4));
        cg.addColorStop(1, hexToRgba(cnc.hex, 0));
        sCtx.fillStyle = cg;
        sCtx.fillRect(CX - 135, EYE_Y - 8, 270, 90);
      }
      const centerCnc = sCtx.createRadialGradient(CX, 206, 4, CX, 206, 46);
      centerCnc.addColorStop(0, hexToRgba(cnc.hex, alpha * 0.55));
      centerCnc.addColorStop(1, hexToRgba(cnc.hex, 0));
      sCtx.fillStyle = centerCnc;
      sCtx.fillRect(CX - 65, 150, 130, 110);
      // Chin brightener
      const chinCnc = sCtx.createRadialGradient(CX, 424, 2, CX, 424, 26);
      chinCnc.addColorStop(0, hexToRgba(cnc.hex, alpha * 0.48));
      chinCnc.addColorStop(1, hexToRgba(cnc.hex, 0));
      sCtx.fillStyle = chinCnc;
      sCtx.fillRect(CX - 40, 395, 80, 55);
    });
  }

  // Contour & Bronzer (cursor-painted)
  const cnt = makeup.contour;
  if (cnt) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.contour, (sCtx) => {
      const alpha = cnt.opacity;
      for (const side of [-1, 1]) {
        sCtx.save();
        sCtx.translate(CX + side * 86, 336);
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

        // Forehead temple bronze
        const tGrad = sCtx.createRadialGradient(CX + side * 95, 176, 5, CX + side * 95, 176, 62);
        tGrad.addColorStop(0, hexToRgba(cnt.hex, alpha * 0.56));
        tGrad.addColorStop(1, hexToRgba(cnt.hex, 0));
        sCtx.fillStyle = tGrad;
        sCtx.fillRect(CX - 140, 120, 280, 130);

        // Jawline contour
        const jGrad = sCtx.createRadialGradient(CX + side * 78, 395, 4, CX + side * 78, 395, 44);
        jGrad.addColorStop(0, hexToRgba(cnt.hex, alpha * 0.48));
        jGrad.addColorStop(1, hexToRgba(cnt.hex, 0));
        sCtx.fillStyle = jGrad;
        sCtx.fillRect(CX - 130, 355, 260, 85);
      }
      // Nose bridge side contour
      for (const side of [-1, 1]) {
        const nGrad = sCtx.createLinearGradient(CX + side * 8, 280, CX + side * 18, 280);
        nGrad.addColorStop(0, hexToRgba(cnt.hex, alpha * 0.38));
        nGrad.addColorStop(1, hexToRgba(cnt.hex, 0));
        sCtx.fillStyle = nGrad;
        sCtx.fillRect(CX + (side > 0 ? 7 : -18), 262, 12, 70);
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
        sCtx.translate(CX + side * 74, 320);
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
          sCtx.translate(CX + side * 76, 300);
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

          const bbGrad = sCtx.createRadialGradient(CX + side * (EYE_DX + 6), BROW_Y + 9, 1, CX + side * (EYE_DX + 6), BROW_Y + 9, 22);
          bbGrad.addColorStop(0, hexToRgba(hl.hex, alpha * 0.58));
          bbGrad.addColorStop(1, hexToRgba(hl.hex, 0));
          sCtx.fillStyle = bbGrad;
          sCtx.fillRect(CX - 130, BROW_Y - 12, 260, 44);
        }

        const nTip = sCtx.createRadialGradient(CX, NOSE_TIP_Y - 6, 1, CX, NOSE_TIP_Y - 6, 15);
        nTip.addColorStop(0, hexToRgba(hl.secondaryHex || hl.hex, alpha * 0.88));
        nTip.addColorStop(1, hexToRgba(hl.hex, 0));
        sCtx.fillStyle = nTip;
        sCtx.beginPath();
        sCtx.arc(CX, NOSE_TIP_Y - 6, 15, 0, Math.PI * 2);
        sCtx.fill();

        const nBridge = sCtx.createLinearGradient(CX, 272, CX, 328);
        nBridge.addColorStop(0, hexToRgba(hl.hex, 0));
        nBridge.addColorStop(0.5, hexToRgba(hl.secondaryHex || hl.hex, alpha * 0.6));
        nBridge.addColorStop(1, hexToRgba(hl.hex, 0));
        sCtx.fillStyle = nBridge;
        sCtx.fillRect(CX - 5, 272, 10, 56);

        const cBow = sCtx.createRadialGradient(CX, MOUTH_Y - 16, 1, CX, MOUTH_Y - 16, 14);
        cBow.addColorStop(0, hexToRgba(hl.secondaryHex || hl.hex, alpha * 0.78));
        cBow.addColorStop(1, hexToRgba(hl.hex, 0));
        sCtx.fillStyle = cBow;
        sCtx.beginPath();
        sCtx.arc(CX, MOUTH_Y - 16, 14, 0, Math.PI * 2);
        sCtx.fill();
      },
      'screen'
    );
  }

  ctx.restore(); // end face clip

  // Subtle face contour outline
  ctx.save();
  drawFacePath(ctx, model);
  ctx.strokeStyle = hexToRgba(p.deepShadow, 0.25);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // 6. Eyes: Natural Shadow + Masked Crease & Lid Eyeshadow + Sclera/Iris + Masked Eyeliner & Mascara
  for (const side of [-1, 1]) {
    const ex = CX + side * EYE_DX;
    const ey = EYE_Y;
    const sock = ctx.createRadialGradient(ex, ey - 6, 6, ex, ey - 4, 42);
    sock.addColorStop(0, hexToRgba(p.shadow, 0.35));
    sock.addColorStop(1, hexToRgba(p.shadow, 0));
    ctx.fillStyle = sock;
    ctx.beginPath();
    ctx.ellipse(ex, ey - 4, 42, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyeshadow Crease (cursor-painted)
  const crs = makeup.eyeshadow_crease;
  if (crs) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.eyeshadow_crease, (sCtx) => {
      const alpha = crs.opacity;
      for (const side of [-1, 1]) {
        const ex = CX + side * EYE_DX;
        const ey = EYE_Y;
        const cg = sCtx.createRadialGradient(ex + side * 6, ey - 13, 3, ex + side * 4, ey - 11, 38);
        cg.addColorStop(0, hexToRgba(crs.hex, alpha * 0.92));
        cg.addColorStop(0.62, hexToRgba(crs.hex, alpha * 0.48));
        cg.addColorStop(1, hexToRgba(crs.hex, 0));
        sCtx.fillStyle = cg;
        sCtx.beginPath();
        sCtx.ellipse(ex + side * 4, ey - 11, 38, 21, side * -0.14, 0, Math.PI * 2);
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
        const ex = CX + side * EYE_DX;
        const ey = EYE_Y;
        const lg = sCtx.createRadialGradient(ex, ey - 4, 2, ex, ey - 5, 33);
        lg.addColorStop(0, hexToRgba(lid.hex, alpha * 0.96));
        lg.addColorStop(0.68, hexToRgba(lid.hex, alpha * 0.56));
        lg.addColorStop(1, hexToRgba(lid.hex, 0));
        sCtx.fillStyle = lg;
        sCtx.beginPath();
        sCtx.ellipse(ex, ey - 5, 33, 16, side * -0.06, Math.PI, Math.PI * 2);
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

  // Draw Eye Apertures (Sclera + Iris + Pupil + Natural Lashes)
  for (const side of [-1, 1]) {
    const ex = CX + side * EYE_DX;
    const ey = EYE_Y;
    const tilt = model.eyeTilt;
    const innerX = ex - side * 26;
    const outerX = ex + side * 27;
    const outerY = ey - tilt * 35;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(innerX, ey + 2);
    ctx.bezierCurveTo(ex - side * 12, ey - 14, ex + side * 12, outerY - 14, outerX, outerY);
    ctx.bezierCurveTo(ex + side * 12, ey + 11, ex - side * 12, ey + 12, innerX, ey + 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();

    ctx.fillStyle = p.sclera;
    ctx.fillRect(ex - 32, ey - 20, 64, 38);

    const irisGrad = ctx.createRadialGradient(ex, ey - 1, 2, ex, ey - 1, 13.5);
    irisGrad.addColorStop(0, p.irisInner);
    irisGrad.addColorStop(0.75, p.irisOuter);
    irisGrad.addColorStop(1, '#1A1310');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(ex, ey - 1, 13.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0E0B0A';
    ctx.beginPath();
    ctx.arc(ex, ey - 1, 5.8, 0, Math.PI * 2);
    ctx.fill();

    const lidShade = ctx.createLinearGradient(ex, ey - 16, ex, ey);
    lidShade.addColorStop(0, 'rgba(20, 12, 10, 0.35)');
    lidShade.addColorStop(1, 'rgba(20, 12, 10, 0)');
    ctx.fillStyle = lidShade;
    ctx.fillRect(ex - 32, ey - 18, 64, 18);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.arc(ex - 4, ey - 5, 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(ex + 4, ey + 3, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = hexToRgba(p.deepShadow, 0.55);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(innerX + side * 3, ey - 9);
    ctx.quadraticCurveTo(ex, ey - 21, outerX - side * 2, outerY - 7);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(p.deepShadow, 0.35);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(innerX, ey + 2);
    ctx.bezierCurveTo(ex - side * 12, ey + 12, ex + side * 12, ey + 11, outerX, outerY);
    ctx.stroke();

    ctx.strokeStyle = p.lashDefault;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(innerX, ey + 2);
    ctx.bezierCurveTo(ex - side * 12, ey - 14, ex + side * 12, outerY - 14, outerX, outerY);
    ctx.stroke();

    // Bare natural lashes
    ctx.strokeStyle = hexToRgba(p.lashDefault, 0.55);
    ctx.lineWidth = 1.0;
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const lx = innerX + (outerX - innerX) * (0.14 + t * 0.84);
      const ly = ey - Math.sin(t * Math.PI) * 11.5 - t * tilt * 30;
      const len = 4.5 * (0.55 + t * 0.55);
      const flare = side * (t - 0.2) * 11;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + flare * 0.45, ly - len * 0.65, lx + flare, ly - len);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Eyeliner Layer (cursor-painted along lash line + wing!)
  const lnr = makeup.eyeliner;
  if (lnr) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.eyeliner, (sCtx) => {
      const style = lnr.style || 'classic';
      const alpha = lnr.opacity;
      sCtx.strokeStyle = hexToRgba(lnr.hex, alpha);
      sCtx.fillStyle = hexToRgba(lnr.hex, alpha);
      sCtx.lineWidth = style === 'natural' ? 2.8 : style === 'classic' ? 3.8 : 4.8;
      sCtx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const ex = CX + side * EYE_DX;
        const ey = EYE_Y;
        const tilt = model.eyeTilt;
        const innerX = ex - side * 26;
        const outerX = ex + side * 27;
        const outerY = ey - tilt * 35;

        sCtx.beginPath();
        sCtx.moveTo(innerX + side * 2, ey + 1);
        sCtx.bezierCurveTo(ex - side * 12, ey - 14.5, ex + side * 12, outerY - 14.5, outerX, outerY);
        sCtx.stroke();

        if (style === 'classic' || style === 'glam') {
          const wingLen = style === 'glam' ? 20 : 13;
          const wingLift = style === 'glam' ? 12 : 7;
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

  // Mascara & Lashes Layer (cursor-painted where wand sweeps!)
  const msc = makeup.mascara;
  if (msc) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.mascara, (sCtx) => {
      const lashStyle = msc.style || 'classic';
      const lashCount = lashStyle === 'glam' ? 16 : lashStyle === 'classic' ? 13 : 10;
      const maxLen = lashStyle === 'glam' ? 15 : lashStyle === 'classic' ? 11 : 8;
      sCtx.strokeStyle = hexToRgba(msc.hex, msc.opacity);
      sCtx.lineCap = 'round';

      for (const side of [-1, 1]) {
        const ex = CX + side * EYE_DX;
        const ey = EYE_Y;
        const tilt = model.eyeTilt;
        const innerX = ex - side * 26;
        const outerX = ex + side * 27;

        sCtx.lineWidth = lashStyle === 'glam' ? 2.1 : 1.6;
        for (let i = 0; i < lashCount; i++) {
          const t = i / (lashCount - 1);
          const lx = innerX + (outerX - innerX) * (0.14 + t * 0.84);
          const ly = ey - Math.sin(t * Math.PI) * 11.5 - t * tilt * 30;
          const len = maxLen * (0.55 + t * 0.55);
          const flare = side * (t - 0.2) * 11;
          sCtx.beginPath();
          sCtx.moveTo(lx, ly);
          sCtx.quadraticCurveTo(lx + flare * 0.45, ly - len * 0.65, lx + flare, ly - len);
          sCtx.stroke();
        }

        sCtx.lineWidth = 1.1;
        for (let i = 0; i < 7; i++) {
          const t = i / 6;
          const lx = innerX + (outerX - innerX) * (0.25 + t * 0.68);
          const ly = ey + 7 + Math.sin(t * Math.PI) * 3;
          sCtx.beginPath();
          sCtx.moveTo(lx, ly);
          sCtx.lineTo(lx + side * (t * 3), ly + (lashStyle === 'glam' ? 6 : 4));
          sCtx.stroke();
        }
      }
    });
  }

  // 7. Eyebrows (Natural + Cursor-Painted Eyebrow Pencil/Gel)
  for (const side of [-1, 1]) {
    const bx0 = CX + side * 26;
    const bxArch = CX + side * 72;
    const bxTail = CX + side * 100;
    const archH = 12 * model.browArch;

    ctx.save();
    ctx.fillStyle = hexToRgba(p.browDefault, 0.36);
    ctx.beginPath();
    ctx.moveTo(bx0, BROW_Y + 4);
    ctx.quadraticCurveTo(bxArch, BROW_Y - archH - 4, bxTail, BROW_Y + 3);
    ctx.quadraticCurveTo(bxArch, BROW_Y - archH + 5, bx0, BROW_Y + 11);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = hexToRgba(p.browDefault, 0.65);
    ctx.lineWidth = 1.15;
    ctx.lineCap = 'round';
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const sx = bx0 + (bxTail - bx0) * t;
      const sy = BROW_Y + 7 - Math.sin(t * Math.PI) * archH * 0.85;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 2);
      ctx.lineTo(sx + side * 4.5, sy - 6.5 * (1 - t * 0.45));
      ctx.stroke();
    }
    ctx.restore();
  }

  const brw = makeup.eyebrows;
  if (brw) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.eyebrows, (sCtx) => {
      for (const side of [-1, 1]) {
        const bx0 = CX + side * 26;
        const bxArch = CX + side * 72;
        const bxTail = CX + side * 100;
        const archH = 12 * model.browArch;

        sCtx.fillStyle = hexToRgba(brw.hex, brw.opacity * 0.58);
        sCtx.beginPath();
        sCtx.moveTo(bx0, BROW_Y + 4);
        sCtx.quadraticCurveTo(bxArch, BROW_Y - archH - 4, bxTail, BROW_Y + 3);
        sCtx.quadraticCurveTo(bxArch, BROW_Y - archH + 5, bx0, BROW_Y + 11);
        sCtx.closePath();
        sCtx.fill();

        sCtx.strokeStyle = hexToRgba(brw.hex, brw.opacity);
        sCtx.lineWidth = 1.65;
        sCtx.lineCap = 'round';
        for (let i = 0; i <= 16; i++) {
          const t = i / 16;
          const sx = bx0 + (bxTail - bx0) * t;
          const sy = BROW_Y + 7 - Math.sin(t * Math.PI) * archH * 0.85;
          sCtx.beginPath();
          sCtx.moveTo(sx, sy + 2);
          sCtx.lineTo(sx + side * 4.5, sy - 6.8 * (1 - t * 0.45));
          sCtx.stroke();
        }
      }
    });
  }

  // 8. Nose Shading & Nostrils
  ctx.save();
  const underNose = ctx.createRadialGradient(CX, NOSE_TIP_Y + 6, 3, CX, NOSE_TIP_Y + 6, 20);
  underNose.addColorStop(0, hexToRgba(p.deepShadow, 0.45));
  underNose.addColorStop(1, hexToRgba(p.deepShadow, 0));
  ctx.fillStyle = underNose;
  ctx.beginPath();
  ctx.ellipse(CX, NOSE_TIP_Y + 6, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [-1, 1]) {
    ctx.strokeStyle = hexToRgba(p.shadow, 0.45);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CX + side * 9, 272);
    ctx.quadraticCurveTo(CX + side * 11, 314, CX + side * 15, NOSE_TIP_Y + 1);
    ctx.stroke();

    ctx.fillStyle = hexToRgba(p.deepShadow, 0.62);
    ctx.beginPath();
    ctx.ellipse(CX + side * 10, NOSE_TIP_Y + 7, 4.5, 2.3, side * -0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 9. Lips (Natural + Cursor-Painted Lipstick + Lip Liner + Lip Gloss)
  const full = model.lipFullness;
  const lipW = 42;
  const lipTopPeak = 11 * full;
  const lipBotDepth = 15 * full;

  const traceUpperLip = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(CX - lipW, MOUTH_Y);
    c.bezierCurveTo(CX - 22, MOUTH_Y - lipTopPeak, CX - 11, MOUTH_Y - lipTopPeak - 2, CX, MOUTH_Y - lipTopPeak + 4);
    c.bezierCurveTo(CX + 11, MOUTH_Y - lipTopPeak - 2, CX + 22, MOUTH_Y - lipTopPeak, CX + lipW, MOUTH_Y);
    c.quadraticCurveTo(CX + 15, MOUTH_Y + 2, CX, MOUTH_Y + 3);
    c.quadraticCurveTo(CX - 15, MOUTH_Y + 2, CX - lipW, MOUTH_Y);
    c.closePath();
  };

  const traceLowerLip = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(CX - lipW + 1, MOUTH_Y);
    c.quadraticCurveTo(CX - 15, MOUTH_Y + 2, CX, MOUTH_Y + 3);
    c.quadraticCurveTo(CX + 15, MOUTH_Y + 2, CX + lipW - 1, MOUTH_Y);
    c.bezierCurveTo(CX + 28, MOUTH_Y + lipBotDepth + 3, CX + 12, MOUTH_Y + lipBotDepth + 6, CX, MOUTH_Y + lipBotDepth + 6);
    c.bezierCurveTo(CX - 12, MOUTH_Y + lipBotDepth + 6, CX - 28, MOUTH_Y + lipBotDepth + 3, CX - lipW + 1, MOUTH_Y);
    c.closePath();
  };

  const underLip = ctx.createRadialGradient(CX, MOUTH_Y + lipBotDepth + 9, 2, CX, MOUTH_Y + lipBotDepth + 9, 26);
  underLip.addColorStop(0, hexToRgba(p.deepShadow, 0.35));
  underLip.addColorStop(1, hexToRgba(p.deepShadow, 0));
  ctx.fillStyle = underLip;
  ctx.fillRect(CX - 34, MOUTH_Y + lipBotDepth, 68, 24);

  ctx.save();
  traceUpperLip(ctx);
  ctx.fillStyle = p.naturalLipUpper;
  ctx.fill();
  traceLowerLip(ctx);
  ctx.fillStyle = p.naturalLipLower;
  ctx.fill();

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
        const sat = sCtx.createRadialGradient(CX, MOUTH_Y + lipBotDepth * 0.52, 2, CX, MOUTH_Y + lipBotDepth * 0.52, 24);
        sat.addColorStop(0, 'rgba(255,255,255,0.22)');
        sat.addColorStop(1, 'rgba(255,255,255,0)');
        sCtx.fillStyle = sat;
        traceLowerLip(sCtx);
        sCtx.fill();
      }
    });
  }

  const lpl = makeup.lipliner;
  if (lpl) {
    compositeMaskedLayer(ctx, scratchCanvas, zoneMasks.lipliner, (sCtx) => {
      sCtx.strokeStyle = hexToRgba(lpl.hex, lpl.opacity);
      sCtx.lineWidth = 3.0;
      sCtx.lineJoin = 'round';
      sCtx.lineCap = 'round';
      sCtx.beginPath();
      sCtx.moveTo(CX - lipW, MOUTH_Y);
      sCtx.bezierCurveTo(CX - 22, MOUTH_Y - lipTopPeak, CX - 11, MOUTH_Y - lipTopPeak - 2, CX, MOUTH_Y - lipTopPeak + 4);
      sCtx.bezierCurveTo(CX + 11, MOUTH_Y - lipTopPeak - 2, CX + 22, MOUTH_Y - lipTopPeak, CX + lipW, MOUTH_Y);
      sCtx.stroke();

      sCtx.beginPath();
      sCtx.moveTo(CX - lipW + 1, MOUTH_Y);
      sCtx.bezierCurveTo(CX - 28, MOUTH_Y + lipBotDepth + 3, CX - 12, MOUTH_Y + lipBotDepth + 6, CX, MOUTH_Y + lipBotDepth + 6);
      sCtx.bezierCurveTo(CX + 12, MOUTH_Y + lipBotDepth + 6, CX + 28, MOUTH_Y + lipBotDepth + 3, CX + lipW - 1, MOUTH_Y);
      sCtx.stroke();
    });
  }

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
      sCtx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      sCtx.beginPath();
      sCtx.ellipse(CX - 11, MOUTH_Y + lipBotDepth * 0.52, 9, 2.8, -0.1, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.beginPath();
      sCtx.ellipse(CX + 10, MOUTH_Y + lipBotDepth * 0.54, 6.5, 2.2, 0.12, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.fillStyle = 'rgba(255, 255, 255, 0.46)';
      sCtx.beginPath();
      sCtx.ellipse(CX - 7, MOUTH_Y - lipTopPeak * 0.42, 5, 1.5, -0.2, 0, Math.PI * 2);
      sCtx.fill();
    });
  }

  // Lip parting crease
  ctx.strokeStyle = hexToRgba(p.lipLine, 0.72);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(CX - lipW + 1, MOUTH_Y);
  ctx.quadraticCurveTo(CX - 14, MOUTH_Y + 2.5, CX, MOUTH_Y + 3.2);
  ctx.quadraticCurveTo(CX + 14, MOUTH_Y + 2.5, CX + lipW - 1, MOUTH_Y);
  ctx.stroke();
  ctx.restore();

  // 10. Front Hair Framing
  drawHairFront(ctx, model);

  // 11. Subtle Active Zone Target Hint (when requested)
  if (activeZoneHighlight) {
    drawTargetZoneHint(ctx, activeZoneHighlight, model);
  }
}

function renderCustomCursor(
  zone: MakeupZoneId,
  toolMode: MakeupToolMode,
  shadeHex: string,
  radiusPx: number
) {
  if (toolMode === 'wipe') {
    return (
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div
          className="rounded-full border-2 border-[#1C1917]/70 bg-white/65 shadow-sm"
          style={{ width: radiusPx * 2, height: radiusPx * 2 }}
        />
        <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded bg-[#1C1917] px-1.5 py-0.5 text-[10px] font-medium text-white whitespace-nowrap">
          Wipe
        </span>
      </div>
    );
  }

  const isPencil =
    zone === 'eyeliner' || zone === 'lipliner' || zone === 'eyebrows';
  const isMascara = zone === 'mascara';
  const isLipstick = zone === 'lipstick' || zone === 'lipgloss';

  return (
    <div className="relative">
      {/* Brush Dab Footprint Ring */}
      <div
        className="-translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1C1917]/40 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
        style={{
          width: Math.max(12, radiusPx * 1.45),
          height: Math.max(12, radiusPx * 1.45),
          backgroundColor: hexToRgba(shadeHex, 0.22),
        }}
      />
      {/* Realistic Tilted Makeup Tool Icon anchored at tip */}
      <svg
        width="38"
        height="38"
        viewBox="0 0 38 38"
        className="absolute left-0 top-0 -translate-x-[3px] -translate-y-[34px] drop-shadow-sm"
      >
        {isPencil ? (
          <g transform="rotate(35 4 34)">
            <rect x="3" y="4" width="6" height="24" rx="1.5" fill="#1C1917" />
            <polygon points="3,28 9,28 6,35" fill={shadeHex} stroke="#1C1917" strokeWidth="0.8" />
          </g>
        ) : isMascara ? (
          <g transform="rotate(35 6 34)">
            <rect x="5" y="2" width="3" height="18" rx="1" fill="#292524" />
            <line x1="6.5" y1="20" x2="6.5" y2="34" stroke="#1C1917" strokeWidth="1.5" />
            {[22, 24.5, 27, 29.5, 32].map((yy) => (
              <line key={yy} x1="2.5" y1={yy} x2="10.5" y2={yy} stroke={shadeHex} strokeWidth="1.7" strokeLinecap="round" />
            ))}
          </g>
        ) : isLipstick ? (
          <g transform="rotate(30 6 34)">
            <rect x="2.5" y="4" width="9" height="16" rx="1.5" fill="#C9A27E" stroke="#1C1917" strokeWidth="0.8" />
            <path d="M3,20 L11,20 L11,30 L3,34 Z" fill={shadeHex} stroke="#1C1917" strokeWidth="0.8" />
          </g>
        ) : (
          <g transform="rotate(32 7 34)">
            {/* Fluffy cosmetic brush handle + ferrule + pigmented bristles */}
            <rect x="5" y="0" width="5" height="17" rx="2" fill="#1C1917" />
            <rect x="4.2" y="16" width="6.6" height="6" rx="1" fill="#D4AF37" />
            <path
              d="M3,22 C1,29 2,35 7.5,35 C13,35 14,29 12,22 Z"
              fill={shadeHex}
              stroke="#44403C"
              strokeWidth="0.9"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

export const RealisticModelCanvas = forwardRef<RealisticModelCanvasHandle, Props>(
  (
    {
      model,
      makeup,
      activeZone,
      activeShadeHex,
      brushSize,
      toolMode,
      showGuide,
      onToggleGuide,
      onStrokeApplied,
      onClearZone,
      onSaveLookClick,
      clearAllSignal,
      clearZoneSignal,
    },
    ref
  ) => {
    const afterCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const beforeCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const zoneMasksRef = useRef<Partial<Record<MakeupZoneId, HTMLCanvasElement>>>({});

    const isBrushingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const [renderTick, setRenderTick] = useState(0);
    const [cursorPos, setCursorPos] = useState<{ pctX: number; pctY: number } | null>(null);
    const [compareBeforeAfter, setCompareBeforeAfter] = useState(false);
    const [splitPercent, setSplitPercent] = useState(50);
    const [showTargetOutline, setShowTargetOutline] = useState(true);

    const getScratch = useCallback(() => {
      if (!scratchCanvasRef.current) {
        scratchCanvasRef.current = createOffscreenCanvas();
      }
      return scratchCanvasRef.current;
    }, []);

    const getMask = useCallback((zone: MakeupZoneId) => {
      if (!zoneMasksRef.current[zone]) {
        zoneMasksRef.current[zone] = createOffscreenCanvas();
      }
      return zoneMasksRef.current[zone]!;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        exportFigureSnapshot: () => {
          const cleanCanvas = createOffscreenCanvas();
          const cleanCtx = cleanCanvas.getContext('2d');
          if (cleanCtx) {
            drawModelPortrait(cleanCtx, getScratch(), model, makeup, zoneMasksRef.current);
          }

          const thumbW = 225;
          const thumbH = 266;
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = thumbW;
          thumbCanvas.height = thumbH;
          const tCtx = thumbCanvas.getContext('2d');
          if (tCtx) {
            tCtx.drawImage(cleanCanvas, 0, 0, thumbW, thumbH);
          }
          const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.72);

          const maskW = 135;
          const maskH = 160;
          const miniCanvas = document.createElement('canvas');
          miniCanvas.width = maskW;
          miniCanvas.height = maskH;
          const mCtx = miniCanvas.getContext('2d');
          const zoneMasks: Record<string, string> = {};

          if (mCtx) {
            for (const z of ALL_ZONES) {
              const maskCanvas = zoneMasksRef.current[z];
              if (!maskCanvas || !makeup[z]) continue;
              mCtx.clearRect(0, 0, maskW, maskH);
              mCtx.drawImage(maskCanvas, 0, 0, maskW, maskH);
              const imgData = mCtx.getImageData(0, 0, maskW, maskH).data;
              let hasAlpha = false;
              for (let i = 3; i < imgData.length; i += 4) {
                if (imgData[i] > 4) {
                  hasAlpha = true;
                  break;
                }
              }
              if (hasAlpha) {
                zoneMasks[z] = miniCanvas.toDataURL('image/png');
              }
            }
          }

          return { thumbnailDataUrl, zoneMasks };
        },
        loadSavedMasks: async (savedMasks: Record<string, string>) => {
          for (const z of ALL_ZONES) {
            const m = zoneMasksRef.current[z];
            if (m) {
              m.getContext('2d')?.clearRect(0, 0, W, H);
            }
          }

          const entries = Object.entries(savedMasks);
          await Promise.all(
            entries.map(
              ([zoneKey, dataUrl]) =>
                new Promise<void>((resolve) => {
                  const zone = zoneKey as MakeupZoneId;
                  if (!ALL_ZONES.includes(zone) || !dataUrl) {
                    resolve();
                    return;
                  }
                  const img = new Image();
                  img.onload = () => {
                    const maskCanvas = getMask(zone);
                    const mCtx = maskCanvas.getContext('2d');
                    if (mCtx) {
                      mCtx.clearRect(0, 0, W, H);
                      mCtx.drawImage(img, 0, 0, W, H);
                    }
                    resolve();
                  };
                  img.onerror = () => resolve();
                  img.src = dataUrl;
                })
            )
          );
          setRenderTick((t) => t + 1);
        },
      }),
      [model, makeup, getScratch, getMask]
    );

  // Clear all masks when clearAllSignal increments
  useEffect(() => {
    if (clearAllSignal === 0) return;
    for (const z of ALL_ZONES) {
      const m = zoneMasksRef.current[z];
      if (m) {
        m.getContext('2d')?.clearRect(0, 0, W, H);
      }
    }
    setRenderTick((t) => t + 1);
  }, [clearAllSignal]);

  // Clear single zone mask when clearZoneSignal changes
  useEffect(() => {
    if (!clearZoneSignal) return;
    const m = zoneMasksRef.current[clearZoneSignal.zone];
    if (m) {
      m.getContext('2d')?.clearRect(0, 0, W, H);
    }
    setRenderTick((t) => t + 1);
  }, [clearZoneSignal]);

  // Render After Portrait
  useEffect(() => {
    const canvas = afterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const activeNeedsHint =
      showTargetOutline && !compareBeforeAfter && (!makeup[activeZone] || (makeup[activeZone]?.coverage ?? 0) < 0.05);
    drawModelPortrait(
      ctx,
      getScratch(),
      model,
      makeup,
      zoneMasksRef.current,
      activeNeedsHint ? activeZone : undefined
    );
  }, [model, makeup, activeZone, showTargetOutline, compareBeforeAfter, renderTick, getScratch]);

  // Render Before Portrait
  useEffect(() => {
    if (!compareBeforeAfter) return;
    const canvas = beforeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawModelPortrait(ctx, getScratch(), model, {}, {});
  }, [model, compareBeforeAfter, getScratch]);

  const stampBrushSegment = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      const mask = getMask(activeZone);
      const mCtx = mask.getContext('2d');
      if (!mCtx) return;

      const r = getBrushRadiusPx(activeZone, brushSize);
      const hard = isZoneHardEdge(activeZone);
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const step = Math.max(2, r * 0.25);
      const steps = Math.max(1, Math.ceil(dist / step));

      mCtx.save();
      if (toolMode === 'wipe') {
        mCtx.globalCompositeOperation = 'destination-out';
      } else {
        mCtx.globalCompositeOperation = 'source-over';
      }

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;

        if (hard) {
          const g = mCtx.createRadialGradient(px, py, r * 0.35, px, py, r);
          g.addColorStop(0, 'rgba(0,0,0,0.85)');
          g.addColorStop(0.75, 'rgba(0,0,0,0.45)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          mCtx.fillStyle = g;
        } else {
          const g = mCtx.createRadialGradient(px, py, 1, px, py, r);
          g.addColorStop(0, 'rgba(0,0,0,0.52)');
          g.addColorStop(0.55, 'rgba(0,0,0,0.22)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          mCtx.fillStyle = g;
        }

        mCtx.beginPath();
        mCtx.arc(px, py, r, 0, Math.PI * 2);
        mCtx.fill();
      }
      mCtx.restore();

      setRenderTick((v) => v + 1);
      onStrokeApplied(activeZone, toolMode === 'apply');
    },
    [activeZone, brushSize, toolMode, getMask, onStrokeApplied]
  );

  const pointerToCoords = (clientX: number, clientY: number) => {
    const canvas = afterCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
      pctX: ((clientX - rect.left) / rect.width) * 100,
      pctY: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (compareBeforeAfter) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = pointerToCoords(e.clientX, e.clientY);
    if (!pt) return;
    isBrushingRef.current = true;
    lastPointRef.current = { x: pt.x, y: pt.y };
    setCursorPos({ pctX: pt.pctX, pctY: pt.pctY });
    stampBrushSegment(pt.x, pt.y, pt.x, pt.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = pointerToCoords(e.clientX, e.clientY);
    if (!pt) return;
    setCursorPos({ pctX: pt.pctX, pctY: pt.pctY });
    if (isBrushingRef.current && !compareBeforeAfter) {
      const prev = lastPointRef.current || { x: pt.x, y: pt.y };
      stampBrushSegment(prev.x, prev.y, pt.x, pt.y);
      lastPointRef.current = { x: pt.x, y: pt.y };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isBrushingRef.current = false;
    lastPointRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const activeLayer = makeup[activeZone];
  const radiusPx = getBrushRadiusPx(activeZone, brushSize);

  return (
    <div className="flex flex-col rounded-xl border border-[#E7E1DA] bg-white overflow-hidden">
      {/* Studio Mirror Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7E1DA] bg-[#FAF8F6] px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-[#57534E]">
          <span className="font-semibold text-[#1C1917]">{model.name}</span>
          <span aria-hidden="true">·</span>
          <span>{model.skinToneLabel}</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{model.undertoneLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleGuide}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showGuide
                ? 'bg-[#9D174D] text-white'
                : 'border border-[#D6CFC7] bg-white text-[#292524] hover:bg-[#F3EFEA]'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Face Map</span>
          </button>

          <button
            type="button"
            onClick={() => setCompareBeforeAfter((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              compareBeforeAfter
                ? 'bg-[#1C1917] text-white'
                : 'border border-[#D6CFC7] bg-white text-[#292524] hover:bg-[#F3EFEA]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{compareBeforeAfter ? 'Exit Before/After' : 'Before / After'}</span>
          </button>

          {onSaveLookClick && (
            <button
              type="button"
              onClick={onSaveLookClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#9D174D] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#831843] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              <span>Save Look</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Portrait Frame */}
      <div className="relative mx-auto w-full max-w-[460px] aspect-[540/640] select-none bg-[#F3EDE6] overflow-hidden">
        <canvas
          ref={afterCanvasRef}
          width={W}
          height={H}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => {
            isBrushingRef.current = false;
            lastPointRef.current = null;
            setCursorPos(null);
          }}
          className={`h-full w-full block touch-none ${
            compareBeforeAfter ? 'cursor-ew-resize' : 'cursor-none'
          }`}
        />

        {/* Before / After Comparison Split */}
        {compareBeforeAfter && (
          <>
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
            >
              <canvas ref={beforeCanvasRef} width={W} height={H} className="h-full w-full block" />
              <div className="absolute left-3 top-3 rounded bg-[#1C1917]/80 px-2 py-0.5 text-[11px] font-medium text-white">
                Before
              </div>
            </div>
            <div className="pointer-events-none absolute right-3 top-3 rounded bg-[#9D174D]/90 px-2 py-0.5 text-[11px] font-medium text-white">
              After
            </div>
            <div
              className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-white shadow"
              style={{ left: `${splitPercent}%` }}
            />
            <input
              type="range"
              min={5}
              max={95}
              value={splitPercent}
              onChange={(e) => setSplitPercent(Number(e.target.value))}
              aria-label="Before and after comparison slider"
              className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            />
          </>
        )}

        {/* Realistic Live Makeup Tool Cursor */}
        {!compareBeforeAfter && cursorPos && (
          <div
            className="pointer-events-none absolute z-20"
            style={{ left: `${cursorPos.pctX}%`, top: `${cursorPos.pctY}%` }}
          >
            {renderCustomCursor(activeZone, toolMode, activeShadeHex, radiusPx)}
          </div>
        )}

        {/* Makeup Anatomy Face Map Overlay */}
        {showGuide && !compareBeforeAfter && (
          <div className="pointer-events-none absolute inset-0 z-10">
            {ZONE_GUIDE_POINTS.map((pt) => {
              const isActive = pt.zone === activeZone;
              return (
                <div
                  key={pt.zone}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
                  style={{ left: `${(pt.x / W) * 100}%`, top: `${(pt.y / H) * 100}%` }}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full border border-white shadow-sm ${
                      isActive ? 'bg-[#9D174D] scale-125' : 'bg-[#1C1917]/70'
                    }`}
                  />
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium shadow-sm whitespace-nowrap ${
                      isActive
                        ? 'bg-[#9D174D] text-white'
                        : 'bg-white/90 text-[#1C1917] border border-[#E7E1DA]'
                    }`}
                  >
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Canvas Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E1DA] bg-[#FAF8F6] px-4 py-2.5">
        <p className="text-xs text-[#57534E]">
          {toolMode === 'wipe'
            ? 'Drag your cursor over any area on the face to wipe off makeup.'
            : 'Hold and drag your cursor across the model’s face to physically apply makeup.'}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTargetOutline((v) => !v)}
            className="rounded-lg border border-[#D6CFC7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#44403C] hover:bg-[#F3EFEA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showTargetOutline ? 'Hide Target Guide' : 'Show Target Guide'}
          </button>
          {activeLayer && (
            <button
              type="button"
              onClick={() => onClearZone(activeZone)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#D6CFC7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#44403C] hover:bg-[#F3EFEA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Wash Zone</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
  }
);

RealisticModelCanvas.displayName = 'RealisticModelCanvas';
