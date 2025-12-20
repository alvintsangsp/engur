import { useState, useCallback, useEffect, useRef } from "react";

const PREFERRED_VOICES = [
  "Google US English",
  "Samantha",
  "Microsoft Zira",
  "Alex",
  "Daniel",
];

export const useSpeech = () => {
  const [isSpeaking, setSpeaking] = useState(false);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voicesLoadedRef = useRef(false);

  const findBestVoice = useCallback(() => {
    if (!("speechSynthesis" in window)) return null;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Try to find preferred voices first
    for (const preferred of PREFERRED_VOICES) {
      const voice = voices.find((v) =>
        v.name.toLowerCase().includes(preferred.toLowerCase())
      );
      if (voice) return voice;
    }

    // Fallback to first en-US or en-GB voice
    const englishVoice = voices.find(
      (v) => v.lang.startsWith("en-US") || v.lang.startsWith("en-GB")
    );
    if (englishVoice) return englishVoice;

    // Last resort: any English voice
    return voices.find((v) => v.lang.startsWith("en")) || voices[0];
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      voiceRef.current = findBestVoice();
      voicesLoadedRef.current = true;
    };

    // Voices may already be loaded
    loadVoices();

    // Chrome loads voices asynchronously
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [findBestVoice]);

  const speak = useCallback((word: string, id?: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";

    // Use the best available voice
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }

    utterance.onstart = () => {
      setSpeaking(true);
      setSpeakingWord(id ?? word);
    };
    utterance.onend = () => {
      setSpeaking(false);
      setSpeakingWord(null);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setSpeakingWord(null);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak, isSpeaking, speakingWord };
};
