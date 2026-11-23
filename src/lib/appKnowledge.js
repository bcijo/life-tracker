/**
 * What the AI Assistant knows about the app itself.
 *
 * The content is the in-app User Guide (lib/userGuide.js), so the Assistant
 * and the /guide page always say the same thing. Edit the guide, not this file.
 */
import { guideToMarkdown, guideForTopic } from './userGuide';

const PREAMBLE = `You are the in-app assistant for LifeTracker, a personal app for habits, calories, money, tasks, a private journal and friends.
Answer questions about how the app works ONLY from the User Guide below. Give short, step-by-step answers that use the exact button and screen names from the guide.
If the guide doesn't cover something, say you're not sure rather than guessing, and suggest Profile menu > Feedback.`;

/** Full guide (kept for any caller that wants everything). */
export const APP_KNOWLEDGE_BASE = `${PREAMBLE}\n\n# LifeTracker User Guide\n\n${guideToMarkdown()}`;

/** Only the guide sections relevant to a topic, to keep AI requests small. */
export const appKnowledgeForTopic = (topic) => `${PREAMBLE}\n\n${guideForTopic(topic)}`;
