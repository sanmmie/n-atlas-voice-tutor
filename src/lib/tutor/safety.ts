import { getConfig } from '../natlas/config';
import type { LanguageCode } from '../languages';

/**
 * Topic guard for the tutor.
 *
 * NAIC's problem statement and the N-ATLaS terms both require the tutor to stay
 * away from political, religious and divisive content. This is a deterministic
 * pre/post filter around the model: it screens the learner's utterance before
 * the N-ATLaS call and screens the generated reply before it is spoken.
 *
 * It is intentionally narrow. Words like "government" or "church" appear in
 * legitimate Nigerian vocabulary exercises, so only explicit question forms and
 * clearly soliciting phrasing are blocked, never a bare noun.
 */

const SENSITIVE_TERMS = [
  'politics',
  'political',
  'election',
  'elections',
  'president',
  'governor',
  'senator',
  'legislature',
  'parliament',
  'party',
  'religion',
  'religious',
  'christian',
  'christianity',
  'moslem',
  'muslim',
  'islam',
  'church',
  'mosque',
  'jihad',
  'tribe',
  'ethnicity',
  'violence',
  'weapon',
  'gun',
  'kill',
  'sabo',
  'biafra',
  'boko haram',
];

/** Opinion-seeking framing: blocks any topic the learner tries to steer N-ATLaS towards an opinion. */
const OPINION_PATTERNS = [
  /\b(what do you think|your opinion|do you support|do you agree|who should|whose side|why do (people|christians|muslims))\b/i,
];

/** Explicitly soliciting one of the sensitive terms. */
const SOLICIT_PATTERNS = SENSITIVE_TERMS.map(
  (term) => new RegExp(`\\b(tell me about|explain|what is|what's|define|discuss|talk about)\\b[^.?]{0,24}\\b${term.replace(/\s+/g, '\\s+')}\\b`, 'i'),
);

/** Unambiguously hostile or divisive framings that no language lesson should answer. */
const HARMFUL_PATTERNS = [
  /\b(all|every)\s+(hausa|igbo|yoruba|christians?|muslims?|people)\s+(are|is)\b/i,
  /\b(stupid|dumb|primitive|barbaric|animals?)\s+(hausa|igbo|yoruba|people|africans?)\b/i,
  /\b(hate|kill|burn|destroy)\s+(all|every|the)\s*(hausa|igbo|yoruba|christians?|muslims?)\b/i,
];

export interface TopicScreen {
  blocked: boolean;
  reason?: 'sensitive_topic' | 'harmful_request' | 'opinion_seeking';
  matchedTerm?: string;
}

export function screenTopic(text: string): TopicScreen {
  // `TUTOR_SAFETY_ENABLED` defaults to true, so the guard is fail-safe: it only
  // opens up when an operator deliberately turns it off.
  if (!getConfig().TUTOR_SAFETY_ENABLED) return { blocked: false };

  const trimmed = text.trim();
  if (!trimmed) return { blocked: false };

  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { blocked: true, reason: 'harmful_request', matchedTerm: pattern.source };
    }
  }

  for (const pattern of SOLICIT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { blocked: true, reason: 'sensitive_topic', matchedTerm: pattern.source };
    }
  }

  for (const pattern of OPINION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { blocked: true, reason: 'opinion_seeking', matchedTerm: pattern.source };
    }
  }

  return { blocked: false };
}

const REFUSALS: Record<LanguageCode, string> = {
  hausa: 'Na san haka ba mu magana ne na hada da batun mai zafi ba. Ka sake mu magana da koyar da harshen Hausa?',
  igbo: 'Ị bị anyị ịjị ọrụ aka ịjighị anyị bụ isi okwu dị egwu. Jị ọzọ anyị ịga nkọwa okwu Igbo?',
  yoruba: 'Èyí kì í ṣe àwó ọjọ́ ọrọ̀ kì í bá àìrẹ́sẹ̀. Ṣé a tún lẹ́yìn kíkẹ́kọ̀ ọ̀rọ̀ Yorùbá?',
};

export function refusalFor(language: LanguageCode): string {
  return REFUSALS[language];
}
