"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StreamingStatus = "idle" | "connecting" | "recording" | "stopping" | "error";
type StopReason = "manual" | "limit" | "error";

type AssemblyAITurnMessage = {
  type?: string;
  turn_order?: number;
  transcript?: string;
  words?: Array<{ text?: string; word_is_final?: boolean }>;
};

type UseAssemblyAIStreamingOptions = {
  maxDurationMs?: number;
  onFinalTranscript: (text: string) => void;
  onStop?: (reason: StopReason) => void;
  onError?: (message: string) => void;
};

const STREAM_URL = "wss://streaming.assemblyai.com/v3/ws";
const SAMPLE_RATE = 16000;
const DEFAULT_MAX_DURATION_MS = 120000;

function floatTo16BitPcm(input: Float32Array, inputSampleRate: number) {
  const ratio = inputSampleRate / SAMPLE_RATE;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sampleIndex = Math.floor(index * ratio);
    const sample = Math.max(-1, Math.min(1, input[sampleIndex] ?? 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output.buffer;
}

function getDelta(previous: string, next: string) {
  if (!next || next === previous) return "";
  if (next.startsWith(previous)) return next.slice(previous.length);
  return "";
}

export function useAssemblyAIStreaming({
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
  onFinalTranscript,
  onStop,
  onError,
}: UseAssemblyAIStreamingOptions) {
  const [status, setStatus] = useState<StreamingStatus>("idle");
  const [livePreview, setLivePreview] = useState("");
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const stopReasonRef = useRef<StopReason>("manual");
  const committedTurnsRef = useRef<Map<number, string>>(new Map());
  const finalTranscriptRef = useRef(onFinalTranscript);
  const onStopRef = useRef(onStop);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    finalTranscriptRef.current = onFinalTranscript;
    onStopRef.current = onStop;
    onErrorRef.current = onError;
  }, [onFinalTranscript, onStop, onError]);

  const cleanup = useCallback(async (reason: StopReason = stopReasonRef.current) => {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "Terminate" }));
      socket.close();
    } else if (socket && socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }

    committedTurnsRef.current.clear();
    setLivePreview("");
    setStatus(reason === "error" ? "error" : "idle");
    onStopRef.current?.(reason);
  }, []);

  const stop = useCallback(async () => {
    stopReasonRef.current = "manual";
    setStatus("stopping");
    await cleanup("manual");
  }, [cleanup]);

  const start = useCallback(async () => {
    if (status === "connecting" || status === "recording" || status === "stopping") return;

    setStatus("connecting");
    setError(null);
    setLivePreview("");
    committedTurnsRef.current.clear();
    stopReasonRef.current = "manual";

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone recording is not supported in this browser.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = mediaStream;
      const tokenResponse = await fetch("/api/assemblyai/token", { cache: "no-store" });
      const tokenData = (await tokenResponse.json()) as { token?: string; error?: string };

      if (!tokenResponse.ok || !tokenData.token) {
        throw new Error(tokenData.error ?? "Unable to start speech transcription.");
      }

      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) {
        throw new Error("Audio recording is not supported in this browser.");
      }

      const audioContext = new AudioContextConstructor();
      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      const params = new URLSearchParams({
        token: tokenData.token,
        speech_model: "universal-streaming-english",
        sample_rate: String(SAMPLE_RATE),
        encoding: "pcm_s16le",
        format_turns: "true",
      });
      const socket = new WebSocket(`${STREAM_URL}?${params.toString()}`);
      socket.binaryType = "arraybuffer";

      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;
      socketRef.current = socket;

      processor.onaudioprocess = (event) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        const input = event.inputBuffer.getChannelData(0);
        socket.send(floatTo16BitPcm(input, audioContext.sampleRate));
      };

      socket.onopen = () => {
        source.connect(processor);
        processor.connect(audioContext.destination);
        setStatus("recording");
        stopTimerRef.current = window.setTimeout(() => {
          stopReasonRef.current = "limit";
          setStatus("stopping");
          void cleanup("limit");
        }, maxDurationMs);
      };

      socket.onmessage = (event) => {
        if (typeof event.data !== "string") return;

        try {
          const message = JSON.parse(event.data) as AssemblyAITurnMessage;
          const turnOrder = message.turn_order;
          const transcript = message.transcript?.trim();

          if (!transcript || typeof turnOrder !== "number") return;

          setLivePreview(transcript);

          const previous = committedTurnsRef.current.get(turnOrder) ?? "";
          const delta = getDelta(previous, transcript);
          if (delta.trim()) {
            committedTurnsRef.current.set(turnOrder, transcript);
            finalTranscriptRef.current(delta);
          }
        } catch {
          // Ignore non-transcript socket messages.
        }
      };

      socket.onerror = () => {
        const message = "AssemblyAI streaming connection failed.";
        setError(message);
        onErrorRef.current?.(message);
        stopReasonRef.current = "error";
        setStatus("stopping");
        void cleanup("error");
      };

      socket.onclose = () => {
        if (stopReasonRef.current === "manual") return;
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to start speech transcription.";
      setError(message);
      onErrorRef.current?.(message);
      stopReasonRef.current = "error";
      await cleanup("error");
    }
  }, [cleanup, maxDurationMs, status]);

  useEffect(() => {
    return () => {
      void cleanup("manual");
    };
  }, [cleanup]);

  return {
    error,
    isRecording: status === "recording",
    livePreview,
    start,
    status,
    stop,
  };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
