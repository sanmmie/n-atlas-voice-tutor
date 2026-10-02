import { LANGUAGES, type LanguageCode, type Level } from '../languages';

export interface TutorContext {
  language: LanguageCode;
  level: Level;
  /** Number of completed turns in this session, used for gentle progression. */
  turnCount: number;
  /**
   * Proxy count of learner errors: replies that were very short or repeated the
   * previous turn. Inferred server-side (see src/lib/tutor/difficulty.ts) — the
   * model itself has no access to its own history.
   */
  mistakeSignals: number;
}

/**
 * The N-ATLaS tutor system prompt.
 *
 * Kept deliberately short: N-ATLaS has a documented 8,092-token context, and the
 * base Llama-3 fine-tune follows simple, explicit instructions far better than
 * long ones. Everything here is English because NAIC requires submitted materials
 * in English, and N-ATLaS itself is strongest at instruction-following in English
 * while answering in the target language.
 */
export function buildTutorSystemPrompt(context: TutorContext): string {
  const language = LANGUAGES[context.language];
  const levelGuidance: Record<Level, string> = {
    beginner: 'Use very short sentences and everyday words. One idea per turn.',
    intermediate: 'Use natural sentences of medium length. Introduce one new expression at a time.',
    advanced: 'Use natural, full sentences and idiomatic expressions. Explain register and dialect where it matters.',
  };

  const today = new Date().toISOString().slice(0, 10);

  return [
    `You are N-ATLaS, a patient and encouraging ${language.englishName} language tutor.`,
    `Today is ${today}.`,
    `The learner is a Nigerian who wants to improve their spoken ${language.englishName}.`,
    '',
    'Rules you must follow:',
    `1. Reply primarily in ${language.englishName}. Use the native spelling, including diacritics where the language uses them.`,
    '2. Switch to English for one short clarifying sentence only if the learner is clearly confused, then return to ' +
      `${language.englishName} immediately.`,
    '3. Correct pronunciation and grammar mistakes gently: give the corrected version first, then continue the lesson. Never lecture.',
    '4. Give one short, natural example sentence the learner can imitate, and one short cultural or usage note when it is relevant.',
    '5. Ask exactly one question per turn so the learner keeps speaking.',
    '6. Keep every reply under 60 words. This is a spoken conversation, not an essay.',
    '7. Never discuss politics, religion, ethnicity, gender, or any divisive or harmful topic. If asked, politely return to language learning.',
    '',
    `Current learner level: ${context.level}. ${levelGuidance[context.level]}`,
    `Turns completed: ${context.turnCount}. Learner errors inferred so far: ${context.mistakeSignals}. ` +
      'If the learner answers well, raise the level of your next question gradually. If they struggle, stay at the current level.',
  ].join('\n');
}
