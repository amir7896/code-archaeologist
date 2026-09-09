/** Investigation answers never claim certainty. */
export const INVESTIGATION_MAX_CONFIDENCE = 0.92;
export const INVESTIGATION_FACT_LIMIT = 12;

export type InvestigationIntent =
  | 'why_exists'
  | 'who_introduced'
  | 'when_changed'
  | 'symbol_history'
  | 'depends_on'
  | 'impact'
  | 'risk'
  | 'evolution'
  | 'overview'
  | 'general';

export type InvestigationFact = {
  sourceType: 'FILE' | 'SYMBOL' | 'COMMIT' | 'EVIDENCE' | 'RISK' | 'GRAPH' | 'REPO';
  sourceId: string;
  citation: string;
  excerpt: string;
  relevance: number;
  fileId?: string | null;
  symbolId?: string | null;
  commitSha?: string | null;
  path?: string | null;
};

const STOP_WORDS = new Set([
  'the',
  'this',
  'that',
  'what',
  'who',
  'when',
  'why',
  'how',
  'does',
  'did',
  'have',
  'has',
  'with',
  'from',
  'into',
  'about',
  'would',
  'could',
  'should',
  'which',
  'where',
  'there',
  'their',
  'and',
  'for',
  'are',
  'was',
  'were',
  'been',
  'being',
  'you',
  'your',
  'our',
  'its',
  'not',
  'can',
  'will',
  'around',
  'happens',
  'happen',
  'remove',
  'change',
  'changed',
  'changing',
  'introduced',
  'introduce',
  'introducing',
  'wrote',
  'owned',
  'author',
  'authors',
  'tell',
  'cloned',
  'used',
  'here',
  'repository',
  'repo',
  'codebase',
  'project',
  'please',
  'describe',
  'explain',
  'someone',
  'person',
  'people',
]);

export function classifyInvestigationIntent(question: string): InvestigationIntent {
  const text = question.toLowerCase();
  if (/\b(about|describe|overview|what is)\b/.test(text) && /\b(repo|repository|codebase|project|this)\b/.test(text)) {
    return 'overview';
  }
  if (/\b(risky|hotspot|risk|fragile)\b/.test(text)) {
    return 'risk';
  }
  if (/\b(if i|blast|impact|break|remove|delete)\b/.test(text) && /\b(change|touch|edit|remove|delete|happen)\b/.test(text)) {
    return 'impact';
  }
  if (/\b(depends?|consumers?|imports?|used by|uses)\b/.test(text)) {
    return 'depends_on';
  }
  if (/\b(evolv\w*|timeline|over time|history of)\b/.test(text)) {
    return 'evolution';
  }
  if (/\b(who|author|wrote|introduced|owned)\b/.test(text)) {
    return 'who_introduced';
  }
  if (/\b(when|first seen|since|date)\b/.test(text)) {
    return 'when_changed';
  }
  if (/\b(why|exist|purpose|introduced this)\b/.test(text)) {
    return 'why_exists';
  }
  if (/\b(symbol|function|method|class)\b/.test(text) && /\b(history|changed|around)\b/.test(text)) {
    return 'symbol_history';
  }
  return 'general';
}

export function extractInvestigationTokens(question: string): string[] {
  const tokens = new Set<string>();
  for (const match of question.matchAll(/[A-Za-z0-9_./-]+\.[A-Za-z]{1,8}/g)) {
    tokens.add(match[0].toLowerCase());
  }
  for (const match of question.matchAll(/[A-Za-z_][A-Za-z0-9_]{2,}/g)) {
    const token = match[0].toLowerCase();
    if (!STOP_WORDS.has(token)) {
      tokens.add(token);
    }
  }
  return rankInvestigationSearchTokens([...tokens]).slice(0, 12);
}

/** Prefer filenames and identifiers over filler that survived stop-word filtering. */
export function rankInvestigationSearchTokens(tokens: string[]): string[] {
  return [...tokens].sort((left, right) => {
    const delta = searchTokenScore(right) - searchTokenScore(left);
    return delta !== 0 ? delta : right.length - left.length;
  });
}

function searchTokenScore(token: string): number {
  if (token.includes('/') && token.includes('.')) {
    return 100;
  }
  if (/\.[a-z][a-z0-9]{0,7}$/i.test(token)) {
    return 90;
  }
  if (token.includes('_') || token.includes('-')) {
    return 70;
  }
  if (token.length >= 6) {
    return 40;
  }
  return 20;
}

