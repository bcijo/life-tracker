import { supabase } from './supabase';

// Groq LLM Integration
// Add VITE_GROQ_API_KEY to your .env file

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'openai/gpt-oss-120b';
const VISION_MODEL_NAME = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Database query tool registration
const SQL_TOOL = {
    type: "function",
    function: {
        name: "execute_read_only_query",
        description: "Executes a read-only SELECT PostgreSQL query against the user's database. Use this tool whenever the user asks for detailed metrics, statistics, average spending, weekly comparison, habit consistency, or journal mood trends. Tables available:\n" +
            "- transactions (id, user_id, amount, description, type: 'expense'|'income', category: 'food'|'transport'|'shopping'|'entertainment'|'bills'|'health'|'salary'|'other', date: timestamptz)\n" +
            "- habits (id, user_id, name, history: jsonb array of {date: 'YYYY-MM-DD', status: 'completed'|'failed'}, active_days: jsonb array of day indices, time_of_day: 'morning'|'evening')\n" +
            "- todos (id, user_id, text, completed: boolean, deadline: date)\n" +
            "- shopping_items (id, user_id, name, is_bought: boolean)\n" +
            "- journal_entries (id, user_id, date: date, how_was_today, on_your_mind, change_for_tomorrow, mood_score: integer 1-5)\n\n" +
            "CRITICAL: Always write queries filtering by user_id = auth.uid() or let RLS handle it (RLS is enabled). DO NOT attempt to INSERT/UPDATE/DELETE. Only SELECT statements are permitted.",
        parameters: {
            type: "object",
            properties: {
                query_text: {
                    type: "string",
                    description: "The SQL SELECT statement. Example: 'SELECT SUM(amount) FROM transactions WHERE type=\'expense\' AND date >= date_trunc(\'month\', CURRENT_DATE)'"
                }
            },
            required: ["query_text"]
        }
    }
};

async function runSQLTool(queryText) {
    console.log('[Groq SQL Agent] Executing Query:', queryText);
    try {
        const { data, error } = await supabase.rpc('execute_read_only_query', { query_text: queryText });
        if (error) {
            console.error('[Groq SQL Agent] Database Error:', error);
            return { error: error.message };
        }
        console.log('[Groq SQL Agent] Returned rows:', data ? data.length : 0);
        return data;
    } catch (err) {
        console.error('[Groq SQL Agent] JS Exception:', err);
        return { error: err.message };
    }
}

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

// 1. Agentic Chat with SQL execution capability
export async function askAI(userQuery, contextData, onQueryLogged = null) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY is missing');
    }

    const systemPrompt = `You are an advanced context-aware personal assistant with direct database query capabilities.
    You have direct, real-time access to the user's data (expenses, habits, tasks, journals) via PostgreSQL read-only SELECT tools.
    
    If the user asks questions requiring specific details, statistics, averages, streaks, weekly trends, or exact lists, you MUST call the execute_read_only_query tool immediately to query the database!
    
    Tables available:
    - transactions: id (uuid), user_id (uuid), amount (numeric), description (text), type (text: 'expense'|'income'), category (text: 'food'|'transport'|'shopping'|'entertainment'|'bills'|'health'|'salary'|'other'), date (timestamptz)
    - habits: id (uuid), user_id (uuid), name (text), history (jsonb: array of {date: 'YYYY-MM-DD', status: 'completed'|'failed'}), active_days (jsonb: e.g. [0,1,2,3,4,5,6]), time_of_day (text: 'morning'|'evening')
    - todos: id (uuid), user_id (uuid), text (text), completed (boolean), deadline (date)
    - shopping_items: id (uuid), user_id (uuid), name (text), is_bought (boolean)
    - journal_entries: id (uuid), user_id (uuid), date (date), mood_score (integer 1-5), how_was_today (text), on_your_mind (text), change_for_tomorrow (text)

    Static overview state: ${JSON.stringify(contextData, null, 2)}
    
    RULES:
    - Be extremely helpful, concise, and professional.
    - If you run database queries, summarize findings nicely. No tech jargon unless asked.
    - Never expose raw user IDs or raw JSON in final outputs.
    - If database returns no data or throws an error, try to correct your SQL syntax or handle it gracefully.`;

    let messages = [
        { role: 'user', content: userQuery }
    ];

    let executedQueries = [];

    // Up to 5 iterations for agentic reasoning
    for (let i = 0; i < 5; i++) {
        const payload = {
            model: MODEL_NAME,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: 0.4,
            max_tokens: 1000,
            tools: [SQL_TOOL],
            tool_choice: "auto"
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
            const errorText = await response.text();
            throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const responseMessage = data.choices[0]?.message;

        if (!responseMessage) {
            throw new Error("Empty response from Groq");
        }

        messages.push(responseMessage);

        const toolCalls = responseMessage.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            // No tools called, this is the final answer!
            return {
                content: responseMessage.content,
                queries: executedQueries
            };
        }

        // Execute tool calls
        for (const toolCall of toolCalls) {
            if (toolCall.function.name === 'execute_read_only_query') {
                const args = JSON.parse(toolCall.function.arguments);
                const queryText = args.query_text;

                executedQueries.push(queryText);
                if (onQueryLogged) {
                    onQueryLogged(queryText);
                }

                const queryResult = await runSQLTool(queryText);

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: 'execute_read_only_query',
                    content: JSON.stringify(queryResult)
                });
            }
        }
    }

    throw new Error("Groq SQL Agent reached maximum execution steps");
}

// 2. Weekly/Monthly Reports with Voluntary Commitments
export async function generateReport(type, periodStart, periodEnd, fullData) {
    const systemPrompt = `Generate a ${type} report (${periodStart} to ${periodEnd}).
    
    Data: ${JSON.stringify(fullData, null, 2)}
    
    Return STRICTLY valid JSON with no enclosing markdown ticks, containing exactly these keys:
    {
        "summary": "1 sentence max - key insight only",
        "highlights": ["3 SHORT bullet points - 5-8 words each"],
        "spendingAnalysis": "1 sentence - spending pattern",
        "habitAnalysis": "1 sentence - habit consistency",
        "journalInsight": "1 sentence - mood/mindset trend from journal entries",
        "suggestion": "1 actionable tip - under 10 words",
        "score": 85,
        "voluntaryCommitments": [
            {
                "id": "commit-unique-id",
                "type": "todo", 
                "title": "Clean room",
                "description": "Clean and declutter your study desk.",
                "actionData": {
                    "deadline": "YYYY-MM-DD"
                }
            },
            {
                "id": "commit-unique-id-2",
                "type": "habit",
                "title": "Morning Journaling",
                "description": "Write down 3 things you are grateful for each morning.",
                "actionData": {
                    "activeDays": [0,1,2,3,4,5,6],
                    "timeOfDay": "morning"
                }
            },
            {
                "id": "commit-unique-id-3",
                "type": "budget",
                "title": "Limit Dining Out",
                "description": "Keep restaurants and dining under ₹1,000 this week.",
                "actionData": {
                    "amount": 1000,
                    "categoryIds": ["food"]
                }
            }
        ]
    }
    
    You MUST generate exactly 2-3 highly personalized "voluntaryCommitments" based on the user's weaknesses or opportunities in their data.
    - If they spent too much, suggest a budget.
    - If they missed habits, suggest a habit.
    - If they have pending tasks or deadlines, suggest a todo.
    Make sure each commitment is realistic and highly action-oriented.
    Be extremely concise in summaries. No fluff.`;

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
