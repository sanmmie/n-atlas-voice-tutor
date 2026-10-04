import { transcribeWithNatlas } from '../natlas/asr';
import { completeWithNatlas, NatlasError, trimToContext, type ChatMessage } from '../natlas/llm';
import { buildTutorSystemPrompt } from '../natlas/tutor-prompt';
import { LANGUAGES, isLanguageCode, type LanguageCode, type Level } from '../languages';
import { learnerLooksStuck, resolveLevel, type DifficultySignals } from './difficulty';
import { refusalFor, screenTopic } from './safety';

export interface TurnRequest {
  sessionId: string;
  userId: string;
  authenticated: boolean;
  language: LanguageCode;
  /** Prior conversation, oldest first. Learner turns are role "user". */
  history: ChatMessage[];
  /** Audio duration measured in the browser, seconds. */
  audioSeconds: number | null;
  networkType: string | null;
  /**
   * Typed utterance. Only used when the browser could not record (desktop demo
   * without a microphone). N-ATLaS ASR is skipped and `asrModel` comes back null,
   * which the CSV export records as a typed turn rather than a spoken one.
   */
  typedTranscript?: string;
}

export interface TurnResult {
  inputTranscript: string;
  asrModel: string | null;
  asrLatencyMs: number | null;
  reply: string;
  /** null when the topic guard answered without calling N-ATLaS at all. */
  llmModel: string | null;
  llmLatencyMs: number | null;
  level: Level;
  blocked: boolean;
  turnIndex: number;
  signals: DifficultySignals;
  typed: boolean;
}

/** Turns the observed conversation into the signals used for level selection. */
export function deriveSignals(history: ChatMessage[]): DifficultySignals {
  const learnerTurns = history.filter((message) => message.role === 'user');
  const recent = learnerTurns.slice(-6);
  const averageInputChars =
    recent.length === 0
      ? 0
      : recent.reduce((sum, message) => sum + message.content.trim().length, 0) / recent.length;

  let repeats = 0;
  for (let i = 1; i < learnerTurns.length; i += 1) {
    const previous = learnerTurns[i - 1].content.trim().toLowerCase();
    const current = learnerTurns[i].content.trim().toLowerCase();
    if (previous && current && previous === current) repeats += 1;
  }

  const veryShort = recent.filter((message) => message.content.trim().length < 4).length;
  const mistakeSignals = veryShort + repeats;

  return {
    turnCount: learnerTurns.length,
    averageInputChars: Number(averageInputChars.toFixed(1)),
    mistakeSignals,
    repeats,
  };
}


/**
 * One full conversational turn:
 *   N-ATLaS ASR (NCAIR1/<Lang>-ASR) -> topic screen -> N-ATLaS LLM (NCAIR1/N-ATLaS)
 *   -> topic screen on output -> reply
 *
 * Both N-ATLaS invocations are made here on the server so the evidence recorded
 * in the interaction log cannot be spoofed by the client.
 */
export async function runTurn(
  audio: ArrayBuffer | null,
  request: TurnRequest,
  mimeType: string,
): Promise<TurnResult> {
  const language = LANGUAGES[request.language];
  const typed = !audio || Boolean(request.typedTranscript);

  let inputTranscript: string;
  let asrModel: string | null;
  let asrLatencyMs: number | null;

  if (typed) {
    inputTranscript = request.typedTranscript ?? '';
    asrModel = null;
    asrLatencyMs = null;
  } else {
    // ---- N-ATLaS ASR INVOCATION #1 (official NCAIR1 ASR checkpoint) ----
    const transcription = await transcribeWithNatlas(audio, {
      language: request.language,
      mimeType,
    });
    inputTranscript = transcription.text;
    asrModel = transcription.model;
    asrLatencyMs = transcription.latencyMs;
  }

  const signals = deriveSignals([...request.history, { role: 'user', content: inputTranscript }]);
  const level = resolveLevel(signals);
  const turnIndex = signals.turnCount;
  const incoming: ChatMessage[] = [...request.history, { role: 'user', content: inputTranscript }];

  const inputScreen = screenTopic(inputTranscript);
  if (inputScreen.blocked) {
    return {
      inputTranscript,
      asrModel,
      asrLatencyMs,
      reply: refusalFor(request.language),
      llmModel: null,
      llmLatencyMs: null,
      level,
      blocked: true,
      turnIndex,
      signals,
      typed,
    };
  }

  const system = buildTutorSystemPrompt({
    language: request.language,
    level,
    turnCount: turnIndex,
    mistakeSignals: signals.mistakeSignals,
  });

  const stuck = learnerLooksStuck(signals);
  const stuckNote = stuck
    ? '\nThe learner looks stuck. Give one short English sentence explaining what you asked, then repeat your question in ' +
      `${language.englishName}.`
    : '';

  const messages = trimToContext(system + stuckNote, incoming);

  // ---- N-ATLaS LLM INVOCATION #2 (official NCAIR1/N-ATLaS weights) ----
  const completion = await completeWithNatlas(messages);

  const outputScreen = screenTopic(completion.text);
  const reply = outputScreen.blocked ? refusalFor(request.language) : completion.text;

  return {
    inputTranscript,
    asrModel,
    asrLatencyMs,
    reply,
    llmModel: completion.model,
    llmLatencyMs: completion.latencyMs,
    level,
    blocked: inputScreen.blocked || outputScreen.blocked,
    turnIndex,
    signals,
    typed,
  };
}

export function parseLanguage(value: unknown): LanguageCode {
  if (!isLanguageCode(value)) {
    throw new NatlasError('llm', 400, 'language must be one of hausa, igbo, yoruba.');
  }
  return value;
}
