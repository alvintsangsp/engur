import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Loader2, Trash2, BookOpen, Volume2, History, Undo2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useSpeech } from "@/hooks/use-speech";
import { useNavigate } from "react-router-dom";
import SwipeableCard from "@/components/SwipeableCard";

interface VocabWord {
  id: string;
  word: string;
  definitions: string[];
  pos: string[];
  created_at: string;
}

interface DeletedWord extends VocabWord {
  pinyin: string[];
  examples: unknown;
  next_review_at: string | null;
  interval_days: number | null;
  ease_factor: number | null;
}

const UNDO_TIMEOUT = 5000; // 5 seconds to undo

const Deck = () => {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeletedWord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast, dismiss } = useToast();
  const { speak, speakingWord } = useSpeech();
  const navigate = useNavigate();

  const fetchWords = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, word, definitions, pos, created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setWords(data || []);
    } catch (error) {
      console.error("Error fetching words:", error);
      toast({
        title: "Failed to load vocabulary",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  // Filter words based on search query
  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return words;
    const query = searchQuery.toLowerCase().trim();
    return words.filter((word) => 
      word.word.toLowerCase().includes(query) ||
      word.definitions.some(def => def.toLowerCase().includes(query)) ||
      word.pos.some(p => p.toLowerCase().includes(query))
    );
  }, [words, searchQuery]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const permanentlyDelete = useCallback(async (wordData: DeletedWord) => {
    try {
      const { error } = await supabase
        .from("vocabulary")
        .delete()
        .eq("id", wordData.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error permanently deleting word:", error);
    }
    setPendingDelete(null);
  }, []);

  const restoreWord = useCallback(async (wordData: DeletedWord) => {
    // Clear the timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    // Restore the word to the UI
    setWords((prev) => {
      const restored = [...prev, wordData].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return restored;
    });

    setPendingDelete(null);

    toast({
      title: "Word restored",
      description: `"${wordData.word}" has been restored to your deck.`,
    });
  }, [toast]);

  const handleDelete = async (id: string, word: string) => {
    setDeletingId(id);

    try {
      // First, fetch the full word data for potential restore
      const { data: fullWordData, error: fetchError } = await supabase
        .from("vocabulary")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const deletedWord = fullWordData as DeletedWord;

      // If there's a pending delete, permanently delete it first
      if (pendingDelete && undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        await permanentlyDelete(pendingDelete);
      }

      // Remove from UI immediately
      setWords((prev) => prev.filter((w) => w.id !== id));

      // Store for potential undo
      setPendingDelete(deletedWord);

      // Show toast with undo action
      const { id: toastId } = toast({
        title: "Word removed",
        description: `"${word}" has been removed.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => {
              dismiss(toastId);
              restoreWord(deletedWord);
            }}
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </Button>
        ),
        duration: UNDO_TIMEOUT,
      });

      // Set timeout to permanently delete
      undoTimeoutRef.current = setTimeout(() => {
        permanentlyDelete(deletedWord);
      }, UNDO_TIMEOUT);

    } catch (error) {
      console.error("Error deleting word:", error);
      toast({
        title: "Failed to delete word",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleReviewLater = async (id: string, word: string) => {
    setReviewingId(id);
    try {
      const { error } = await supabase
        .from("vocabulary")
        .update({ created_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      // Re-fetch to get updated order
      await fetchWords();
      toast({
        title: "Moved to later",
        description: `"${word}" will appear later in your deck.`,
      });
    } catch (error) {
      console.error("Error updating word:", error);
      toast({
        title: "Failed to update word",
        variant: "destructive",
      });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft pb-20">
      <main className="w-full px-4 pt-6 pb-8 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-4 animate-fade-in">
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            My Deck
          </h1>
          <p className="text-sm text-muted-foreground">
            {words.length} word{words.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {/* Search Input */}
        {!isLoading && words.length > 0 && (
          <div className="relative mb-4 animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search words, definitions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 bg-background/80 backdrop-blur-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 animate-pulse-soft">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading your deck...</p>
          </div>
        )}

        {/* Word List */}
        {!isLoading && filteredWords.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            {filteredWords.map((item, index) => (
              <div
                key={item.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <SwipeableCard
                  onSwipeLeft={() => handleDelete(item.id, item.word)}
                  onSwipeRight={() => handleReviewLater(item.id, item.word)}
                  leftLabel="Delete"
                  rightLabel="Move to end"
                  className="relative p-4 pr-12 border border-border shadow-card cursor-pointer"
                  onClick={() => navigate(`/word/${encodeURIComponent(item.word)}`)}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-11 w-11 p-0 flex-shrink-0 ${speakingWord === item.id ? "text-primary animate-pulse-soft" : "text-muted-foreground hover:text-primary"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(item.word, item.id);
                      }}
                      disabled={speakingWord === item.id}
                    >
                      <Volume2 className="w-6 h-6" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-display font-semibold text-foreground">
                        {item.word}
                      </h3>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.pos.map((p, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-primary/10 text-primary border-0 text-xs"
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                  {item.definitions[0] && (
                    <p className="font-chinese text-sm text-muted-foreground line-clamp-2 mb-3">
                      {item.definitions[0]}
                    </p>
                  )}
                  {/* Review Later button - top right */}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Review Later"
                    className={`absolute top-3 right-3 h-8 w-8 p-0 ${reviewingId === item.id ? "text-primary animate-pulse-soft" : "text-muted-foreground hover:text-primary"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReviewLater(item.id, item.word);
                    }}
                    disabled={reviewingId === item.id}
                  >
                    {reviewingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <History className="w-4 h-4" />
                    )}
                  </Button>
                  {/* Delete button - bottom right */}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete word"
                    className="absolute bottom-3 right-3 text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id, item.word);
                    }}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </SwipeableCard>
              </div>
            ))}
          </div>
        )}

        {/* No Results State */}
        {!isLoading && words.length > 0 && filteredWords.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              No matches found
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Try a different search term.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && words.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              No words yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Search for words and save them to build your vocabulary deck.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Deck;
