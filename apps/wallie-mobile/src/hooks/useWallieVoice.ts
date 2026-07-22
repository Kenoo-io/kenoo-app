import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";

import {
  setRecordingAudioMode,
} from "@/lib/audio-session";
import { createRecordingSilenceDetector } from "@/lib/recording-silence-detector";
import { createSpeechQueue } from "@/lib/speech-queue";
import { transcribeAudio } from "@/lib/voice-api";
import {
  CHUNK_MAX_CHARS,
  CHUNK_MIN_CHARS,
  FIRST_CHUNK_MIN_CHARS,
  takeReadyChunk,
} from "@/lib/voice-chunks";
import { textForSpeech } from "@/lib/voice-text";

export type WallieVoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "preparing_speech"
  | "speaking";

const MIN_RECORDING_MS = 450;

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
  progressUpdateIntervalMillis: 50,
};

const METERING_POLL_MS = 32;

export function useWallieVoice(
  onSend: (
    text: string,
    onDelta?: (deltaText: string) => void,
  ) => Promise<string | null | undefined>,
) {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(false);
  const isStartingRef = useRef(false);
  const isFinishingRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const discardRecordingRef = useRef(false);
  const silenceDetectorRef = useRef<ReturnType<
    typeof createRecordingSilenceDetector
  > | null>(null);
  const meteringPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const finishListeningRef = useRef<() => void>(() => undefined);
  const startListeningRef = useRef<() => Promise<void>>(async () => undefined);

  const [state, setState] = useState<WallieVoiceState>("idle");
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const stopLevelAnimation = useCallback(() => {
    if (levelRafRef.current != null) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const animateLevelForState = useCallback(
    (nextState: WallieVoiceState) => {
      stopLevelAnimation();

      if (nextState !== "listening" && nextState !== "speaking") {
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        const t = (now - start) / 1000;
        const base = nextState === "speaking" ? 0.45 : 0.2;
        const wave =
          (Math.sin(t * (nextState === "speaking" ? 8 : 5)) + 1) * 0.22;
        setAudioLevel(Math.min(1, base + wave));
        levelRafRef.current = requestAnimationFrame(tick);
      };

      levelRafRef.current = requestAnimationFrame(tick);
    },
    [stopLevelAnimation],
  );

  const stopMeteringPoll = useCallback(() => {
    if (meteringPollRef.current != null) {
      clearInterval(meteringPollRef.current);
      meteringPollRef.current = null;
    }
  }, []);

  const stopSilenceDetector = useCallback(() => {
    stopMeteringPoll();
    silenceDetectorRef.current?.stop();
    silenceDetectorRef.current = null;
    stopLevelAnimation();
  }, [stopLevelAnimation, stopMeteringPoll]);

  const stopSound = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {
      // ignore unload errors during cancel
    }
  }, []);

  const stopRecordingTracks = useCallback(async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return null;

    try {
      recording.setOnRecordingStatusUpdate(null);
      const status = await recording.getStatusAsync();
      if (status.isRecording) {
        await recording.stopAndUnloadAsync();
      } else {
        await recording.stopAndUnloadAsync().catch(() => undefined);
      }
    } catch {
      // recording may already be stopped
    }

    return recording.getURI();
  }, []);

  const resetToIdle = useCallback(() => {
    setState("idle");
  }, []);

  const cancelSession = useCallback(async () => {
    sessionRef.current = false;
    setIsSessionOpen(false);
    isFinishingRef.current = false;
    isStartingRef.current = false;
    discardRecordingRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    stopSilenceDetector();
    await stopSound();
    await stopRecordingTracks();
    resetToIdle();
  }, [resetToIdle, stopRecordingTracks, stopSilenceDetector, stopSound]);

  const processRecording = useCallback(
    async (uri: string | null) => {
      if (!sessionRef.current) {
        resetToIdle();
        return;
      }

      if (discardRecordingRef.current) {
        discardRecordingRef.current = false;
        await startListeningRef.current();
        return;
      }

      setState("processing");
      stopLevelAnimation();

      try {
        if (!uri) throw new Error("Recording failed");

        const text = await transcribeAudio(uri);
        if (!sessionRef.current) return;

        if (!text) {
          await startListeningRef.current();
          return;
        }

        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const controller = abortRef.current;

        let sentenceBuffer = "";
        let firstChunkQueued = false;
        let hasQueuedAny = false;

        const speechQueue = createSpeechQueue(controller.signal, soundRef, () => {
          if (sessionRef.current && !controller.signal.aborted) {
            setState("speaking");
            animateLevelForState("speaking");
          }
        });

        const queueReadyChunks = (isFinal: boolean) => {
          while (true) {
            const minChars = firstChunkQueued
              ? CHUNK_MIN_CHARS
              : FIRST_CHUNK_MIN_CHARS;
            const ready = takeReadyChunk(
              sentenceBuffer,
              minChars,
              CHUNK_MAX_CHARS,
            );
            if (!ready) break;
            sentenceBuffer = ready.rest;
            if (textForSpeech(ready.chunk).trim()) {
              speechQueue.push(ready.chunk);
              hasQueuedAny = true;
              if (
                !firstChunkQueued &&
                sessionRef.current &&
                !controller.signal.aborted
              ) {
                setState("preparing_speech");
              }
              firstChunkQueued = true;
            }
          }
          if (isFinal) {
            const remainder = sentenceBuffer.trim();
            sentenceBuffer = "";
            if (remainder && textForSpeech(remainder).trim()) {
              speechQueue.push(remainder);
              hasQueuedAny = true;
            }
          }
        };

        const reply = await onSend(text, (deltaText) => {
          if (!sessionRef.current || discardRecordingRef.current) return;
          sentenceBuffer += deltaText;
          queueReadyChunks(false);
        });
        if (!sessionRef.current) return;

        queueReadyChunks(true);

        // Some responses only arrive as a final payload (no deltas). Speak that once.
        if (!hasQueuedAny && reply?.trim() && textForSpeech(reply).trim()) {
          speechQueue.push(reply);
          hasQueuedAny = true;
        }

        if (!hasQueuedAny) {
          await startListeningRef.current();
          return;
        }

        await speechQueue.finish();

        if (!sessionRef.current) return;

        stopLevelAnimation();
        await startListeningRef.current();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          if (!sessionRef.current) resetToIdle();
          return;
        }
        console.error("[wallie-mobile] voice:", error);
        if (sessionRef.current) {
          await startListeningRef.current();
        } else {
          resetToIdle();
        }
      }
    },
    [animateLevelForState, onSend, resetToIdle, stopLevelAnimation],
  );

  const finishListening = useCallback(async () => {
    if (!sessionRef.current || isFinishingRef.current) return;

    const recording = recordingRef.current;
    if (!recording) return;

    isFinishingRef.current = true;
    stopSilenceDetector();

    try {
      const elapsed = Date.now() - recordingStartedAtRef.current;
      if (elapsed < MIN_RECORDING_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_RECORDING_MS - elapsed),
        );
      }

      const uri = await stopRecordingTracks();
      // Release before STT/chat/TTS so post-speech startListening isn't blocked.
      isFinishingRef.current = false;
      await processRecording(uri);
    } finally {
      isFinishingRef.current = false;
    }
  }, [processRecording, stopRecordingTracks, stopSilenceDetector]);

  finishListeningRef.current = () => {
    void finishListening();
  };

  const startListening = useCallback(async () => {
    if (!sessionRef.current || isStartingRef.current || isFinishingRef.current) {
      return;
    }

    if (recordingRef.current) return;

    isStartingRef.current = true;
    discardRecordingRef.current = false;
    stopSilenceDetector();

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Microphone permission is required to talk to Wallie.");
      }

      await setRecordingAudioMode();

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);

      silenceDetectorRef.current = createRecordingSilenceDetector({
        onSilence: () => finishListeningRef.current(),
        onMaxDuration: () => {
          if (__DEV__) {
            console.log("[wallie-mobile] voice: max recording duration reached");
          }
        },
        onNoSpeech: () => {
          discardRecordingRef.current = true;
          finishListeningRef.current();
        },
        onLevel: setAudioLevel,
      });

      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;
        silenceDetectorRef.current?.tick(status.metering);
      });

      await recording.startAsync();

      if (!sessionRef.current) {
        await recording.stopAndUnloadAsync().catch(() => undefined);
        return;
      }

      recordingRef.current = recording;
      recordingStartedAtRef.current = Date.now();
      setState("listening");
      stopLevelAnimation();

      meteringPollRef.current = setInterval(() => {
        const activeRecording = recordingRef.current;
        if (!activeRecording || !silenceDetectorRef.current) return;

        void activeRecording.getStatusAsync().then((status) => {
          if (!status.isRecording) return;
          silenceDetectorRef.current?.tick(status.metering);
        });
      }, METERING_POLL_MS);
    } finally {
      isStartingRef.current = false;
    }
  }, [stopLevelAnimation, stopSilenceDetector]);

  startListeningRef.current = startListening;

  const enterSession = useCallback(async () => {
    if (sessionRef.current || isStartingRef.current) return;

    sessionRef.current = true;
    setIsSessionOpen(true);
    try {
      await startListening();
    } catch (error) {
      await cancelSession();
      throw error;
    }
  }, [cancelSession, startListening]);

  const exitSession = useCallback(() => {
    void cancelSession();
  }, [cancelSession]);

  useEffect(() => {
    void Audio.requestPermissionsAsync();
    void setRecordingAudioMode();

    return () => {
      sessionRef.current = false;
      abortRef.current?.abort();
      stopSilenceDetector();
      void stopSound();
      void stopRecordingTracks();
    };
  }, [stopRecordingTracks, stopSilenceDetector, stopSound]);

  return {
    state,
    isSessionOpen,
    audioLevel,
    enterSession,
    exitSession,
    isBusy:
      state === "processing" ||
      state === "preparing_speech" ||
      state === "speaking",
  };
}
