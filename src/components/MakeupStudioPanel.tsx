import React, { useState } from 'react';
import { Brush, Eraser, Lock, RotateCcw, Sparkles, Star } from 'lucide-react';
import {
  getToolInfo,
  getZoneUnlockToolId,
  HAIRSTYLE_OPTIONS,
  MAKEUP_PRODUCTS,
  MODELS,
  STARTER_ZONES,
} from '../data/makeupCatalog';
import {
  AppliedMakeupState,
  BrushSize,
  HairStyle,
  MakeupGroup,
  MakeupShade,
  MakeupStyle,
  MakeupToolMode,
  MakeupZoneId,
  ModelProfile,
  UnlockableToolId,
} from '../types';

interface Props {
  selectedModel: ModelProfile;
  onSelectModel: (model: ModelProfile) => void;
  selectedHairStyle: HairStyle;
  onSelectHairStyle: (style: HairStyle) => void;
  activeZone: MakeupZoneId;
  onSelectZone: (zone: MakeupZoneId) => void;
  loadedShades: Record<MakeupZoneId, MakeupShade>;
  makeup: AppliedMakeupState;
  unlockedShades: Set<string>;
  unlockedTools: Set<UnlockableToolId>;
  glamStars: number;
  brushSize: BrushSize;
  onChangeBrushSize: (size: BrushSize) => void;
  toolMode: MakeupToolMode;
  onChangeToolMode: (mode: MakeupToolMode) => void;
  onLoadShade: (zone: MakeupZoneId, shade: MakeupShade) => void;
  onUnlockAndLoadShade: (zone: MakeupZoneId, shade: MakeupShade) => void;
  onUnlockTool: (toolId: UnlockableToolId, onAfterUnlock?: () => void) => void;
  onUpdateOpacity: (zone: MakeupZoneId, opacity: number) => void;
  onUpdateStyle: (zone: MakeupZoneId, style: MakeupStyle) => void;
  onResetAll: () => void;
  onPromptSolveForMore: (message?: string) => void;
}

const GROUPS: MakeupGroup[] = ['Face', 'Cheeks', 'Brows & Eyes', 'Lips'];

function formatQuestionCost(cost: number): string {
  return cost === 1 ? '1 Question' : `${cost} Questions`;
}

