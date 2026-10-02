'use client';

export interface RecordedUtterance {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

/**
 * Picks the best container MediaRecorder can produce on this device.
 * Chrome/Android give us WebM Opus (small, cheap to upload on a metered line);
 * Safari gives us MP4/AAC. Both are decoded to 16 kHz mono on the ASR side.
 */
export function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

export interface RecorderHandle {
  start(): Promise<void>;
  stop(): Promise<RecordedUtterance>;
  cancel(): void;
  readonly isSupported: boolean;
}

export interface RecorderOptions {
  /** Hard cap per utterance; N-ATLaS ASR checkpoints take 30 s per inference. */
  maxSeconds?: number;
  onAutoStop?: () => void;
  onLevel?: (level: number) => void;
}

export function createRecorder(options: RecorderOptions = {}): RecorderHandle {
  const maxSeconds = options.maxSeconds ?? 25;
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: BlobPart[] = [];
  let startedAt = 0;
  let autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  let levelTimer: ReturnType<typeof setInterval> | null = null;
  let audioContext: AudioContext | null = null;

  const supported =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  function cleanupAudioGraph() {
    if (levelTimer) {
      clearInterval(levelTimer);
      levelTimer = null;
    }
    if (audioContext) {
      void audioContext.close().catch(() => undefined);
      audioContext = null;
    }
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  return {
    get isSupported() {
      return supported;
    },

    async start() {
      if (!supported) throw new Error('This browser cannot record audio.');
      // Ask for the cheapest mono mode first; many Android devices ignore it, but
      // when it is honoured the upload shrinks noticeably on 2G/3G.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = pickMimeType();
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.start(250);
      startedAt = Date.now();

      autoStopTimer = setTimeout(() => {
        options.onAutoStop?.();
      }, maxSeconds * 1000);

      if (options.onLevel) {
        try {
          audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          const buffer = new Uint8Array(analyser.frequencyBinCount);
          levelTimer = setInterval(() => {
            analyser.getByteTimeDomainData(buffer);
            let peak = 0;
            for (let i = 0; i < buffer.length; i += 1) {
              peak = Math.max(peak, Math.abs(buffer[i] - 128));
            }
            options.onLevel?.(Math.min(1, peak / 80));
          }, 120);
        } catch {
          // Level metering is cosmetic; ignore if the browser refuses.
        }
      }
    },

    async stop() {
      if (!recorder) throw new Error('Recorder is not running.');
      const mimeType = recorder.mimeType || 'audio/webm';
      const durationSeconds = (Date.now() - startedAt) / 1000;

      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        recorder!.onerror = () => reject(new Error('Recording failed.'));
        recorder!.stop();
      });

      if (autoStopTimer) clearTimeout(autoStopTimer);
      cleanupAudioGraph();
      recorder = null;

      return { blob, mimeType, durationSeconds: Number(durationSeconds.toFixed(2)) };
    },

    cancel() {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      if (autoStopTimer) clearTimeout(autoStopTimer);
      chunks = [];
      cleanupAudioGraph();
      recorder = null;
    },
  };
}

/**
 * Best-effort connection label for the log, so the validation report can show how
 * the tutor behaved on 2G/3G as well as Wi-Fi.
 */
export function detectNetworkType(): string | null {
  if (typeof navigator === 'undefined') return null;
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; type?: string };
  }).connection;
  return connection?.effectiveType ?? connection?.type ?? null;
}
