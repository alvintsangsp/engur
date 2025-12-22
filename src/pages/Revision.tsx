import { useState, useEffect, useCallback, useRef } from "react";
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
  const [againQueue, setAgainQueue] = useState<VocabCard[]>([]);
  const againQueueRef = useRef<VocabCard[]>([]);
  const seenCardIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchNextCard = useCallback(async () => {
    setIsLoading(true);
    try {
      // Note: Queue is no longer used for "Next" button
      // It's only kept for removing cards when "Done" is pressed

      // Build base query
      let countQuery = supabase
        .from("vocabulary")
        .select("*", { count: "exact", head: true })
        .lte("next_review_at", new Date().toISOString());
      
      // Exclude all seen cards in this session
      seenCardIdsRef.current.forEach((cardId) => {
        countQuery = countQuery.neq("id", cardId);
      });

      // Count remaining cards (excluding learned ones)
      // Try with is_learned filter first, fallback if column doesn't exist
      let count = 0;
      try {
        const countQueryWithFilter = countQuery.or("is_learned.is.null,is_learned.eq.false");
        const { count: countResult, error: countError } = await countQueryWithFilter;
        
        if (!countError) {
          count = countResult || 0;
        } else {
          // Column might not exist, try without filter
          const { count: fallbackCount } = await countQuery;
          count = fallbackCount || 0;
        }
      } catch {
        // If query fails, try without is_learned filter
        const { count: fallbackCount } = await countQuery;
        count = fallbackCount || 0;
      }

      setCardsRemaining(count + againQueueRef.current.length);

      // Fetch cards that are due for review and not learned
      // Fetch multiple to filter out seen ones client-side
      let data = null;
      let error = null;
      
      // Build data query - fetch more cards to filter out seen ones
      let dataQuery = supabase
        .from("vocabulary")
        .select("*")
        .lte("next_review_at", new Date().toISOString());
      
      // Exclude all seen cards in this session
      seenCardIdsRef.current.forEach((cardId) => {
        dataQuery = dataQuery.neq("id", cardId);
      });
      
      // Try with is_learned filter first - fetch up to 10 cards
      const result = await dataQuery
        .or("is_learned.is.null,is_learned.eq.false")
        .order("next_review_at", { ascending: true })
        .limit(10);
      
      data = result.data;
      error = result.error;
      
      // If error occurs (likely column doesn't exist), try without filter
      if (error) {
        let fallbackQuery = supabase
          .from("vocabulary")
          .select("*")
          .lte("next_review_at", new Date().toISOString());
        
        // Exclude all seen cards
        seenCardIdsRef.current.forEach((cardId) => {
          fallbackQuery = fallbackQuery.neq("id", cardId);
        });
        
        const fallbackResult = await fallbackQuery
          .order("next_review_at", { ascending: true })
          .limit(10);
        
        data = fallbackResult.data;
        error = fallbackResult.error;
      }
      
      // Filter out any seen cards (in case they slipped through) and pick first
      let cardData = null;
      if (data && Array.isArray(data) && data.length > 0) {
        const unseenCards = data.filter((card) => !seenCardIdsRef.current.has(card.id));
        cardData = unseenCards.length > 0 ? unseenCards[0] : null;
      } else if (data && !Array.isArray(data)) {
        // Single result case (shouldn't happen with limit 10, but handle it)
        if (!seenCardIdsRef.current.has(data.id)) {
          cardData = data;
        }
      }
      
      data = cardData;

      if (error) {
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

        const newCard = {
          id: data.id,
          word: data.word,
          definitions: data.definitions || [],
          pos: data.pos || [],
          pinyin: data.pinyin || [],
          examples,
          interval_days: data.interval_days || 1,
          ease_factor: data.ease_factor || 2.5,
        };
        
        setCurrentCard(newCard);
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

  const handleRate = async (rating: "again" | "good") => {
    if (!currentCard) return;

    setIsUpdating(true);

    try {
      // Add current card to seen set before fetching next
      // This ensures it won't appear again in this session
      seenCardIdsRef.current.add(currentCard.id);
      
      if (rating === "again") {
        // "Next" button: Skip to next card without any changes
        // Don't update database, don't add to queue
        // Card remains in database with original scheduling for future sessions
        // Card is already added to seen set above
        await fetchNextCard();
      } else if (rating === "good") {
        // "Done" button: Remove from again queue and move to next card
        // Remove from againQueue if present
        againQueueRef.current = againQueueRef.current.filter((card) => card.id !== currentCard.id);
        setAgainQueue(againQueueRef.current);

        // Fetch next card (current card already added to seen set above)
        await fetchNextCard();
      }
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
              All cards done for now
            </h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Great job! You've completed all your due cards. Add more words or check back later.
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
