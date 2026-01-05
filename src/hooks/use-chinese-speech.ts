import { useState, useCallback, useEffect, useRef } from "react";

const PREFERRED_LANGS = ["zh-CN", "zh-TW", "zh-HK"];

export const useChineseSpeech = () => {
  const [isSpeaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const findChineseVoice = useCallback(() => {
    if (!("speechSynthesis" in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Try to find preferred Chinese voices in order
    for (const lang of PREFERRED_LANGS) {
      const voice = voices.find((v) => v.lang === lang || v.lang.startsWith(lang));
      if (voice) return voice;
    }

    // Fallback to any Chinese voice
    return voices.find((v) => v.lang.startsWith("zh")) || null;
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      voiceRef.current = findChineseVoice();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [findChineseVoice]);

  const speakChinese = useCallback((text: string, id?: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.lang = "zh-CN"; // Explicitly set Mandarin

    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }

    utterance.onstart = () => {
      setSpeaking(true);
      setSpeakingId(id ?? text);
    };
    utterance.onend = () => {
      setSpeaking(false);
      setSpeakingId(null);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setSpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  return { speakChinese, isSpeaking, speakingId };
};
