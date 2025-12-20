import { useState, useEffect, useCallback } from "react";
import { PartyPopper, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import Flashcard from "@/components/Flashcard";

interface Example {
  en: string;
  zh: string;
}

interface VocabCard {
  id: string;
  word: string;
  ipa?: string;
  definitions: string[];
  pos: string[];
  pinyin: string[];
  examples: Example[];
  interval_days: number;
  ease_factor: number;
}

const Revision = () => {
  const [currentCard, setCurrentCard] = useState<VocabCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [cardsRemaining, setCardsRemaining] = useState(0);
  const { toast } = useToast();

  const fetchNextCard = useCallback(async () => {
    setIsLoading(true);
    try {
      // Count remaining cards
      const { count } = await supabase
        .from("vocabulary")
        .select("*", { count: "exact", head: true })
        .lte("next_review_at", new Date().toISOString());

      setCardsRemaining(count || 0);

      // Fetch one card that's due for review
      const { data, error } = await supabase
        .from("vocabulary")
        .select("*")
        .lte("next_review_at", new Date().toISOString())
        .order("next_review_at", { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        // Parse examples from JSONB
        const rawExamples = data.examples;
        const examples: Example[] = Array.isArray(rawExamples)
          ? rawExamples.map((ex: unknown) => {
              const item = ex as { en?: string; zh?: string };
              return { en: item.en || "", zh: item.zh || "" };
            })
          : [];

        setCurrentCard({
          id: data.id,
          word: data.word,
          definitions: data.definitions || [],
          pos: data.pos || [],
          pinyin: data.pinyin || [],
          examples,
          interval_days: data.interval_days || 1,
          ease_factor: data.ease_factor || 2.5,
        });
      } else {
        setCurrentCard(null);
      }
    } catch (error) {
      console.error("Error fetching card:", error);
      toast({
        title: "Failed to load cards",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNextCard();
  }, [fetchNextCard]);

  const handleRate = async (rating: "again" | "good" | "easy") => {
    if (!currentCard) return;

    setIsUpdating(true);

    try {
      // SM-2 algorithm calculations
      let newInterval: number;
      let newEaseFactor = currentCard.ease_factor;

      switch (rating) {
        case "again":
          newInterval = 1;
          newEaseFactor = Math.max(1.3, currentCard.ease_factor - 0.2);
          break;
        case "good":
          newInterval = currentCard.interval_days * currentCard.ease_factor;
          break;
        case "easy":
          newInterval = currentCard.interval_days * currentCard.ease_factor * 1.5;
          newEaseFactor = Math.min(2.8, currentCard.ease_factor + 0.1);
          break;
      }

      // Calculate next review date
      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + Math.ceil(newInterval));

      // Update the card in the database
      const { error } = await supabase
        .from("vocabulary")
        .update({
          next_review_at: nextReviewAt.toISOString(),
          interval_days: newInterval,
          ease_factor: newEaseFactor,
        })
        .eq("id", currentCard.id);

      if (error) {
        throw error;
      }

      // Fetch next card
      await fetchNextCard();
    } catch (error) {
      console.error("Error updating card:", error);
      toast({
        title: "Failed to update progress",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft pb-20">
      <main className="w-full px-4 pt-6 pb-8 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            Review
          </h1>
          <p className="text-sm text-muted-foreground">
            {cardsRemaining > 0
              ? `${cardsRemaining} card${cardsRemaining !== 1 ? "s" : ""} due`
              : "Practice your vocabulary"}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 animate-pulse-soft">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading cards...</p>
          </div>
        )}

        {/* Flashcard */}
        {!isLoading && currentCard && (
          <div className="animate-scale-in">
            <Flashcard
              word={currentCard.word}
              ipa={currentCard.ipa}
              definitions={currentCard.definitions}
              pos={currentCard.pos}
              pinyin={currentCard.pinyin}
              examples={currentCard.examples}
              onRate={handleRate}
              isUpdating={isUpdating}
            />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !currentCard && (
          <div className="text-center py-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
              <PartyPopper className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              All caught up!
            </h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              You've reviewed all your due cards. Add more words or check back later.
            </p>
            <Button
              onClick={fetchNextCard}
              variant="outline"
              className="h-12 w-full gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check again
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Revision;
