import { useCallback, useEffect, useState } from 'react';
import * as Speech from 'expo-speech';

/**
 * Thin wrapper over expo-speech for text-to-speech playback of the improved
 * answer. Tracks a `speaking` flag and stops on unmount.
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Speech.stop();
    setSpeaking(true);
    Speech.speak(trimmed, {
      rate: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (speaking) stop();
      else speak(text);
    },
    [speaking, speak, stop],
  );

  return { speaking, speak, stop, toggle };
}
