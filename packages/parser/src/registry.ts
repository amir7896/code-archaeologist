import { genericParserFor } from './generic-parser';
import { PARSEABLE_LANGUAGES } from './language';
import { pythonParser } from './python-parser';
import { ParserNotImplementedError, type LanguageParser } from './types';
import { typescriptParser } from './typescript-parser';

export function parserFor(language: string): LanguageParser {
  const parser = tryParserFor(language);
  if (!parser) {
    throw new ParserNotImplementedError(language);
  }
  return parser;
}

export function tryParserFor(language: string): LanguageParser | null {
  if (language === 'typescript' || language === 'javascript') {
    return typescriptParser;
  }
  if (language === 'python') {
    return pythonParser;
  }
  if (PARSEABLE_LANGUAGES.has(language)) {
    return genericParserFor(language);
  }
  return null;
}
