import { useCallback, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

/**
 * Microphone recording via expo-audio. Handles permission, audio-mode setup,
 * and exposes start/stop plus live recording state. `stop` resolves to the
 * recorded file URI (or null).
 */
export function useRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission is required to record.');
        return false;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    } catch (e) {
      setError((e as Error).message ?? 'Could not start recording.');
      return false;
    }
  }, [recorder]);

  const stop = useCallback(async (): Promise<string | null> => {
    try {
      await recorder.stop();
      return recorder.uri;
    } catch (e) {
      setError((e as Error).message ?? 'Could not stop recording.');
      return null;
    }
  }, [recorder]);

  return {
    isRecording: state.isRecording,
    durationMillis: state.durationMillis,
    start,
    stop,
    error,
  };
}
