import React from 'react';
import { ArrowRight, CheckCircle2, Target } from 'lucide-react';
import {
  DailyStatsMap,
  MathProblem,
  OST_TOPICS,
  OstTopic,
  TopicStatsMap,
} from '../types';

interface Props {
  problemsByTopic: Record<OstTopic, MathProblem[]>;
  solvedIds: Set<string>;
  totalCorrect: number;
  totalIncorrect: number;
  topicStats: TopicStatsMap;
  dailyStats: DailyStatsMap;
  onPracticeTopic: (topic: OstTopic) => void;
}

const TOPIC_SUMMARIES: Record<OstTopic, string> = {
  'THE LAZY WAY STRATEGIES':
    'Identify problem types (Linear, Quadratic, Exponential, Systems), back-solve equations, and match equivalent expressions.',
  'DATA ANALYSIS (BOX WHISKER, LINE OF BEST FIT, DATA, ETC...)':
    'Line of best fit, scatterplots, dot plots, histograms, skew & outliers, box-and-whisker 5-number summary, IQR, and two-way frequency tables.',
  'ALL THINGS POLYNOMIALS':
    'Add polynomials, subtract polynomials by flipping signs, and multiply binomials/polynomials with the Box Method.',
  'FUNCTIONS AND FUNCTION NOTATIONS':
    'Determine functions from ordered pairs, tables, and the Vertical Line Test; evaluate f(x) and solve for x given f(x).',
  'FACTORING, SOLVING, MODELING, ANALYZING QUADRATICS':
    'Vertex (max/min), axis of symmetry, zeros/roots, projectile motion height & time, and factoring with GCF & X-Method.',
  'CREATE, ANALYZE, MODEL EXPONENTIAL FUNCTIONS':
    'Model y = a(b)^x, distinguish growth (1 + r) vs decay (1 − r), interpret initial value and percent rates, and read exponential graphs.',
  'CREATING, GRAPHING, MODELING LINEAR (PART 1)':
    'Slope, x- and y-intercepts, checking points on lines, completing linear tables, and writing y = mx + b from graphs or two points.',
  'CREATING, GRAPHING, MODELING LINEAR (PART 2)':
    'Interpret rate of change and starting values in y = mx + b and write/interpret Standard Form Ax + By = C from word problems.',
  'CREATING, SOLVING, MODELING SYSTEMS OF EQUATIONS':
    'One, zero, or infinite solutions; solving systems by graphing, substitution, or elimination; ticket/coin stories; and systems of inequalities.',
  'EXPRESSIONS, EQUATIONS, AND INEQUALITIES':
    'Distribute and combine like terms, solve multi-step equations with vertical fractions, literal equations, inequalities, and spot student errors.',
};

