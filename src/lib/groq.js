import { supabase } from './supabase';
import { APP_KNOWLEDGE_BASE } from './appKnowledge';

// Groq LLM Integration
// Add VITE_GROQ_API_KEY to your .env file

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';
const VISION_MODEL_NAME = 'qwen/qwen3.6-27b';

/**
 * Converts a raw SQL query into a human-understandable activity phrase
 * so database schema and raw SQL aren't exposed in UI.
 */
export function getHumanReadableQueryDescription(queryText) {
    if (!queryText) return "Analyzing your records...";
    if (typeof queryText === 'object' && queryText.label) return queryText.label;
    
    const q = String(queryText).toLowerCase();

    if (q.includes('recurring_expenses')) {
        return "Checking your active recurring & fixed expenses...";
    }
    if (q.includes('transactions')) {
        if (q.includes('group by') && (q.includes('day') || q.includes('date') || q.includes('date_trunc'))) {
            return "Calculating daily spending breakdown for this month...";
        }
        if (q.includes('category') || q.includes('group by category')) {
            return "Analyzing spending by category...";
        }
        if (q.includes('sum(') || q.includes('avg(')) {
            return "Computing financial totals and spending averages...";
        }
        if (q.includes('order by') && q.includes('desc')) {
            return "Scanning your recent transaction history...";
        }
        return "Querying transaction and expense history...";
    }
    if (q.includes('habits')) {
        if (q.includes('history')) {
            return "Checking habit completion history & streaks...";
        }
        return "Reviewing active habits & schedule...";
    }
    if (q.includes('todos')) {
        if (q.includes('completed = false') || q.includes('completed is false') || q.includes('not completed')) {
            return "Looking up pending tasks & deadlines...";
        }
        return "Scanning your tasks & to-do items...";
    }
    if (q.includes('journal_entries')) {
        if (q.includes('mood_score')) {
            return "Analyzing mood trends & reflections...";
        }
        return "Reviewing recent journal reflections...";
    }
    if (q.includes('bank_accounts') || q.includes('bank_balance')) {
        return "Checking bank account balances...";
    }
    if (q.includes('expense_cards') || q.includes('budgets') || q.includes('expense_subcategories')) {
        return "Checking budget targets & expense cards...";
    }
    if (q.includes('shopping_items')) {
        return "Checking your shopping list items...";
    }
    return "Fetching your personal data...";
}

// Compact tool definition to conserve tokens
const SQL_TOOL = {
    type: "function",
    function: {
        name: "execute_read_only_query",
        description: "PostgreSQL SELECT query tool. Tables: transactions (id, amount, description, type, category, date), recurring_expenses (id, name, amount, category, day_of_month, is_active), habits (id, name, history, active_days), todos (id, text, completed, deadline), journal_entries (id, date, mood_score, how_was_today), bank_accounts (id, name, current_balance), expense_cards (id, name, budget_amount). Keep queries focused with aggregations (SUM, COUNT, GROUP BY) or LIMIT 10.",
        parameters: {
            type: "object",
            properties: {
                query_text: {
                    type: "string",
                    description: "PostgreSQL SELECT query string"
                }
            },
            required: ["query_text"]
        }
    }
};

/**
 * Compacts database result to stay well within TPM limits
 */
function compactToolResult(data) {
    if (!data) return "[]";
    if (typeof data === 'string') return data.slice(0, 1200);
    if (Array.isArray(data)) {
        const simplified = data.slice(0, 12).map(item => {
            if (item && item.history && Array.isArray(item.history)) {
                return { ...item, history: `[${item.history.length} habit logs]` };
            }
            return item;
        });
        const str = JSON.stringify(simplified);
        return str.length > 1500 ? str.slice(0, 1500) + '...]' : str;
    }
    const str = JSON.stringify(data);
    return str.length > 1500 ? str.slice(0, 1500) + '...' : str;
}

async function fetchGroqWithRetry(payload, apiKey, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 429) {
                console.warn(`[Groq Rate Limit 429] Waiting 2s before retry (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API error ${response.status}: ${errorText}`);
            }

            return await response.json();
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    }

    throw lastError || new Error("Failed to communicate with Groq");
}

