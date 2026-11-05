/**
 * Read-aloud using the browser's Web Speech API (FR-15).
 * Picks a Hindi or Indian-English voice when available. No network calls
 * are made by this app; voices are provided by the user's device.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Lang } from '../lib/types';

export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const speak = useCallback(
    (text: string, lang: Lang) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang === 'hi' ? 'hi' : 'en-IN'));
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.onend = u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [supported],
  );

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, stop };
}
