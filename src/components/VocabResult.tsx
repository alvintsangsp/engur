import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookPlus, Languages, Quote, GitBranch } from "lucide-react";
import AudioPlayer from "./AudioPlayer";

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

interface VocabResultProps {
  word: string;
  ipa?: string;
  definitions: string[];
  pos: string[];
  pinyin: string[];
  examples: Example[];
  wordFamily?: WordFamily;
  onSave: () => void;
  isSaving: boolean;
  onLookupWord?: (word: string) => void;
}

const VocabResult = ({
  word,
  ipa,
  definitions,
  pos,
  pinyin,
  examples,
  wordFamily,
  onSave,
  isSaving,
  onLookupWord,
}: VocabResultProps) => {
  const wordFamilyEntries = wordFamily 
    ? Object.entries(wordFamily).filter(([_, value]) => value) 
    : [];
  return (
    <Card className="animate-slide-up shadow-elevated border-0 bg-card overflow-hidden">
      <div className="h-1.5 bg-gradient-primary" />
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="space-y-3">
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
          
          <AudioPlayer word={word} ipa={ipa} />
          
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="w-full h-12 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity text-base font-medium"
          >
            <BookPlus className="w-5 h-5 mr-2" />
            {isSaving ? "Saving..." : "Save to My Deck"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-4 sm:px-6 pb-6">
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
                <div>
                  <p className="font-chinese text-base sm:text-lg text-foreground leading-relaxed">{def}</p>
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
                <button
                  key={posLabel}
                  onClick={() => onLookupWord?.(wordForm as string)}
                  className="flex flex-col items-start p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-colors animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="text-xs text-muted-foreground capitalize">{posLabel}</span>
                  <span className="font-semibold text-foreground">{wordForm as string}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
      </CardContent>
    </Card>
  );
};

export default VocabResult;
