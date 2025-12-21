import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import VocabResult from "@/components/VocabResult";

interface Example {
  en: string;
  zh: string;
}

interface VocabWord {
  id: string;
  word: string;
  definitions: string[];
  pos: string[];
  pinyin: string[];
  examples: Example[] | null;
}

const WordDetail = () => {
  const { word } = useParams<{ word: string }>();
  const navigate = useNavigate();
  const [vocabData, setVocabData] = useState<VocabWord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWord = async () => {
      if (!word) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const decodedWord = decodeURIComponent(word);
        const { data, error } = await supabase
          .from("vocabulary")
          .select("*")
          .eq("word", decodedWord.toLowerCase())
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Parse examples from JSONB
          const rawExamples = data.examples;
          const examples: Example[] = Array.isArray(rawExamples)
            ? rawExamples.map((ex: unknown) => {
                const item = ex as { en?: string; zh?: string };
                return { en: item.en || "", zh: item.zh || "" };
              })
            : [];

          setVocabData({
            id: data.id,
            word: data.word,
            definitions: data.definitions || [],
            pos: data.pos || [],
            pinyin: data.pinyin || [],
            examples,
          });
        } else {
          toast({
            title: "Word not found",
            description: "This word is not in your deck.",
            variant: "destructive",
          });
          navigate("/deck");
        }
      } catch (error) {
        console.error("Error fetching word:", error);
        toast({
          title: "Failed to load word",
          description: "Please try again later.",
          variant: "destructive",
        });
        navigate("/deck");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWord();
  }, [word, navigate, toast]);

  const handleSave = () => {
    // Word is already saved, do nothing
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft pb-20">
        <main className="w-full px-4 pt-6 pb-8 max-w-lg mx-auto">
          <div className="flex flex-col items-center justify-center py-16 animate-pulse-soft">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading word details...</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!vocabData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-soft pb-20">
      <main className="w-full px-4 pt-6 pb-8 max-w-lg mx-auto">
        {/* Back Button */}
        <div className="mb-4 animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/deck")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deck
          </Button>
        </div>

        {/* Word Details */}
        <VocabResult
          word={vocabData.word}
          definitions={vocabData.definitions}
          pos={vocabData.pos}
          pinyin={vocabData.pinyin}
          examples={vocabData.examples}
          onSave={handleSave}
          isSaving={false}
          hideSaveButton={true}
        />
      </main>

      <BottomNav />
    </div>
  );
};

export default WordDetail;

