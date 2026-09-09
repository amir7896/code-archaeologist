export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CouplingLabel = 'low' | 'medium' | 'high';
export type ComplexityLabel = 'low' | 'medium' | 'high';

export type RiskFactor = {
  key: string;
  label: string;
  raw: number;
  normalized: number;
  weight: number;
  contribution: number;
};

export type RiskResult = {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  evidenceConfidence: number;
};

export const RISK_WEIGHTS = {
  fanIn: 0.2,
  fanOut: 0.15,
  churn: 0.2,
  complexity: 0.2,
  ownership: 0.15,
  recency: 0.1,
} as const;

const DAY_MS = 86_400_000;

export function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function couplingLabel(fanIn: number, fanOut: number): CouplingLabel {
  const total = fanIn + fanOut;
  if (total >= 12) {
    return 'high';
  }
  if (total >= 5) {
    return 'medium';
  }
  return 'low';
}

export function complexityLabel(complexity: number): ComplexityLabel {
  if (complexity >= 15) {
    return 'high';
  }
  if (complexity >= 6) {
    return 'medium';
  }
  return 'low';
}

export function riskLevel(score: number): RiskLevel {
  if (score >= 75) {
    return 'CRITICAL';
  }
  if (score >= 50) {
    return 'HIGH';
  }
  if (score >= 25) {
    return 'MEDIUM';
  }
  return 'LOW';
}

export function recencyNormalized(daysSinceChange: number | null): number {
  if (daysSinceChange === null) {
    return 0;
  }
  if (daysSinceChange <= 14) {
    return 1;
  }
  if (daysSinceChange >= 180) {
    return 0;
  }
  return clamp01(1 - (daysSinceChange - 14) / (180 - 14));
}

export function daysSince(value: Date | null, now = Date.now()): number | null {
  if (!value) {
    return null;
  }
  return Math.max(0, Math.floor((now - value.getTime()) / DAY_MS));
}

/**
 * Weighted 0–100 score. Every factor is stored so the UI can explain the number.
 */
export function scoreRisk(input: {
  fanIn: number;
  fanOut: number;
  changeCount: number;
  complexity: number;
  maxAuthorShare: number;
  daysSinceChange: number | null;
}): RiskResult {
  const factors: RiskFactor[] = [
    factor('fanIn', 'Consumers', input.fanIn, clamp01(input.fanIn / 20), RISK_WEIGHTS.fanIn),
    factor('fanOut', 'Dependencies', input.fanOut, clamp01(input.fanOut / 15), RISK_WEIGHTS.fanOut),
    factor('churn', 'Change frequency', input.changeCount, clamp01(input.changeCount / 30), RISK_WEIGHTS.churn),
    factor(
      'complexity',
      'Structural complexity',
      input.complexity,
      clamp01(input.complexity / 25),
      RISK_WEIGHTS.complexity,
    ),
    factor(
      'ownership',
      'Author concentration',
      Number(input.maxAuthorShare.toFixed(2)),
      clamp01(input.maxAuthorShare),
      RISK_WEIGHTS.ownership,
    ),
    factor(
      'recency',
      'Recent change',
      input.daysSinceChange ?? 0,
      recencyNormalized(input.daysSinceChange),
      RISK_WEIGHTS.recency,
    ),
  ];
  const score = Math.round(factors.reduce((sum, item) => sum + item.contribution, 0) * 100);
  const evidenceConfidence = clamp01(
    0.35 +
      (input.changeCount > 0 ? 0.25 : 0) +
      (input.fanIn + input.fanOut > 0 ? 0.2 : 0) +
      (input.complexity > 0 ? 0.2 : 0),
  );
  return {
    score,
    level: riskLevel(score),
    factors,
    evidenceConfidence: Number(evidenceConfidence.toFixed(2)),
  };
}

export function hotspotScore(input: { changeCount: number; complexity: number; fanIn: number }): number {
  return input.changeCount * (input.complexity + 1) * (input.fanIn + 1);
}

function factor(
  key: string,
  label: string,
  raw: number,
  normalized: number,
  weight: number,
): RiskFactor {
  return {
    key,
    label,
    raw,
    normalized: Number(normalized.toFixed(3)),
    weight,
    contribution: Number((normalized * weight).toFixed(4)),
  };
}
