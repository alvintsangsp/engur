import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Languages, Quote, GitBranch, Volume2, ArrowLeftRight, MessageCircle } from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import { useSpeech } from "@/hooks/use-speech";
import { useChineseSpeech } from "@/hooks/use-chinese-speech";

interface WordFamily {
  verb?: string;
  noun?: string;
  adjective?: string;
  adverb?: string;
}

interface Example {
  en: string;
  zh: string;
}

interface Phrase {
  phrase: string;
  meaning: string;
}

interface VocabResultProps {
  word: string;
  ipa?: string;
  definitions: string[];
  pos: string[];
  pinyin: string[];
  examples: Example[];
  wordFamily?: WordFamily;
  phrases?: Phrase[];
  commonSynonym?: string;
  commonAntonym?: string;
  onSave: () => void;
  isSaving: boolean;
  onLookupWord?: (word: string) => void;
  hideSaveButton?: boolean;
}

const VocabResult = ({
  word,
  ipa,
  definitions,
  pos,
  pinyin,
  examples,
  wordFamily,
  phrases,
  commonSynonym,
  commonAntonym,
  onSave,
  isSaving,
  onLookupWord,
  hideSaveButton = false,
}: VocabResultProps) => {
  const { speak, speakingWord } = useSpeech();
  const { speakChinese, speakingId } = useChineseSpeech();
  const wordFamilyEntries = wordFamily 
    ? Object.entries(wordFamily).filter(([_, value]) => value) 
    : [];
  const hasSynonymOrAntonym = (commonSynonym && commonSynonym.trim() !== "") || (commonAntonym && commonAntonym.trim() !== "");
  const hasPhrases = phrases && phrases.length > 0;
  return (
    <Card className="animate-slide-up shadow-elevated border-0 bg-card overflow-hidden">
      <div className="h-1.5 bg-gradient-primary" />
      <CardHeader className="pb-3 px-4 sm:px-6 relative">
        <div className="absolute top-4 right-4 sm:right-6">
          <AudioPlayer word={word} ipa={ipa} />
        </div>
        <div className="space-y-3 pr-20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">
                {word}
              </CardTitle>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {pos.map((p, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-0 font-medium text-xs"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-4 sm:px-6 pb-6">
        {/* Word Forms */}
        {wordFamilyEntries.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GitBranch className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Word Forms
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {wordFamilyEntries.map(([posLabel, wordForm], i) => (
                <div
                  key={posLabel}
                  className="flex items-center gap-1 p-3 rounded-xl border border-border bg-card animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <button
                    onClick={() => onLookupWord?.(wordForm as string)}
                    className="flex flex-col items-start hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="text-xs text-muted-foreground capitalize">{posLabel}</span>
                    <span className="font-semibold text-foreground">{wordForm as string}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 ml-1 ${speakingWord === `form-${posLabel}` ? "text-primary animate-pulse" : "text-muted-foreground hover:text-primary"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(wordForm as string, `form-${posLabel}`);
                    }}
                    disabled={speakingWord === `form-${posLabel}`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common Phrases */}
        {hasPhrases && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Common Phrases
              </span>
            </div>
            <div className="space-y-2">
              {phrases!.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onLookupWord?.(item.phrase)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors animate-fade-in cursor-pointer text-left"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="font-semibold text-foreground">{item.phrase}</span>
                  <span className="font-chinese text-muted-foreground text-sm">{item.meaning}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Definitions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Languages className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Definitions
            </span>
          </div>
          <div className="space-y-2">
            {definitions.map((def, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-semibold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-chinese text-base sm:text-lg text-foreground leading-relaxed">{def}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 w-6 p-0 flex-shrink-0 ${speakingId === `def-${i}` ? "text-primary animate-pulse" : "text-muted-foreground hover:text-primary"}`}
                      onClick={() => speakChinese(def, `def-${i}`)}
                      disabled={speakingId === `def-${i}`}
                      aria-label="Review Later"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {pinyin[i] && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {pinyin[i]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Examples */}
        {examples.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Quote className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Examples
              </span>
            </div>
            <div className="space-y-2">
              {examples.map((ex, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-border bg-card animate-fade-in"
                  style={{ animationDelay: `${(i + definitions.length) * 100}ms` }}
                >
                  <p className="text-foreground text-sm sm:text-base mb-1">{ex.en}</p>
                  <p className="font-chinese text-muted-foreground text-sm">{ex.zh}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Synonym & Antonym */}
        {hasSynonymOrAntonym && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowLeftRight className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Common Synonym & Antonym
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {commonSynonym && commonSynonym.trim() !== "" && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-xs text-muted-foreground">Synonym:</span>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors px-3 py-1.5 text-sm font-medium"
                    onClick={() => onLookupWord?.(commonSynonym)}
                  >
                    {commonSynonym}
                  </Badge>
                </div>
              )}
              {commonAntonym && commonAntonym.trim() !== "" && (
                <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: "50ms" }}>
                  <span className="text-xs text-muted-foreground">Antonym:</span>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors px-3 py-1.5 text-sm font-medium"
                    onClick={() => onLookupWord?.(commonAntonym)}
                  >
                    {commonAntonym}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VocabResult;