async function runSQLTool(queryText) {
    console.log('[Groq SQL Agent] Executing Query:', queryText);
    try {
        const { data, error } = await supabase.rpc('execute_read_only_query', { query_text: queryText });
        if (!error && data !== undefined && data !== null) {
            return data;
        }

        if (error) {
            console.warn('[Groq SQL Agent] RPC note:', error.message, 'Trying direct fallback...');
        }

        // Fallback: Query target table directly if RPC is not installed or has regex block
        const q = String(queryText).toLowerCase();
        let targetTable = null;
        if (q.includes('from transactions')) targetTable = 'transactions';
        else if (q.includes('from recurring_expenses')) targetTable = 'recurring_expenses';
        else if (q.includes('from habits')) targetTable = 'habits';
        else if (q.includes('from todos')) targetTable = 'todos';
        else if (q.includes('from journal_entries')) targetTable = 'journal_entries';
        else if (q.includes('from shopping_items')) targetTable = 'shopping_items';
        else if (q.includes('from bank_accounts')) targetTable = 'bank_accounts';
        else if (q.includes('from expense_cards')) targetTable = 'expense_cards';

        if (targetTable) {
            const { data: fallbackData, error: fallbackError } = await supabase
                .from(targetTable)
                .select('*')
                .limit(100);

            if (!fallbackError && fallbackData) {
                return fallbackData;
            }
        }

        return { error: error?.message || "Query execution failed." };
    } catch (err) {
        console.error('[Groq SQL Agent] Exception:', err);
        return { error: err.message };
    }
}

async function callGroq(messages, systemPrompt, jsonMode = false) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY is missing');
    }

    const payload = {
        model: FALLBACK_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages
        ],
        temperature: 0.4,
        max_tokens: 1000,
    };

    if (jsonMode) {
        payload.response_format = { type: "json_object" };
    }

    const data = await fetchGroqWithRetry(payload, apiKey, 2);
    return data.choices[0]?.message?.content;
}

// 1. Agentic Chat with SQL execution capability
export async function askAI(userQuery, contextData, onQueryLogged = null, history = []) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY is missing');
    }

    const todayDate = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are LifeTracker's intelligent, concise personal assistant and app guide expert. Today is ${todayDate}.

=== APP KNOWLEDGE BASE & USER GUIDE ===
${APP_KNOWLEDGE_BASE}

=== CORE CAPABILITIES & INSTRUCTIONS ===
1. APP HOW-TOS & USER GUIDE:
   - When the user asks about ANY feature in LifeTracker (e.g. how Runway & Burn rate works, what "Ignore Outliers" does, how Habit XP and Levels work, how to install as iPhone PWA, how to split a bill, how to use expense cards, reorder habits, or convert shopping items into logged expenses), refer to the App Knowledge Base above and provide clear, concise, step-by-step guidance.
2. PERSONAL DATA & SQL QUERIES:
   - Use the PostgreSQL SELECT tool execute_read_only_query when the user asks for specific personal metrics, history, or breakdowns (max 1-2 queries per turn).
   - Table rules:
     * transactions (id, amount, description, type, category, date) -> past logged transactions (column is 'date', not 'transaction_date').
     * recurring_expenses (id, name, amount, category, day_of_month, is_active) -> active fixed/recurring expenses configuration (ALWAYS check this table when asked about fixed spending, recurring bills, or subscriptions).
     * todos (id, text, completed, deadline) -> table is 'todos'.
     * habits (id, name, history, active_days) -> table is 'habits'.
     * journal_entries, bank_accounts, expense_cards, shopping_items.
3. PERSONAL DATA CONTEXT:
   - Summary: ${JSON.stringify(contextData)}