export const MakeupStudioPanel: React.FC<Props> = ({
  selectedModel,
  onSelectModel,
  selectedHairStyle,
  onSelectHairStyle,
  activeZone,
  onSelectZone,
  loadedShades,
  makeup,
  unlockedShades,
  unlockedTools,
  glamStars,
  brushSize,
  onChangeBrushSize,
  toolMode,
  onChangeToolMode,
  onLoadShade,
  onUnlockAndLoadShade,
  onUnlockTool,
  onUpdateOpacity,
  onUpdateStyle,
  onResetAll,
  onPromptSolveForMore,
}) => {
  const activeProduct = MAKEUP_PRODUCTS.find((p) => p.zone === activeZone) || MAKEUP_PRODUCTS[0];
  const [selectedGroup, setSelectedGroup] = useState<MakeupGroup>(activeProduct.group);

  const productsInGroup = MAKEUP_PRODUCTS.filter((p) => p.group === selectedGroup);
  const currentLayer = makeup[activeZone];
  const loadedShade = loadedShades[activeZone] || activeProduct.shades[0];

  const isZoneUnlocked = (zone: MakeupZoneId): boolean => {
    if (STARTER_ZONES.includes(zone)) return true;
    const toolId = getZoneUnlockToolId(zone);
    return !toolId || unlockedTools.has(toolId);
  };

  const handleGroupClick = (group: MakeupGroup) => {
    setSelectedGroup(group);
    const unlockedInGroup = MAKEUP_PRODUCTS.find(
      (p) => p.group === group && isZoneUnlocked(p.zone)
    );
    const firstInGroup = unlockedInGroup || MAKEUP_PRODUCTS.find((p) => p.group === group);
    if (firstInGroup && firstInGroup.group !== activeProduct.group && isZoneUnlocked(firstInGroup.zone)) {
      onSelectZone(firstInGroup.zone);
    }
  };

  const handleZoneClick = (zone: MakeupZoneId) => {
    if (isZoneUnlocked(zone)) {
      onSelectZone(zone);
      return;
    }
    const toolId = getZoneUnlockToolId(zone);
    if (!toolId) return;
    const info = getToolInfo(toolId);
    if (glamStars >= info.cost) {
      onUnlockTool(toolId, () => onSelectZone(zone));
    } else {
      onPromptSolveForMore(
        `Answer ${formatQuestionCost(info.cost)} correctly to earn Glam Stars and unlock ${info.label}.`
      );
    }
  };

  const handleBrushClick = (sz: BrushSize) => {
    if (sz === 'medium') {
      onChangeBrushSize(sz);
      return;
    }
    const toolId: UnlockableToolId = sz === 'fine' ? 'brush_fine' : 'brush_fluffy';
    if (unlockedTools.has(toolId)) {
      onChangeBrushSize(sz);
      return;
    }
    const info = getToolInfo(toolId);
    if (glamStars >= info.cost) {
      onUnlockTool(toolId, () => onChangeBrushSize(sz));
    } else {
      onPromptSolveForMore(
        `Answer ${formatQuestionCost(info.cost)} correctly to unlock the ${info.label}.`
      );
    }
  };

  const handleWipeClick = () => {
    if (unlockedTools.has('tool_wipe')) {
      onChangeToolMode('wipe');
      return;
    }
    const info = getToolInfo('tool_wipe');
    if (glamStars >= info.cost) {
      onUnlockTool('tool_wipe', () => onChangeToolMode('wipe'));
    } else {
      onPromptSolveForMore(
        `Answer ${formatQuestionCost(info.cost)} correctly to unlock the ${info.label}.`
      );
    }
  };

  const handleStyleClick = (styleId: MakeupStyle) => {
    if (styleId === 'natural') {
      onUpdateStyle(activeZone, styleId);
      return;
    }
    const toolId: UnlockableToolId = styleId === 'classic' ? 'style_classic' : 'style_glam';
    if (unlockedTools.has(toolId)) {
      onUpdateStyle(activeZone, styleId);
      return;
    }
    const info = getToolInfo(toolId);
    if (glamStars >= info.cost) {
      onUnlockTool(toolId, () => onUpdateStyle(activeZone, styleId));
    } else {
      onPromptSolveForMore(
        `Answer ${formatQuestionCost(info.cost)} correctly to unlock ${info.label}.`
      );
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-[#E7E1DA] bg-white overflow-hidden">
      {/* Model Selector Header */}
      <div className="border-b border-[#E7E1DA] bg-[#FAF8F6] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <h2 className="text-sm font-semibold text-[#1C1917] font-sans">
            Choose Model (Light to Deep Skin Tones)
          </h2>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9D174D] tabular-nums">
              <Star className="h-3.5 w-3.5 fill-[#9D174D] text-[#9D174D]" />
              <span>Glam Stars: {glamStars}</span>
            </span>
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1 rounded-lg border border-[#D6CFC7] bg-white px-2.5 py-1 text-xs font-medium text-[#44403C] hover:bg-[#F3EFEA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear Face</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MODELS.map((m) => {
            const isSelected = m.id === selectedModel.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectModel(m)}
                className={`flex flex-col items-center rounded-lg border px-2 py-2 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#9D174D] bg-[#9D174D]/5 ring-1 ring-[#9D174D]'
                    : 'border-[#E7E1DA] bg-white hover:border-[#C7BEB4]'
                }`}
              >
                <span
                  className="h-7 w-7 rounded-full border border-black/15 shadow-inner mb-1"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${m.palette.highlight}, ${m.palette.base} 60%, ${m.palette.shadow})`,
                  }}
                />
                <span className="text-xs font-semibold text-[#1C1917] leading-tight">{m.name}</span>
                <span className="text-[10px] text-[#57534E] leading-tight mt-0.5 line-clamp-1">
                  {m.skinToneLabel.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hairstyle Selector for Active Model */}
        <div className="mt-3 pt-2.5 border-t border-[#E7E1DA]/80 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#44403C] whitespace-nowrap">
            {selectedModel.name}’s Hairstyle:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {HAIRSTYLE_OPTIONS.map((hs) => {
              const active = selectedHairStyle === hs.id;
              return (
                <button
                  key={hs.id}
                  type="button"
                  onClick={() => onSelectHairStyle(hs.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#1C1917] text-white'
                      : 'bg-white border border-[#D6CFC7] text-[#44403C] hover:bg-[#F3EFEA]'
                  }`}
                >
                  {hs.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Makeup Group & Product Tabs (with Zone Locks) */}
      <div className="border-b border-[#E7E1DA] bg-[#FAF8F6] px-4 py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {GROUPS.map((group) => {
            const active = selectedGroup === group;
            return (
              <button
                key={group}
                type="button"
                onClick={() => handleGroupClick(group)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#9D174D] text-white'
                    : 'bg-white text-[#44403C] border border-[#E7E1DA] hover:bg-[#F3EFEA]'
                }`}
              >
                {group}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {productsInGroup.map((prod) => {
            const isActive = prod.zone === activeZone;
            const zoneOpen = isZoneUnlocked(prod.zone);
            const toolId = getZoneUnlockToolId(prod.zone);
            const zoneCost = toolId ? getToolInfo(toolId).cost : 0;
            const hasApplied = Boolean(makeup[prod.zone] && (makeup[prod.zone]?.coverage ?? 0) > 0);
            const canUnlock = glamStars >= zoneCost;

            return (
              <button
                key={prod.zone}
                type="button"
                onClick={() => handleZoneClick(prod.zone)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#1C1917] text-white'
                    : zoneOpen
                    ? 'bg-white text-[#44403C] border border-[#E7E1DA] hover:border-[#A8A096]'
                    : canUnlock
                    ? 'bg-[#9D174D]/10 text-[#9D174D] border border-[#9D174D]/35 hover:bg-[#9D174D]/15'
                    : 'bg-[#F3EFEA] text-[#57534E] border border-[#E7E1DA] hover:border-[#C7BEB4]'
                }`}
              >
                {hasApplied && (
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-white/60 shrink-0"
                    style={{ backgroundColor: makeup[prod.zone]?.hex }}
                  />
                )}
                <span>{prod.shortName}</span>
                {!zoneOpen && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold opacity-90">
                    <Lock className="h-2.5 w-2.5" />
                    <span>{zoneCost} ★</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Explanation + Locked Brush / Wipe Controls */}
      <div className="border-b border-[#E7E1DA] bg-white px-4 py-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-[#1C1917] font-sans">
            {activeProduct.name}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeToolMode('apply')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                toolMode === 'apply'
                  ? 'bg-[#9D174D] text-white'
                  : 'border border-[#D6CFC7] bg-white text-[#44403C] hover:bg-[#F3EFEA]'
              }`}
            >
              <Brush className="h-3.5 w-3.5" />
              <span>Brush</span>
            </button>

            {(() => {
              const wipeUnlocked = unlockedTools.has('tool_wipe');
              const wipeCost = getToolInfo('tool_wipe').cost;
              return (
                <button
                  type="button"
                  onClick={handleWipeClick}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    toolMode === 'wipe'
                      ? 'bg-[#1C1917] text-white'
                      : wipeUnlocked
                      ? 'border border-[#D6CFC7] bg-white text-[#44403C] hover:bg-[#F3EFEA]'
                      : glamStars >= wipeCost
                      ? 'border border-[#9D174D]/40 bg-[#9D174D]/10 text-[#9D174D] hover:bg-[#9D174D]/15'
                      : 'border border-[#E7E1DA] bg-[#F3EFEA] text-[#57534E]'
                  }`}
                >
                  {wipeUnlocked ? (
                    <Eraser className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  <span>Wipe</span>
                  {!wipeUnlocked && <span className="text-[10px] font-semibold">· {wipeCost} ★</span>}
                </button>
              );
            })()}
          </div>
        </div>

        <p className="text-xs text-[#44403C] leading-relaxed">
          <strong className="text-[#1C1917]">What it is:</strong> {activeProduct.whatItIs}{' '}
          <strong className="text-[#1C1917]">Where it goes:</strong> {activeProduct.whereItGoes}
        </p>

        {/* Brush Size Selector (Fine & Fluffy locked behind OST questions) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-[#57534E]">Brush:</span>
            {(['fine', 'medium', 'fluffy'] as BrushSize[]).map((sz) => {
              const isStarter = sz === 'medium';
              const toolId: UnlockableToolId | null =
                sz === 'fine' ? 'brush_fine' : sz === 'fluffy' ? 'brush_fluffy' : null;
              const unlocked = isStarter || (toolId ? unlockedTools.has(toolId) : true);
              const cost = toolId ? getToolInfo(toolId).cost : 0;
              const active = brushSize === sz && unlocked;

              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleBrushClick(sz)}
                  className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1C1917] text-white'
                      : unlocked
                      ? 'bg-[#FAF8F6] text-[#44403C] border border-[#E7E1DA] hover:bg-[#EFECE7]'
                      : glamStars >= cost
                      ? 'bg-[#9D174D]/10 text-[#9D174D] border border-[#9D174D]/35 hover:bg-[#9D174D]/15'
                      : 'bg-[#F3EFEA] text-[#57534E] border border-[#E7E1DA]'
                  }`}
                >
                  {!unlocked && <Lock className="h-2.5 w-2.5" />}
                  <span>{sz}</span>
                  {!unlocked && <span className="text-[10px] font-semibold">· {cost} ★</span>}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-[#78716C]">
            Tip: {activeProduct.proTip}
          </span>
        </div>
      </div>

      {/* Shades Grid (Tiered multi-question costs for unique shades) */}
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E]">
          <span>
            Pick a shade to dip your brush, then drag on the model’s face. Rarer shades cost more OST questions!
          </span>
          <span className="tabular-nums font-medium text-[#9D174D]">
            1 Correct OST Problem = 1 ★
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeProduct.shades.map((shade) => {
            const isUnlocked = Boolean(shade.starterUnlocked || unlockedShades.has(shade.id));
            const isLoaded = loadedShade.id === shade.id;
            const canAfford = glamStars >= shade.cost;

            return (
              <button
                key={shade.id}
                type="button"
                onClick={() => {
                  if (isUnlocked) {
                    onLoadShade(activeZone, shade);
                  } else if (canAfford) {
                    onUnlockAndLoadShade(activeZone, shade);
                  } else {
                    onPromptSolveForMore(
                      `Answer ${formatQuestionCost(shade.cost)} correctly (${
                        shade.cost - glamStars
                      } more needed) to unlock "${shade.name}".`
                    );
                  }
                }}
                className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                  isLoaded
                    ? 'border-[#9D174D] bg-[#9D174D]/5 ring-1 ring-[#9D174D]'
                    : isUnlocked
                    ? 'border-[#E7E1DA] bg-white hover:border-[#BDB4AA]'
                    : 'border-[#E7E1DA] bg-[#FAF8F6] hover:border-[#9D174D]/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-8 w-8 rounded-full border border-black/15 shrink-0 relative overflow-hidden"
                    style={{
                      background: shade.secondaryHex
                        ? `linear-gradient(135deg, ${shade.hex} 40%, ${shade.secondaryHex})`
                        : shade.hex,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#1C1917] truncate">
                      {shade.name}
                    </div>
                    <div className="text-[11px] text-[#57534E] truncate">
                      {shade.finish} · {shade.bestFor}
                    </div>
                  </div>
                </div>

                {!isUnlocked ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 tabular-nums ${
                      canAfford ? 'bg-[#9D174D] text-white' : 'bg-[#E7E1DA] text-[#44403C]'
                    }`}
                  >
                    <Lock className="h-3 w-3" />
                    <span>{shade.cost} ★</span>
                  </span>
                ) : isLoaded ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9D174D] shrink-0">
                    <Sparkles className="h-3 w-3" />
                    <span>On Brush</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Intensity & Locked Pro Style Controls */}
        <div className="rounded-lg border border-[#E7E1DA] bg-[#FAF8F6] p-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[#292524] mb-1">
              <span>Pigment Strength</span>
              <span className="font-mono tabular-nums">
                {Math.round((currentLayer?.opacity ?? activeProduct.defaultOpacity) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={100}
              value={Math.round((currentLayer?.opacity ?? activeProduct.defaultOpacity) * 100)}
              onChange={(e) => onUpdateOpacity(activeZone, Number(e.target.value) / 100)}
              aria-label="Makeup intensity"
              className="w-full accent-[#9D174D] cursor-pointer"
            />
          </div>

          {activeProduct.supportsStyle && (
            <div>
              <div className="text-xs font-medium text-[#292524] mb-1.5">
                {activeZone === 'eyeliner' ? 'Eyeliner Wing Style' : 'Lash Volume Style'}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'natural', label: activeZone === 'eyeliner' ? 'Tightline' : 'Natural', cost: 0 },
                    { id: 'classic', label: activeZone === 'eyeliner' ? 'Classic Wing' : 'Classic', cost: 1 },
                    { id: 'glam', label: activeZone === 'eyeliner' ? 'Cat-Eye Glam' : 'Full Glam', cost: 3 },
                  ] as const
                ).map((st) => {
                  const unlocked =
                    st.id === 'natural' ||
                    unlockedTools.has(st.id === 'classic' ? 'style_classic' : 'style_glam');
                  const active = (currentLayer?.style || 'natural') === st.id && unlocked;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleStyleClick(st.id)}
                      className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-[#1C1917] text-white'
                          : unlocked
                          ? 'bg-white border border-[#D6CFC7] text-[#44403C] hover:bg-[#F3EFEA]'
                          : glamStars >= st.cost
                          ? 'bg-[#9D174D]/10 border border-[#9D174D]/35 text-[#9D174D]'
                          : 'bg-[#F3EFEA] border border-[#E7E1DA] text-[#57534E]'
                      }`}
                    >
                      {!unlocked && <Lock className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{st.label}</span>
                      {!unlocked && <span className="text-[10px] font-semibold">· {st.cost} ★</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
