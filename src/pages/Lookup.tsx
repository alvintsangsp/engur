import { useState, useEffect } from "react";
import { Search, Loader2, X, Clock, RefreshCw, BookPlus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface Phrase {
  phrase: string;
  meaning: string;
}

interface VocabData {
  is_valid?: boolean;
  ipa?: string;
  definitions: string[];
  pos: string[];
  pinyin: string[];
  examples: Example[];
  word_family?: WordFamily;
  phrases?: Phrase[];
  common_synonym?: string;
  common_antonym?: string;
  suggestions?: string[];
  fromCache?: boolean;
}

const HISTORY_KEY = "vocab-search-history";
const MAX_HISTORY = 15;

const getSearchHistory = (): string[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addToSearchHistory = (word: string) => {
  const history = getSearchHistory();
  const filtered = history.filter((w) => w !== word);
  const updated = [word, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
};

const clearSearchHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
  return [];
};

const Lookup = () => {
  const [word, setWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<VocabData | null>(null);
  const [invalidWordData, setInvalidWordData] = useState<{ suggestions: string[] } | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  const lookupWord = async (searchWord: string, forceRefresh = false) => {
    if (!searchWord.trim()) {
      toast({
        title: "Please enter a word",
        variant: "destructive",
      });
      return;
    }

    const normalizedWord = searchWord.trim().toLowerCase();
    setWord(normalizedWord);
    
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setResult(null);
      setInvalidWordData(null);
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-vocab", {
        body: { word: normalizedWord, forceRefresh },
      });

      if (error) {
        throw error;
      }

      // Check if word is valid
      if (data.is_valid === false) {
        setInvalidWordData({ suggestions: data.suggestions || [] });
        setResult(null);
      } else {
        setResult(data);
        setInvalidWordData(null);
        // Add to history only on successful lookup
        setSearchHistory(addToSearchHistory(normalizedWord));
        
        if (forceRefresh) {
          toast({
            title: "Refreshed from Perplexity",
            description: "Data has been updated with the latest information.",
          });
        }
      }
    } catch (error) {
      console.error("Lookup error:", error);
      toast({
        title: "Failed to look up word",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLookup = () => lookupWord(word);

  const handleRefresh = () => {
    if (word) {
      lookupWord(word, true);
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
        title: "Saved to Deck",
      });
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

  const handleClear = () => {
    setWord("");
    setResult(null);
    setInvalidWordData(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setWord(suggestion);
    lookupWord(suggestion);
  };

  return (
    <div className="min-h-screen bg-gradient-soft pb-32">
      <main className="w-full px-4 pt-6 pb-8 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-1">
            <img 
              src="/logo.png" 
              alt="Engur Logo" 
              className="h-6 w-6 sm:h-7 sm:w-7 object-contain"
              onError={(e) => {
                // Try alternative formats if logo.png doesn't exist
                const target = e.target as HTMLImageElement;
                if (target.src.endsWith('.png')) {
                  target.src = '/logo.svg';
                } else if (target.src.endsWith('.svg')) {
                  target.src = '/logo.jpg';
                } else {
                  target.style.display = 'none';
                }
              }}
            />
            <h1 className="text-2xl font-display font-bold text-foreground">
              Look Up Word
            </h1>
          </div>
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
              className="pl-10 pr-10 h-12 text-base border-2 border-border focus:border-primary bg-card shadow-card"
              disabled={isLoading}
            />
            {word && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground hover:text-foreground transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            )}
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

        {/* Invalid Word Suggestions */}
        {invalidWordData && !isLoading && (
          <div className="bg-card border-2 border-border rounded-xl p-4 mb-6 animate-fade-in">
            <p className="text-sm text-muted-foreground mb-3">
              This word is not recognized. Did you mean:
            </p>
            <div className="flex flex-wrap gap-2">
              {invalidWordData.suggestions.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5 text-sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 animate-pulse-soft">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Looking up "{word}"...</p>
          </div>
        )}

        {/* Result */}
        {result && !isLoading && (
          <>
            <VocabResult
              word={word.trim().toLowerCase()}
              ipa={result.ipa}
              definitions={result.definitions}
              pos={result.pos}
              pinyin={result.pinyin}
              examples={result.examples}
              wordFamily={result.word_family}
              phrases={result.phrases}
              commonSynonym={result.common_synonym}
              commonAntonym={result.common_antonym}
              onSave={handleSave}
              isSaving={isSaving}
              onLookupWord={lookupWord}
              hideSaveButton={true}
            />
            
            {/* Refresh Button */}
            <div className="mt-4 flex justify-center animate-fade-in">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-muted-foreground hover:text-foreground"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh from Perplexity
                  </>
                )}
              </Button>
            </div>
            
            {/* Cache indicator */}
            {result.fromCache && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Loaded from cache
              </p>
            )}
          </>
        )}

        {/* Empty State with History */}
        {!result && !isLoading && !invalidWordData && (
          <div className="animate-fade-in">
            {searchHistory.length > 0 ? (
              <div className="bg-card border-2 border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Recent Searches</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchHistory(clearSearchHistory())}
                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((historyWord) => (
                    <Badge
                      key={historyWord}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors px-3 py-1.5 text-sm"
                      onClick={() => lookupWord(historyWord)}
                    >
                      {historyWord}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Enter a word above to get started</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fixed Save Button Bar */}
      {result && !isLoading && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity text-base font-medium"
            >
              <BookPlus className="w-5 h-5 mr-2" />
              {isSaving ? "Saving..." : "Save to My Deck"}
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Lookup;
