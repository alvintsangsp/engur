-- Add a cache table for storing Perplexity API responses
CREATE TABLE public.vocab_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vocab_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (cache is shared)
CREATE POLICY "Allow public read access" 
ON public.vocab_cache 
FOR SELECT 
USING (true);

-- Allow public insert access
CREATE POLICY "Allow public insert access" 
ON public.vocab_cache 
FOR INSERT 
WITH CHECK (true);

-- Allow public update access
CREATE POLICY "Allow public update access" 
ON public.vocab_cache 
FOR UPDATE 
USING (true);

-- Create index for fast word lookups
CREATE INDEX idx_vocab_cache_word ON public.vocab_cache(word);