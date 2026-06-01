"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import type { TtsMode } from "@/lib/appSettings";
import {
  createIdleAudioSession,
  readPlaybackSpeed,
  writePlaybackSpeed,
  type AudioSessionSource,
  type BookAudioSession,
} from "@/lib/bookAudioSession";

type StartSessionParams = {
  source: AudioSessionSource;
  title: string;
  chunks: string[];
  bookId?: string;
  chatMessageId?: string;
  startChunkIndex?: number;
  startCharIndex?: number;
  loadingBookId?: string;
};

export function useBookAudioSession(ttsMode: TtsMode) {
  const [session, setSession] = useState<BookAudioSession>(createIdleAudioSession);
  const [playbackSpeed, setPlaybackSpeedState] = useState(() => readPlaybackSpeed());

  const tokenRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pausedRef = useRef(false);
  const pauseResolversRef = useRef<Array<() => void>>([]);
  const playbackSpeedRef = useRef(playbackSpeed);
  const sessionRef = useRef(session);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // noop
      }
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const wakePauseWaiters = useCallback(() => {
    const resolvers = pauseResolversRef.current;
    pauseResolversRef.current = [];
    resolvers.forEach((r) => r());
  }, []);

  const waitWhilePaused = useCallback(async (token: number) => {
    while (pausedRef.current && tokenRef.current === token) {
      await new Promise<void>((resolve) => {
        pauseResolversRef.current.push(resolve);
      });
    }
  }, []);

  const patchSession = useCallback((patch: Partial<BookAudioSession>) => {
    setSession((prev) => {
      const next = { ...prev, ...patch };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const stopSession = useCallback(() => {
    tokenRef.current += 1;
    pausedRef.current = false;
    wakePauseWaiters();
    cleanupAudio();
    cancelSpeech();
    const idle = createIdleAudioSession();
    sessionRef.current = idle;
    setSession(idle);
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
      navigator.mediaSession.metadata = null;
    }
  }, [cancelSpeech, cleanupAudio, wakePauseWaiters]);

  const pauseSession = useCallback(() => {
    if (sessionRef.current.status !== "playing") return;
    pausedRef.current = true;
    patchSession({ status: "paused" });
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // noop
      }
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  }, [patchSession]);

  const resumeSession = useCallback(() => {
    if (sessionRef.current.status !== "paused") return;
    pausedRef.current = false;
    patchSession({ status: "playing" });
    wakePauseWaiters();
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeedRef.current;
      void audioRef.current.play().catch(() => {
        // noop
      });
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "playing";
    }
  }, [patchSession, wakePauseWaiters]);

  const togglePauseResume = useCallback(() => {
    if (sessionRef.current.status === "playing") pauseSession();
    else if (sessionRef.current.status === "paused") resumeSession();
  }, [pauseSession, resumeSession]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    writePlaybackSpeed(speed);
    playbackSpeedRef.current = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, []);

  const updateMediaSession = useCallback((title: string, playing: boolean) => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: "Book Chat" });
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, []);

  const playOpenAiChunk = useCallback(
    async (text: string, token: number): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 8000) }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err?.detail ?? `TTS failed (HTTP ${response.status}).`);
      }
      const blob = await response.blob();
      if (tokenRef.current !== token) return;
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audio.playbackRate = playbackSpeedRef.current;
      audioRef.current = audio;
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          cleanupAudio();
          resolve();
        };
        audio.onerror = () => {
          cleanupAudio();
          reject(new Error("Audio playback error."));
        };
        void audio.play().catch(reject);
      });
    },
    [cleanupAudio],
  );

  const runPlaybackLoop = useCallback(
    async (
      token: number,
      parts: string[],
      startChunkIndex: number,
      startCharIndex: number,
      meta: { source: AudioSessionSource; title: string; bookId?: string; chatMessageId?: string },
    ) => {
      let idx = startChunkIndex;
      const initialChar = startCharIndex;

      if (ttsMode === "openai") {
        while (idx < parts.length) {
          if (tokenRef.current !== token) return;
          await waitWhilePaused(token);
          if (tokenRef.current !== token) return;

          const activeStartOffset = idx === startChunkIndex ? initialChar : 0;
          const chunkText = parts[idx];
          const slice = (activeStartOffset > 0 ? chunkText.slice(activeStartOffset) : chunkText).trim();

          patchSession({
            chunkIndex: idx,
            charOffset: activeStartOffset,
            wordStart: 0,
            wordEnd: chunkText.length,
            status: "playing",
            ...meta,
          });
          updateMediaSession(meta.title, true);

          if (!slice) {
            idx += 1;
            continue;
          }
          try {
            await playOpenAiChunk(slice, token);
          } catch (e) {
            if (tokenRef.current === token) {
              patchSession({
                status: "idle",
                error: e instanceof Error ? e.message : "Server TTS failed.",
                chunks: [],
              });
            }
            return;
          }
          idx += 1;
        }
        if (tokenRef.current === token) stopSession();
        return;
      }

      // Browser TTS
      const speakNext = () => {
        if (tokenRef.current !== token) return;
        if (idx >= parts.length) {
          stopSession();
          return;
        }
        void (async () => {
          await waitWhilePaused(token);
          if (tokenRef.current !== token) return;

          const activeStartOffset = idx === startChunkIndex ? initialChar : 0;
          const chunkText = parts[idx];
          patchSession({
            chunkIndex: idx,
            charOffset: activeStartOffset,
            wordStart: activeStartOffset,
            wordEnd: Math.min(activeStartOffset + 1, chunkText.length),
            status: "playing",
            ...meta,
          });
          updateMediaSession(meta.title, true);

          const utter = new SpeechSynthesisUtterance(
            activeStartOffset > 0 ? chunkText.slice(activeStartOffset) : chunkText,
          );
          utter.rate = playbackSpeedRef.current;
          utter.pitch = 1;
          utter.onboundary = (event) => {
            if (tokenRef.current !== token) return;
            const e = event as SpeechSynthesisEvent;
            const start = Math.min(Math.max(0, activeStartOffset + e.charIndex), chunkText.length);
            let end = e.charLength > 0 ? start + e.charLength : start;
            if (end <= start) {
              const rest = chunkText.slice(start);
              const word = rest.match(/^\s*\S+/)?.[0] ?? rest.slice(0, 1);
              end = Math.min(start + (word?.length ?? 1), chunkText.length);
            } else {
              end = Math.min(end, chunkText.length);
            }
            patchSession({ wordStart: start, wordEnd: end });
          };
          utter.onend = () => {
            if (tokenRef.current !== token) return;
            patchSession({ wordStart: 0, wordEnd: 0 });
            idx += 1;
            if (idx >= parts.length) {
              stopSession();
              return;
            }
            speakNext();
          };
          utter.onerror = (event) => {
            if (tokenRef.current !== token) return;
            const synthError = (event as SpeechSynthesisErrorEvent).error;
            if (synthError === "canceled" || synthError === "interrupted") return;
            patchSession({
              status: "idle",
              error: "Playback stopped due to a speech synthesis error.",
              chunks: [],
            });
            stopSession();
          };
          window.speechSynthesis.speak(utter);
        })();
      };
      speakNext();
    },
    [
      ttsMode,
      patchSession,
      playOpenAiChunk,
      stopSession,
      updateMediaSession,
      waitWhilePaused,
    ],
  );

  const beginLoadingSession = useCallback(
    (params: { source: AudioSessionSource; bookId: string; title: string }) => {
      stopSession();
      patchSession({
        source: params.source,
        bookId: params.bookId,
        title: params.title,
        chunks: [],
        chunkIndex: 0,
        charOffset: 0,
        wordStart: 0,
        wordEnd: 0,
        status: "loading",
        loadingBookId: params.bookId,
        error: undefined,
      });
    },
    [patchSession, stopSession],
  );

  const startSession = useCallback(
    async (params: StartSessionParams) => {
      if (typeof window === "undefined") return;
      if (ttsMode === "browser" && !("speechSynthesis" in window)) return;

      stopSession();
      const token = tokenRef.current + 1;
      tokenRef.current = token;
      pausedRef.current = false;

      const { chunks, startChunkIndex = 0, startCharIndex = 0 } = params;
      if (chunks.length === 0) {
        patchSession({
          status: "idle",
          error: "No readable text found.",
          loadingBookId: undefined,
        });
        return;
      }

      const startIdx = Math.max(0, Math.min(startChunkIndex, chunks.length - 1));
      const startChar = Math.max(
        0,
        Math.min(startCharIndex, Math.max(0, chunks[startIdx].length - 1)),
      );

      patchSession({
        source: params.source,
        title: params.title,
        chunks,
        bookId: params.bookId,
        chatMessageId: params.chatMessageId,
        chunkIndex: startIdx,
        charOffset: startChar,
        wordStart: startChar,
        wordEnd: Math.min(startChar + 1, chunks[startIdx].length),
        status: "playing",
        error: undefined,
        loadingBookId: undefined,
      });

      const meta = {
        source: params.source,
        title: params.title,
        bookId: params.bookId,
        chatMessageId: params.chatMessageId,
      };

      await runPlaybackLoop(token, chunks, startIdx, startChar, meta);
    },
    [patchSession, runPlaybackLoop, stopSession, ttsMode],
  );

  const skipChunk = useCallback(
    (delta: number) => {
      const s = sessionRef.current;
      if (s.status !== "playing" && s.status !== "paused") return;
      if (s.chunks.length === 0) return;

      const nextIndex = Math.max(0, Math.min(s.chunkIndex + delta, s.chunks.length - 1));
      if (nextIndex === s.chunkIndex && delta < 0 && s.chunkIndex === 0) return;
      if (nextIndex === s.chunkIndex && delta > 0 && s.chunkIndex >= s.chunks.length - 1) return;

      const token = tokenRef.current + 1;
      tokenRef.current = token;
      pausedRef.current = false;
      wakePauseWaiters();
      cleanupAudio();
      cancelSpeech();

      const meta = {
        source: s.source,
        title: s.title,
        bookId: s.bookId,
        chatMessageId: s.chatMessageId,
      };

      void runPlaybackLoop(token, s.chunks, nextIndex, 0, meta);
    },
    [cancelSpeech, cleanupAudio, runPlaybackLoop, wakePauseWaiters],
  );

  useEffect(() => {
    return () => {
      tokenRef.current += 1;
      cleanupAudio();
      cancelSpeech();
    };
  }, [cancelSpeech, cleanupAudio]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const onPlay = () => resumeSession();
    const onPause = () => pauseSession();
    const onStop = () => stopSession();
    const onPrev = () => skipChunk(-1);
    const onNext = () => skipChunk(1);

    navigator.mediaSession.setActionHandler("play", onPlay);
    navigator.mediaSession.setActionHandler("pause", onPause);
    navigator.mediaSession.setActionHandler("stop", onStop);
    navigator.mediaSession.setActionHandler("previoustrack", onPrev);
    navigator.mediaSession.setActionHandler("nexttrack", onNext);

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("stop", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    };
  }, [pauseSession, resumeSession, skipChunk, stopSession]);

  const isSessionActive =
    session.status === "playing" || session.status === "paused" || session.status === "loading";

  return {
    session,
    playbackSpeed,
    isSessionActive,
    beginLoadingSession,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    togglePauseResume,
    skipChunk,
    setPlaybackSpeed,
  };
}
