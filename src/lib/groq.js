// Groq LLM Integration
// Add VITE_GROQ_API_KEY to your .env file

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'openai/gpt-oss-120b';
const VISION_MODEL_NAME = 'meta-llama/llama-4-scout-17b-16e-instruct';

async function callGroq(messages, systemPrompt, jsonMode = false) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    console.log('[Groq] Checking API Key:', apiKey ? 'Found' : 'Missing', 'Length:', apiKey ? apiKey.length : 0);

    if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY is missing');
    }

    const payload = {
        model: MODEL_NAME,
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000,
    };

    if (jsonMode) {
        payload.response_format = { type: "json_object" };
    }

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content;
}

// 1. General Chat
export async function askAI(userQuery, contextData) {
    const systemPrompt = `You are a concise life assistant with access to user's financial and habit data.
    
    Context: ${JSON.stringify(contextData, null, 2)}
    
    RULES:
    - Answer in 1-2 sentences MAX. Be direct and to the point.
    - Use numbers and key facts only. No fluff.
    - If data is unavailable, say "I don't have that info" briefly.
    - Never expose raw JSON.`;

    const messages = [{ role: 'user', content: userQuery }];
    return await callGroq(messages, systemPrompt);
}

// 2. Weekly/Monthly Reports
export async function generateReport(type, periodStart, periodEnd, fullData) {
    const systemPrompt = `Generate a ${type} report (${periodStart} to ${periodEnd}).
    
    Data: ${JSON.stringify(fullData, null, 2)}
    
    Return STRICTLY valid JSON:
    {
        "summary": "1 sentence max - key insight only",
        "highlights": ["3 SHORT bullet points - 5-8 words each"],
        "spendingAnalysis": "1 sentence - spending pattern",
        "habitAnalysis": "1 sentence - habit consistency",
        "journalInsight": "1 sentence - mood/mindset trend from journal entries",
        "suggestion": "1 actionable tip - under 10 words",
        "score": 85
    }
    
    If journal entries exist, analyze mood patterns and key reflections.
    Be extremely concise. No fluff.`;

    const messages = [{ role: 'user', content: `Generate the ${type} report.` }];

    try {
        const jsonStr = await callGroq(messages, systemPrompt, true);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Failed to generate report:', e);
        return null;
    }
}

// 3. Bill Splitting — Direct Vision Parser (Groq Llama 4 Scout)
// Returns: { restaurant_name, items, charges, discounts }
export async function parseBillImage(base64ImageDataUrl) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('VITE_GROQ_API_KEY is missing');

    const payload = {
        model: VISION_MODEL_NAME,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `You are a restaurant receipt parser. Carefully read this receipt image and extract all data into structured JSON.

Return a JSON object with exactly these 4 keys: "restaurant_name", "items", "charges", "discounts".

0. "restaurant_name" — The name of the restaurant, cafe, shop or establishment printed on the receipt. If not visible, return null.

1. "items" — Individual food/drink ordered:
   - "name": item name (clean it up if needed)
   - "quantity": number of units (integer, default 1 if not shown)
   - "unit_price": price per single unit (number, in INR)
   - "total_price": quantity × unit_price (number, in INR)
   Example: 2x Butter Naan at ₹40 each → { "name": "Butter Naan", "quantity": 2, "unit_price": 40, "total_price": 80 }

2. "charges" — Additional charges added to the bill:
   - Include: service charge, service tax, GST, CGST, SGST, packing charge, delivery fee, etc.
   - "name": charge name
   - "amount": charge amount (number, in INR)
   - If the charge is a percentage and you can compute it, put the computed rupee amount.

3. "discounts" — Any discounts or deductions:
   - Include: discount, offer, coupon, promo, membership discount, etc.
   - "name": discount name
   - "amount": discount amount as a POSITIVE number (even though it reduces the bill)

Return only valid JSON, no markdown fences, no extra text. Example structure:
{
  "restaurant_name": "The Spice Garden",
  "items": [
    { "name": "Paneer Tikka", "quantity": 1, "unit_price": 280, "total_price": 280 },
    { "name": "Butter Naan", "quantity": 2, "unit_price": 40, "total_price": 80 }
  ],
  "charges": [
    { "name": "GST (5%)", "amount": 18 },
    { "name": "Service Charge", "amount": 36 }
  ],
  "discounts": [
    { "name": "10% Membership Discount", "amount": 36 }
  ]
}`
                    },
                    {
                        type: 'image_url',
                        image_url: { url: base64ImageDataUrl }
                    }
                ]
            }
        ],
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
    };

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq Vision API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const jsonStr = data.choices[0]?.message?.content;

    try {
        const parsed = JSON.parse(jsonStr);
        return {
            restaurant_name: parsed.restaurant_name || null,
            items: parsed.items || [],
            charges: parsed.charges || [],
            discounts: parsed.discounts || [],
        };
    } catch (e) {
        console.error('Failed to parse bill vision response:', e, jsonStr);
        return { restaurant_name: null, items: [], charges: [], discounts: [] };
    }
}
