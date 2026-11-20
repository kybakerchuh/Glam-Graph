import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  RefreshCw,
  Shuffle,
  XCircle,
} from 'lucide-react';
import { MathProblem, OST_TOPICS, OstTopic } from '../types';
import { isNumericAnswerCorrect } from '../utils/mathEval';
import { getRedoProblem } from '../utils/redoMatcher';
import { MathText } from './MathText';
import { ProblemVisual } from './ProblemVisual';

interface Props {
  problems: MathProblem[];
  selectedTopic: OstTopic | 'ALL';
  onSelectTopic: (topic: OstTopic | 'ALL') => void;
  solvedIds: Set<string>;
  onMarkSolved: (problemId: string, correct: boolean, topic: OstTopic) => void;
  highlightNotice?: string | null;
}

interface RedoSession {
  rootProblemId: string;
  problem: MathProblem;
  isGeneratedVariant: boolean;
  skillLabel: string;
  attempt: number;
  triedIds: string[];
  completed: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const QuizPanel: React.FC<Props> = ({
  problems,
  selectedTopic,
  onSelectTopic,
  solvedIds,
  onMarkSolved,
  highlightNotice,
}) => {
  const filteredProblems =
    selectedTopic === 'ALL'
      ? problems
      : problems.filter((p) => p.topic === selectedTopic);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number[]>([]);
  const [numericInput, setNumericInput] = useState('');
  const [submitted, setSubmitted] = useState<'correct' | 'wrong' | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [redoSession, setRedoSession] = useState<RedoSession | null>(null);

  // Reset index to first unsolved or 0 when topic changes
  useEffect(() => {
    const firstUnsolved = filteredProblems.findIndex((p) => !solvedIds.has(p.id));
    setCurrentIdx(firstUnsolved >= 0 ? firstUnsolved : 0);
    setSelectedChoice([]);
    setNumericInput('');
    setSubmitted(null);
    setShowTip(false);
    setRedoSession(null);
  }, [selectedTopic]);

  const baseProblem = filteredProblems[currentIdx] || filteredProblems[0];
  const displayProblem = redoSession ? redoSession.problem : baseProblem;

  // Student cannot advance/switch until a wrong answer's redo version is solved
  const isRedoLocked =
    submitted === 'wrong' || Boolean(redoSession && !redoSession.completed);

  const resetInputs = () => {
    setSelectedChoice([]);
    setNumericInput('');
    setSubmitted(null);
    setShowTip(false);
  };

  const handleToggleOption = (idx: number) => {
    // Lock choices once submitted (either correct or wrong, so wrong must trigger a new version)
    if (submitted !== null || !displayProblem) return;

    if (displayProblem.kind === 'single') {
      setSelectedChoice([idx]);
    } else {
      setSelectedChoice((prev) =>
        prev.includes(idx) ? prev.filter((v) => v !== idx) : [...prev, idx]
      );
    }
  };

  const handleCheck = () => {
    if (!displayProblem || submitted !== null) return;
    let isCorrect = false;

    if (displayProblem.kind === 'numeric') {
      isCorrect = isNumericAnswerCorrect(
        numericInput,
        displayProblem.acceptedAnswers || []
      );
    } else {
      const target = [...(displayProblem.correctIndices || [])].sort((a, b) => a - b);
      const chosen = [...selectedChoice].sort((a, b) => a - b);
      isCorrect =
        target.length === chosen.length && target.every((v, i) => v === chosen[i]);
    }

    if (isCorrect) {
      setSubmitted('correct');
      if (redoSession) {
        const creditedId = redoSession.isGeneratedVariant
          ? redoSession.rootProblemId
          : redoSession.problem.id;
        setRedoSession({ ...redoSession, completed: true });
        onMarkSolved(creditedId, true, displayProblem.topic);
      } else {
        onMarkSolved(displayProblem.id, true, displayProblem.topic);
      }
    } else {
      setSubmitted('wrong');
      onMarkSolved(displayProblem.id, false, displayProblem.topic);
    }
  };

  const handleStartRedoVariant = () => {
    if (!displayProblem) return;
    const rootId = redoSession ? redoSession.rootProblemId : baseProblem.id;
    const nextAttempt = redoSession ? redoSession.attempt + 1 : 1;
    const priorIds = redoSession ? redoSession.triedIds : [baseProblem.id];
    const excludeSet = new Set<string>([...priorIds, ...Array.from(solvedIds)]);

    const { problem: nextVariant, isGeneratedVariant, skillLabel } = getRedoProblem(
      redoSession ? redoSession.problem : baseProblem,
      problems,
      excludeSet,
      nextAttempt
    );

    setRedoSession({
      rootProblemId: rootId,
      problem: nextVariant,
      isGeneratedVariant,
      skillLabel,
      attempt: nextAttempt,
      triedIds: [...priorIds, nextVariant.id],
      completed: false,
    });
    resetInputs();
  };

  const handleNext = () => {
    if (isRedoLocked) return;
    const nextIdx = (currentIdx + 1) % filteredProblems.length;
    setCurrentIdx(nextIdx);
    setRedoSession(null);
    resetInputs();
  };

  const handleRandomUnsolved = () => {
    if (isRedoLocked) return;
    const unsolvedIndices = filteredProblems
      .map((p, idx) => (!solvedIds.has(p.id) ? idx : -1))
      .filter((idx) => idx >= 0 && idx !== currentIdx);
    const pool =
      unsolvedIndices.length > 0
        ? unsolvedIndices
        : filteredProblems.map((_, i) => i).filter((i) => i !== currentIdx);
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setCurrentIdx(pick);
      setRedoSession(null);
      resetInputs();
    }
  };

