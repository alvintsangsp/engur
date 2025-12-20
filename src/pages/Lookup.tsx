import { useState } from "react";
import { Search, Loader2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import VocabResult from "@/components/VocabResult";

interface Example {
  en: string;
  zh: string;
}

interface VocabData {
  definitions: string[];
  pos: string[];
  pinyin: string[];
  examples: Example[];
}

const Lookup = () => {
  const [word, setWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<VocabData | null>(null);
  const { toast } = useToast();

  const handleLookup = async () => {
    if (!word.trim()) {
      toast({
        title: "Please enter a word",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-vocab", {
        body: { word: word.trim().toLowerCase() },
      });

      if (error) {
        throw error;
      }

      setResult(data);
    } catch (error) {
      console.error("Lookup error:", error);
      toast({
        title: "Failed to look up word",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setIsSaving(true);

    try {
      const { error } = await supabase.from("vocabulary").insert([{
        word: word.trim().toLowerCase(),
        definitions: result.definitions,
        pos: result.pos,
        pinyin: result.pinyin,
        examples: JSON.parse(JSON.stringify(result.examples)),
      }]);

      if (error) {
        throw error;
      }

      toast({
        title: "Word saved!",
        description: `"${word}" has been added to your deck.`,
      });

      // Clear the form
      setWord("");
      setResult(null);
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Failed to save word",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleLookup();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />

      <main className="container max-w-2xl mx-auto px-4 pt-24 pb-12">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary shadow-glow mb-6">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">
            Lookup & Add
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Search for any English word to get Traditional Chinese translations,
            pinyin, and example sentences.
          </p>
        </div>

        {/* Search Section */}
        <div className="flex gap-3 mb-8 animate-slide-up">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type an English word..."
              className="pl-12 h-14 text-lg border-2 border-border focus:border-primary bg-card shadow-card"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleLookup}
            disabled={isLoading || !word.trim()}
            size="lg"
            className="h-14 px-8 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Lookup"
            )}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 animate-pulse-soft">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Looking up "{word}"...</p>
          </div>
        )}

        {/* Result */}
        {result && !isLoading && (
          <VocabResult
            word={word.trim().toLowerCase()}
            definitions={result.definitions}
            pos={result.pos}
            pinyin={result.pinyin}
            examples={result.examples}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}

        {/* Empty State */}
        {!result && !isLoading && (
          <div className="text-center py-16 text-muted-foreground animate-fade-in">
            <p>Enter a word above to get started</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Lookup;