4. FORMATTING:
   - Format answers cleanly with Markdown (bold key terms, bullet points, clean tables when appropriate). Keep answers concise and direct.`;

    // Filter valid conversational history (last 4 turns, skip failed errors)
    const validHistory = Array.isArray(history)
        ? history
            .filter(m => m && m.content && !m.content.includes("I ran into an issue") && !m.isError)
            .slice(-4)
            .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
        : [];

    let messages = [
        ...validHistory,
        { role: 'user', content: userQuery }
    ];

    let executedQueries = [];

    // Up to 3 iterations for agentic reasoning
    for (let i = 0; i < 3; i++) {
        let data;
        try {
            data = await fetchGroqWithRetry({
                model: PRIMARY_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.3,
                max_tokens: 1000,
                tools: [SQL_TOOL],
                tool_choice: "auto"
            }, apiKey, 1);
        } catch (primaryErr) {
            console.warn('[Groq Agent] Primary model failed, trying fallback model...', primaryErr.message);
            data = await fetchGroqWithRetry({
                model: FALLBACK_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.3,
                max_tokens: 1000,
                tools: [SQL_TOOL],
                tool_choice: "auto"
            }, apiKey, 2);
        }

        const responseMessage = data?.choices?.[0]?.message;
        if (!responseMessage) {
            throw new Error("Empty response from AI assistant");
        }

        messages.push(responseMessage);

        const toolCalls = responseMessage.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            // Final response reached
            return {
                content: responseMessage.content || "I have analyzed your data and prepared the summary above.",
                queries: executedQueries
            };
        }

        // Execute tool calls
        for (const toolCall of toolCalls) {
            if (toolCall.function.name === 'execute_read_only_query') {
                let args = {};
                try {
                    args = typeof toolCall.function.arguments === 'string' 
                        ? JSON.parse(toolCall.function.arguments) 
                        : toolCall.function.arguments;
                } catch {
                    args = { query_text: toolCall.function.arguments };
                }
                const queryText = args.query_text || "";
                const stepLabel = getHumanReadableQueryDescription(queryText);

                executedQueries.push({
                    query: queryText,
                    label: stepLabel
                });

                if (onQueryLogged) {
                    onQueryLogged({
                        query: queryText,
                        label: stepLabel
                    });
                }

                const queryResult = await runSQLTool(queryText);
                const compacted = compactToolResult(queryResult);

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: 'execute_read_only_query',
                    content: compacted
                });
            }
        }
    }

    // If iterations reached limit, perform final direct synthesis
    const finalAnswer = await callGroq(messages, systemPrompt);
    return {
        content: finalAnswer || "Here is the summary based on your recent activity.",
        queries: executedQueries
    };
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

// 3. Bill Splitting — Direct Vision Parser (Groq Qwen 3.6 27B)
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

// 4. Speech-to-Text Transcription via Groq Whisper Large V3
const AUDIO_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3';

/**
 * Transcribes an audio blob using Groq's whisper-large-v3 model.
 * @param {Blob} audioBlob - Audio recording blob (webm, mp4, wav, ogg, etc.)
 * @param {string} [promptHint] - Optional context to guide vocabulary and punctuation
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeAudio(audioBlob, promptHint = '') {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY is missing');
    }

    const mimeType = audioBlob.type || 'audio/webm';
    let ext = 'webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) ext = 'm4a';
    else if (mimeType.includes('ogg')) ext = 'ogg';
    else if (mimeType.includes('wav')) ext = 'wav';
    else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) ext = 'mp3';

    const formData = new FormData();
    formData.append('file', audioBlob, `recording.${ext}`);
    formData.append('model', WHISPER_MODEL);
    formData.append('response_format', 'json');
    formData.append('temperature', '0.0');
    if (promptHint) {
        formData.append('prompt', promptHint);
    }

    const response = await fetch(AUDIO_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        body: formData
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('[Groq Whisper Error]:', response.status, errText);
        throw new Error(`Whisper transcription failed: ${response.status}`);
    }

    const data = await response.json();
    return data.text ? data.text.trim() : '';
}

/**
 * AI Habit Match Analysis: Compares habits of two users to discover shared habits,
 * synergized habits, and mutual challenge opportunities.
 */
export async function analyzeHabitMatch(myHabits, friendHabits, myName = 'You', friendName = 'Friend') {
    const myHabitNames = (myHabits || []).map(h => ({ id: h.id, name: h.name, active_days: h.active_days }));
    const friendHabitNames = (friendHabits || []).map(h => ({ id: h.id, name: h.name, active_days: h.active_days }));

    const systemPrompt = `You are a concise AI habit matcher for LifeTracker.
Analyze habits of: ${myName} and ${friendName}.
Tasks:
1. Suggest ONE clean, realistic mutual habit challenge neither tracks that fits their shared focus.
2. Match similar habits they already track.

Return ONLY a JSON object with this exact minimal structure:
{
  "compatibilityScore": 85,
  "mutualSynergyHabit": {
    "title": "Morning 15m Walk",
    "category": "Health",
    "frequency": "Daily"
  },
  "matches": [
    {
      "habitTitle": "Workout",
      "category": "Fitness",
      "myHabitId": "optional-id-or-null",
      "friendHabitId": "optional-id-or-null",
      "status": "both_tracking"
    }
  ]
}

Status must be: "both_tracking" | "you_need_to_add" | "friend_needs_to_add". Keep all titles concise (2-4 words max).`;

    const userMessage = `${myName}'s habits: ${JSON.stringify(myHabitNames)}\n${friendName}'s habits: ${JSON.stringify(friendHabitNames)}`;

    try {
        const response = await callGroq([
            { role: 'user', content: userMessage }
        ], systemPrompt, true);

        if (!response) return null;
        return JSON.parse(response);
    } catch (e) {
        console.error('Error analyzing habit match:', e);
        return null;
    }
}


