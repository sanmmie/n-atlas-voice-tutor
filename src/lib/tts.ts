import type { LanguageCode } from './languages';

export type TtsEngine = 'phrase-library' | 'web-speech' | 'none';

interface PhraseEntry {
  text: string;
  file: string;
}

interface PhraseManifest {
  phrases?: PhraseEntry[];
}

/**
 * Voice layer, in two tiers.
 *
 * N-ATLaS ships no text-to-speech model, so a reply is spoken by the best
 * available of: a pre-recorded phrase in `public/audio/phrases/<language>/`,
 * then the browser `SpeechSynthesis` engine. When neither can manage the
 * selected language the caller is told so it can show the reply as text rather
 * than letting the browser read it aloud in English.
 */

/** `. , ! ? ; : ¿ ¡ …` are dropped; everything else is collapsed to single spaces. */
const PUNCTUATION = /[.,!?;:¿¡…]/g;

/**
 * Lowercase, strip combining diacritics, drop punctuation and collapse
 * whitespace, so a recording only has to match the reply loosely.
 */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(PUNCTUATION, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const manifestCache = new Map<LanguageCode, PhraseEntry[]>();

/**
 * Recordings that turned out not to be there. A manifest entry can outrun its
 * .mp3, and without this the browser requests the missing file on every greeting
 * and logs a 404 each time.
 */
const missingRecordings = new Set<string>();

async function recordingExists(language: LanguageCode, file: string): Promise<boolean> {
  const key = `${language}/${file}`;
  if (missingRecordings.has(key)) return false;
  try {
    const response = await fetch(`/audio/phrases/${language}/${file}`, { method: 'HEAD' });
    if (response.ok) return true;
  } catch {
    // treat an unreachable file as absent rather than guessing
  }
  missingRecordings.add(key);
  return false;
}

async function loadManifest(language: LanguageCode): Promise<PhraseEntry[]> {
  const cached = manifestCache.get(language);
  if (cached) return cached;

  let entries: PhraseEntry[] = [];
  try {
    const response = await fetch(`/audio/phrases/${language}/manifest.json`, {
      cache: 'force-cache',
    });
    if (response.ok) {
      const manifest = (await response.json()) as PhraseManifest;
      entries = Array.isArray(manifest.phrases) ? manifest.phrases : [];
    }
  } catch {
    entries = [];
  }
  manifestCache.set(language, entries);
  return entries;
}

async function speakWithPhrase(text: string, language: LanguageCode): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const entries = await loadManifest(language);
  const wanted = normalise(text);
  const match = entries.find((entry) => normalise(entry.text) === wanted);
  if (!match) return false;
  if (!(await recordingExists(language, match.file))) return false;

  const audio = new Audio(`/audio/phrases/${language}/${match.file}`);
  currentAudio = audio;
  return new Promise<boolean>((resolve) => {
    audio.addEventListener('ended', () => resolve(true), { once: true });
    audio.addEventListener('error', () => resolve(false), { once: true });
    void audio.play().catch(() => resolve(false));
  });
}

/**
 * Chrome returns `[]` from `getVoices()` until the voice list has loaded, which
 * on a cold first turn would look exactly like "this device has no Hausa
 * voice". Wait for `voiceschanged` (with a short cap so a device that never
 * fires it still resolves) before deciding.
 */
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing.length) return Promise.resolve(existing);

  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const handler = () => {
        synth.removeEventListener('voiceschanged', handler);
        resolve(synth.getVoices());
      };
      synth.addEventListener('voiceschanged', handler);
      setTimeout(() => resolve(synth.getVoices()), 2000);
    });
  }
  return voicesReady;
}

async function speakWithBrowser(text: string, language: LanguageCode): Promise<boolean> {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;

  const bcp47 = language === 'hausa' ? 'ha-NG' : language === 'igbo' ? 'ig-NG' : 'yo-NG';
  const prefix = language === 'hausa' ? 'ha' : language === 'igbo' ? 'ig' : 'yo';

  const voices = await loadVoices();
  const exact = voices.find((voice) => voice.lang === bcp47);
  const loose = voices.find((voice) => voice.lang?.toLowerCase().startsWith(prefix));
  const voice = exact ?? loose;

  if (!voice) return false; // don't let the browser fall back to English

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1;
  synth.speak(utterance);
  return true;
}

/**
 * Speak `text` in `language`, preferring a recording over a browser voice.
 *
 * Returns the engine that spoke, or `'none'` when the language is unsupported on
 * this device — callers should then surface the reply as text.
 */
export async function speak(text: string, language: LanguageCode): Promise<TtsEngine> {
  const trimmed = text.trim();
  if (!trimmed) return 'none';

  if (await speakWithPhrase(trimmed, language)) return 'phrase-library';

  const spoke = await speakWithBrowser(trimmed, language);
  return spoke ? 'web-speech' : 'none';
}

let currentAudio: HTMLAudioElement | null = null;

/** Halt playback immediately; called before recording and on unmount. */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentAudio?.pause();
  currentAudio = null;
}