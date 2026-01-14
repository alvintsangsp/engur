import { useState, useCallback, useEffect, useRef } from "react";
import { Volume2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PREFERRED_VOICES = [
  "Google US English",
  "Samantha",
  "Microsoft Zira",
  "Alex",
  "Daniel",
];

interface AudioPlayerProps {
  word: string;
  ipa?: string;
  compact?: boolean;
}

const AudioPlayer = ({ word, ipa, compact = false }: AudioPlayerProps) => {
  const [speed, setSpeed] = useState("0.9");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const findBestVoice = useCallback(() => {
    if (!("speechSynthesis" in window)) return null;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    for (const preferred of PREFERRED_VOICES) {
      const voice = voices.find((v) =>
        v.name.toLowerCase().includes(preferred.toLowerCase())
      );
      if (voice) return voice;
    }

    const englishVoice = voices.find(
      (v) => v.lang.startsWith("en-US") || v.lang.startsWith("en-GB")
    );
    if (englishVoice) return englishVoice;

    return voices.find((v) => v.lang.startsWith("en")) || voices[0];
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      voiceRef.current = findBestVoice();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [findBestVoice]);

  const speak = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = parseFloat(speed);
      utterance.pitch = 1.0;
      utterance.lang = "en-US";

      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [word, speed]);

  return (
    <div className={`flex items-center gap-2 ${compact ? "flex-wrap" : ""}`}>
      <Button
        onClick={speak}
        variant="ghost"
        size={compact ? "default" : "lg"}
        className={`gap-2 ${isSpeaking ? "text-primary animate-pulse-soft" : "text-muted-foreground hover:text-primary"}`}
        disabled={isSpeaking}
      >
        <Volume2 className={compact ? "w-5 h-5" : "w-6 h-6"} />
        {!compact && <span>Play</span>}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground h-8 w-8 p-0">
            <Settings2 className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuRadioGroup value={speed} onValueChange={setSpeed}>
            <DropdownMenuRadioItem value="0.5">0.5x (Slow)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="0.75">0.75x</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="1">1.0x (Normal)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="1.25">1.25x</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {ipa && (
        <span className="font-mono text-sm text-muted-foreground">
          {ipa}
        </span>
      )}
    </div>
  );
};

export default AudioPlayer;
