import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';

import { base64ToBytes } from '@/core/utils/base64';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { usePracticeRepositories } from '../PracticeProvider';

type Subscription = { remove: () => void };

/**
 * Text-to-speech playback. Prefers natural cloud TTS (OpenAI via the `speak`
 * Edge Function); falls back to the on-device system voice (expo-speech) for
 * guests, offline, or any error — so playback always works. Tracks a `speaking`
 * flag and cleans up the player/file/subscription on stop and unmount.
 */
export function useSpeech() {
  const { tts } = usePracticeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<Subscription | null>(null);
  const fileRef = useRef<File | null>(null);
  const genRef = useRef(0); // guards against races between overlapping speak() calls

  const releaseAudio = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
    playerRef.current?.remove();
    playerRef.current = null;
    try {
      fileRef.current?.delete();
    } catch {
      // best effort
    }
    fileRef.current = null;
  }, []);

  useEffect(
    () => () => {
      Speech.stop();
      releaseAudio();
    },
    [releaseAudio],
  );

  const stop = useCallback(() => {
    genRef.current += 1;
    Speech.stop();
    releaseAudio();
    setSpeaking(false);
    setLoading(false);
  }, [releaseAudio]);

  const speakOnDevice = useCallback((text: string) => {
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, {
      rate: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      stop();
      const gen = genRef.current;

      // Try natural cloud voice first (signed-in + configured).
      if (userId) {
        setLoading(true);
        const result = await tts.synthesize(userId, trimmed);
        setLoading(false);
        if (gen !== genRef.current) return; // superseded/stopped while awaiting

        if (result.ok) {
          try {
            const file = new File(Paths.cache, `tts-${Date.now()}.mp3`);
            try {
              file.create({ overwrite: true });
            } catch {
              // file may not pre-exist; write() creates it
            }
            file.write(base64ToBytes(result.value));
            await setAudioModeAsync({ playsInSilentMode: true });
            if (gen !== genRef.current) {
              try { file.delete(); } catch { /* noop */ }
              return;
            }
            const player = createAudioPlayer(file.uri);
            fileRef.current = file;
            playerRef.current = player;
            subRef.current = player.addListener('playbackStatusUpdate', (status) => {
              if (status.didJustFinish) {
                setSpeaking(false);
                releaseAudio();
              }
            });
            setSpeaking(true);
            player.play();
            return;
          } catch {
            // fall through to device voice
          }
        }
      }

      speakOnDevice(trimmed);
    },
    [tts, userId, stop, speakOnDevice, releaseAudio],
  );

  const toggle = useCallback(
    (text: string) => {
      if (speaking || loading) stop();
      else void speak(text);
    },
    [speaking, loading, speak, stop],
  );

  return { speaking, loading, speak, stop, toggle };
}
