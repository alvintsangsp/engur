import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { word } = await req.json();
    
    if (!word || typeof word !== 'string') {
      console.error('Invalid word parameter:', word);
      return new Response(JSON.stringify({ error: 'Word is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Looking up word: ${word}`);

const systemPrompt = `You are a dictionary API that returns ONLY raw JSON. Do not use markdown.

First, check if the input is a valid, correctly-spelled English word. If the input word is misspelled, nonsense, or not found in standard English dictionaries:
- Set "is_valid" to false
- Provide up to 3 likely correct English suggestions in "suggestions"
- Do NOT make up a meaning for an unknown or nonsense word

If the word IS valid:
- Set "is_valid" to true
- Provide the IPA pronunciation, Traditional Chinese definitions, parts of speech, pinyin, and word family
- Identify the word family for the input word with keys for available forms: 'verb', 'noun', 'adjective', 'adverb'. If a form doesn't exist, omit it.

CRITICAL LANGUAGE REQUIREMENTS:
- ALL definitions MUST be written in Traditional Chinese (繁體中文) ONLY
- Do NOT use Simplified Chinese (简体中文)
- Do NOT use English, Hungarian, or ANY other language in the definitions field
- The "zh" field in examples must also be in Traditional Chinese
- Only the "ipa", "pos", "word_family" values, and "en" field should contain English

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
  "word_family": { "verb": "exemplify", "noun": "example", "adjective": "exemplary" }
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
          { role: 'user', content: word }
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

    return new Response(JSON.stringify(vocabData), {
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
