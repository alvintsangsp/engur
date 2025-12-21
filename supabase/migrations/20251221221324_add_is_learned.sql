-- Add is_learned column to vocabulary table
ALTER TABLE public.vocabulary 
ADD COLUMN is_learned BOOLEAN DEFAULT false;

-- Update existing rows to set is_learned = false (explicit for clarity)
UPDATE public.vocabulary 
SET is_learned = false 
WHERE is_learned IS NULL;

-- Create index for efficient filtering
CREATE INDEX idx_vocabulary_is_learned ON public.vocabulary(is_learned);

