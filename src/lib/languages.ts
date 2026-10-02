export type LanguageCode = 'hausa' | 'igbo' | 'yoruba';

export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface LanguageDefinition {
  code: LanguageCode;
  /** Name in the language itself, in native orthography. */
  endonym: string;
  englishName: string;
  /** ISO 639-1 / BCP-47 tag used for SpeechSynthesis voice selection. */
  bcp47: string;
  /** Official N-ATLaS speech-recognition weights used for this language. */
  asrModel: string;
  /** IS0 639-3 code carried by the N-ATLaS ASR models. */
  iso6393: string;
  theme: LanguageCode;
  /** Short cultural note shown on the selection card. */
  culture: string;
  /** Tutor greeting used as the first spoken turn and as a TTS phrase-library entry. */
  greeting: string;
  /** Translation of the greeting, for the transcript accessibility line. */
  greetingEnglish: string;
  /** Prompt used to ask a learner to produce a target sentence. */
  prompts: Record<Level, string[]>;
  /** Highest ASR context window of the N-ATLaS ASR checkpoints (30s per inference). */
  maxChunkSeconds: number;
  /** Honest accuracy expectations, surfaced in the UI and in docs/limitations.md. */
  knownQuality: 'strong' | 'moderate' | 'weak';
  qualityNote: string;
}

export const LANGUAGES: Record<LanguageCode, LanguageDefinition> = {
  hausa: {
    code: 'hausa',
    endonym: 'Hausa',
    englishName: 'Hausa',
    bcp47: 'ha-NG',
    asrModel: 'NCAIR1/Hausa-ASR',
    iso6393: 'ha',
    theme: 'hausa',
    culture: 'Hausa — geometric latticework and Sahel architecture.',
    greeting: 'Sannu! Ku ne mai koyar da harshen Hausa. Ka fa za ka iya magana da ni?',
    greetingEnglish:
      'Hello! I am your Hausa language tutor. Are you ready to speak with me?',
    prompts: {
      beginner: [
        'Ka sa gaisuwa da yaya a Hausa?',
        'Meninge ne, yaya ake saying "good morning" a Hausa?',
        'Ka san wane abu ne? Ka nuna mini abin da kake so?',
      ],
      intermediate: [
        'Ka san yadda ake nuna gaisuwa da babuwa a cikin yanayi?',
        'Ka iya bayyana abin da kake yi a ranar yana aiki a Hausa?',
        'Ka san yadda ake neman gafara idan ka yi kuskure?',
      ],
      advanced: [
        'Ka san yadda ake faɗuɗewa da wasu bambancin dawacin Hausa na yi?',
        'Ka iya bayyana wani darasi na al’adar da ke bambanta da kowane yanki?',
        'Ka san yadda ake tafiyar da shakadara mai zurfin hankali na gwagudu?',
      ],
    },
    maxChunkSeconds: 25,
    knownQuality: 'strong',
    qualityNote:
      'N-ATLaS human evaluation scores Hausa highest of the three (3.98/5.0). Expect the best turn-taking quality here.',
  },
  igbo: {
    code: 'igbo',
    endonym: 'Igbo',
    englishName: 'Igbo',
    bcp47: 'ig-NG',
    asrModel: 'NCAIR1/Igbo-ASR',
    iso6393: 'ig',
    theme: 'igbo',
    culture: 'Igbo — uli-inspired chalk line work and forest tones.',
    greeting:
      'Nọọ! Na-abụ mma nkọwa okwu Igbo gị. Ị dị njikị ịtụla anyị na-ekwu okwu?',
    greetingEnglish:
      'Hello! I am your Igbo language tutor. Are you ready for us to speak?',
    prompts: {
      beginner: [
        'Kedu ihe ị na-ekwu maka ịbịa nke ọma?',
        'Ole ole ga esi akpọ mmadị dị mma n’Igbo?',
        'Gịnị ị na-ahụ maka obodo gị?',
      ],
      intermediate: [
        'Kedu ihe ị na-ekwu mgbe ị na-agba aka?',
        'Ị nwere ike ịkọcha otu ihe ị na-atụ anya ịchọ ya?',
        'Ole ole ga-aka ihu ma ọ bụ onye ị si n’ịnya?',
      ],
      advanced: [
        'Kedu ihe dị iche dị n’etiti ọtụtụ Igbo na Igbo mmadụ?',
        'Ị nwere ike kọcha otu akụkọ dị iche n’elu afọ ọ dị ọma?',
        'Kedu ihe ị na-atụ anya ịhụ anyị na ọ bụ n’akụkọ niile?',
      ],
    },
    maxChunkSeconds: 25,
    knownQuality: 'moderate',
    qualityNote:
      'N-ATLaS scores Igbo 3.87/5.0. Solid, but dialect variants (standard Igbo vs. regional) can reduce ASR accuracy.',
  },
  yoruba: {
    code: 'yoruba',
    endonym: 'Yorùbá',
    englishName: 'Yoruba',
    bcp47: 'yo-NG',
    asrModel: 'NCAIR1/Yoruba-ASR',
    iso6393: 'yo',
    theme: 'yoruba',
    culture: 'Yorùbá — adire indigo cloth patterning.',
    greeting:
      'Pẹ̀lẹ́ o! Emi ni olùtọ́rọ̀ èdè Yorùbá rẹ. Ṣé o mọ̀ láti jíròrò pẹ̀lú mi?',
    greetingEnglish:
      'Hello! I am your Yoruba language tutor. Are you ready to talk with me?',
    prompts: {
      beginner: [
        'Bawo ni a ṣe n ibi ojoojọ?',
        'Kini a n pe ọmọlẹ́ ojú ọwọ́?',
        'Kín ni o fẹ́ kí kí n sọ fún ọ nípa ìlú rẹ?',
      ],
      intermediate: [
        'Bawo ni a ṣe ṣe àlàáfẹ́ pẹ̀lú ẹ̀yá rẹ ní ọjọ́ ìwé?',
        'Ṣé o lè kọ́ àkójọ̀rọ̀ kan nípa ìṣe ẹ́ tí o ṣe ní ọjọ́ àná?',
        'Kín ni a n fẹ́ láti sọ bó tilẹ̀ jẹ́ pẹ̀lú ojú ọwọ́?',
      ],
      advanced: [
        'Kín ni àwọn ọ̀rọ̀ lílorí inú Yorùbá tí ó yàrà lọ́wọ́ lọ́ sí i?',
        'Ṣé o lè kọ́ ìtàn kan nípa ìlú tí o ń ìwàlàyè?',
        'Bawo ni a ṣe dá ọjọ́ ìwé ní Yorùbá àti Naijiria lọ́wọ́?',
      ],
    },
    maxChunkSeconds: 25,
    knownQuality: 'weak',
    qualityNote:
      'N-ATLaS scores Yorùbá lowest (2.69/5.0 fluency 2.71/5.0). Expect broken transcripts and stilted replies; transcripts stay on screen so learners can always recover the text. Reported honestly — see docs/limitations.md.',
  },
};

export const LANGUAGE_ORDER: LanguageCode[] = ['hausa', 'igbo', 'yoruba'];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && value in LANGUAGES;
}

export function getLanguage(code: LanguageCode): LanguageDefinition {
  return LANGUAGES[code];
}
