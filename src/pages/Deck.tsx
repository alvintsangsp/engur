import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, BookOpen, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

interface VocabWord {
  id: string;
  word: string;
  definitions: string[];
  pos: string[];
  created_at: string;
}

const Deck = () => {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const { toast } = useToast();

  const speakWord = useCallback((id: string, word: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.onstart = () => setSpeakingId(id);
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const fetchWords = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, word, definitions, pos, created_at")
        .order("created_at", { ascending: false });

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

  const handleDelete = async (id: string, word: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("vocabulary")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setWords((prev) => prev.filter((w) => w.id !== id));
      toast({
        title: "Word removed",
        description: `"${word}" has been removed from your deck.`,
      });
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

  return (
    <div className="min-h-screen bg-gradient-soft pb-20">
      <main className="w-full px-4 pt-6 pb-8 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            My Deck
          </h1>
          <p className="text-sm text-muted-foreground">
            {words.length} word{words.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 animate-pulse-soft">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading your deck...</p>
          </div>
        )}

        {/* Word List */}
        {!isLoading && words.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            {words.map((item, index) => (
              <Card
                key={item.id}
                className="p-4 border border-border shadow-card bg-card animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-display font-semibold text-foreground">
                        {item.word}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${speakingId === item.id ? "text-primary animate-pulse-soft" : "text-muted-foreground hover:text-primary"}`}
                        onClick={() => speakWord(item.id, item.word)}
                        disabled={speakingId === item.id}
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
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
                      <p className="font-chinese text-sm text-muted-foreground line-clamp-2">
                        {item.definitions[0]}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive h-10 w-10 p-0"
                    onClick={() => handleDelete(item.id, item.word)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </Card>
            ))}
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
