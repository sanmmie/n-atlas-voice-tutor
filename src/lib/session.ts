'use client';

import type { LanguageCode } from './languages';

const USER_KEY = 'natlas.userId';
const SESSION_KEY = 'natlas.sessionId';
const HISTORY_KEY = 'natlas.history';

export interface TurnMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Optional learner 1-5 rating, shown next to the turn. */
  rating?: number | null;
  blocked?: boolean;
}

/**
 * Guest mode is mandatory for NAIC PS2: nothing here requires an account, a phone
 * number, or an email address. The learner id is a random opaque string held in
 * localStorage, so interactions can be counted per learner without identifying
 * anyone.
 */
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = window.localStorage.getItem(USER_KEY);
  if (existing) return existing;
  const created = `guest-${randomId(10)}`;
  window.localStorage.setItem(USER_KEY, created);
  return created;
}

export function getOrCreateSessionId(language: LanguageCode): string {
  if (typeof window === 'undefined') return 'server';
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = `s-${language}-${randomId(12)}`;
  window.localStorage.setItem(SESSION_KEY, created);
  return created;
}

export function loadHistory(): TurnMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as TurnMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(messages: TurnMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep the persisted window small: N-ATLaS only has 8,092 tokens of context.
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-12)));
  } catch {
    // Private-mode quota errors must not break the lesson.
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(HISTORY_KEY);
}

function randomId(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
