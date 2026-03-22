"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface UseVoiceOutputResult {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string, options?: { rate?: number; pitch?: number }) => void;
  stop: () => void;
}

export function useVoiceOutput(): UseVoiceOutputResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, []);

  const speak = useCallback(
    (text: string, options?: { rate?: number; pitch?: number }) => {
      if (!isSupported || !text.trim()) return;
      stop();

      const u = new SpeechSynthesisUtterance(text.trim());
      u.rate = options?.rate ?? 0.95;
      u.pitch = options?.pitch ?? 1;
      u.lang = "en-US";
      u.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };
      u.onerror = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = u;
      window.speechSynthesis.speak(u);
      setIsSpeaking(true);
    },
    [isSupported, stop]
  );

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { isSpeaking, isSupported, speak, stop };
}
