/**
 * LifeTracker User Guide: the single source of truth.
 *
 * The /guide page renders these sections, and the AI Assistant answers
 * "how does X work" questions from the same text (see appKnowledge.js), so
 * the two can never drift apart. When a feature changes, update it here.
 *
 * `icon` is a lucide-react icon name, resolved by the guide page.
 * `keywords` help the Assistant find the right section for a question.
 */
export const GUIDE_SECTIONS = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        category: 'Basics',
        icon: 'Compass',
        color: '#6366f1',
        summary: 'Your Home screen, the Vital Seven habits, moving around the app and installing it on your phone.',
        keywords: ['home', 'dashboard', 'start', 'new', 'sign up', 'navigation', 'install', 'pwa', 'iphone', 'android', 'dock', 'vital seven', 'vital', 'starter', 'default habits'],
        topics: [
            {
                title: 'The Home screen',
                content: "Home shows today's date, a Journal shortcut, Daily Status (habits completed and tasks remaining), a 7-day spending trend, and Quick Access cards for the AI Assistant, Todos, Split a Bill and the Daily Report.",
            },
            {
                title: 'The Vital Seven',
                content: "Every account comes with The Vital Seven, seven healthy daily habits: Wake up early, Drink a glass of water, Meditate 10 minutes, Walk 10,000 steps, Eat healthy, No screens before bed and Sleep on time. They sit in their own section at the top of the Habits page, with a ring showing how many you've done today. Tap the section header to fold it away. They can't be deleted, but you can pause any of them. Your Vital Seven progress is the only habit data your friends can see.",
            },
            {
                title: 'Moving around',
                content: 'On phones, the bottom bar has Home, Habits, Calories, Finances and Friends. Tap a tab, or drag the highlighted bubble across the bar. On larger screens the same pages are in the left sidebar. Your profile picture (top right) opens the profile menu.',
            },
            {
                title: 'Install on your phone',
                content: "iPhone: open LifeTracker in Safari, tap Share (the square with an up arrow) and choose 'Add to Home Screen'. Android: open it in Chrome, tap the ⋮ menu and choose 'Install app' or 'Add to Home screen'. It then opens full screen like a normal app.",
            },
        ],
    },
    {
        id: 'habits',
        title: 'Habits & Streaks',
        category: 'Growth',
        icon: 'Activity',
        color: '#10b981',
        summary: 'Create habits, check them off, keep streaks going, pause for holidays, and see your progress.',
        keywords: ['habit', 'habits', 'icon', 'emoji', 'streak', 'check', 'complete', 'missed', 'failed', 'pause', 'vacation', 'holiday', 'reorder', 'analytics', 'morning', 'evening', 'schedule', 'days', 'tracking start', 'accountability', 'partner'],
        topics: [
            {
                title: 'Adding a habit',
                content: "Tap + on the Habits page. Enter a name; an icon (emoji) is suggested from the name, and you can tap another one. Choose Morning or Evening and the days of the week it applies to (every day by default), optionally invite a friend as an accountability partner, and tap 'Start Habit'. If no icon fits the name, the AI picks one for you. Change a habit's icon later from its details. Your own habits are listed under 'Your habits' and are private to you.",
            },
            {
                title: 'Checking off a habit',
                content: 'Each habit card has a switch. Tap it to mark the habit done; tap again to undo. Drag the switch to the left to mark it missed. Tap a day in the week strip to view or fix an earlier day.',
            },
            {
                title: 'How streaks work',
                content: "A streak counts the scheduled days in a row you completed a habit. Days the habit isn't scheduled (for example weekends for a weekday habit) are skipped and don't break it. Paused days also keep the streak. Today doesn't count against you until it's over. A missed day ends the streak.",
            },
            {
                title: 'Pausing and vacation mode',
                content: "Tap the pause button at the top of the Habits page. Pause a single habit, or use Pause All from a start date for a holiday. Paused days don't break streaks. Resume from the same place when you're back.",
            },
            {
                title: 'Tracking start date',
                content: "Use 'Set a global tracking start date' on the Habits page to ignore everything before a date, which is useful when you restart. Streaks and success rates are calculated from that date.",
            },
            {
                title: 'Habit details',
                content: 'Tap a habit name to open its details: current streak, best streak, success rate and total check-ins, a month calendar you can mark, its time of day and icon, pausing, inviting an accountability partner, and deleting it (not available for the Vital Seven).',
            },
            {
                title: 'Analytics and reordering',
                content: "The chart button opens Analytics: weekly or monthly completion, with All, Morning or Evening habits, per-day rates and a per-habit breakdown. Use 'Reorder' above the list to drag habits into the order you want.",
            },
        ],
    },
    {
        id: 'calories',
        title: 'Calories, Water & Weight',
        category: 'Health',
        icon: 'Flame',
        color: '#f97316',
        summary: 'Log meals with several foods at once, track water, exercise and weight, and see your daily calorie balance.',
        keywords: ['calorie', 'calories', 'food', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'plate', 'macro', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'water', 'exercise', 'weight', 'bmr', 'deficit', 'surplus', 'scan', 'label', 'saved foods', 'nutrition'],
        topics: [
            {
                title: 'Logging a meal',
                content: "Tap + on the Calories page and choose the meal (Breakfast, Lunch, Snack or Dinner). Search for a food; you can type amounts like '2 roti' or '200 ml milk'. Pick it and set the portion. Tap 'Add another item' (or just search again) to put it on the meal's plate. When the plate is complete, tap 'Log to Lunch' (or your chosen meal) to save every item at once. Tap a plate item to change its portion, or × to remove it.",
            },
            {
                title: "When a food isn't found",
                content: "Under the search results you can always 'Look up online' (finds the nutrition values and saves the food to your database), 'Scan a label' (photograph a nutrition table to fill the values in) or 'Enter manually'.",
            },
            {
                title: "Today's Log",
                content: "Entries are grouped into Breakfast, Lunch, Snack, Dinner, Exercise and Water, each showing the item count, macros and total. Tap a group to expand it, tap a food to see its full nutrition card, and use 'Add to <meal>' to add more to that meal.",
            },
            {
                title: 'Saved Foods',
                content: 'The Saved Foods tab lists every food in your database. Tap one to see its nutrition, edit its values or serving unit, or add a portion straight to today.',
            },
            {
                title: 'Water, exercise and weight',
                content: "Water: tap 250 ml, 500 ml, 750 ml or 1 L, or 'Custom ml'; 'Undo' removes the last drink. Exercise and Weight are tabs in the + sheet: pick an activity and duration (calories are estimated from your weight) or record today's weight.",
            },
            {
                title: 'Calorie balance and BMR',
                content: 'Your daily burn is your BMR (calories your body uses at rest) plus exercise. BMR is calculated with the Mifflin-St Jeor formula from your weight, height, age and gender; tap BMR at the top to change these, set a custom BMR, or change your daily water goal. Net balance = intake minus burn: negative is a deficit, positive a surplus.',
            },
            {
                title: 'Weekly analytics and past days',
                content: "Tap Analytics for the last 7 days of calories, macros, water and weight. Use the date picker to view or add to any of the last 7 days.",
            },
        ],
    },
    {
        id: 'finances',
        title: 'Finances',
        category: 'Money',
        icon: 'Wallet',
        color: '#a855f7',
        summary: 'Log expenses, see how your month is going, set budgets, track subscriptions and keep a shopping list.',
        keywords: ['money', 'finance', 'finances', 'expense', 'spend', 'spending', 'income', 'budget', 'category', 'subcategory', 'recurring', 'subscription', 'shopping', 'burn rate', 'runway', 'safe to spend', 'outlier', 'privacy', 'hide', 'split with people'],
        topics: [
            {
                title: 'Logging an expense',
                content: "Tap + on the Finances page. Enter the amount and what it was for, pick a category (and optionally a subcategory), and choose the date. 'Split with people' records that you shared the cost. Tap an expense in the list to edit or delete it.",
            },
            {
                title: 'Overview card',
                content: "The Overview tab shows this month's spend, your daily burn rate (average spend per day), whether you're on track for the month, how much is safe to spend today, and fixed vs daily spending. The 'Ignoring >₹5k outliers' setting leaves big one-off purchases out of the forecast. Tap the eye icon to hide amounts when others can see your screen.",
            },
            {
                title: 'Categories and subcategories',
                content: "The Categories tab lists your spending categories with this month's spend against each budget. Tap one to add subcategories, see its analytics and history, or change its settings. Use 'Add Category' for a new one with a colour, icon and optional monthly budget.",
            },
            {
                title: 'Budgets and subscriptions',
                content: "The Budgets tab shows your total monthly budgets and fixed commitments (recurring payments like rent or Netflix), with the projected yearly cost. Create budgets linked to one or more categories with 'New Budget'.",
            },
            {
                title: 'Analytics',
                content: "The Analytics tab shows total and daily-average spend, top category, peak spend day, the spending trend, category distribution, weekday vs weekend rhythm and big purchases. Switch between Weekly and Monthly, and use 'Recurring: ON/OFF' to include or exclude fixed payments.",
            },
            {
                title: 'Shopping list',
                content: "The Shopping tab is a checklist of things to buy, each tagged with a category. Tap 'Got it' when you buy something to turn it into a logged expense.",
            },
        ],
    },
    {
        id: 'todos',
        title: 'Tasks',
        category: 'Productivity',
        icon: 'CheckSquare',
        color: '#38bdf8',
        summary: 'Add tasks with deadlines and difficulty, earn XP for finishing them, and keep overdue work visible.',
        keywords: ['task', 'tasks', 'todo', 'todos', 'deadline', 'due', 'overdue', 'difficulty', 'easy', 'medium', 'hard', 'xp', 'level', 'upcoming'],
        topics: [
            {
                title: 'Adding a task',
                content: "Type in 'Add a new task…' and tap Add. The sliders button sets a due date (Today, Tomorrow or a custom date) and difficulty: Easy (+10 XP), Medium (+25 XP) or Hard (+50 XP). The microphone lets you dictate a task.",
            },
            {
                title: 'Views and filters',
                content: 'Switch between Today, Upcoming, All and Done, and filter by difficulty. Overdue tasks are marked in red and counted at the top. Tick the box to complete a task; use the pencil to edit or the bin to delete.',
            },
            {
                title: 'Task levels',
                content: 'Completed tasks earn XP. Levels: Apprentice Focus (0 XP), Velocity Builder (100), Task Master (250), Productivity Champion (500) and Grandmaster of Flow (1,000). Tap the level pill at the top for your stats.',
            },
        ],
    },
    {
        id: 'journal',
        title: 'Journal',
        category: 'Mind',
        icon: 'BookOpen',
        color: '#ec4899',
        summary: 'A short daily reflection with a mood, kept private with end-to-end encryption.',
        keywords: ['journal', 'diary', 'mood', 'reflection', 'highlights', 'thoughts', 'tomorrow', 'encryption', 'e2ee', 'vault', 'pin', 'recovery key', 'private'],
        topics: [
            {
                title: 'Writing an entry',
                content: "Open Journal from Home. Pick a mood (Rough, Meh, Okay, Good or Amazing) and write under Highlights, Thoughts and Tomorrow. Entries save automatically; the microphone next to each box dictates text. Use the week strip to read earlier days.",
            },
            {
                title: 'Encryption and vault PIN',
                content: "Journal text is encrypted on your device before it's saved, so nobody else, including the server, can read it. Tap the shield icon (or Profile menu > Privacy & Encryption) to set a vault PIN so you can unlock your journal on other devices, and to export your recovery key. Keep the recovery key somewhere safe: without it or your PIN, encrypted entries can't be recovered.",
            },
        ],
    },
    {
        id: 'assistant',
        title: 'AI Assistant',
        category: 'Intelligence',
        icon: 'Sparkles',
        color: '#f59e0b',
        summary: 'Ask questions about your own data, get a copyable summary of your day, and ask how the app works.',
        keywords: ['assistant', 'ai', 'chat', 'ask', 'question', 'summary', 'summarize', 'day summary', '/day', 'voice', 'copy', 'insight'],
        topics: [
            {
                title: 'Asking about your data',
                content: "Ask in plain language, for example 'How much did I spend on food this month?', 'Which habits did I miss this week?' or 'What tasks are overdue?'. The Assistant reads your data to answer; it doesn't change or add anything. Tap 'sources analyzed' under an answer to see what it looked at. The microphone lets you speak your question.",
            },
            {
                title: 'Summarize my day',
                content: "Tap 'Summarize my day' (a starter card, or the chip above the input), or type /day. You get one block of text covering today's calories and meals, habits, completed tasks, spending and journal entry, with a Copy button so you can paste it into another chatbot. It's built on your phone and nothing is sent to the AI.",
            },
            {
                title: 'Questions about the app',
                content: "Ask things like 'How do streaks work?' or 'How do I log a meal?'. The Assistant answers from this User Guide.",
            },
        ],
    },
    {
        id: 'friends',
        title: 'Friends & Accountability',
        category: 'Community',
        icon: 'Users',
        color: '#ec4899',
        summary: 'Add friends by invite link, share habits as duo pacts, nudge each other and compare progress.',
        keywords: ['friend', 'friends', 'invite', 'username', 'link', 'request', 'duo', 'pact', 'nudge', 'leaderboard', 'ranks', 'compare', 'score', 'social'],
        topics: [
            {
                title: 'Your username and invite link',
                content: "Friends are added by invite only. Set your @username under Profile menu > Account Details, then use 'Invite Friends' or the share button on the Friends page to send your personal link. When someone opens it, they can send you a friend request.",
            },
            {
                title: 'Friend requests',
                content: "Incoming requests appear on the Friends tab, where you can accept or decline. Use ↻ to refresh. To remove a friend, open them and choose Remove.",
            },
            {
                title: 'Duo pacts and nudges',
                content: "A duo pact is a habit you and a friend both do. Create one by inviting a partner when adding a habit, or from a habit's details. Both of you see each other's status for today on the habit card, and you can send a nudge or a high-five. Manage pacts on the Duo tab.",
            },
            {
                title: 'Ranks and Compare',
                content: "Ranks is a leaderboard of you and your friends by habit score. Compare puts you head to head with one friend on consistency, streaks, check-ins, active habits and perfect days.",
            },
        ],
    },
    {
        id: 'habit-xp',
        title: 'Habit Score, XP & Levels',
        category: 'Growth',
        icon: 'Zap',
        color: '#eab308',
        summary: 'How your habit XP, level and rank title are calculated.',
        keywords: ['xp', 'level', 'score', 'rank', 'title', 'formula', 'points', 'perfect day', 'novice', 'master'],
        topics: [
            {
                title: 'Level formula',
                content: 'Level = floor(√(XP ÷ 35)) + 1. For example, 140 XP is level 3 and 315 XP is level 4.',
            },
            {
                title: 'Where XP comes from',
                content: 'Check-ins (+10 XP each, plus a smaller all-time weight), streak bonuses for keeping 3+ and 7+ day streaks, a consistency bonus (your completion rate × 1.5), +10 XP per active habit, and +20 XP for each perfect day where every scheduled habit was completed.',
            },
            {
                title: 'Rank titles',
                content: 'Level 1+: 🌱 Habit Novice · 4+: ⚡ Daily Apprentice · 8+: 🛡️ Discipline Knight · 13+: ⚔️ Consistency Champion · 20+: 🔮 Habit Master · 30+: 👑 Streak Warlord · 45+: 🌟 Mythic Titan.',
            },
        ],
    },
    {
        id: 'tools',
        title: 'Bill Splitter & Daily Report',
        category: 'Tools',
        icon: 'Split',
        color: '#06b6d4',
        summary: 'Split a bill with friends, and share a picture card of your day.',
        keywords: ['split', 'bill', 'receipt', 'gst', 'tax', 'tip', 'share', 'daily report', 'report card', 'feedback'],
        topics: [
            {
                title: 'Splitting a bill',
                content: "Open Split a Bill from Home. Take or upload a photo of the receipt and the items are read automatically, or tap 'Start Manual Split'. Add the people, assign each item (to one person or All), and add extra charges like GST or service charge, which are split in proportion to what each person ordered.",
            },
            {
                title: 'Daily Report card',
                content: "Tap Daily Report on Home to make a shareable image of your day. Choose a template (Minimal, Habits, Spending or Detailed) and a day; sensitive details like amounts are masked by default.",
            },
            {
                title: 'Sending feedback',
                content: 'Profile menu > Feedback lets you report a bug, request a feature or send general feedback, by typing or dictating. Your previous feedback is listed there too.',
            },
        ],
    },
    {
        id: 'settings',
        title: 'Themes, Account & Privacy',
        category: 'Settings',
        icon: 'Settings2',
        color: '#64748b',
        summary: 'Change the look of the app, manage your account, privacy and updates.',
        keywords: ['theme', 'themes', 'dark', 'light', 'zen', 'ocean', 'appearance', 'account', 'name', 'username', 'privacy', 'update', 'refresh', 'cache', 'offline', 'sign out', 'logout'],
        topics: [
            {
                title: 'Themes',
                content: "Profile menu > Appearance. Choose Light, Dark (default), Midnight Ocean or Ancient Zen. Ancient Zen is a calm light theme with its own paper texture, fonts and loading animation.",
            },
            {
                title: 'Account details',
                content: 'Profile menu > Account Details shows your name, @username and email. Edit your name or claim a username there.',
            },
            {
                title: 'Updates and offline use',
                content: "Your data is cached on the device so the app opens instantly, even with a weak connection. When a new version is available you're prompted to update; you can also tap Profile menu > Check for Updates.",
            },
            {
                title: 'Signing out',
                content: 'Profile menu > Sign Out.',
            },
        ],
    },
];

