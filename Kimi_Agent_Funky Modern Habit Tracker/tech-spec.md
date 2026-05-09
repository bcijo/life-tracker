# Tech Spec — Aura Habit

## Dependencies
- `framer-motion` — Core animation library for page transitions, spring toggle drag, progress ring drawing, ambient blob
- `lucide-react` — Icon library (BarChart, Home, Settings, Droplets, BookOpen, Flame, ChevronDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown)
- `clsx` — Conditional className utility
- `tailwind-merge` — Merge Tailwind classes without conflicts

## Component Inventory

### Layout
- **MobileContainer** — Max-width 430px, centered on desktop, contains ambient blob behind content
- **BottomNav** — Fixed bottom bar with 3 icons, active state styling, backdrop blur

### Reusable Components
- **AuraSpringToggle** — `framer-motion` drag-enabled toggle with snap logic, spring physics, two visual states
- **CircularProgressRing** — SVG circle with animated stroke-dashoffset, supports full ring (Aura Score) and donut (Completion Rate)
- **HabitCard** — Card wrapper with shadow, contains habit name, timestamp, and AuraSpringToggle
- **WeeklyBarChart** — 7-day bar chart with current day highlighting, glassmorphic avg badge overlay
- **AnalyticRow** — Labeled row with value, used in Insights breakdown list

### Page Sections
- **Header** — Greeting + profile avatar
- **AuraScoreSection** — Centered circular progress ring with score label and metadata
- **TodaysHabitsSection** — Vertical stack of HabitCard components
- **WeeklyPerformanceSection** — Card with bar chart and floating avg badge
- **HabitAnalyticsSection** — Expandable analytics breakdown with rows and donut chart

## Animation Implementation Table

| Animation | Library | Approach | Complexity |
|-----------|---------|----------|------------|
| Spring toggle drag + snap | framer-motion | `drag="x"` with constraints, `onDragEnd` snap logic, spring transition | **High** |
| Circular progress ring draw | framer-motion | Animate `stroke-dashoffset` from circumference to target, rotate -90deg | **Medium** |
| Ambient blob float | framer-motion | `animate` with keyframes array, infinite repeat, easeInOut | **Low** |
| Page transition (slide/fade) | framer-motion | `AnimatePresence` + `motion.div` with y/opacity variants | **Medium** |
| Tap scale depression | framer-motion | `whileTap={{ scale: 0.98 }}` | **Low** |
| Toggle track color change | framer-motion | `animate` backgroundColor based on completion state | **Low** |
| Knob slide + spring | framer-motion | `animate={{ x }}` with spring transition type | **Low** |
| Bar chart fill animation | framer-motion | `initial={{ scaleY: 0 }}` to `animate={{ scaleY: 1 }}`, origin bottom | **Low** |
| Completion rate donut | framer-motion | Same as circular progress ring, smaller size variant | **Low** |

## State & Logic Plan

### Global State (React Context or useState at app level)
- `currentPage: 'dashboard' | 'insights'` — Controls which page is rendered
- `habits: Habit[]` — Array of habit objects with completion status
- `auraScore: number` — Calculated from completed habits / total habits

### Habit Data Model
```typescript
interface Habit {
  id: string;
  name: string;
  time: string;
  completed: boolean;
  streak: number;
  weekData: boolean[]; // 7 days, true = completed
}
```

### Aura Score Calculation
- Derived state: `(completedHabits.length / habits.length) * 100`
- Updates whenever a habit toggle changes

### Toggle Interaction Logic
- `onDragEnd`: Check `info.offset.x`
- If `> 15px` → mark complete, animate knob to `x: 24`, track turns green
- If `<= 15px` → mark incomplete, animate knob to `x: 0`, track turns white
- Spring transition: `{ type: "spring", stiffness: 500, damping: 30 }`

### Page Transition
- `AnimatePresence` wraps page content
- Exit: `opacity: 0.5, y: 20`
- Enter: `opacity: 1, y: 0`
- Transition: `{ duration: 0.3, ease: "easeInOut" }`

## Other Key Decisions

### Mobile-First Architecture
- Container max-width 430px centered with outer viewport showing `bg-base`
- All measurements (px/rem) based on mobile viewport
- Touch-friendly tap targets (min 44px)

### Color System
- All colors defined as Tailwind arbitrary values matching design tokens exactly
- No custom CSS variables needed — Tailwind classes handle everything

### No Charts Library
- Weekly bar chart built manually with divs + framer-motion
- Avoids recharts dependency for a simple 7-bar visualization
- More control over animation and styling

### Font Setup
- Use system font stack as fallback if Geist not available
- Monospace for all numeric displays (score, percentages, dates)
