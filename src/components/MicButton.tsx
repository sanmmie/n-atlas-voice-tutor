'use client';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'thinking' | 'speaking' | 'error';

interface Props {
  state: RecorderState;
  level: number;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}

const LABELS: Record<RecorderState, string> = {
  idle: 'Tap to speak',
  requesting: 'Waiting for microphone…',
  recording: 'Listening — tap to send',
  thinking: 'N-ATLaS is thinking…',
  speaking: 'Tutor is speaking',
  error: 'Tap to retry',
};

/**
 * The primary control. One large target, because the audience for this app often
 * includes learners with low vision or limited dexterity, and because it has to
 * work one-handed on a phone held at arm's length.
 */
export function MicButton({ state, level, disabled, onStart, onStop }: Props) {
  const isRecording = state === 'recording';
  const busy = state === 'thinking' || state === 'speaking' || state === 'requesting';

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={isRecording ? onStop : onStart}
        disabled={disabled || busy || state === 'error'}
        aria-label={LABELS[state]}
        aria-pressed={isRecording}
        className={[
          'relative flex h-36 w-36 items-center justify-center rounded-full border-4 transition',
          'focus-visible:outline-4',
          isRecording
            ? 'scale-105 border-gold bg-accent text-black'
            : 'border-accent/60 bg-accent/15 text-accent hover:bg-accent/25',
          state === 'error' ? 'border-gold/70 bg-gold/15 text-gold' : '',
          busy ? 'opacity-70' : '',
        ].join(' ')}
      >
        {isRecording ? (
          <>
            <span
              aria-hidden
              className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-gold"
              style={{ transform: `scale(${1 + level * 0.25})` }}
            />
            <span aria-hidden className="h-12 w-12 rounded-2xl bg-black/80" />
          </>
        ) : (
          <svg viewBox="0 0 24 24" className="h-14 w-14" aria-hidden fill="currentColor">
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
            <path d="M18 11a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.9V19H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.1A6 6 0 0 0 18 11Z" />
          </svg>
        )}
      </button>

      <p
        className="text-sm font-medium"
        role="status"
        aria-live="polite"
        style={{ color: isRecording ? 'rgb(var(--gold))' : undefined }}
      >
        {LABELS[state]}
      </p>
    </div>
  );
}