export const GUIDE_CATEGORIES = ['All', ...Array.from(new Set(GUIDE_SECTIONS.map((s) => s.category)))];

const sectionToMarkdown = (s) => [
    `## ${s.title}`,
    s.summary,
    ...s.topics.map((t) => `### ${t.title}\n${t.content}`),
].join('\n\n');

/** The whole guide as Markdown. */
export const guideToMarkdown = (sections = GUIDE_SECTIONS) => sections.map(sectionToMarkdown).join('\n\n---\n\n');

/**
 * The guide sections most relevant to a question or topic, as Markdown,
 * followed by a list of every section so the reader knows what else exists.
 * Keeps what the Assistant sends to the AI small.
 */
const STOP_WORDS = new Set(['how', 'what', 'where', 'when', 'why', 'who', 'does', 'did', 'can', 'the', 'and', 'for', 'with', 'into', 'from', 'that', 'this', 'there', 'work', 'works', 'use', 'using', 'app', 'lifetracker', 'you', 'your', 'are', 'get', 'set', 'add', 'make', 'want', 'need', 'about', 'show', 'tell']);

export const guideForTopic = (topic, maxSections = 3) => {
    const words = String(topic || '').toLowerCase().split(/[^a-z0-9/]+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    const scored = GUIDE_SECTIONS.map((s) => {
        const haystack = [s.title, s.summary, ...(s.keywords || []), ...s.topics.map((t) => `${t.title} ${t.content}`)].join(' ').toLowerCase();
        const keywordHits = (s.keywords || []).filter((k) => String(topic || '').toLowerCase().includes(k)).length;
        const wordHits = words.filter((w) => haystack.includes(w)).length;
        return { s, score: keywordHits * 3 + wordHits };
    }).filter((x) => x.score >= 2).sort((a, b) => b.score - a.score);

    // Keep sections that score close to the best match
    const best = scored[0]?.score || 0;
    const picked = scored.filter((x) => x.score >= best * 0.5).slice(0, maxSections).map((x) => x.s);
    const index = GUIDE_SECTIONS.map((s) => `- ${s.title}: ${s.summary}`).join('\n');
    if (!picked.length) {
        return `# LifeTracker User Guide (overview)\n\n${index}`;
    }
    return `# LifeTracker User Guide (relevant sections)\n\n${guideToMarkdown(picked)}\n\n---\n\n## All guide sections\n${index}`;
};
