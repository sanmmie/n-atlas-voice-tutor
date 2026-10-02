'use client';

import type { TurnMessage } from '@/lib/session';

interface Props {
  messages: TurnMessage[];
  pendingTranscript: string;
  languageName: string;
  onRate: (index: number, rating: number) => void;
}

/**
 * Live transcript panel.
 *
 * Non-negotiable for this audience: it makes the lesson readable for learners who
 * are deaf or hard of hearing, it survives a broken N-ATLaS ASR turn (the text is
 * still on screen), and it gives a reviewable record of what was actually said.
 */
export function TranscriptPanel({ messages, pendingTranscript, languageName, onRate }: Props) {
  if (messages.length === 0 && !pendingTranscript) {
    return (
      <div className="card text-sm text-muted">
        Your conversation will appear here, turn by turn. Nothing here is stored on your
        phone beyond this browser session.
      </div>
    );
  }

  return (
    <ol className="scroll-thin flex max-h-[52vh] flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
      {messages.map((message, index) => (
        <li
          key={`${index}-${message.role}`}
          className="animate-rise-in card !p-4"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: message.role === 'user' ? 'rgb(var(--accent))' : 'rgb(var(--gold))' }}
            >
              {message.role === 'user' ? 'You' : languageName + ' tutor'}
              {message.blocked ? ' · topic guard' : ''}
            </span>
            {message.role === 'assistant' ? (
              <span className="flex gap-1" aria-label="Rate this reply">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onRate(index, value)}
                    aria-label={`Rate ${value} out of 5`}
                    className={`rounded px-1 text-xs ${
                      message.rating === value ? 'bg-accent text-black' : 'text-muted hover:bg-white/10'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </span>
            ) : null}
          </div>
          <p lang={message.role === 'user' ? undefined : languageName} className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {message.content}
          </p>
        </li>
      ))}

      {pendingTranscript ? (
        <li className="card !p-4 opacity-70">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--accent))' }}>
            Transcribing
          </span>
          <p className="mt-1 text-[15px]">{pendingTranscript}</p>
        </li>
      ) : null}
    </ol>
  );
}