function formatDayLabel(isoDay: string): string {
  const parts = isoDay.split('-');
  if (parts.length !== 3) return isoDay;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(date.getTime())) return isoDay;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const TopicsOverviewView: React.FC<Props> = ({
  problemsByTopic,
  solvedIds,
  totalCorrect,
  totalIncorrect,
  topicStats,
  dailyStats,
  onPracticeTopic,
}) => {
  const totalCount = OST_TOPICS.reduce((sum, t) => sum + problemsByTopic[t].length, 0);
  const totalSolved = OST_TOPICS.reduce(
    (sum, t) => sum + problemsByTopic[t].filter((p) => solvedIds.has(p.id)).length,
    0
  );

  const totalAttempts = totalCorrect + totalIncorrect;
  const overallAccuracy =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;

  // Sort chronological daily history (last 14 active study days)
  const dailyEntries = Object.entries(dailyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14);

  const maxDailyTotal = dailyEntries.reduce(
    (max, [, s]) => Math.max(max, (s.correct || 0) + (s.incorrect || 0)),
    1
  );

  // Find topic with lowest accuracy (with at least 1 attempt) for "Focus Weakest Topic"
  type WeakestTopicInfo = { topic: OstTopic; accuracy: number; incorrect: number };
  let weakestTopic: WeakestTopicInfo | null = null;
  for (let idx = 0; idx < OST_TOPICS.length; idx++) {
    const topic = OST_TOPICS[idx];
    const stat = topicStats[`t${idx}`];
    if (!stat) continue;
    const attempts = (stat.correct || 0) + (stat.incorrect || 0);
    if (attempts === 0) continue;
    const acc = Math.round(((stat.correct || 0) / attempts) * 100);
    if (
      stat.incorrect > 0 &&
      (!weakestTopic ||
        acc < weakestTopic.accuracy ||
        (acc === weakestTopic.accuracy && stat.incorrect > weakestTopic.incorrect))
    ) {
      weakestTopic = { topic, accuracy: acc, incorrect: stat.incorrect };
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C1917]">
            OST Topics &amp; Progress Over Time
          </h1>
          <p className="mt-1.5 text-sm text-[#44403C]">
            Track overall and per-topic correct vs. incorrect answers across all 10 Algebra 1 OST
            Playbook sheets ({totalCount} total problems).
          </p>
        </div>

        {weakestTopic !== null && (
          <button
            type="button"
            onClick={() => onPracticeTopic(weakestTopic.topic)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#9D174D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#831843] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Target className="h-3.5 w-3.5" />
            <span>Focus Weakest Topic ({weakestTopic.accuracy}%)</span>
          </button>
        )}
      </div>

      {/* Overall Accuracy & Counts Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#E7E1DA] bg-white p-4">
          <div className="text-xs text-[#57534E]">Overall Correct</div>
          <div className="mt-1 text-2xl font-semibold text-[#047857] tabular-nums">
            {totalCorrect}
          </div>
          <div className="text-[11px] text-[#78716C] mt-0.5">All-time correct answers</div>
        </div>

        <div className="rounded-xl border border-[#E7E1DA] bg-white p-4">
          <div className="text-xs text-[#57534E]">Overall Incorrect</div>
          <div className="mt-1 text-2xl font-semibold text-[#B45309] tabular-nums">
            {totalIncorrect}
          </div>
          <div className="text-[11px] text-[#78716C] mt-0.5">All-time missed attempts</div>
        </div>

        <div className="rounded-xl border border-[#E7E1DA] bg-white p-4">
          <div className="text-xs text-[#57534E]">Overall Accuracy</div>
          <div className="mt-1 text-2xl font-semibold text-[#1C1917] tabular-nums">
            {overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
          </div>
          <div className="text-[11px] text-[#78716C] mt-0.5">
            {totalAttempts} total {totalAttempts === 1 ? 'attempt' : 'attempts'}
          </div>
        </div>

        <div className="rounded-xl border border-[#E7E1DA] bg-white p-4">
          <div className="text-xs text-[#57534E]">Unique Mastered</div>
          <div className="mt-1 text-2xl font-semibold text-[#9D174D] tabular-nums">
            {totalSolved} / {totalCount}
          </div>
          <div className="text-[11px] text-[#78716C] mt-0.5">
            {Math.round((totalSolved / totalCount) * 100)}% of OST bank
          </div>
        </div>
      </div>

      {/* Over-Time Daily Correct vs Incorrect History */}
      <section className="rounded-xl border border-[#E7E1DA] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#1C1917] font-sans">
              Correct vs. Incorrect Over Time
            </h2>
            <p className="text-xs text-[#57534E]">
              Daily accuracy history across your study sessions
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#57534E]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#047857]" />
              <span>Correct</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#D97706]" />
              <span>Incorrect</span>
            </span>
          </div>
        </div>

        {dailyEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D6CFC7] bg-[#FAF8F6] px-4 py-6 text-center text-xs text-[#57534E]">
            Answer OST problems in the Makeup Studio to start tracking your daily correct and
            incorrect trend over time.
          </div>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="flex items-end gap-3 min-w-[320px] h-40 pt-4 px-1 border-b border-[#E7E1DA]">
              {dailyEntries.map(([day, stats]) => {
                const c = stats.correct || 0;
                const inc = stats.incorrect || 0;
                const tot = c + inc;
                const dayAcc = tot > 0 ? Math.round((c / tot) * 100) : 0;
                const cHeight = Math.round((c / maxDailyTotal) * 100);
                const iHeight = Math.round((inc / maxDailyTotal) * 100);

                return (
                  <div
                    key={day}
                    className="flex flex-col items-center flex-1 min-w-[54px] h-full justify-end gap-1"
                  >
                    <span className="text-[10px] font-medium text-[#57534E] tabular-nums">
                      {dayAcc}%
                    </span>
                    <div className="w-full max-w-[36px] flex flex-col justify-end h-24 rounded-t overflow-hidden bg-[#F3EFEA]">
                      {inc > 0 && (
                        <div
                          style={{ height: `${Math.max(8, iHeight)}%` }}
                          className="w-full bg-[#D97706]"
                          title={`${formatDayLabel(day)}: ${inc} incorrect`}
                        />
                      )}
                      {c > 0 && (
                        <div
                          style={{ height: `${Math.max(8, cHeight)}%` }}
                          className="w-full bg-[#047857]"
                          title={`${formatDayLabel(day)}: ${c} correct`}
                        />
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-[#44403C] tabular-nums">
                      +{c} / -{inc}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 min-w-[320px] pt-1.5 px-1">
              {dailyEntries.map(([day]) => (
                <div
                  key={day}
                  className="flex-1 min-w-[54px] text-center text-[11px] font-medium text-[#57534E]"
                >
                  {formatDayLabel(day)}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Per-Topic Cards with Correct / Incorrect & Accuracy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {OST_TOPICS.map((topic, idx) => {
          const list = problemsByTopic[topic];
          const done = list.filter((p) => solvedIds.has(p.id)).length;
          const pct = Math.round((done / list.length) * 100);
          const tStat = topicStats[`t${idx}`] || { correct: 0, incorrect: 0 };
          const tAttempts = tStat.correct + tStat.incorrect;
          const tAccuracy = tAttempts > 0 ? Math.round((tStat.correct / tAttempts) * 100) : null;

          return (
            <div
              key={topic}
              className="flex flex-col justify-between rounded-xl border border-[#E7E1DA] bg-white p-5 space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#57534E] tabular-nums">
                  <span>Sheet {idx + 1} of 10</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#1C1917]">
                    {done === list.length && <CheckCircle2 className="h-3.5 w-3.5 text-[#047857]" />}
                    {done} / {list.length} mastered
                  </span>
                </div>
                <h2 className="text-sm font-bold text-[#1C1917] font-sans tracking-tight">
                  {topic}
                </h2>
                <p className="text-xs text-[#44403C] leading-relaxed">{TOPIC_SUMMARIES[topic]}</p>
              </div>

              <div className="space-y-3">
                {/* Per-topic Correct / Incorrect / Accuracy Readout */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#FAF8F6] border border-[#E7E1DA] px-3 py-2 text-xs tabular-nums">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#047857]">
                      Correct: {tStat.correct}
                    </span>
                    <span aria-hidden="true" className="text-[#D6CFC7]">
                      ·
                    </span>
                    <span className="font-semibold text-[#B45309]">
                      Incorrect: {tStat.incorrect}
                    </span>
                  </div>
                  <span className="font-semibold text-[#1C1917]">
                    {tAccuracy !== null ? `${tAccuracy}% accuracy` : 'Not attempted'}
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-[#EFECE7] overflow-hidden">
                  <div
                    className="h-full bg-[#9D174D] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onPracticeTopic(topic)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#9D174D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#831843] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Practice Topic</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
