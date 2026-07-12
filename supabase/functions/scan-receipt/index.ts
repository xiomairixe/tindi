// supabase/functions/scan-receipt/index.ts
// @deno-types are handled automatically once VS Code recognizes this as a Deno project.
// See .vscode/settings.json (deno.enablePaths) + supabase/functions/deno.json

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, mimeType } = await req.json()

    if (!imageBase64) {
      throw new Error('Walang image na natanggap')
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const prompt = `You are a receipt-scanning assistant for a Filipino sari-sari store expense tracker.
Analyze this receipt image and extract the data as STRICT JSON only, no markdown, no preamble.

Format:
{
  "store_name": string | null,
  "date": "YYYY-MM-DD" | null,
  "items": [
    { "name": string, "quantity": number, "unit_price": number, "total_price": number }
  ],
  "total_amount": number,
  "suggested_category": one of ["Supplies", "Utilities", "Rent", "Salaries", "Maintenance", "Transport", "Other"],
  "confidence": "high" | "medium" | "low"
}

Rules:
- If a field is unreadable, use null (not a guess).
- quantity defaults to 1 if not shown.
- total_amount should match the receipt's grand total if visible; otherwise sum of items.
- suggested_category should be your best guess based on the store name/items.
- Return ONLY the JSON object, nothing else.`

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      console.error('Gemini API error:', errText)
      throw new Error('Nabigo ang pag-scan ng resibo. Subukan ulit.')
    }

    const geminiData = await geminiResponse.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      throw new Error('Walang laman ang response mula sa AI')
    }

    let parsed
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (_parseErr) {
      console.error('Failed to parse Gemini response:', rawText)
      throw new Error('Hindi mabasa ang resulta ng pag-scan. Subukan ulit o mag-manual entry.')
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error occurred'
    console.error('scan-receipt error:', error)
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})