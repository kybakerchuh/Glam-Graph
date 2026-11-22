import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bookmark,
  Check,
  LogIn,
  Palette,
  Star,
} from 'lucide-react';
import { HAIRSTYLE_OPTIONS, HairstyleCategory, MODELS } from '../data/makeupCatalog';
import { HairStyle, ModelProfile, OST_TOPICS, OstTopic } from '../types';
import { ModelPortraitPreview } from './ModelPortraitPreview';

const HAIR_CATEGORIES: ('All' | HairstyleCategory)[] = ['All', 'Buns', 'Braids', 'Parts & Styles'];

interface Props {
  selectedModel: ModelProfile;
  onSelectModel: (model: ModelProfile) => void;
  selectedHairStyle: HairStyle;
  onSelectHairStyle: (style: HairStyle) => void;
  selectedTopic: OstTopic | 'ALL';
  onSelectTopic: (topic: OstTopic | 'ALL') => void;
  totalProblemsCount: number;
  masteredCount: number;
  totalCorrect: number;
  totalIncorrect: number;
  glamStars: number;
  savedFiguresCount: number;
  isSignedIn: boolean;
  userFirstName?: string;
  onSignIn: () => void;
  onEnterStudio: () => void;
  onNavigateTab: (tab: 'studio' | 'saved' | 'guide' | 'topics') => void;
}

