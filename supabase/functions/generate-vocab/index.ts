import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, forceRefresh } = await req.json();
    
    if (!word || typeof word !== 'string') {
      console.error('Invalid word parameter:', word);
      return new Response(JSON.stringify({ error: 'Word is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedWord = word.trim().toLowerCase();

    // Initialize Supabase client for caching
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first (unless forceRefresh is true)
    if (!forceRefresh) {
      console.log(`Checking cache for word: ${normalizedWord}`);
      const { data: cachedData, error: cacheError } = await supabase
        .from('vocab_cache')
        .select('data')
        .eq('word', normalizedWord)
        .maybeSingle();

      if (!cacheError && cachedData) {
        console.log(`Cache hit for word: ${normalizedWord}`);
        return new Response(JSON.stringify({ ...cachedData.data, fromCache: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log(`Cache miss for word: ${normalizedWord}`);
    } else {
      console.log(`Force refresh requested for word: ${normalizedWord}`);
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Looking up word from Perplexity: ${normalizedWord}`);

const systemPrompt = `You are a dictionary API that returns ONLY raw JSON. Do not use markdown.

First, check if the input is a valid, correctly-spelled English word. If the input word is misspelled, nonsense, or not found in standard English dictionaries:
- Set "is_valid" to false
- Provide up to 3 likely correct English suggestions in "suggestions"
- Do NOT make up a meaning for an unknown or nonsense word

If the word IS valid:
- Set "is_valid" to true
- Provide the IPA pronunciation, Traditional Chinese definitions, parts of speech, pinyin, and word family
- Identify the word family for the input word with keys for available forms: 'verb', 'noun', 'adjective', 'adverb'. If a form doesn't exist, omit it.
- Return exactly one high-frequency English synonym and one high-frequency English antonym of the headword. Leave the field as empty string "" if no natural synonym/antonym exists.
- Return a list of 2-3 common phrasal verbs or idiomatic phrases containing the target word. Include a brief Traditional Chinese explanation for each. If no common phrases exist, return an empty array.

CRITICAL LANGUAGE REQUIREMENTS:
- ALL definitions MUST be written in Traditional Chinese (繁體中文) ONLY
- Do NOT use Simplified Chinese (简体中文)
- Do NOT use English, Hungarian, or ANY other language in the definitions field
- The "zh" field in examples must also be in Traditional Chinese
- The "meaning" field in phrases must also be in Traditional Chinese
- Only the "ipa", "pos", "word_family" values, "en" field, "phrase" field, "common_synonym", and "common_antonym" should contain English

The JSON schema must be:
{
  "is_valid": true,
  "ipa": "/ˈɛɡzæmpəl/",
  "definitions": ["例子，樣本", "示範，說明"],
  "pos": ["noun", "verb"],
  "pinyin": ["lì zi", "shì fàn"],
  "examples": [
    { "en": "This is an example.", "zh": "這是一個例子。" }
  ],
  "word_family": { "verb": "exemplify", "noun": "example", "adjective": "exemplary" },
  "common_synonym": "instance",
  "common_antonym": "",
  "phrases": [
    { "phrase": "for example", "meaning": "例如；舉例來說" },
    { "phrase": "set an example", "meaning": "樹立榜樣" }
  ]
}

OR for invalid/misspelled words:
{
  "is_valid": false,
  "suggestions": ["opportunity", "opportune", "opportunities"]
}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: normalizedWord }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch vocabulary data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Perplexity response:', JSON.stringify(data));
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in response');
      return new Response(JSON.stringify({ error: 'No content in response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to parse the JSON from the content
    let vocabData;
    try {
      // Remove any markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      vocabData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse vocabulary data:', parseError, 'Content:', content);
      return new Response(JSON.stringify({ error: 'Failed to parse vocabulary data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Parsed vocabulary data:', JSON.stringify(vocabData));

    // Validate definitions are in Traditional Chinese (filter out Latin characters)
    if (vocabData.is_valid && vocabData.definitions) {
      const latinPattern = /[a-zA-Z]/;
      vocabData.definitions = vocabData.definitions.map((def: string) => {
        // If definition contains Latin letters, it's likely wrong language
        if (latinPattern.test(def)) {
          return '（說明暫時無法取得）';
        }
        return def;
      });
    }

    // Cache the result if it's a valid word
    if (vocabData.is_valid) {
      console.log(`Caching result for word: ${normalizedWord}`);
      const { error: upsertError } = await supabase
        .from('vocab_cache')
        .upsert(
          { 
            word: normalizedWord, 
            data: vocabData, 
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'word' }
        );
      
      if (upsertError) {
        console.error('Failed to cache result:', upsertError);
        // Don't fail the request, just log the error
      }
    }

    return new Response(JSON.stringify({ ...vocabData, fromCache: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-vocab function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
