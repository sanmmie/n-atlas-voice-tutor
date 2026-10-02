'use client';

import type { LanguageCode } from './languages';

export type TtsEngine = 'phrase-library' | 'web-speech' | 'none';

interface PhraseEntry {
  text: string;
  file: string;
}

interface PhraseLibrary {
  phrases: PhraseEntry[];
}

const manifestCache = new Map<LanguageCode, PhraseEntry[]>();
let currentAudio: HTMLAudioElement | null = null;

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:¿¡…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadLibrary(language: LanguageCode): Promise<PhraseEntry[]> {
  const cached = manifestCache.get(language);
  if (cached) return cached;
  try {
    const response = await fetch(`/audio/phrases/${language}/manifest.json`, { cache: 'force-cache' });
    if (!response.ok) throw new Error('no manifest');
    const payload = (await response.json()) as PhraseLibrary;
    const phrases = Array.isArray(payload.phrases) ? payload.phrases : [];
    manifestCache.set(language, phrases);
    return phrases;
  } catch {
    manifestCache.set(language, []);
    return [];
  }
}

/**
 * Speech output for the tutor reply.
 *
 * N-ATLaS ships no text-to-speech model, so the app uses a two-tier strategy:
 *
 *  1. Pre-recorded phrase library — `public/audio/phrases/<language>/*.mp3` plus a
 *     manifest of the exact strings the tutor uses most (greetings, the refusal
 *     line, the fixed drill prompts). These are human-recorded by native speakers,
 *     so they carry correct native pronunciation that no browser engine matches.
 *  2. Browser Web Speech API fallback — `ha-NG` / `ig-NG` / `yo-NG`. Availability is
 *     device-dependent and on most Android devices no Yorùbá voice exists at all.
 *     The limitation is stated in the UI and in docs/tts.md rather than hidden.
 */
export async function speak(text: string, language: LanguageCode): Promise<TtsEngine> {
  const trimmed = text.trim();
  if (!trimmed || typeof window === 'undefined') return 'none';

  const library = await loadLibrary(language);
  const target = normalise(trimmed);
  const match = library.find((entry) => normalise(entry.text) === target);

  if (match) {
    try {
      await playFile(`/audio/phrases/${language}/${match.file}`);
      return 'phrase-library';
    } catch {
      // Missing/corrupt recording: fall through to the browser engine.
    }
  }

  return speakWithBrowser(trimmed, language) ? 'web-speech' : 'none';
}

function playFile(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio?.pause();
    currentAudio = audio;
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error(`Could not play ${url}`));
    void audio.play().catch(reject);
  });
}

function speakWithBrowser(text: string, language: LanguageCode): boolean {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;

  const bcp47 = language === 'hausa' ? 'ha-NG' : language === 'igbo' ? 'ig-NG' : 'yo-NG';
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = bcp47;
  utterance.rate = 0.95;
  utterance.pitch = 1;

  const voices = synth.getVoices();
  const exact = voices.find((voice) => voice.lang === bcp47);
  const loose = voices.find((voice) => voice.lang?.toLowerCase().startsWith(language === 'hausa' ? 'ha' : language === 'igbo' ? 'ig' : 'yo'));
  if (exact ?? loose) utterance.voice = (exact ?? loose) as SpeechSynthesisVoice;

  synth.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  currentAudio?.pause();
  currentAudio = null;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

/** True when the device has any voice at all for the selected language. */
export function hasVoiceFor(language: LanguageCode): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  const prefix = language === 'hausa' ? 'ha' : language === 'igbo' ? 'ig' : 'yo';
  return window.speechSynthesis.getVoices().some((voice) => voice.lang?.toLowerCase().startsWith(prefix));
}