export const StartMenuView: React.FC<Props> = ({
  selectedModel,
  onSelectModel,
  selectedHairStyle,
  onSelectHairStyle,
  selectedTopic,
  onSelectTopic,
  totalProblemsCount,
  masteredCount,
  totalCorrect,
  totalIncorrect,
  glamStars,
  savedFiguresCount,
  isSignedIn,
  userFirstName,
  onSignIn,
  onEnterStudio,
  onNavigateTab,
}) => {
  const [hairCategory, setHairCategory] = useState<'All' | HairstyleCategory>('All');
  const filteredHairstyles =
    hairCategory === 'All'
      ? HAIRSTYLE_OPTIONS
      : HAIRSTYLE_OPTIONS.filter((h) => h.category === hairCategory);

  const activeHairLabel =
    HAIRSTYLE_OPTIONS.find((h) => h.id === selectedHairStyle)?.label ||
    (selectedHairStyle === 'sleek'
      ? 'Straight'
      : selectedHairStyle === 'updo'
      ? 'Ballerina Bun'
      : selectedHairStyle);

  const effectivePreviewModel = useMemo(
    () => ({ ...selectedModel, hairStyle: selectedHairStyle }),
    [selectedModel, selectedHairStyle]
  );

  const totalAttempts = totalCorrect + totalIncorrect;
  const overallAccuracy =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;
  const hasProgress = totalAttempts > 0 || glamStars > 0 || masteredCount > 0;

  return (
    <div className="space-y-6 py-2">
      {/* Main Hero Split: Game Entry & Setup + How-To & Progress Snapshot */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Title, Model Selection, Topic Selection & Primary Launch CTA */}
        <div className="lg:col-span-7 rounded-xl border border-[#E7E1DA] bg-white p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
              <span>Algebra 1 Ohio State Test Review</span>
              <span aria-hidden="true">·</span>
              <span>{totalProblemsCount} Problems</span>
              <span aria-hidden="true">·</span>
              <span>6 Models</span>
              <span aria-hidden="true">·</span>
              <span>13 Makeup Zones</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-[#1C1917] leading-[1.12] [text-wrap:balance] max-w-2xl">
              Master Algebra 1 OST. Style Every Studio Look.
            </h1>

            <p className="text-sm sm:text-base text-[#44403C] leading-relaxed max-w-2xl">
              Solve Ohio State Test problems across all 10 Playbook sheets to earn Glam Stars.
              Unlock brushes, makeup zones, and custom shades, then paint directly on your chosen
              model with your cursor.
            </p>
          </div>

          {/* Interactive Starting Setup */}
          <div className="space-y-5 pt-2 border-t border-[#E7E1DA]">
            {/* Choose Starting Model */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1C1917]">
                  1. Choose Your Model
                </span>
                <span className="text-xs text-[#57534E]">
                  Selected: <strong className="text-[#1C1917]">{selectedModel.name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {MODELS.map((model) => {
                  const isSelected = model.id === selectedModel.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => onSelectModel(model)}
                      className={`group flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#9D174D] bg-[#9D174D]/[0.04]'
                          : 'border-[#E7E1DA] bg-[#FAF8F6]/60 hover:border-[#C6BEB5] hover:bg-[#FAF8F6]'
                      }`}
                    >
                      <span className="relative h-10 w-10 shrink-0">
                        <span className="block h-full w-full rounded-full border border-black/15 overflow-hidden bg-[#F3EDE6]">
                          <ModelPortraitPreview
                            model={model}
                            className="h-full w-full object-cover object-top"
                          />
                        </span>
                        {isSelected && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#9D174D] text-white flex items-center justify-center shadow-sm ring-1 ring-white">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-[#1C1917] truncate">
                          {model.name}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Hairstyle Selector for Chosen Model */}
              <div className="pt-2 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#44403C]">
                    {selectedModel.name}’s Hairstyle:{' '}
                    <span className="text-[#9D174D]">{activeHairLabel}</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {HAIR_CATEGORIES.map((cat) => {
                      const isCatActive = hairCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setHairCategory(cat)}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isCatActive
                              ? 'bg-[#9D174D] text-white'
                              : 'bg-white border border-[#E7E1DA] text-[#57534E] hover:bg-[#F3EFEA]'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                  {filteredHairstyles.map((hs) => {
                    const active = selectedHairStyle === hs.id;
                    return (
                      <button
                        key={hs.id}
                        type="button"
                        onClick={() => onSelectHairStyle(hs.id)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#1C1917] text-white'
                            : 'bg-[#FAF8F6] border border-[#D6CFC7] text-[#44403C] hover:bg-[#F3EFEA]'
                        }`}
                      >
                        {hs.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Choose Starting Topic */}
            <div className="space-y-1.5">
              <label
                htmlFor="menu-topic-select"
                className="block text-xs font-semibold text-[#1C1917]"
              >
                2. Choose Starting OST Topic
              </label>
              <select
                id="menu-topic-select"
                value={selectedTopic}
                onChange={(e) => onSelectTopic(e.target.value as OstTopic | 'ALL')}
                className="w-full rounded-lg border border-[#D6CFC7] bg-white px-3 py-2.5 text-xs sm:text-sm font-medium text-[#1C1917] focus:border-[#9D174D] focus:outline-none cursor-pointer"
              >
                <option value="ALL">
                  All 10 OST Playbook Topics ({totalProblemsCount} Problems Mixed)
                </option>
                {OST_TOPICS.map((topic, idx) => (
                  <option key={topic} value={topic}>
                    Sheet {idx + 1}: {topic} (30 Problems)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary Launch Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E7E1DA]">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onEnterStudio}
                className="inline-flex items-center gap-2 rounded-lg bg-[#9D174D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#831843] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{hasProgress ? 'Continue Makeup Studio' : 'Start Game'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('topics')}
                className="rounded-lg border border-[#D6CFC7] bg-white px-4 py-2.5 text-xs font-semibold text-[#1C1917] hover:bg-[#F3EFEA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                View Topic Progress
              </button>
            </div>

            {isSignedIn ? (
              <span className="text-xs text-[#57534E]">
                Signed in as <strong className="text-[#1C1917]">{userFirstName || 'Student'}</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9D174D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign in with Google to sync looks</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Model Preview + Progress Snapshot & How-to-Play Breakdown */}
        <div className="lg:col-span-5 rounded-xl border border-[#E7E1DA] bg-white p-6 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#1C1917] font-sans">
                Live Model &amp; Studio Snapshot
              </h2>
              <span className="text-xs text-[#57534E] whitespace-nowrap">
                {selectedModel.name} · {activeHairLabel}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="w-28 sm:w-32 mx-auto sm:mx-0 shrink-0 rounded-lg border border-[#E7E1DA] bg-[#F3EDE6] overflow-hidden aspect-[540/640]">
                <ModelPortraitPreview
                  model={effectivePreviewModel}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex-1 grid grid-cols-2 gap-px rounded-lg border border-[#E7E1DA] bg-[#E7E1DA] overflow-hidden">
              <div className="bg-[#FAF8F6] p-3.5">
                <div className="text-[11px] text-[#57534E]">OST Mastered</div>
                <div className="mt-0.5 text-lg font-semibold text-[#1C1917] tabular-nums">
                  {masteredCount} / {totalProblemsCount}
                </div>
              </div>
              <div className="bg-[#FAF8F6] p-3.5">
                <div className="text-[11px] text-[#57534E]">Accuracy</div>
                <div className="mt-0.5 text-lg font-semibold text-[#047857] tabular-nums">
                  {overallAccuracy !== null ? `${overallAccuracy}%` : 'Ready'}
                </div>
                {totalAttempts > 0 && (
                  <div className="text-[11px] text-[#57534E] font-mono tabular-nums">
                    +{totalCorrect} / -{totalIncorrect}
                  </div>
                )}
              </div>
              <div className="bg-[#FAF8F6] p-3.5">
                <div className="text-[11px] text-[#57534E]">Glam Stars</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-lg font-semibold text-[#9D174D] tabular-nums">
                  <Star className="h-4 w-4 fill-[#9D174D] text-[#9D174D]" />
                  <span>{glamStars}</span>
                </div>
              </div>
              <div className="bg-[#FAF8F6] p-3.5">
                <div className="text-[11px] text-[#57534E]">Saved Looks</div>
                <div className="mt-0.5 text-lg font-semibold text-[#1C1917] tabular-nums">
                  {savedFiguresCount}
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Editorial Numbered Guide */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-[#1C1917] font-sans">
              How the Game Works
            </h2>
            <ol className="divide-y divide-[#E7E1DA] border-t border-b border-[#E7E1DA]">
              <li className="py-3 space-y-0.5">
                <div className="text-xs font-semibold text-[#1C1917]">
                  01. Solve OST Algebra Questions
                </div>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Practice Playbook problems with vertical fractions and true exponents. Missing a
                  question gives you a fresh variation of the same skill before moving on.
                </p>
              </li>
              <li className="py-3 space-y-0.5">
                <div className="text-xs font-semibold text-[#1C1917]">
                  02. Unlock Brushes, Zones &amp; Shades
                </div>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Every newly mastered question awards 1 Glam Star to unlock Fine Detail &amp; Fluffy
                  brushes, Micellar Wipe, new zones, and rare 1★–5★ shades.
                </p>
              </li>
              <li className="py-3 space-y-0.5">
                <div className="text-xs font-semibold text-[#1C1917]">
                  03. Paint With Your Cursor &amp; Save
                </div>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Use your cursor like a real makeup brush on any model, then sign in with Google to
                  save finished figures to your gallery.
                </p>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Bottom 4-Card Quick-Launch Directory */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={onEnterStudio}
          className="group rounded-xl border border-[#E7E1DA] bg-white p-4 text-left hover:border-[#9D174D]/50 transition-colors flex flex-col justify-between gap-3 cursor-pointer"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[#9D174D]">
              <Palette className="h-4 w-4" />
              <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm font-semibold text-[#1C1917]">Makeup Studio</div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Paint {selectedModel.name} with your cursor and solve OST questions side by side.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#9D174D]">Open Studio</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('saved')}
          className="group rounded-xl border border-[#E7E1DA] bg-white p-4 text-left hover:border-[#9D174D]/50 transition-colors flex flex-col justify-between gap-3 cursor-pointer"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[#9D174D]">
              <Bookmark className="h-4 w-4" />
              <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm font-semibold text-[#1C1917]">
              Saved Looks ({savedFiguresCount})
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Reopen, edit, or manage the model portraits saved to your Google account.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#9D174D]">Open Gallery</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('guide')}
          className="group rounded-xl border border-[#E7E1DA] bg-white p-4 text-left hover:border-[#9D174D]/50 transition-colors flex flex-col justify-between gap-3 cursor-pointer"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[#9D174D]">
              <BookOpen className="h-4 w-4" />
              <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm font-semibold text-[#1C1917]">Makeup Guide</div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Learn what foundation, blush, contour, eyeliner, and lip products do and where they go.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#9D174D]">Read Guide</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('topics')}
          className="group rounded-xl border border-[#E7E1DA] bg-white p-4 text-left hover:border-[#9D174D]/50 transition-colors flex flex-col justify-between gap-3 cursor-pointer"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[#9D174D]">
              <BarChart3 className="h-4 w-4" />
              <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm font-semibold text-[#1C1917]">OST Topics &amp; Stats</div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Review all 10 Playbook sheets and track your correct vs. incorrect accuracy over time.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#9D174D]">View Progress</span>
        </button>
      </section>
    </div>
  );
};
