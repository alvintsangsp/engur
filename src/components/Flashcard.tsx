import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, RotateCcw, ThumbsUp, Volume2 } from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import { useSpeech } from "@/hooks/use-speech";
import { useSwipe } from "@/hooks/use-swipe";

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
  onRate: (rating: "again" | "good") => void;
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

  const handleRate = (rating: "again" | "good") => {
    onRate(rating);
    setIsFlipped(false);
  };

  const swipeHandlers = useMemo(
    () => ({
      onSwipeLeft: () => !isUpdating && handleRate("good"),
      onSwipeRight: () => !isUpdating && handleRate("again"),
    }),
    [isUpdating]
  );

  const { swipeState, handlers: touchHandlers } = useSwipe(
    swipeHandlers,
    isFlipped && !isUpdating
  );

  // Calculate visual feedback based on swipe
  const getSwipeStyle = () => {
    if (!isFlipped) return {};
    
    const { offsetX, offsetY, direction } = swipeState;
    const rotation = offsetX * 0.05;
    
    return {
      transform: `translate(${offsetX * 0.5}px, ${Math.min(offsetY * 0.3, 0)}px) rotate(${rotation}deg)`,
      transition: offsetX === 0 && offsetY === 0 ? "transform 0.3s ease-out" : "none",
    };
  };

  const getSwipeIndicator = () => {
    const { direction, offsetX, offsetY } = swipeState;
    const threshold = 80;
    
    if (Math.abs(offsetX) > threshold / 2) {
      if (offsetX > threshold / 2) {
        return { text: "Next", color: "bg-destructive text-destructive-foreground" };
      } else if (offsetX < -threshold / 2) {
        return { text: "Done", color: "bg-success text-success-foreground" };
      }
    }
    return null;
  };

  const indicator = getSwipeIndicator();

  return (
    <div className="w-full flex justify-center">
      <div 
        className="flashcard relative"
        style={getSwipeStyle()}
        {...touchHandlers}
      >
        {/* Swipe indicator overlay */}
        {indicator && isFlipped && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full font-semibold text-sm ${indicator.color} animate-scale-in`}>
            {indicator.text}
          </div>
        )}
        
        <div className={`flashcard-inner ${isFlipped ? "flipped" : ""}`}>
          {/* Front of card */}
          <div className="flashcard-face flashcard-front border border-border">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
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
                <span className="font-mono text-sm text-muted-foreground mb-3">
                  {ipa}
                </span>
              )}
              
              <div className="flex flex-wrap justify-center gap-1.5">
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
              className="w-full h-12 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity text-base font-medium"
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
            <div className="flex justify-center gap-2 pt-3">
              <div className="text-center flex-1 max-w-[200px]">
                <Button
                  onClick={() => handleRate("good")}
                  disabled={isUpdating}
                  variant="outline"
                  className="h-12 w-full border-success text-success hover:bg-success/10 text-sm font-medium"
                >
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  Done
                </Button>
                <span className="text-[10px] text-muted-foreground mt-1 block">← swipe</span>
              </div>
              <div className="text-center flex-1 max-w-[200px]">
                <Button
                  onClick={() => handleRate("again")}
                  disabled={isUpdating}
                  variant="outline"
                  className="h-12 w-full border-destructive text-destructive hover:bg-destructive/10 text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Next
                </Button>
                <span className="text-[10px] text-muted-foreground mt-1 block">swipe →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