  const insertHelperChar = (snippet: string) => {
    if (submitted !== null) return;
    setNumericInput((prev) => prev + snippet);
  };

  const canSubmit =
    submitted === null &&
    (displayProblem?.kind === 'numeric'
      ? numericInput.trim().length > 0
      : selectedChoice.length > 0);

  if (!displayProblem) return null;

  const topicSolvedCount = filteredProblems.filter((p) => solvedIds.has(p.id)).length;

  return (
    <div className="flex flex-col rounded-xl border border-[#E7E1DA] bg-white overflow-hidden">
      {/* Topic Selector Header */}
      <div className="border-b border-[#E7E1DA] bg-[#FAF8F6] px-4 py-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#1C1917]">
            Algebra 1 OST Challenge ({problems.length} Problems)
          </span>
          <span className="text-xs text-[#57534E] tabular-nums">
            Topic Progress: {topicSolvedCount} / {filteredProblems.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <select
              value={selectedTopic}
              disabled={isRedoLocked}
              onChange={(e) => onSelectTopic(e.target.value as OstTopic | 'ALL')}
              aria-label="Filter by Algebra 1 OST Topic"
              className="w-full appearance-none rounded-lg border border-[#D6CFC7] bg-white py-2 pl-3 pr-9 text-xs font-semibold text-[#1C1917] focus:border-[#9D174D] focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="ALL">ALL 10 TOPICS ({problems.length} PROBLEMS)</option>
              {OST_TOPICS.map((t, i) => {
                const tList = problems.filter((p) => p.topic === t);
                const tDone = tList.filter((p) => solvedIds.has(p.id)).length;
                return (
                  <option key={t} value={t}>
                    {i + 1}. {t} ({tDone}/{tList.length})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#57534E]" />
          </div>

          <button
            type="button"
            disabled={isRedoLocked}
            onClick={handleRandomUnsolved}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6CFC7] bg-white px-3 py-2 text-xs font-medium text-[#292524] hover:bg-[#F3EFEA] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>Random</span>
          </button>
        </div>

        {highlightNotice && (
          <div className="rounded-lg border border-[#9D174D]/30 bg-[#9D174D]/5 px-3 py-2 text-xs font-medium text-[#9D174D]">
            {highlightNotice}
          </div>
        )}
      </div>

      {/* Problem Content */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Redo Mode Banner */}
        {redoSession && !redoSession.completed && (
          <div className="rounded-lg border border-[#B45309]/40 bg-[#B45309]/10 px-3.5 py-2.5 text-xs text-[#78350F] space-y-0.5">
            <div className="font-semibold">
              Redo Challenge · {redoSession.skillLabel} · Attempt #{redoSession.attempt}
            </div>
            <div>
              Solve this fresh version of the same question type correctly before moving on.
            </div>
          </div>
        )}

        {/* Clean Unboxed Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-[#9D174D]">{displayProblem.topic}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {redoSession
                ? `Redo Version (${redoSession.skillLabel})`
                : `Problem ${currentIdx + 1} of ${filteredProblems.length}`}
            </span>
          </div>
          {!redoSession && solvedIds.has(displayProblem.id) && (
            <span className="inline-flex items-center gap-1 font-medium text-[#047857]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Mastered</span>
            </span>
          )}
        </div>

        {/* Prompt */}
        <div className="text-[15px] text-[#1C1917] font-medium">
          <MathText text={displayProblem.prompt} />
        </div>

        {/* Optional Chart / Table / Graph */}
        {displayProblem.visual && <ProblemVisual visual={displayProblem.visual} />}

        {/* Interactive Answer Area */}
        {displayProblem.kind === 'numeric' ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {displayProblem.answerPrefix && (
                <span className="text-sm font-semibold text-[#1C1917]">
                  <MathText text={displayProblem.answerPrefix} />
                </span>
              )}
              <input
                type="text"
                value={numericInput}
                onChange={(e) => setNumericInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) {
                    handleCheck();
                  }
                }}
                placeholder="Type answer (e.g. 6, -3/4, 2x+5)"
                disabled={submitted !== null}
                className="flex-1 min-w-[180px] rounded-lg border border-[#D6CFC7] bg-white px-3 py-2 font-mono text-sm text-[#1C1917] focus:border-[#9D174D] focus:outline-none disabled:bg-[#FAF8F6]"
              />
              {displayProblem.answerSuffix && (
                <span className="text-sm text-[#57534E]">{displayProblem.answerSuffix}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[#78716C] mr-1">Quick keys:</span>
              {['-', '/', '^', '(', ')', 'x'].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  disabled={submitted !== null}
                  onClick={() => insertHelperChar(ch)}
                  className="rounded border border-[#E7E1DA] bg-[#FAF8F6] px-2.5 py-1 font-mono text-xs font-medium text-[#292524] hover:bg-[#EFECE7] cursor-pointer disabled:opacity-50"
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {displayProblem.kind === 'multi' && (
              <p className="text-xs font-medium text-[#57534E]">
                Select all choices that apply.
              </p>
            )}
            <div className="grid grid-cols-1 gap-2">
              {(displayProblem.options || []).map((opt, idx) => {
                const isSelected = selectedChoice.includes(idx);
                const isCorrectOpt = displayProblem.correctIndices?.includes(idx);

                let style =
                  'border-[#E7E1DA] bg-white text-[#1C1917] hover:border-[#BDB4AA] hover:bg-[#FAF8F6]';
                if (submitted === 'correct' && isCorrectOpt) {
                  style = 'border-[#047857] bg-[#047857]/8 text-[#064E3B]';
                } else if (submitted === 'wrong' && isSelected) {
                  style = 'border-[#B45309] bg-[#B45309]/8 text-[#78350F]';
                } else if (isSelected) {
                  style = 'border-[#9D174D] bg-[#9D174D]/8 text-[#1C1917] ring-1 ring-[#9D174D]';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={submitted !== null}
                    onClick={() => handleToggleOption(idx)}
                    className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                      submitted === null ? 'cursor-pointer' : 'cursor-default'
                    } ${style}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center border text-xs font-semibold tabular-nums ${
                        displayProblem.kind === 'multi' ? 'rounded' : 'rounded-full'
                      } ${
                        submitted === 'wrong' && isSelected
                          ? 'border-[#B45309] bg-[#B45309] text-white'
                          : isSelected
                          ? 'border-[#9D174D] bg-[#9D174D] text-white'
                          : 'border-[#D6CFC7] bg-[#FAF8F6] text-[#44403C]'
                      }`}
                    >
                      {OPTION_LETTERS[idx]}
                    </span>
                    <span className="flex-1">
                      <MathText text={opt} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Row: Tip + Submit / Next */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setShowTip((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6CFC7] bg-[#FAF8F6] px-3 py-2 text-xs font-medium text-[#44403C] hover:bg-[#F3EFEA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Lightbulb className="h-3.5 w-3.5 text-[#B45309]" />
            <span>{showTip ? 'Hide Playbook Tip' : 'OST Playbook Tip'}</span>
          </button>

          <div className="flex items-center gap-2">
            {submitted === null && (
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleCheck}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#9D174D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#831843] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Check Answer</span>
              </button>
            )}

            {submitted === 'correct' && (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1C1917] px-4 py-2 text-xs font-semibold text-white hover:bg-[#292524] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Next Problem</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Playbook Tip Callout */}
        {showTip && (
          <div className="rounded-lg border border-[#E7E1DA] bg-[#FAF8F6] p-3 text-xs text-[#44403C]">
            <span className="font-semibold text-[#1C1917]">Playbook Strategy: </span>
            <MathText text={displayProblem.playbookTip} />
          </div>
        )}

        {/* Answer Verification Feedback */}
        {submitted === 'correct' && (
          <div className="rounded-lg border border-[#047857]/30 bg-[#047857]/8 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#047857]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                {redoSession
                  ? `Redo Mastered (${redoSession.skillLabel}) — +1 Glam Star earned!`
                  : 'Correct — +1 Glam Star earned to unlock brushes, zones & shades!'}
              </span>
            </div>
            <div className="text-xs text-[#1C1917]">
              <MathText text={displayProblem.explanation} />
            </div>
          </div>
        )}

        {submitted === 'wrong' && (
          <div className="rounded-lg border border-[#B45309]/40 bg-[#B45309]/8 p-4 space-y-3">
            <div className="flex items-start gap-2 text-xs font-semibold text-[#92400E]">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#B45309]" />
              <span>
                Not quite! To master this question type, complete another version of the same type before moving on.
              </span>
            </div>

            <div className="rounded-md border border-[#E7E1DA] bg-white p-2.5 text-xs text-[#44403C]">
              <span className="font-semibold text-[#1C1917]">Playbook Strategy: </span>
              <MathText text={displayProblem.playbookTip} />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleStartRedoVariant}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#9D174D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#831843] transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>
                  {redoSession
                    ? `Try Another Version (Attempt #${redoSession.attempt + 1})`
                    : 'Redo This Type (New Version)'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
