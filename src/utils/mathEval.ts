/**
 * Normalizes student numeric or algebraic answers and checks against accepted answers.
 */
export function normalizeAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/−/g, '-')
    .replace(/\$|%/g, '')
    .replace(/^(x|y|a|b|t|n|p|f\(x\)|f\(n\)|h\(t\))=/i, '');
}

function tryParseFractionOrNumber(s: string): number | null {
  const cleaned = s.replace(/,/g, '');
  if (/^[+-]?\d+(\.\d+)?$/.test(cleaned)) {
    return Number(cleaned);
  }
  const fracMatch = cleaned.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (den !== 0) return num / den;
  }
  return null;
}

export function isNumericAnswerCorrect(userInput: string, acceptedAnswers: string[]): boolean {
  const rawTrim = userInput.trim().toLowerCase().replace(/\s+/g, '').replace(/−/g, '-');
  if (!rawTrim) return false;

  const normUser = normalizeAnswer(userInput);

  for (const acc of acceptedAnswers) {
    const rawAcc = acc.trim().toLowerCase().replace(/\s+/g, '').replace(/−/g, '-');
    const normAcc = normalizeAnswer(acc);

    if (rawTrim === rawAcc || normUser === normAcc) {
      return true;
    }

    const numUser = tryParseFractionOrNumber(normUser);
    const numAcc = tryParseFractionOrNumber(normAcc);
    if (numUser !== null && numAcc !== null && Math.abs(numUser - numAcc) < 0.005) {
      return true;
    }
  }

  return false;
}
