// Groq LLM Integration
// Add VITE_GROQ_API_KEY to your .env file

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'openai/gpt-oss-120b';

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
        "suggestion": "1 actionable tip - under 10 words",
        "score": 85
    }
    
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

