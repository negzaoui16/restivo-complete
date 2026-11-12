"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Voix off via la Web Speech API (gratuite, côté navigateur).
 * Sans support, `supported` vaut false et la visite reste en texte seul.
 */
export function useVoiceOver() {
  const supported = useSyncExternalStore(
    () => () => {},
    () => "speechSynthesis" in window,
    () => false
  );
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const pick = () => {
      const voices = synth.getVoices();
      voiceRef.current =
        voices.find((v) => v.lang.toLowerCase() === "fr-fr") ??
        voices.find((v) => v.lang.toLowerCase().startsWith("fr")) ??
        null;
    };
    pick();
    synth.addEventListener?.("voiceschanged", pick);
    return () => {
      synth.removeEventListener?.("voiceschanged", pick);
      synth.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    tokenRef.current += 1; // invalide les callbacks de la lecture en cours
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  /**
   * Lit `text`. `onDone` est appelé quand la lecture se termine d'elle-même
   * (pas si elle est interrompue par stop() ou par une nouvelle lecture).
   */
  const speak = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const myId = ++tokenRef.current;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1.15; // un peu plus rapide que la normale (1.0)
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
      if (tokenRef.current === myId) onDone?.();
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
      // Une erreur réelle ne doit pas bloquer une lecture enchaînée.
      if (tokenRef.current === myId) onDone?.();
    };
    synth.speak(utterance);
  }, []);

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, []);

  return { supported, speaking, paused, speak, pause, resume, stop };
}
