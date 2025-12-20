import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import VocabResult from "@/components/VocabResult";

interface Example {
  en: string;
  zh: string;
}

interface WordFamily {
  verb?: string;
  noun?: string;
  adjective?: string;
  adverb?: string;
}

interface VocabData {
  ipa?: string;
  definitions: string[];
  pos: string[];
  pinyin: string[];
  examples: Example[];
  word_family?: WordFamily;
}

const Lookup = () => {
  const [word, setWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<VocabData | null>(null);
  const { toast } = useToast();

  const lookupWord = async (searchWord: string) => {
    if (!searchWord.trim()) {
      toast({
        title: "Please enter a word",
        variant: "destructive",
      });
      return;
    }

    setWord(searchWord.trim().toLowerCase());
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-vocab", {
        body: { word: searchWord.trim().toLowerCase() },
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

  const handleLookup = () => lookupWord(word);

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
    <div className="min-h-screen bg-gradient-soft pb-20">
      <main className="w-full px-4 pt-6 pb-8 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            Look Up Word
          </h1>
          <p className="text-sm text-muted-foreground">
            Get Chinese translations & examples
          </p>
        </div>

        {/* Search Section */}
        <div className="flex gap-2 mb-6 animate-slide-up">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter English word..."
              className="pl-10 h-12 text-base border-2 border-border focus:border-primary bg-card shadow-card"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleLookup}
            disabled={isLoading || !word.trim()}
            size="lg"
            className="h-12 px-5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 animate-pulse-soft">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Looking up "{word}"...</p>
          </div>
        )}

        {/* Result */}
        {result && !isLoading && (
          <VocabResult
            word={word.trim().toLowerCase()}
            ipa={result.ipa}
            definitions={result.definitions}
            pos={result.pos}
            pinyin={result.pinyin}
            examples={result.examples}
            wordFamily={result.word_family}
            onSave={handleSave}
            isSaving={isSaving}
            onLookupWord={lookupWord}
          />
        )}

        {/* Empty State */}
        {!result && !isLoading && (
          <div className="text-center py-12 text-muted-foreground animate-fade-in">
            <p className="text-sm">Enter a word above to get started</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Lookup;
