import type { Level } from '../languages';

export interface DifficultySignals {
  turnCount: number;
  /** Average character length of the learner's recent transcriptions. */
  averageInputChars: number;
  /** Proxy count of learner errors: very short replies plus verbatim repeats. */
  mistakeSignals: number;
  /** How often the learner repeated the previous turn verbatim (a stuck signal). */
  repeats: number;
}

/**
 * Deterministic difficulty adaptation.
 *
 * N-ATLaS is fine-tuned for instruction following, but it has no persistent learner
 * state, so the level is computed here from observable signals and injected into
 * the system prompt. The thresholds are intentionally simple and inspectable —
 * they are documented in docs/architecture.md so evaluators can see exactly why a
 * learner was moved up or held back.
 */
export function resolveLevel(signals: DifficultySignals): Level {
  const { turnCount, averageInputChars, mistakeSignals, repeats } = signals;

  if (turnCount < 3) return 'beginner';
  if (repeats >= 3) return 'beginner';

  if (turnCount < 10) {
    return averageInputChars >= 22 ? 'intermediate' : 'beginner';
  }

  if (averageInputChars >= 38 && mistakeSignals <= 4) return 'advanced';
  if (averageInputChars >= 20) return 'intermediate';
  return 'beginner';
}

/** Suggests a one-line English bridge when the learner appears to be stuck. */
export function learnerLooksStuck(signals: DifficultySignals): boolean {
  return (
    signals.repeats >= 2 ||
    (signals.turnCount >= 3 && signals.averageInputChars > 0 && signals.averageInputChars < 8)
  );
}
