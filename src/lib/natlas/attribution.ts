import type { LanguageCode } from '../languages';

/**
 * Required public attribution for N-ATLaS, per the model licence:
 * "N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation
 * and Digital Economy, and powered by Awarri Technologies."
 *
 * Kept in its own module so client components can render it without pulling the
 * server-only configuration parser into the browser bundle.
 */
export const NATLAS_ATTRIBUTION =
  'N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.';

export const NATLAS_LLM_MODEL_CARD = 'https://huggingface.co/NCAIR1/N-ATLaS';

/**
 * Per-checkpoint attribution.
 *
 * The N-ATLaS licence requires attribution for *each* model, and the ASR cards
 * state their own wording — which is NOT the same string as the LLM's, and is
 * not even the same between the ASR cards. Yoruba-ASR in particular reads
 * "developed by ... in partnership with the Federal Government of Nigeria"
 * rather than "powered by ... in an initiative of ...".
 *
 * These strings are quoted verbatim from the "Required attribution in all
 * public use" section of each model card. Do not paraphrase them.
 */
export const NATLAS_ASR_ATTRIBUTIONS: Record<LanguageCode, string> = {
  hausa:
    'Hausa-ASR is powered by Awarri Technologies in an initiative of the Federal Ministry of Communications, Innovation and Digital Economy.',
  igbo:
    'Igbo-ASR is powered by Awarri Technologies in an initiative of the Federal Ministry of Communications, Innovation and Digital Economy.',
  yoruba:
    'Yoruba-ASR is developed by Awarri Technologies in partnership with the Federal Government of Nigeria.',
};

/** Every attribution line this application must display publicly. */
export const NATLAS_ALL_ATTRIBUTIONS = [
  NATLAS_ATTRIBUTION,
  ...Object.values(NATLAS_ASR_ATTRIBUTIONS),
];

export type TeamMember = {
  name: string;
  role: string;
  affiliation: string;
};

export const NATLAS_TEAM: TeamMember[] = [
  {
    name: 'Prof. Semion Olaogun',
    role: 'Academic Lead',
    affiliation: 'Department of Linguistics and Languages, AAUA',
  },
  {
    name: 'Oluwasanmi T. Adebowale',
    role: 'Technical Partner',
    affiliation: 'DeltaOS Core',
  },
  {
    name: 'Aladejana Aduragbemi Samuel',
    role: 'PG student',
    affiliation: 'Department of Linguistics and Languages, AAUA',
  },
];

export const NATLAS_TEAM_ATTRIBUTION =
  'Developed by DeltaOS Core in collaboration with the Department of Linguistics and Languages, AAUA. See /team for the full team.';