export function rankInvestigationFacts(facts: InvestigationFact[]): InvestigationFact[] {
  return [...facts]
    .sort((left, right) => {
      if (right.relevance !== left.relevance) {
        return right.relevance - left.relevance;
      }
      return left.citation.localeCompare(right.citation);
    })
    .slice(0, INVESTIGATION_FACT_LIMIT);
}

export function numberInvestigationFacts(facts: InvestigationFact[]): Array<InvestigationFact & { index: number }> {
  return rankInvestigationFacts(facts).map((fact, index) => ({ ...fact, index: index + 1 }));
}

export function buildInvestigationContext(facts: Array<InvestigationFact & { index: number }>): string {
  if (facts.length === 0) {
    return 'No indexed evidence was retrieved.';
  }
  return facts
    .map((fact) => `[${fact.index}] (${fact.sourceType}) ${fact.citation}: ${fact.excerpt}`)
    .join('\n');
}

export function buildDeterministicAnswer(input: {
  question: string;
  intent: InvestigationIntent;
  facts: Array<InvestigationFact & { index: number }>;
  usedModel: boolean;
}): { answer: string; confidence: number } {
  if (input.facts.length === 0) {
    return {
      answer:
        'There is not enough indexed evidence to answer. Sync the repository, then ask about a file or symbol that appears in Code, History, or Evolution.',
      confidence: 0.12,
    };
  }

  const lines = input.facts.slice(0, 6).map((fact) => `- ${fact.citation}: ${fact.excerpt} [${fact.index}]`);
  const preface =
    input.intent === 'impact'
      ? 'Indexed architecture and history say:'
      : input.intent === 'risk'
        ? 'Indexed risk and history say:'
        : input.intent === 'overview'
          ? 'Indexed repository facts say:'
          : input.intent === 'who_introduced'
            ? 'Indexed authorship evidence says:'
            : 'Indexed evidence says:';
  const limitations =
    'Limitations: symbol locations come from the current tree; commit-to-symbol links are scored, never certain; no issue or pull-request text is available yet.';
  const modelNote = input.usedModel
    ? ''
    : ' A local model was not used; this is the retrieved evidence only.';
  return {
    answer: `${preface}\n${lines.join('\n')}\n\n${limitations}${modelNote}`,
    confidence: scoreInvestigationConfidence({
      factCount: input.facts.length,
      citedCount: input.facts.length,
      usedModel: false,
      invented: false,
    }),
  };
}

export function validateCitedAnswer(
  answer: string,
  factCount: number,
): { answer: string; cited: number[]; invented: boolean } {
  const refs = [...answer.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  const cited = [...new Set(refs.filter((index) => index >= 1 && index <= factCount))];
  const invented = refs.some((index) => index < 1 || index > factCount);
  let next = answer;
  if (invented) {
    next = next.replace(/\[(\d+)\]/g, (match, raw: string) => {
      const index = Number(raw);
      return index >= 1 && index <= factCount ? match : '';
    });
    next = `${next.trim()}\n\nSome model citations were removed because they were not in the evidence set.`;
  }
  if (cited.length === 0 && factCount > 0) {
    const list = Array.from({ length: Math.min(factCount, 6) }, (_, index) => `[${index + 1}]`).join(' ');
    next = `${next.trim()}\n\nCited evidence: ${list}`;
  }
  if (factCount === 0 && !next.toLowerCase().includes('not enough')) {
    next = `${next.trim()}\n\nThere is not enough indexed evidence to support this answer.`;
  }
  return { answer: next.trim(), cited, invented };
}

export function scoreInvestigationConfidence(input: {
  factCount: number;
  citedCount: number;
  usedModel: boolean;
  invented: boolean;
}): number {
  if (input.factCount === 0) {
    return 0.12;
  }
  const coverage = input.citedCount / Math.max(1, Math.min(input.factCount, 6));
  let score = 0.28 + 0.4 * coverage + Math.min(0.18, input.factCount * 0.03);
  if (input.usedModel && !input.invented) {
    score += 0.08;
  }
  if (input.invented) {
    score -= 0.2;
  }
  return Math.min(INVESTIGATION_MAX_CONFIDENCE, Math.max(0.08, Number(score.toFixed(3))));
}

export function investigationConfidenceLabel(confidence: number): 'possible' | 'likely' | 'strong' {
  if (confidence >= 0.7) {
    return 'strong';
  }
  if (confidence >= 0.45) {
    return 'likely';
  }
  return 'possible';
}
