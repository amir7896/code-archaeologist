/**
 * LLM provider abstraction from the project scope.
 * Ollama is first. Hosted providers are optional and must disclose when source leaves the machine.
 * AI never silently changes repositories in v1.
 */
export * from './ollama';
export * from './prompt';
export * from './types';
