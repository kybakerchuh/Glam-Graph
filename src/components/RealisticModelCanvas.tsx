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
import {
  CX,
  drawModelPortrait,
  getModelFeatures,
  hexToRgba,
  PORTRAIT_H as H,
  PORTRAIT_W as W,
} from '../utils/portraitRenderer';

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

function getZoneGuidePoints(model: ModelProfile): { zone: MakeupZoneId; label: string; x: number; y: number }[] {
  const f = getModelFeatures(model);
  return [
    { zone: 'foundation', label: 'Foundation (All-Over)', x: CX, y: f.foreheadY + 24 },
    { zone: 'eyebrows', label: 'Eyebrows', x: CX - f.browArchX - 14, y: f.browY - 16 },
    { zone: 'eyeshadow_crease', label: 'Eye Crease', x: CX + f.eyeDx + 18, y: f.eyeY - 20 },
    { zone: 'eyeshadow_lid', label: 'Eyelid', x: CX - f.eyeDx, y: f.eyeY - 8 },
    { zone: 'eyeliner', label: 'Lash Line / Wing', x: CX + f.eyeDx + 26, y: f.eyeY + 4 },
    { zone: 'mascara', label: 'Lashes (Mascara)', x: CX - f.eyeDx - 14, y: f.eyeY + 10 },
    { zone: 'concealer', label: 'Under-Eye Concealer', x: CX + f.eyeDx + 2, y: f.eyeY + 28 },
    { zone: 'highlighter', label: 'Cheekbone Highlight', x: CX - (f.cheekWidth - 10), y: f.cheekY + 42 },
    { zone: 'blush', label: 'Cheek Blush', x: CX + (f.cheekWidth - 18), y: f.cheekY + 62 },
    { zone: 'contour', label: 'Cheek Hollow Contour', x: CX - (f.cheekWidth - 12), y: f.cheekY + 86 },
    { zone: 'lipliner', label: 'Lip Liner / Cupid’s Bow', x: CX, y: f.mouthY - 20 },
    { zone: 'lipstick', label: 'Lipstick', x: CX, y: f.mouthY + 8 },
    { zone: 'lipgloss', label: 'Lip Gloss', x: CX + f.lipWidth + 6, y: f.mouthY + 18 },
  ];
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
            {getZoneGuidePoints(model).map((pt) => {
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
