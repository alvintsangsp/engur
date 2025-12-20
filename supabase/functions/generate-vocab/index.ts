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

    const systemPrompt = `You are a dictionary API that returns ONLY raw JSON. Do not use markdown. For the user's word, provide Traditional Chinese definitions, parts of speech, and pinyin.
The JSON schema must be:
{
  "definitions": ["定義一", "定義二"],
  "pos": ["noun", "verb"],
  "pinyin": ["pīn yīn yī", "pīn yīn èr"],
  "examples": [
    { "en": "This is an example.", "zh": "這是一個例子。" }
  ]
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
