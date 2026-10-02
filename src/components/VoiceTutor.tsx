'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MicButton, type RecorderState } from './MicButton';
import { TranscriptPanel } from './TranscriptPanel';
import { EvidenceStrip, type Evidence } from './EvidenceStrip';
import { LANGUAGES, type LanguageCode, type Level } from '@/lib/languages';
import { createRecorder, detectNetworkType, type RecorderHandle } from '@/lib/audio';
import { speak, stopSpeaking, type TtsEngine } from '@/lib/tts';
import {
  clearHistory,
  getOrCreateSessionId,
  getOrCreateUserId,
  loadHistory,
  saveHistory,
  type TurnMessage,
} from '@/lib/session';

interface TurnResponse {
  interactionId: string;
  input: { text: string; model: string | null; latencyMs: number | null };
  reply: { text: string; model: string | null; latencyMs: number | null; provider: string };
  level: Level;
  blocked: boolean;
  typed: boolean;
  turnIndex: number;
  nextPrompts: string[];
  qualityNote: string;
}

export function VoiceTutor({ language }: { language: LanguageCode }) {
  const definition = LANGUAGES[language];

  const [state, setState] = useState<RecorderState>('idle');
  const [level, setLevel] = useState(0);
  const [messages, setMessages] = useState<TurnMessage[]>([]);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [currentLevel, setCurrentLevel] = useState<Level>('beginner');
  const [prompts, setPrompts] = useState<string[]>(definition.prompts.beginner.slice(0, 2));

  const recorderRef = useRef<RecorderHandle | null>(null);
  const sessionIdRef = useRef<string>('');
  const userIdRef = useRef<string>('');
  const startedAtRef = useRef<string>(new Date().toISOString());
  const historyRef = useRef<TurnMessage[]>([]);
  const greetedRef = useRef(false);

  const recorderSupported = useMemo(
    () => typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined',
    [],
  );

  /* ------------------------------------------------------------- session setup */
  useEffect(() => {
    userIdRef.current = getOrCreateUserId();
    sessionIdRef.current = getOrCreateSessionId(language);
    startedAtRef.current = new Date().toISOString();
    const restored = loadHistory();
    historyRef.current = restored;
    setMessages(restored);
    return () => stopSpeaking();
  }, [language]);

  /* ------------------------------------------------- spoken greeting on arrival */
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;

    const greeting: TurnMessage = { role: 'assistant', content: definition.greeting, blocked: false };
    historyRef.current = [...historyRef.current, greeting];
    setMessages(historyRef.current);
    saveHistory(historyRef.current);

    // Give the learner a moment to see the screen before the tutor speaks.
    const timer = setTimeout(() => {
      setState('speaking');
      void speak(definition.greeting, language).finally(() => setState('idle'));
    }, 400);

    return () => clearTimeout(timer);
  }, [definition.greeting, language]);

  /* -------------------------------------------------------------- turn plumbing */
  const appendMessages = useCallback((added: TurnMessage[]) => {
    historyRef.current = [...historyRef.current, ...added];
    setMessages([...historyRef.current]);
    saveHistory(historyRef.current);
  }, []);

  const sendTurn = useCallback(
    async (payload: { blob?: Blob; durationSeconds?: number }) => {
      setError(null);
      setState('thinking');
      setPendingTranscript('');

      const historyForModel = historyRef.current
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({ role: message.role, content: message.content }));

      const meta = {
        sessionId: sessionIdRef.current,
        userId: userIdRef.current,
        authenticated: false,
        language,
        history: historyForModel,
        audioSeconds: payload.durationSeconds ?? null,
        sessionStartedAt: startedAtRef.current,
        networkType: detectNetworkType(),
      };

      const form = new FormData();
      if (payload.blob) {
        form.append('audio', payload.blob, 'utterance.webm');
        form.append('meta', JSON.stringify(meta));
      } else {
        const text = typed.trim();
        form.append('meta', JSON.stringify({ ...meta, text }));
      }

      try {
        const response = await fetch('/api/turn', { method: 'POST', body: form });
        const data = (await response.json()) as TurnResponse & { error?: string; detail?: string };

        if (!response.ok) {
          throw new Error(data.error ?? `Request failed (${response.status})`);
        }

        const inputTurn: TurnMessage = { role: 'user', content: data.input.text || '(no speech detected)' };
        const replyTurn: TurnMessage = {
          role: 'assistant',
          content: data.reply.text,
          blocked: data.blocked,
          rating: null,
        };
        appendMessages([inputTurn, replyTurn]);

        setCurrentLevel(data.level);
        setPrompts(data.nextPrompts);
        setEvidence({
          asrModel: data.input.model,
          asrLatencyMs: data.input.latencyMs,
          llmModel: data.reply.model,
          llmLatencyMs: data.reply.latencyMs,
          provider: data.reply.provider,
          typed: data.typed,
          interactionId: data.interactionId,
        });

        setState('speaking');
        const ttsEngine: TtsEngine = await speak(data.reply.text, language);
        setState('idle');

        void fetch('/api/log', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ interactionId: data.interactionId, ttsEngine, rating: null, error: null }),
        });
      } catch (caught) {
        const message = (caught as Error).message;
        setError(message);
        setState('error');
        setTimeout(() => setState('idle'), 2500);
      }
    },
    [appendMessages, language, typed],
  );

  /* ------------------------------------------------------------------- recording */
  const startRecording = useCallback(async () => {
    stopSpeaking();
    setError(null);
    setState('requesting');

    const handle = createRecorder({
      maxSeconds: definition.maxChunkSeconds,
      onLevel: setLevel,
      onAutoStop: () => {
        void finishRecording();
      },
    });
    recorderRef.current = handle;

    try {
      await handle.start();
      setState('recording');
    } catch (caught) {
      setError(
        `${(caught as Error).message} You can still practise by typing below, or check browser microphone permission.`,
      );
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition.maxChunkSeconds]);

  const finishRecording = useCallback(async () => {
    const handle = recorderRef.current;
    if (!handle) return;
    try {
      const recorded = await handle.stop();
      setLevel(0);
      await sendTurn({ blob: recorded.blob, durationSeconds: recorded.durationSeconds });
    } catch (caught) {
      setError((caught as Error).message);
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  }, [sendTurn]);

  const cancelRecording = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setLevel(0);
    setState('idle');
  }, []);

  const submitTyped = useCallback(() => {
    const text = typed.trim();
    if (!text) return;
    setTyped('');
    void sendTurn({});
  }, [sendTurn, typed]);

  const rate = useCallback(
    async (index: number, value: number) => {
      const target = historyRef.current[index];
      if (!target) return;
      const updated = [...historyRef.current];
      updated[index] = { ...target, rating: value };
      historyRef.current = updated;
      setMessages(updated);
      saveHistory(updated);

      const interactionId = evidence?.interactionId;
      if (interactionId) {
        void fetch('/api/log', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ interactionId, rating: value, ttsEngine: 'none', error: null }),
        });
      }
    },
    [evidence?.interactionId],
  );

  const restart = useCallback(() => {
    stopSpeaking();
    clearHistory();
    historyRef.current = [];
    setMessages([]);
    setEvidence(null);
    setError(null);
    startedAtRef.current = new Date().toISOString();
    setState('idle');
  }, []);

  /* ----------------------------------------------------------------------- view */
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <EvidenceStrip evidence={evidence} qualityNote={definition.qualityNote} />

      <TranscriptPanel
        messages={messages}
        pendingTranscript={pendingTranscript}
        languageName={definition.englishName}
        onRate={rate}
      />

      {prompts.length > 0 && state === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setTyped(prompt)}
              className="chip hover:border-white/25 hover:text-ink"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          {error}
        </p>
      ) : null}

      <div className="flex justify-center">
        <MicButton
          state={state}
          level={level}
          disabled={!recorderSupported}
          onStart={startRecording}
          onStop={finishRecording}
        />
      </div>

      {state === 'recording' ? (
        <div className="flex justify-center">
          <button type="button" onClick={cancelRecording} className="btn-ghost text-sm">
            Discard
          </button>
        </div>
      ) : null}

      <details className="card text-sm">
        <summary className="cursor-pointer font-semibold">
          Cannot use a microphone? Type instead ({definition.endonym} or English)
        </summary>
        <div className="mt-3 flex gap-2">
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitTyped();
            }}
            placeholder={definition.prompts[currentLevel][0]}
            aria-label="Type a phrase for the tutor"
            className="flex-1 rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-ink placeholder:text-muted/70"
          />
          <button type="button" onClick={submitTyped} className="btn-primary" disabled={!typed.trim()}>
            Send
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Typed turns skip N-ATLaS ASR and are logged as typed, so the validation CSV stays honest.
        </p>
      </details>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Level: <strong className="text-ink">{currentLevel}</strong> · session {sessionIdRef.current.slice(0, 14)}
        </span>
        <button type="button" onClick={restart} className="underline underline-offset-4 hover:text-ink">
          Start a new session
        </button>
      </div>
    </div>
  );
}
