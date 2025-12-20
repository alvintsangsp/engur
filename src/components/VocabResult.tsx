import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookPlus, Languages, Quote } from "lucide-react";

interface Example {
  en: string;
  zh: string;
}

interface VocabResultProps {
  word: string;
  definitions: string[];
  pos: string[];
  pinyin: string[];
  examples: Example[];
  onSave: () => void;
  isSaving: boolean;
}

const VocabResult = ({
  word,
  definitions,
  pos,
  pinyin,
  examples,
  onSave,
  isSaving,
}: VocabResultProps) => {
  return (
    <Card className="animate-slide-up shadow-elevated border-0 bg-card overflow-hidden">
      <div className="h-2 bg-gradient-primary" />
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-3xl font-display font-bold text-foreground mb-2">
              {word}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {pos.map((p, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-primary/10 text-primary border-0 font-medium"
                >
                  {p}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
          >
            <BookPlus className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save to My Deck"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Definitions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Languages className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wide">
              Definitions
            </span>
          </div>
          <div className="space-y-2">
            {definitions.map((def, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-semibold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="font-chinese text-lg text-foreground">{def}</p>
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Quote className="w-4 h-4" />
              <span className="text-sm font-medium uppercase tracking-wide">
                Examples
              </span>
            </div>
            <div className="space-y-3">
              {examples.map((ex, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-border bg-card animate-fade-in"
                  style={{ animationDelay: `${(i + definitions.length) * 100}ms` }}
                >
                  <p className="text-foreground mb-2">{ex.en}</p>
                  <p className="font-chinese text-muted-foreground">{ex.zh}</p>
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
