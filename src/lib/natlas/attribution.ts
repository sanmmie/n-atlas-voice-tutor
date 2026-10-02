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
