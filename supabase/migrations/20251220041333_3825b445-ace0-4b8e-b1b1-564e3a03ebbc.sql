-- Create vocabulary table for storing words and their details
CREATE TABLE public.vocabulary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  definitions TEXT[] NOT NULL DEFAULT '{}',
  pos TEXT[] NOT NULL DEFAULT '{}',
  pinyin TEXT[] NOT NULL DEFAULT '{}',
  examples JSONB DEFAULT '[]'::jsonb,
  next_review_at TIMESTAMPTZ DEFAULT now(),
  interval_days FLOAT DEFAULT 1.0,
  ease_factor FLOAT DEFAULT 2.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (no auth required for this app)
CREATE POLICY "Allow public read access" 
ON public.vocabulary 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.vocabulary 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.vocabulary 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access" 
ON public.vocabulary 
FOR DELETE 
USING (true);