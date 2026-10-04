function speakWithBrowser(text: string, language: LanguageCode): boolean {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;

  const bcp47 = language === 'hausa' ? 'ha-NG' : language === 'igbo' ? 'ig-NG' : 'yo-NG';
  const prefix = language === 'hausa' ? 'ha' : language === 'igbo' ? 'ig' : 'yo';

  const voices = synth.getVoices();
  const exact = voices.find((voice) => voice.lang === bcp47);
  const loose = voices.find((voice) => voice.lang?.toLowerCase().startsWith(prefix));
  const voice = exact ?? loose;

  // No matching voice on this device: refuse rather than let the browser read
  // Hausa/Igbo/Yorùbá text with its English default. Returning false makes
  // `speak()` return 'none', and the UI shows a text-only badge instead of
  // playing wrong-language audio.
  if (!voice) return false;

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1;
  synth.speak(utterance);
  return true;
}