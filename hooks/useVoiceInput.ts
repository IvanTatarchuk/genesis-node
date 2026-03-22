"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Minimal type for Web Speech API (browser may not have global types)
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: { length: number; [i: number]: { length: number; 0: { transcript: string }; isFinal?: boolean } } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export interface UseVoiceInputResult {
  isListening: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useVoiceInput(options?: { lang?: string; continuous?: boolean }): UseVoiceInputResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    setError(null);
    setTranscript("");

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = options?.continuous ?? true;
    rec.interimResults = true;
    rec.lang = options?.lang ?? "en-US";

    rec.onresult = (event: { results: { length: number; [i: number]: { 0: { transcript: string } } } }) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      setTranscript(full);
    };

    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    rec.onerror = (event: { error: string }) => {
      if (event.error === "not-allowed") {
        setError("Microphone access was denied. Allow the mic to use voice input.");
      } else if (event.error !== "aborted") {
        setError("Voice input failed. Try again.");
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
    } catch (e) {
      setError("Could not start voice input. Try again.");
    }
  }, [isSupported, options?.continuous, options?.lang]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
