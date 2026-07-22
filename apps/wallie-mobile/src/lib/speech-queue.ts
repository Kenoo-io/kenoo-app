import { Audio } from "expo-av";
import type { MutableRefObject } from "react";

import { setPlaybackAudioMode } from "@/lib/audio-session";
import { fetchSpeechFileUri } from "@/lib/voice-api";

export interface SpeechQueue {
  push: (text: string) => void;
  finish: () => Promise<void>;
}

/**
 * Plays sentence-sized chunks in order as they're pushed, fetching each chunk's
 * audio in parallel with playback of the previous one — so speech starts on the
 * first sentence instead of waiting for the whole reply.
 */
export function createSpeechQueue(
  signal: AbortSignal,
  soundRef: MutableRefObject<Audio.Sound | null>,
  onStart?: () => void,
): SpeechQueue {
  let chain: Promise<void> = Promise.resolve();
  let started = false;
  let playbackModeReady: Promise<void> | null = null;

  const ensurePlaybackMode = () => {
    if (!playbackModeReady) {
      playbackModeReady = setPlaybackAudioMode();
    }
    return playbackModeReady;
  };

  const playFile = async (fileUri: string) => {
    if (signal.aborted) return;

    await ensurePlaybackMode();
    if (signal.aborted) return;

    const previous = soundRef.current;
    soundRef.current = null;
    if (previous) {
      try {
        await previous.stopAsync();
        await previous.unloadAsync();
      } catch {
        // ignore cleanup errors between chunks
      }
    }

    const sound = new Audio.Sound();
    soundRef.current = sound;

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        void sound.stopAsync().catch(() => undefined);
        void sound.unloadAsync().catch(() => undefined);
        if (soundRef.current === sound) {
          soundRef.current = null;
        }
        reject(new DOMException("Aborted", "AbortError"));
      };

      if (signal.aborted) {
        onAbort();
        return;
      }

      signal.addEventListener("abort", onAbort, { once: true });

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          if ("error" in status && status.error) {
            signal.removeEventListener("abort", onAbort);
            reject(new Error(String(status.error)));
          }
          return;
        }

        if (status.didJustFinish) {
          signal.removeEventListener("abort", onAbort);
          void sound.unloadAsync().catch(() => undefined);
          if (soundRef.current === sound) {
            soundRef.current = null;
          }
          resolve();
        }
      });

      onStart?.();
      void sound
        .loadAsync(
          { uri: fileUri },
          { shouldPlay: true, volume: 1.0, isMuted: false },
        )
        .then(async () => {
          const playbackStatus = await sound.getStatusAsync();
          if (
            playbackStatus.isLoaded &&
            !playbackStatus.isPlaying &&
            !playbackStatus.didJustFinish
          ) {
            await sound.playAsync();
          }
        })
        .catch((error) => {
          signal.removeEventListener("abort", onAbort);
          reject(error);
        });
    });
  };

  const push = (text: string) => {
    if (signal.aborted || !text.trim()) return;
    started = true;
    const audioPromise = fetchSpeechFileUri(text, signal);
    chain = chain
      .then(async () => {
        if (signal.aborted) return;
        const fileUri = await audioPromise;
        if (signal.aborted) return;
        await playFile(fileUri);
      })
      .catch((error) => {
        if (
          signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }
        throw error;
      });
  };

  const finish = async () => {
    if (!started) return;
    await chain;
  };

  return { push, finish };
}
