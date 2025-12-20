import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, RotateCcw, ThumbsUp, Sparkles, Volume2 } from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import { useSpeech } from "@/hooks/use-speech";

interface Example {
  en: string;
  zh: string;
}

interface FlashcardProps {
  word: string;
  ipa?: string;
  definitions: string[];
  pos: string[];
  pinyin: string[];
  examples: Example[];
  onRate: (rating: "again" | "good" | "easy") => void;
  isUpdating: boolean;
}

const Flashcard = ({
  word,
  ipa,
  definitions,
  pos,
  pinyin,
  examples,
  onRate,
  isUpdating,
}: FlashcardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const { speak, isSpeaking } = useSpeech();

  const handleFlip = () => {
    setIsFlipped(true);
  };

  const handleRate = (rating: "again" | "good" | "easy") => {
    onRate(rating);
    setIsFlipped(false);
  };

  return (
    <div className="w-full">
      <div className="flashcard">
        <div className={`flashcard-inner ${isFlipped ? "flipped" : ""}`}>
          {/* Front of card */}
          <div className="flashcard-face flashcard-front border border-border">
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-3xl sm:text-5xl font-display font-bold text-foreground">
                  {word}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-10 w-10 p-0 ${isSpeaking ? "text-primary animate-pulse" : "text-muted-foreground hover:text-primary"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(word);
                  }}
                  disabled={isSpeaking}
                >
                  <Volume2 className="w-5 h-5" />
                </Button>
              </div>
              
              {ipa && (
                <span className="font-mono text-sm text-muted-foreground mb-4">
                  {ipa}
                </span>
              )}
              
              <div className="flex flex-wrap justify-center gap-2">
                {pos.map((p, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-0 font-medium text-sm"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              onClick={handleFlip}
              size="lg"
              className="w-full h-14 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity text-base font-medium"
            >
              <Eye className="w-5 h-5 mr-2" />
              Show Answer
            </Button>
          </div>

          {/* Back of card */}
          <div className="flashcard-face flashcard-back border border-border overflow-y-auto">
            <div className="flex-1 space-y-3 overflow-y-auto">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">
                  {word}
                </h2>
                {ipa && (
                  <span className="font-mono text-sm text-muted-foreground">
                    {ipa}
                  </span>
                )}
              </div>
              
              {/* Definitions */}
              <div className="space-y-2">
                {definitions.map((def, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-chinese text-sm sm:text-base text-foreground">{def}</p>
                      {pinyin[i] && (
                        <p className="text-xs text-muted-foreground">
                          {pinyin[i]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Examples */}
              {examples.length > 0 && (
                <div className="pt-2 border-t border-border space-y-2">
                  {examples.slice(0, 2).map((ex, i) => (
                    <div key={i} className="text-xs sm:text-sm">
                      <p className="text-foreground">{ex.en}</p>
                      <p className="font-chinese text-muted-foreground">{ex.zh}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rating buttons */}
            <div className="grid grid-cols-3 gap-2 pt-3">
              <Button
                onClick={() => handleRate("again")}
                disabled={isUpdating}
                variant="outline"
                className="h-12 border-destructive text-destructive hover:bg-destructive/10 text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Again
              </Button>
              <Button
                onClick={() => handleRate("good")}
                disabled={isUpdating}
                variant="outline"
                className="h-12 border-success text-success hover:bg-success/10 text-sm font-medium"
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                Good
              </Button>
              <Button
                onClick={() => handleRate("easy")}
                disabled={isUpdating}
                variant="outline"
                className="h-12 border-warning text-warning hover:bg-warning/10 text-sm font-medium"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Easy
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
