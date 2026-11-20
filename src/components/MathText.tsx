import React from 'react';

interface MathTextProps {
  text: string;
  className?: string;
}

type Token =
  | { type: 'text'; value: string }
  | { type: 'frac'; num: string; den: string }
  | { type: 'sup'; content: string }
  | { type: 'sub'; content: string };

const DOLLAR_SENTINEL = '\uE000';

/**
 * Extracts a balanced {...} block starting at index `start` (which should point to '{').
 * Returns [content, nextIndexAfterClosingBrace].
 */
function readBraced(str: string, start: number): [string, number] {
  if (str[start] !== '{') {
    return [str[start] ?? '', start + 1];
  }
  let depth = 0;
  let i = start;
  while (i < str.length) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return [str.slice(start + 1, i), i + 1];
      }
    }
    i++;
  }
  return [str.slice(start + 1), str.length];
}

function tokenizeMath(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let buffer = '';

  const flush = () => {
    if (buffer.length > 0) {
      tokens.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  while (i < expr.length) {
    if (expr.startsWith('\\frac', i)) {
      flush();
      i += 5;
      while (expr[i] === ' ') i++;
      const [num, afterNum] = readBraced(expr, i);
      i = afterNum;
      while (expr[i] === ' ') i++;
      const [den, afterDen] = readBraced(expr, i);
      i = afterDen;
      tokens.push({ type: 'frac', num, den });
      continue;
    }

    if (expr[i] === '^') {
      flush();
      i++;
      if (expr[i] === '{') {
        const [content, next] = readBraced(expr, i);
        i = next;
        tokens.push({ type: 'sup', content });
      } else {
        const ch = expr[i] ?? '';
        i++;
        tokens.push({ type: 'sup', content: ch });
      }
      continue;
    }

    if (expr[i] === '_') {
      flush();
      i++;
      if (expr[i] === '{') {
        const [content, next] = readBraced(expr, i);
        i = next;
        tokens.push({ type: 'sub', content });
      } else {
        const ch = expr[i] ?? '';
        i++;
        tokens.push({ type: 'sub', content: ch });
      }
      continue;
    }

    buffer += expr[i];
    i++;
  }

  flush();
  return tokens;
}

function formatMathChars(raw: string): string {
  return raw
    .replaceAll(DOLLAR_SENTINEL, '$')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\hat\{y\}/g, 'ŷ')
    .replace(/\\hat\{([^}]*)\}/g, '$1\u0302')
    .replace(/\\left|\\right/g, '')
    .replace(/\\implies/g, ' → ')
    .replace(/\\to/g, ' → ')
    .replace(/\\circ/g, '°')
    .replace(/\\pm/g, ' ± ')
    .replace(/\\approx/g, ' ≈ ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\%/g, '%')
    .replace(/\\cdot/g, ' · ')
    .replace(/\\times/g, ' × ')
    .replace(/<=/g, ' ≤ ')
    .replace(/>=/g, ' ≥ ')
    .replace(/\\le/g, ' ≤ ')
    .replace(/\\ge/g, ' ≥ ')
    .replace(/\\neq/g, ' ≠ ')
    .replace(/ - /g, ' − ')
    .replace(/^-/g, '−');
}

function RenderMathSegment({ expr, inExponent = false }: { expr: string; inExponent?: boolean }) {
  const tokens = tokenizeMath(expr);

  return (
    <span className="inline-flex items-baseline flex-wrap font-serif tracking-[0.01em] tabular-nums">
      {tokens.map((tok, idx) => {
        if (tok.type === 'text') {
          return <span key={idx}>{formatMathChars(tok.value)}</span>;
        }
        if (tok.type === 'frac') {
          return (
            <span
              key={idx}
              className={`inline-flex flex-col items-center justify-center align-middle mx-[2px] leading-[1.08] ${
                inExponent ? 'text-[0.76em] -translate-y-[0.08em]' : 'text-[0.86em]'
              }`}
              aria-label={`fraction ${tok.num} over ${tok.den}`}
            >
              <span className="px-[3px] pb-[1px] border-b border-current text-center">
                <RenderMathSegment expr={tok.num} inExponent={inExponent} />
              </span>
              <span className="px-[3px] pt-[1.5px] text-center">
                <RenderMathSegment expr={tok.den} inExponent={inExponent} />
              </span>
            </span>
          );
        }
        if (tok.type === 'sup') {
          return (
            <sup
              key={idx}
              className="inline-flex items-baseline text-[0.72em] leading-none font-medium -top-[0.48em] relative ml-[0.5px] mr-[1px]"
            >
              <RenderMathSegment expr={tok.content} inExponent />
            </sup>
          );
        }
        return (
          <sub
            key={idx}
            className="inline-flex items-baseline text-[0.72em] leading-none -bottom-[0.25em] relative ml-[0.5px]"
          >
            <RenderMathSegment expr={tok.content} inExponent />
          </sub>
        );
      })}
    </span>
  );
}

/**
 * Renders prose mixed with `$...$` math segments.
 * Ensures all fractions are vertical stacked and all exponents are real superscripts without parentheses.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  const escaped = text.replace(/\\\$/g, DOLLAR_SENTINEL);
  const parts = escaped.split(/(\$[^$]+\$)/g);

  return (
    <span className={`leading-[1.65] ${className}`}>
      {parts.map((part, idx) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
          const inner = part.slice(1, -1);
          return (
            <span key={idx} className="inline-flex items-baseline mx-[1px]">
              <RenderMathSegment expr={inner} />
            </span>
          );
        }
        const plain = part.replaceAll(DOLLAR_SENTINEL, '$');
        const lines = plain.split('\n');
        return (
          <React.Fragment key={idx}>
            {lines.map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {line}
                {lineIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </span>
  );
};
