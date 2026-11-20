import { MathProblem, OstTopic } from '../types';

export interface RedoResult {
  problem: MathProblem;
  isGeneratedVariant: boolean;
  skillLabel: string;
}

function seededInt(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  const frac = x - Math.floor(x);
  return min + Math.floor(frac * (max - min + 1));
}

function pickFrom<T>(arr: T[], seed: number): T {
  return arr[Math.abs(Math.floor(seed)) % arr.length];
}

function fmtSigned(n: number): string {
  return n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`;
}

function fmtCoeffX(a: number, variable = 'x'): string {
  if (a === 1) return variable;
  if (a === -1) return `-${variable}`;
  return `${a}${variable}`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function formatLatexFraction(num: number, den: number): string {
  if (den === 0) return '0';
  const sign = (num < 0) !== (den < 0) ? '-' : '';
  const n = Math.abs(num);
  const d = Math.abs(den);
  const g = gcd(n, d);
  const rn = n / g;
  const rd = d / g;
  if (rd === 1) return `${sign}${rn}`;
  return `${sign}\\frac{${rn}}{${rd}}`;
}

function formatAnswerFraction(num: number, den: number): string[] {
  const sign = (num < 0) !== (den < 0) ? '-' : '';
  const n = Math.abs(num);
  const d = Math.abs(den);
  const g = gcd(n, d);
  const rn = n / g;
  const rd = d / g;
  if (rd === 1) return [`${sign}${rn}`];
  const dec = (num / den).toFixed(4).replace(/\.?0+$/, '');
  return [`${sign}${rn}/${rd}`, dec];
}

function buildSingleChoice(
  base: MathProblem,
  seed: number,
  prompt: string,
  correctStr: string,
  distractors: string[],
  playbookTip: string,
  explanation: string,
  visual?: MathProblem['visual']
): MathProblem {
  const uniqueDistractors: string[] = [];
  for (const d of distractors) {
    if (d !== correctStr && !uniqueDistractors.includes(d)) {
      uniqueDistractors.push(d);
    }
    if (uniqueDistractors.length === 3) break;
  }
  const all = [correctStr, ...uniqueDistractors];
  // Deterministic shuffle
  const indexed = all.map((opt, i) => ({ opt, isCorrect: i === 0, sortKey: Math.sin((seed + 1) * (i + 7)) }));
  indexed.sort((a, b) => a.sortKey - b.sortKey);
  const correctIdx = indexed.findIndex((item) => item.isCorrect);

  return {
    ...base,
    id: `${base.id}__redo_${seed}`,
    kind: 'single',
    prompt,
    options: indexed.map((item) => item.opt),
    correctIndices: [correctIdx >= 0 ? correctIdx : 0],
    acceptedAnswers: undefined,
    visual,
    playbookTip,
    explanation,
  };
}

function shuffleSingleProblem(problem: MathProblem, seed: number): MathProblem {
  if (problem.kind !== 'single' || !problem.options || !problem.correctIndices?.length) {
    return problem;
  }
  const correctSet = new Set(problem.correctIndices);
  const items = problem.options.map((opt, idx) => ({
    opt,
    isCorrect: correctSet.has(idx),
    k: Math.sin((seed + 3) * (idx + 11) + problem.id.length),
  }));
  items.sort((a, b) => a.k - b.k);
  return {
    ...problem,
    options: items.map((i) => i.opt),
    correctIndices: items.map((i, idx) => (i.isCorrect ? idx : -1)).filter((idx) => idx >= 0),
  };
}

/**
 * Generates an isomorphic fresh version of the same problem with new numbers
 * when the problem matches a parameterized Algebra 1 OST template.
 */
function generateParametricVariant(
  base: MathProblem,
  attempt: number
): RedoResult | null {
  const id = base.id.split('__redo_')[0];
  const seed = attempt * 17 + id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  // 1. Solve (ax + b)/c = d (lw-01, lw-30, eei-16)
  if (id === 'lw-01' || id === 'lw-30' || id === 'eei-16') {
    const xAns = seededInt(seed + 1, 3, 11);
    const a = id === 'eei-16' ? 1 : seededInt(seed + 2, 2, 5);
    const c = seededInt(seed + 3, 2, 6);
    const offset = seededInt(seed + 4, 1, 8) * (seed % 2 === 0 ? 1 : -1);
    const numVal = a * xAns + offset;
    // Make numVal cleanly divisible by c
    const b = offset - (numVal % c);
    const d = (a * xAns + b) / c;
    const numerator = `${fmtCoeffX(a)} ${fmtSigned(b)}`;
    const prompt = `Solve for $x$: $\\frac{${numerator}}{${c}} = ${d}$`;
    const tip = `Multiply both sides by $${c}$ first to clear the fraction, or plug answer choices in for $x$.`;
    const expl = `Multiply by $${c}$: $${numerator} = ${d * c}$. Then $${fmtCoeffX(a)} = ${d * c - b}$, so $x = ${xAns}$.`;

    if (base.kind === 'numeric') {
      return {
        skillLabel: 'Fractional Linear Equations',
        isGeneratedVariant: true,
        problem: {
          ...base,
          id: `${id}__redo_${attempt}`,
          prompt,
          answerPrefix: '$x =$',
          acceptedAnswers: [String(xAns)],
          playbookTip: tip,
          explanation: expl,
        },
      };
    }

    return {
      skillLabel: 'Fractional Linear Equations',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        prompt,
        `$${xAns}$`,
        [`$${xAns - 2}$`, `$${xAns + 1}$`, `$${xAns + 3}$`, `$${xAns - 1}$`],
        tip,
        expl
      ),
    };
  }

  // 2. Two-sided linear equation: ax + b = cx + d (lw-02, lw-25)
  if (id === 'lw-02' || id === 'lw-25') {
    const xAns = seededInt(seed + 1, 2, 9);
    const c = seededInt(seed + 2, 2, 5);
    const a = c + seededInt(seed + 3, 2, 4);
    const b = seededInt(seed + 4, -9, 9) || 3;
    const d = (a - c) * xAns + b;
    const prompt = `Solve for $x$: $${a}x ${fmtSigned(b)} = ${c}x ${fmtSigned(d)}$`;
    const expl = `Subtract $${c}x$ from both sides: $${a - c}x ${fmtSigned(b)} = ${d}$, then $${a - c}x = ${d - b}$, so $x = ${xAns}$.`;
    return {
      skillLabel: 'Two-Sided Linear Equations',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        prompt,
        `$${xAns}$`,
        [`$${xAns - 2}$`, `$${xAns + 2}$`, `$${xAns + 1}$`, `$${-xAns}$`],
        'Move all $x$ terms to one side and constants to the other, or test each option in both sides.',
        expl
      ),
    };
  }

  // 3. Solve for x given f(x) = k (lw-03, fn-06, fn-12, fn-26, fn-30)
  if (id === 'lw-03' || id === 'fn-06' || id === 'fn-12' || id === 'fn-26' || id === 'fn-30') {
    const m = seededInt(seed + 1, 2, 7) * (id === 'lw-03' ? -1 : 1);
    const b = seededInt(seed + 2, 3, 25);
    const xAns = seededInt(seed + 3, 3, 12);
    const k = m * xAns + b;
    const prompt = `If $f(x) = ${m}x ${fmtSigned(b)}$, find $x$ such that $f(x) = ${k}$.`;
    const tip = `Set $${m}x ${fmtSigned(b)} = ${k}$ and solve for $x$ (do NOT plug $${k}$ in for $x$).`;
    const expl = `$${m}x ${fmtSigned(b)} = ${k} \\implies ${m}x = ${k - b} \\implies x = ${xAns}$.`;

    if (base.kind === 'numeric') {
      return {
        skillLabel: 'Solving for Input in Function Notation',
        isGeneratedVariant: true,
        problem: {
          ...base,
          id: `${id}__redo_${attempt}`,
          prompt,
          answerPrefix: '$x =$',
          acceptedAnswers: [String(xAns)],
          playbookTip: tip,
          explanation: expl,
        },
      };
    }
    return {
      skillLabel: 'Solving for Input in Function Notation',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        prompt,
        `$${xAns}$`,
        [`$${xAns + 2}$`, `$${xAns - 1}$`, `$${k}$`, `$${xAns + 4}$`],
        tip,
        expl
      ),
    };
  }

  // 4. Fractional coefficient linear equation: (p/q)x + b = c (lw-11, eei-19)
  if (id === 'lw-11' || id === 'eei-19') {
    const q = seededInt(seed + 1, 3, 6);
    const p = q === 4 ? 3 : seededInt(seed + 2, 2, q - 1);
    const mult = seededInt(seed + 3, 2, 5);
    const xAns = q * mult;
    const b = seededInt(seed + 4, 2, 9);
    const c = p * mult + b;
    const prompt = `Solve for $x$: $\\frac{${p}}{${q}}x + ${b} = ${c}$`;
    const expl = `Subtract $${b}$: $\\frac{${p}}{${q}}x = ${c - b}$. Multiply by $\\frac{${q}}{${p}}$: $x = ${xAns}$.`;
    return {
      skillLabel: 'Linear Equations with Fractions',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        kind: 'numeric',
        prompt,
        answerPrefix: '$x =$',
        acceptedAnswers: [String(xAns)],
        playbookTip: `Subtract $${b}$ first, then multiply both sides by the reciprocal $\\frac{${q}}{${p}}$.`,
        explanation: expl,
      },
    };
  }

  // 5. Function evaluation (fn-04, fn-05, fn-13, fn-14, fn-15, fn-16, fn-24, fn-28, lw-27, exp-16, exp-29)
  if (id === 'fn-05' || id === 'fn-15') {
    const den = seededInt(seed + 1, 2, 5);
    const num = den === 2 ? 3 : seededInt(seed + 2, 2, 5);
    const k = den * seededInt(seed + 3, 2, 5);
    const b = seededInt(seed + 4, -6, 8) || 3;
    const ans = (num * k) / den + b;
    const prompt = `A function is shown: $f(x) = \\frac{${num}}{${den}}x ${fmtSigned(b)}$. What is the value of $f(${k})$?`;
    const expl = `Substitute $x = ${k}$: $f(${k}) = \\frac{${num}}{${den}}(${k}) ${fmtSigned(b)} = ${(num * k) / den} ${fmtSigned(b)} = ${ans}$.`;
    if (base.kind === 'numeric') {
      return {
        skillLabel: 'Function Evaluation',
        isGeneratedVariant: true,
        problem: {
          ...base,
          id: `${id}__redo_${attempt}`,
          prompt,
          answerPrefix: `$f(${k}) =$`,
          acceptedAnswers: [String(ans)],
          playbookTip: `Replace $x$ with $${k}$ and simplify step-by-step.`,
          explanation: expl,
        },
      };
    }
    return {
      skillLabel: 'Function Evaluation',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        prompt,
        `$${ans}$`,
        [`$${ans + 3}$`, `$${ans - 2}$`, `$${k + b}$`, `$${ans + 6}$`],
        `Replace $x$ with $${k}$ and simplify carefully.`,
        expl
      ),
    };
  }

  if (id === 'fn-13' || id === 'fn-14' || id === 'fn-24' || id === 'lw-27') {
    const a = seededInt(seed + 1, 1, 3) * (id === 'fn-14' ? -1 : 1);
    const b = seededInt(seed + 2, -5, 5);
    const c = seededInt(seed + 3, 1, 10);
    const xVal = seededInt(seed + 4, 2, 5) * (id === 'fn-14' ? -1 : 1);
    const ans = a * xVal * xVal + b * xVal + c;
    const bPart = b === 0 ? '' : ` ${fmtSigned(b)}x`;
    const prompt = `Given $h(x) = ${a === 1 ? '' : a === -1 ? '-' : a}x^2${bPart} + ${c}$, find $h(${xVal})$.`;
    const expl = `Substitute $x = ${xVal}$: $h(${xVal}) = ${a}(${xVal})^2${b === 0 ? '' : ` ${fmtSigned(b)}(${xVal})`} + ${c} = ${ans}$.`;
    if (base.kind === 'numeric') {
      return {
        skillLabel: 'Quadratic Function Evaluation',
        isGeneratedVariant: true,
        problem: {
          ...base,
          id: `${id}__redo_${attempt}`,
          prompt,
          answerPrefix: `$h(${xVal}) =$`,
          acceptedAnswers: [String(ans)],
          playbookTip: 'Square $x$ FIRST before multiplying by the leading coefficient!',
          explanation: expl,
        },
      };
    }
    return {
      skillLabel: 'Quadratic Function Evaluation',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        prompt,
        `$${ans}$`,
        [`$${ans + 4}$`, `$${ans - 4}$`, `$${-ans}$`, `$${ans + 2}$`],
        'Square $x$ FIRST before multiplying by the leading coefficient!',
        expl
      ),
    };
  }

  if (id === 'fn-04' || id === 'fn-28' || id === 'exp-16' || id === 'exp-29') {
    const baseNum = pickFrom([2, 3], seed);
    const expVal = seededInt(seed + 1, 2, 4);
    const a = id === 'exp-16' ? 64 : seededInt(seed + 2, 2, 6);
    if (id === 'exp-16') {
      const k = seededInt(seed + 3, 2, 4);
      const start = k === 2 ? 48 : k === 3 ? 96 : 128;
      const ans = start / Math.pow(2, k);
      return {
        skillLabel: 'Exponential Function Evaluation',
        isGeneratedVariant: true,
        problem: {
          ...base,
          id: `${id}__redo_${attempt}`,
          prompt: `An exponential function is $f(x) = ${start}\\left(\\frac{1}{2}\\right)^x$. What is $f(${k})$?`,
          answerPrefix: `$f(${k}) =$`,
          acceptedAnswers: [String(ans)],
          playbookTip: `Multiply $${start}$ by $\\frac{1}{2}$ a total of $${k}$ times (cut in half $${k}$ times).`,
          explanation: `$f(${k}) = ${start} \\cdot \\left(\\frac{1}{2}\\right)^${k} = \\frac{${start}}{${Math.pow(2, k)}} = ${ans}$.`,
        },
      };
    }
    const c = seededInt(seed + 4, 1, 8);
    const ans = a * Math.pow(baseNum, expVal) - c;
    return {
      skillLabel: 'Exponential Function Evaluation',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        kind: 'numeric',
        prompt: `If $f(x) = ${a}(${baseNum})^x - ${c}$, find $f(${expVal})$.`,
        answerPrefix: `$f(${expVal}) =$`,
        acceptedAnswers: [String(ans)],
        playbookTip: `Evaluate the exponent $${baseNum}^${expVal}$ FIRST, then multiply by $${a}$, then subtract $${c}$.`,
        explanation: `$f(${expVal}) = ${a}(${Math.pow(baseNum, expVal)}) - ${c} = ${a * Math.pow(baseNum, expVal)} - ${c} = ${ans}$.`,
      },
    };
  }

  // 6. Box plot IQR match or Median difference (da-03, da-05)
  if (id === 'da-03') {
    const targetIqr = seededInt(seed + 1, 3, 5) * 5;
    const tQ1 = seededInt(seed + 2, 2, 4) * 5;
    const tQ3 = tQ1 + targetIqr;
    const tMed = tQ1 + 5;
    const c1 = { label: 'Class 1', min: 5, q1: 10, median: 20, q3: 10 + targetIqr - 5, max: 55 };
    const c2 = { label: 'Class 2', min: 15, q1: 20, median: 35, q3: 20 + targetIqr + 5, max: 60 };
    const c3 = { label: 'Class 3', min: 5, q1: 15, median: 25, q3: 15 + targetIqr + 10, max: 55 };
    const c4 = { label: 'Class 4', min: 15, q1: 25, median: 35, q3: 25 + targetIqr, max: 60 };
    const plots = [
      { label: 'Class 5', min: Math.max(0, tQ1 - 5), q1: tQ1, median: tMed, q3: tQ3, max: Math.min(60, tQ3 + 10), color: '#1C1917' },
      c1,
      c2,
      c3,
      c4,
    ];
    return {
      skillLabel: 'Box Plot IQR Comparison',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        'Compare the box plots below. Which class has an interquartile range (IQR) EQUAL to Class 5’s IQR?',
        'Class 4',
        ['Class 1', 'Class 2', 'Class 3'],
        `IQR is the width of the box: $Q_3 - Q_1$. For Class 5, $Q_3 - Q_1 = ${tQ3} - ${tQ1} = ${targetIqr}$.`,
        `Class 5 has $\\text{IQR} = ${tQ3} - ${tQ1} = ${targetIqr}$. Class 4 has $Q_1 = 25$ and $Q_3 = ${25 + targetIqr}$, so $\\text{IQR} = ${targetIqr}$.`,
        {
          type: 'boxplots',
          title: 'Pages Read Last Week',
          axisLabel: 'Pages Read',
          domain: [0, 60],
          step: 10,
          plots,
        }
      ),
    };
  }

  if (id === 'da-05') {
    const m1 = seededInt(seed + 1, 12, 16) * 25;
    const m2 = m1 - seededInt(seed + 2, 1, 3) * 25;
    const diff = m1 - m2;
    return {
      skillLabel: 'Box Plot Median Comparison',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: 'Two readers tracked the total pages in each book they read. What is the difference in the median number of pages per book?',
        acceptedAnswers: [String(diff)],
        playbookTip: 'The vertical line inside each box is the Median. Subtract the smaller median from the larger median.',
        explanation: `Median 1 $= ${m1}$, Median 2 $= ${m2}$. Difference $= ${m1} - ${m2} = ${diff}$.`,
        visual: {
          type: 'boxplots',
          title: 'Total Pages per Book',
          axisLabel: 'Pages',
          domain: [150, 475],
          step: 25,
          plots: [
            { label: 'Reader A', min: m1 - 75, q1: m1 - 25, median: m1, q3: m1 + 50, max: Math.min(475, m1 + 75) },
            { label: 'Reader B', min: Math.max(150, m2 - 50), q1: m2 - 25, median: m2, q3: m2 + 50, max: m2 + 75 },
          ],
        },
      },
    };
  }

  // 7. Dot Plot Range Difference (da-04)
  if (id === 'da-04') {
    const minA = seededInt(seed + 1, 1, 2);
    const maxA = seededInt(seed + 2, 9, 10);
    const minB = seededInt(seed + 3, 3, 5);
    const maxB = seededInt(seed + 4, 8, 9);
    const rangeA = maxA - minA;
    const rangeB = maxB - minB;
    const diff = Math.abs(rangeA - rangeB);
    return {
      skillLabel: 'Dot Plot Range Comparison',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: 'Customers rated two products from $1$ to $10$. What is the difference between the ranges of the two dot plots?',
        acceptedAnswers: [String(diff)],
        playbookTip: 'Range = Maximum − Minimum. Find each dot plot’s range, then subtract.',
        explanation: `Product A range $= ${maxA} - ${minA} = ${rangeA}$. Product B range $= ${maxB} - ${minB} = ${rangeB}$. Difference $= |${rangeA} - ${rangeB}| = ${diff}$.`,
        visual: {
          type: 'dotplots',
          title: 'Customer Product Ratings',
          axisLabel: 'Rating (1 to 10)',
          domain: [1, 10],
          step: 1,
          plots: [
            { label: 'Product A', values: { [minA]: 2, [minA + 3]: 4, 6: 5, 7: 4, [maxA]: 2 } },
            { label: 'Product B', values: { [minB]: 1, 6: 4, 7: 6, [maxB]: 3 } },
          ],
        },
      },
    };
  }

  // 8. Data summary IQR / Q3 / Median (da-14, da-20, da-27, da-30)
  if (id === 'da-30') {
    const q1 = seededInt(seed + 1, 25, 55);
    const iqr = seededInt(seed + 2, 12, 28);
    const q3 = q1 + iqr;
    return {
      skillLabel: 'Interquartile Range Formula',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `A box plot has $Q_1 = ${q1}$ and $\\text{IQR} = ${iqr}$. What is the value of $Q_3$?`,
        answerPrefix: '$Q_3 =$',
        acceptedAnswers: [String(q3)],
        playbookTip: '$\\text{IQR} = Q_3 - Q_1$, so $Q_3 = Q_1 + \\text{IQR}$.',
        explanation: `$Q_3 = ${q1} + ${iqr} = ${q3}$.`,
      },
    };
  }

  if (id === 'da-20') {
    const min = seededInt(seed + 1, 10, 22);
    const range = seededInt(seed + 2, 25, 48);
    const max = min + range;
    return {
      skillLabel: 'Range from 5-Number Summary',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `A data set has a minimum of $${min}$, $Q_1 = ${min + 7}$, median $= ${min + 14}$, $Q_3 = ${max - 8}$, and maximum of $${max}$. What is the range?`,
        acceptedAnswers: [String(range)],
        playbookTip: 'Range is $\\text{Maximum} - \\text{Minimum}$ (not $Q_3 - Q_1$).',
        explanation: `Range $= ${max} - ${min} = ${range}$.`,
      },
    };
  }

  // 9. Polynomial multiply / expand / square (poly-04, poly-09, poly-10, poly-11, poly-13, poly-17, poly-29)
  if (id === 'poly-04' || id === 'poly-10' || id === 'poly-17') {
    const a = seededInt(seed + 1, 2, 6);
    const b = seededInt(seed + 2, 1, 5) * -1;
    const c = seededInt(seed + 3, 2, 5);
    const d = seededInt(seed + 4, 2, 6);
    const mid = a * d + b * c;
    const prompt = `If $(${a}x ${fmtSigned(b)})(${c}x ${fmtSigned(d)}) = Ax^2 + Bx + C$, what is the value of $B$?`;
    const expl = `Middle term $Bx = (${a}x)(${d}) + (${b})(${c}x) = ${a * d}x ${fmtSigned(b * c)}x = ${mid}x$, so $B = ${mid}$.`;
    if (base.kind === 'numeric') {
      return {
        skillLabel: 'Polynomial Product Coefficient',
        isGeneratedVariant: true,
        problem: {
          ...base,
          id: `${id}__redo_${attempt}`,
          prompt,
          answerPrefix: '$B =$',
          acceptedAnswers: [String(mid)],
          playbookTip: 'Multiply the Outer terms and Inner terms, then add their coefficients.',
          explanation: expl,
        },
      };
    }
    return {
      skillLabel: 'Polynomial Product Coefficient',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        prompt,
        `$${mid}$`,
        [`$${a * d - b * c}$`, `$${b * d}$`, `$${a * c}$`, `$${-mid}$`],
        'Multiply the Outer terms and Inner terms, then combine like terms for the $x$-term.',
        expl
      ),
    };
  }

  if (id === 'poly-09' || id === 'poly-13') {
    const a = seededInt(seed + 1, 2, 4);
    const b = seededInt(seed + 2, 1, 5) * -1;
    const c = id === 'poly-13' ? a : 1;
    const d = id === 'poly-13' ? b : seededInt(seed + 3, 2, 6);
    const A = a * c;
    const B = a * d + b * c;
    const C = b * d;
    const prompt =
      id === 'poly-13'
        ? `Which expression is equivalent to $(${a}x ${fmtSigned(b)})^2$?`
        : `Multiply the binomials: $(${a}x ${fmtSigned(b)})(${c}x ${fmtSigned(d)})$`;
    const correct = `$${A}x^2 ${fmtSigned(B)}x ${fmtSigned(C)}$`;
    const wrong1 = `$${A}x^2 ${fmtSigned(C)}$`;
    const wrong2 = `$${A}x^2 ${fmtSigned(-B)}x ${fmtSigned(C)}$`;
    const wrong3 = `$${A}x^2 ${fmtSigned(B)}x ${fmtSigned(-C)}$`;
    return {
      skillLabel: 'Binomial Multiplication',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        prompt,
        correct,
        [wrong1, wrong2, wrong3],
        'Use the Box Method or FOIL so you do not forget the middle $x$ terms!',
        `Expanding gives $${A}x^2 + (${a * d}x ${fmtSigned(b * c)}x) ${fmtSigned(C)} = ${A}x^2 ${fmtSigned(B)}x ${fmtSigned(C)}$.`
      ),
    };
  }

  // 10. Slope between two points (lin1-06, lin1-07, lin1-23)
  if (id === 'lin1-06' || id === 'lin1-07' || id === 'lin1-23') {
    const x1 = seededInt(seed + 1, -4, 3);
    const dx = seededInt(seed + 2, 2, 6);
    const x2 = x1 + dx;
    const y1 = seededInt(seed + 3, -3, 8);
    if (base.kind === 'numeric' && id === 'lin1-06') {
      const m = seededInt(seed + 4, 2, 5);
      const y2 = y1 + m * dx;
      return {
        skillLabel: 'Slope from Two Points',
        isGeneratedVariant: true,
        problem: {
          ...base,
          id: `${id}__redo_${attempt}`,
          prompt: `Find the slope of the line passing through $(${x1}, ${y1})$ and $(${x2}, ${y2})$.`,
          answerPrefix: '$m =$',
          acceptedAnswers: [String(m)],
          playbookTip: 'Use $m = \\frac{y_2 - y_1}{x_2 - x_1}$. Subtract $y$-values on top and $x$-values on bottom.',
          explanation: `$m = \\frac{${y2} - (${y1})}{${x2} - (${x1})} = \\frac{${y2 - y1}}{${dx}} = ${m}$.`,
        },
      };
    }
    const dy = seededInt(seed + 4, 1, 5) * (seed % 2 === 0 ? -1 : 1);
    const y2 = y1 + dy;
    const slopeTex = `$${formatLatexFraction(dy, dx)}$`;
    const invTex = `$${formatLatexFraction(dx, dy)}$`;
    const negTex = `$${formatLatexFraction(-dy, dx)}$`;
    const otherTex = `$${formatLatexFraction(dy + 1, dx)}$`;
    if (base.kind === 'numeric') {
      return {
        skillLabel: 'Slope from Two Points',
        isGeneratedVariant: true,
        problem: {
          ...base,
          id: `${id}__redo_${attempt}`,
          prompt: `What is the slope of the line passing through $(${x1}, ${y1})$ and $(${x2}, ${y2})$? (Enter as a fraction or decimal.)`,
          answerPrefix: '$m =$',
          acceptedAnswers: formatAnswerFraction(dy, dx),
          playbookTip: 'Use $m = \\frac{y_2 - y_1}{x_2 - x_1}$.',
          explanation: `$m = \\frac{${y2} - (${y1})}{${x2} - (${x1})} = ${formatLatexFraction(dy, dx)}$.`,
        },
      };
    }
    return {
      skillLabel: 'Slope from Two Points',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        `Find the slope of the line passing through $(${x1}, ${y1})$ and $(${x2}, ${y2})$.`,
        slopeTex,
        [negTex, invTex, otherTex],
        'Use $m = \\frac{y_2 - y_1}{x_2 - x_1}$ ($y$ change on top, $x$ change on bottom).',
        `$m = \\frac{${y2} - (${y1})}{${x2} - (${x1})} = ${formatLatexFraction(dy, dx)}$.`
      ),
    };
  }

  // 11. Intercepts of Ax + By = C or y = mx + b (lin1-03, lin1-11, lin1-12, lin1-25)
  if (id === 'lin1-11' || id === 'lin1-12') {
    const a = seededInt(seed + 1, 2, 5);
    const b = seededInt(seed + 2, 2, 6);
    const k = seededInt(seed + 5, 1, 3);
    const C = a * b * k;
    const actualYInt = C / b;
    const actualXInt = C / a;
    const askY = id === 'lin1-11';
    const ans = askY ? actualYInt : actualXInt;
    return {
      skillLabel: 'Intercepts in Standard Form',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `What is the $${askY ? 'y' : 'x'}$-intercept of $${a}x + ${b}y = ${C}$?`,
        answerPrefix: askY ? '$y =$' : '$x =$',
        acceptedAnswers: [String(ans)],
        playbookTip: askY
          ? 'To find the $y$-intercept, set $x = 0$ and solve for $y$.'
          : 'To find the $x$-intercept, set $y = 0$ and solve for $x$.',
        explanation: askY
          ? `Set $x = 0$: $${b}y = ${C} \\implies y = ${ans}$.`
          : `Set $y = 0$: $${a}x = ${C} \\implies x = ${ans}$.`,
      },
    };
  }

  if (id === 'lin1-03' || id === 'lin1-25') {
    const xInt = seededInt(seed + 1, 2, 9);
    const den = id === 'lin1-25' ? pickFrom([2, 3, 4], seed) : 1;
    const num = den === 1 ? seededInt(seed + 2, 2, 5) : seededInt(seed + 2, 2, 3);
    const multX = den * seededInt(seed + 3, 2, 4);
    const b = -((num * multX) / den);
    const slopeExpr = den === 1 ? `${num}x` : `\\frac{${num}}{${den}}x`;
    const ans = id === 'lin1-03' ? -(b / num) : multX;
    const finalB = id === 'lin1-03' ? -num * xInt : b;
    const finalAns = id === 'lin1-03' ? xInt : multX;
    return {
      skillLabel: 'Finding x-Intercept',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `Find the $x$-intercept of $y = ${slopeExpr} ${fmtSigned(finalB)}$.`,
        answerPrefix: '$x =$',
        acceptedAnswers: [String(finalAns)],
        playbookTip: 'Set $y = 0$ and solve for $x$!',
        explanation: `Set $0 = ${slopeExpr} ${fmtSigned(finalB)}$, then solve to get $x = ${finalAns}$.`,
      },
    };
  }

  // 12. Quadratic factoring, vertex, axis of symmetry, solving (qd-02, qd-09, qd-14, qd-16, qd-19, qd-22, qd-23, qd-27)
  if (id === 'qd-09') {
    const a = seededInt(seed + 1, 2, 6);
    const h = seededInt(seed + 2, 1, 7);
    const k = seededInt(seed + 3, -6, 9) || 4;
    return {
      skillLabel: 'Minimum Value from Vertex Form',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `A function is shown: $f(x) = ${a}(x - ${h})^2 ${fmtSigned(k)}$. What is the MINIMUM value of the function?`,
        acceptedAnswers: [String(k)],
        playbookTip: 'In vertex form $a(x - h)^2 + k$ with $a > 0$, the minimum value is the $y$-coordinate $k$ at the vertex $(h, k)$.',
        explanation: `The vertex is $(${h}, ${k})$, so the minimum $y$-value is $${k}$.`,
      },
    };
  }

  if (id === 'qd-14' || id === 'qd-22') {
    const r1 = seededInt(seed + 1, 2, 7);
    const r2 = seededInt(seed + 2, 3, 9) === r1 ? r1 + 2 : seededInt(seed + 2, 3, 9);
    const b = -(r1 + r2);
    const c = r1 * r2;
    if (id === 'qd-14') {
      return {
        skillLabel: 'Factoring Quadratics',
        isGeneratedVariant: true,
        problem: buildSingleChoice(
          base,
          seed,
          `Factor completely: $x^2 ${fmtSigned(b)}x + ${c}$`,
          `$(x - ${r1})(x - ${r2})$`,
          [
            `$(x + ${r1})(x + ${r2})$`,
            `$(x - ${r1})(x + ${r2})$`,
            `$(x + ${r1})(x - ${r2})$`,
          ],
          `Find two numbers that multiply to $+${c}$ and add to $${b}$.`,
          `$(-${r1})(-${r2}) = +${c}$ and $-${r1} + (-${r2}) = ${b}$, so it factors as $(x - ${r1})(x - ${r2})$.`
        ),
      };
    }
    return {
      skillLabel: 'Quadratic from Zeros',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        `Which quadratic function has zeros at $x = -${r1}$ and $x = ${r2}$?`,
        `$f(x) = (x + ${r1})(x - ${r2})$`,
        [
          `$f(x) = (x - ${r1})(x + ${r2})$`,
          `$f(x) = (x - ${r1})(x - ${r2})$`,
          `$f(x) = (x + ${r1})(x + ${r2})$`,
        ],
        'A zero at $x = r$ corresponds to the factor $(x - r)$ (opposite sign inside the parentheses!).',
        `Zeros $x = -${r1}$ and $x = ${r2}$ come from factors $(x - (-${r1})) = (x + ${r1})$ and $(x - ${r2})$.`
      ),
    };
  }

  if (id === 'qd-16') {
    const h = seededInt(seed + 1, 2, 7);
    const b = -2 * h;
    const c = seededInt(seed + 2, 3, 15);
    return {
      skillLabel: 'Axis of Symmetry',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `What is the axis of symmetry of $y = x^2 ${fmtSigned(b)}x + ${c}$? Enter the number for $x$.`,
        answerPrefix: '$x =$',
        acceptedAnswers: [String(h)],
        playbookTip: 'Use the axis of symmetry formula $x = -\\frac{b}{2a}$.',
        explanation: `$x = -\\frac{${b}}{2(1)} = ${h}$.`,
      },
    };
  }

  if (id === 'qd-23') {
    const h = seededInt(seed + 1, 2, 6);
    const root = seededInt(seed + 2, 3, 7);
    const sq = root * root;
    const posSol = h + root;
    return {
      skillLabel: 'Solving by Square Roots',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `Solve $(x - ${h})^2 = ${sq}$. What is the POSITIVE solution?`,
        answerPrefix: '$x =$',
        acceptedAnswers: [String(posSol)],
        playbookTip: `Take the square root of both sides: $x - ${h} = \\pm ${root}$.`,
        explanation: `$x - ${h} = ${root} \\implies x = ${posSol}$ (the other root is $x = ${h - root}$).`,
      },
    };
  }

  // 13. Exponential growth/decay rate & doubling (exp-03, exp-04, exp-13, exp-14, exp-17)
  if (id === 'exp-13' || id === 'exp-17') {
    const isDecay = id === 'exp-13';
    const pct = seededInt(seed + 1, 4, 24);
    const factor = isDecay ? (100 - pct) / 100 : (100 + pct) / 100;
    const factorStr = factor.toFixed(2).replace(/0$/, '');
    if (base.kind === 'numeric') {
      return {
        skillLabel: 'Percent Decay Rate',
        isGeneratedVariant: true,
        problem: {
          ...base,
          id: `${id}__redo_${attempt}`,
          prompt: `The value of an item is modeled by $V(t) = 18,000(${factorStr})^t$. By what PERCENT does the value decrease each year?`,
          answerSuffix: '%',
          acceptedAnswers: [String(pct)],
          playbookTip: 'Compare the base $b$ to $1$: $\\text{percent decrease} = (1 - b) \\times 100\\%$.',
          explanation: `$1 - ${factorStr} = ${(pct / 100).toFixed(2)}$, which is a $${pct}\\%$ decrease each year.`,
        },
      };
    }
    return {
      skillLabel: 'Percent Growth Rate',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        `A town’s population is modeled by $P(t) = 15,000(${factorStr})^t$. What is the annual percent growth rate?`,
        `$${pct}\\%$`,
        [`$${pct / 10}\\%$`, `$${100 + pct}\\%$`, `$${pct + 5}\\%$`, `$${pct - 2}\\%$`],
        'Compare the growth factor to $1$: $1 + r = b$, so $r = b - 1$.',
        `$${factorStr} - 1 = ${(pct / 100).toFixed(2)} = ${pct}\\%$ growth per year.`
      ),
    };
  }

  if (id === 'exp-03' || id === 'exp-14') {
    const start = pickFrom([5, 10, 20, 50, 100], seed);
    const t = seededInt(seed + 1, 3, 5);
    const ans = start * Math.pow(2, t);
    return {
      skillLabel: 'Exponential Doubling',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `A population starts with $${start}$ and doubles every hour. How many will there be after $${t}$ hours?`,
        acceptedAnswers: [String(ans)],
        playbookTip: `Doubling means multiplying by $2$: $P(t) = ${start}(2)^t$. Plug in $t = ${t}$.`,
        explanation: `$${start} \\cdot 2^${t} = ${start} \\cdot ${Math.pow(2, t)} = ${ans}$.`,
      },
    };
  }

  // 14. Linear modeling word problems (lin2-07, lin2-17, lin2-22, lin2-25, lin2-29)
  if (id === 'lin2-07' || id === 'lin2-22' || id === 'lin2-29') {
    const rate = pickFrom([25, 35, 40, 50, 65], seed);
    const fixed = pickFrom([30, 45, 60, 100], seed + 1);
    const xAns = seededInt(seed + 2, 3, 9);
    const total = rate * xAns + fixed;
    return {
      skillLabel: 'Solving Linear Word Model',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `A membership plan costs $\\$${fixed}$ to join plus $\\$${rate}$ per month: $C = ${rate}m + ${fixed}$. If the total cost is $\\$${total}$, how many months $m$ were paid for?`,
        acceptedAnswers: [String(xAns)],
        playbookTip: `Set $${rate}m + ${fixed} = ${total}$, subtract $${fixed}$, then divide by $${rate}$.`,
        explanation: `$${rate}m = ${total - fixed} \\implies m = ${xAns}$ months.`,
      },
    };
  }

  if (id === 'lin2-17' || id === 'lin2-25') {
    const baseFee = pickFrom([3, 4, 25, 30], seed);
    const perMile = pickFrom([1.5, 2, 2.5], seed + 1);
    const miles = seededInt(seed + 2, 4, 12) * 2;
    const total = baseFee + perMile * miles;
    return {
      skillLabel: 'Evaluating Linear Cost Model',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `A ride service charges a $\\$${baseFee}$ base fare plus $\\$${perMile.toFixed(2)}$ per mile. What is the total cost (in dollars) for a $${miles}$-mile ride?`,
        answerPrefix: '$',
        acceptedAnswers: [String(total), total.toFixed(2)],
        playbookTip: `Multiply the per-mile rate by $${miles}$ miles, then add the fixed $\\$${baseFee}$ base fare.`,
        explanation: `$${baseFee} + ${perMile.toFixed(2)}(${miles}) = ${baseFee} + ${perMile * miles} = \\$${total}$.`,
      },
    };
  }

  // 15. Systems of equations (sys-06, sys-21, sys-22, sys-25, sys-26)
  if (id === 'sys-21') {
    const xAns = seededInt(seed + 1, 6, 15);
    const yAns = seededInt(seed + 2, 2, xAns - 1);
    const sum = xAns + yAns;
    const diff = xAns - yAns;
    return {
      skillLabel: 'System by Elimination',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `Solve the system by elimination:\n$x + y = ${sum}$\n$x - y = ${diff}$\nWhat is the value of $x$?`,
        answerPrefix: '$x =$',
        acceptedAnswers: [String(xAns)],
        playbookTip: 'Add the two equations straight down so $+y$ and $-y$ cancel out!',
        explanation: `Adding gives $2x = ${sum + diff} \\implies x = ${xAns}$.`,
      },
    };
  }

  if (id === 'sys-06' || id === 'sys-22') {
    const m1 = seededInt(seed + 1, 2, 5);
    const m2 = m1 + seededInt(seed + 2, 2, 4);
    const xAns = seededInt(seed + 3, 2, 7);
    const b1 = seededInt(seed + 4, 1, 8);
    const b2 = (m1 - m2) * xAns + b1;
    return {
      skillLabel: 'Solving Linear System for x',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `Two functions are given:\n$f(x) = ${m1}x ${fmtSigned(b1)}$\n$g(x) = ${m2}x ${fmtSigned(b2)}$\nWhat value of $x$ makes $f(x) = g(x)$?`,
        answerPrefix: '$x =$',
        acceptedAnswers: [String(xAns)],
        playbookTip: 'Set the two expressions equal: $f(x) = g(x)$, then solve for $x$.',
        explanation: `$${m1}x ${fmtSigned(b1)} = ${m2}x ${fmtSigned(b2)} \\implies ${m2 - m1}x = ${b1 - b2} \\implies x = ${xAns}$.`,
      },
    };
  }

  if (id === 'sys-25' || id === 'sys-26') {
    const xAns = seededInt(seed + 1, 2, 7);
    const yAns = seededInt(seed + 2, 2, 6);
    const a1 = seededInt(seed + 3, 2, 4);
    const a2 = seededInt(seed + 4, 2, 5);
    const k = seededInt(seed + 5, 2, 3);
    const c1 = a1 * xAns + k * yAns;
    const c2 = a2 * xAns - k * yAns;
    const askX = id === 'sys-25';
    return {
      skillLabel: 'System by Elimination',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `Solve the system:\n$${a1}x + ${k}y = ${c1}$\n$${a2}x - ${k}y = ${c2}$\nWhat is the value of $${askX ? 'x' : 'y'}$?`,
        answerPrefix: askX ? '$x =$' : '$y =$',
        acceptedAnswers: [String(askX ? xAns : yAns)],
        playbookTip: `Add the two equations together to eliminate $y$ and find $x$ first!`,
        explanation: `Adding gives $${a1 + a2}x = ${c1 + c2} \\implies x = ${xAns}$, and plugging back gives $y = ${yAns}$.`,
      },
    };
  }

  // 16. Exponent rules & absolute value (eei-26, eei-27, eei-28)
  if (id === 'eei-26') {
    const coeff = seededInt(seed + 1, 2, 5);
    const m = seededInt(seed + 2, 2, 5);
    const n = seededInt(seed + 3, 2, 3);
    const newCoeff = Math.pow(coeff, n);
    const newExp = m * n;
    return {
      skillLabel: 'Power of a Product Exponent Rule',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        `Simplify using exponent rules: $(${coeff}x^${m})^${n}$`,
        `$${newCoeff}x^{${newExp}}$`,
        [
          `$${coeff * n}x^{${newExp}}$`,
          `$${newCoeff}x^{${m + n}}$`,
          `$${coeff}x^{${newExp}}$`,
        ],
        'Raise the coefficient to the outside power AND multiply the exponents!',
        `$${coeff}^${n} = ${newCoeff}$ and $(x^${m})^${n} = x^{${m} \\cdot ${n}} = x^{${newExp}}$, giving $${newCoeff}x^{${newExp}}$.`
      ),
    };
  }

  if (id === 'eei-27') {
    const denC = seededInt(seed + 1, 2, 5);
    const qC = seededInt(seed + 2, 2, 6);
    const numC = denC * qC;
    const m = seededInt(seed + 3, 5, 9);
    const n = seededInt(seed + 4, 2, 4);
    const diffExp = m - n;
    return {
      skillLabel: 'Quotient of Powers Exponent Rule',
      isGeneratedVariant: true,
      problem: buildSingleChoice(
        base,
        seed,
        `Simplify: $\\frac{${numC}x^${m}}{${denC}x^${n}}$ (for $x \\neq 0$)`,
        `$${qC}x^${diffExp}$`,
        [
          `$${numC - denC}x^${diffExp}$`,
          `$${qC}x^{${m + n}}$`,
          `$${numC}x^${diffExp}$`,
        ],
        'Divide the coefficients, and SUBTRACT the exponents when dividing like bases.',
        `$\\frac{${numC}}{${denC}} = ${qC}$ and $x^{${m} - ${n}} = x^${diffExp}$, giving $${qC}x^${diffExp}$.`
      ),
    };
  }

  if (id === 'eei-28') {
    const h = seededInt(seed + 1, 2, 7);
    const d = seededInt(seed + 2, 4, 10);
    const posAns = h + d;
    return {
      skillLabel: 'Absolute Value Equations',
      isGeneratedVariant: true,
      problem: {
        ...base,
        id: `${id}__redo_${attempt}`,
        prompt: `Solve $|x - ${h}| = ${d}$. What is the POSITIVE solution?`,
        answerPrefix: '$x =$',
        acceptedAnswers: [String(posAns)],
        playbookTip: `Set up two cases: $x - ${h} = ${d}$ and $x - ${h} = -${d}$.`,
        explanation: `$x - ${h} = ${d} \\implies x = ${posAns}$ (the negative case gives $x = ${h - d}$).`,
      },
    };
  }

  return null;
}

/**
 * Classifies any of the 300 problems into a fine-grained skill subtype
 * so if no parametric generator applies, we always pick another problem of the SAME type.
 */
export function getSkillSubtype(p: MathProblem): { subtype: string; label: string } {
  const txt = p.prompt.toLowerCase();
  if (p.visual?.type === 'steps') return { subtype: 'step-error', label: 'Find the Error Step' };
  if (p.visual?.type === 'boxplots') return { subtype: 'boxplot', label: 'Box-and-Whisker Plots' };
  if (p.visual?.type === 'dotplots') return { subtype: 'dotplot', label: 'Dot Plots & Spread' };
  if (p.visual?.type === 'histogram') return { subtype: 'histogram', label: 'Histograms & Skew' };
  if (p.visual?.type === 'graph' && p.visual.inequalities) {
    return { subtype: 'graph-ineq', label: 'Graphing Inequalities' };
  }
  if (p.visual?.type === 'graph') return { subtype: 'graph-read', label: 'Reading Coordinate Graphs' };
  if (p.visual?.type === 'table') return { subtype: 'table-read', label: 'Interpreting Data Tables' };

  if (txt.includes('which type of function') || txt.includes('which type of model')) {
    return { subtype: 'model-type-id', label: 'Identifying Function Families' };
  }
  if (txt.includes('literal equation') || txt.includes('solve for $h$') || txt.includes('solve for $w$')) {
    return { subtype: 'literal-eq', label: 'Literal Equations' };
  }
  if (txt.includes('how many solutions')) {
    return { subtype: 'solution-count', label: 'Number of Solutions' };
  }
  if (txt.includes('inequality') || txt.includes('\\le') || txt.includes('\\ge') || txt.includes('at least')) {
    return { subtype: 'inequalities', label: 'Solving & Modeling Inequalities' };
  }
  if (txt.includes('parallel') || txt.includes('perpendicular')) {
    return { subtype: 'parallel-perp', label: 'Parallel & Perpendicular Lines' };
  }
  if (txt.includes('slope')) {
    return { subtype: 'linear-slope', label: 'Slope & Rate of Change' };
  }
  if (txt.includes('intercept')) {
    return { subtype: 'intercepts', label: 'x- and y-Intercepts' };
  }
  if (txt.includes('vertex') || txt.includes('axis of symmetry') || txt.includes('maximum height') || txt.includes('minimum')) {
    return { subtype: 'quad-features', label: 'Quadratic Vertex & Features' };
  }
  if (txt.includes('factor')) {
    return { subtype: 'quad-factor', label: 'Factoring Quadratics' };
  }
  if (txt.includes('domain') || txt.includes('range')) {
    return { subtype: 'domain-range', label: 'Domain & Range' };
  }
  if (txt.includes('function') && (txt.includes('represent') || txt.includes('vertical line') || txt.includes('ordered pairs'))) {
    return { subtype: 'is-function', label: 'Identifying Functions' };
  }
  if (txt.includes('correlation') || txt.includes('line of best fit') || txt.includes('residual') || txt.includes('scatterplot')) {
    return { subtype: 'scatter-corr', label: 'Line of Best Fit & Correlation' };
  }
  if (txt.includes('iqr') || txt.includes('interquartile') || txt.includes('median') || txt.includes('standard deviation')) {
    return { subtype: 'data-spread', label: 'Center & Spread' };
  }
  if (txt.includes('system')) {
    return { subtype: 'systems', label: 'Systems of Equations' };
  }
  if (txt.includes('percent') || txt.includes('decay') || txt.includes('growth') || txt.includes('doubles') || txt.includes('triples')) {
    return { subtype: 'exp-modeling', label: 'Exponential Growth & Decay' };
  }
  if (txt.includes('simplify') || txt.includes('equivalent to')) {
    return { subtype: 'simplify-equiv', label: 'Simplifying & Equivalent Expressions' };
  }
  return { subtype: `topic:${p.topic}`, label: p.topic };
}

/**
 * Given a missed problem, returns another version of the SAME question type:
 * 1) Prefers an isomorphic parametric variant with new numbers if supported.
 * 2) Otherwise picks an unseen sibling problem of the exact same fine-grained skill subtype
 *    (falling back to the same topic & question format if needed).
 */
export function getRedoProblem(
  missed: MathProblem,
  allProblems: MathProblem[],
  excludeIds: Set<string>,
  attempt: number
): RedoResult {
  const parametric = generateParametricVariant(missed, attempt);
  if (parametric) {
    return parametric;
  }

  const { subtype, label } = getSkillSubtype(missed);
  const rootId = missed.id.split('__redo_')[0];

  const isEligible = (p: MathProblem) =>
    p.id !== missed.id && p.id !== rootId && !excludeIds.has(p.id);

  // 1. Same subtype + same topic
  let candidates = allProblems.filter(
    (p) => isEligible(p) && p.topic === missed.topic && getSkillSubtype(p).subtype === subtype
  );

  // 2. Same subtype across all topics
  if (candidates.length === 0) {
    candidates = allProblems.filter(
      (p) => isEligible(p) && getSkillSubtype(p).subtype === subtype
    );
  }

  // 3. Same topic + same kind
  if (candidates.length === 0) {
    candidates = allProblems.filter(
      (p) => isEligible(p) && p.topic === missed.topic && p.kind === missed.kind
    );
  }

  // 4. Same topic (any eligible)
  if (candidates.length === 0) {
    candidates = allProblems.filter((p) => isEligible(p) && p.topic === missed.topic);
  }

  // 5. Allow solved siblings of the same subtype (with shuffled options) if everything else was excluded
  if (candidates.length === 0) {
    candidates = allProblems.filter(
      (p) => p.id !== rootId && getSkillSubtype(p).subtype === subtype
    );
  }

  if (candidates.length === 0) {
    candidates = allProblems.filter((p) => p.id !== rootId && p.topic === missed.topic);
  }

  const picked = pickFrom(candidates, attempt * 7 + rootId.length);
  const shuffled = shuffleSingleProblem(picked, attempt);

  return {
    problem: shuffled,
    isGeneratedVariant: false,
    skillLabel: label,
  };
}
