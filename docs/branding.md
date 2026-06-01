# FlowChat — Brand & Design System

---

## Brand Identity

**Product name:** FlowChat  
**Tagline:** *Every conversation in flow.*  
**Voice:** Confident, warm, efficient. Technical enough to be trusted. Human enough to be loved.

---

## Logo System

Four variants — all defined in `logo.svg` and `icon.svg` alongside this file.

| Variant | Use case |
|---|---|
| Wordmark (horizontal) | App header, marketing pages, email headers |
| Icon only | Favicons, app icons, notification badges, loading spinners |
| Icon + wordmark (stacked) | Onboarding, splash screens |
| Monochrome (white) | Dark backgrounds, footer, print |

### Clear Space
Minimum clear space = **1× the icon height** on all four sides.

### Minimum Sizes
| Context | Minimum width |
|---|---|
| Digital icon only | 16 px |
| Digital wordmark | 80 px |
| Print | 25 mm |

---

## Color Palette

### Primary Brand Colors

```
--fc-primary-50:   #EEF2FF   /* Lightest tint — hover surfaces */
--fc-primary-100:  #E0E7FF   /* Light tint — selected rows */
--fc-primary-200:  #C7D2FE   /* Border accent */
--fc-primary-300:  #A5B4FC   /* Disabled state */
--fc-primary-400:  #818CF8   /* Hover on primary button */
--fc-primary-500:  #6366F1   /* PRIMARY BRAND — Indigo */
--fc-primary-600:  #4F46E5   /* Pressed / active */
--fc-primary-700:  #4338CA   /* Dark primary */
--fc-primary-800:  #3730A3   /* Very dark — text on light bg */
--fc-primary-900:  #312E81   /* Deepest — hero gradients */
```

**Primary:** `#6366F1` — Indigo 500 (Tailwind `indigo-500`)

Indigo was chosen because it sits between calming blue (trust) and energetic violet (creativity) — perfect for a communication platform.

---

### Secondary / Accent Colors

```
--fc-accent-50:    #F0FDFA
--fc-accent-100:   #CCFBF1
--fc-accent-200:   #99F6E4
--fc-accent-300:   #5EEAD4
--fc-accent-400:   #2DD4BF
--fc-accent-500:   #14B8A6   /* ACCENT — Teal */
--fc-accent-600:   #0D9488
--fc-accent-700:   #0F766E
--fc-accent-800:   #115E59
--fc-accent-900:   #134E4A
```

**Accent:** `#14B8A6` — Teal 500 (Tailwind `teal-500`)  
Used for: online status dots, success states, CSAT positive, AI suggestion highlights.

---

### Semantic Colors

```
/* Success */
--fc-success-light:  #DCFCE7
--fc-success:        #22C55E   /* green-500 */
--fc-success-dark:   #16A34A

/* Warning */
--fc-warning-light:  #FEF9C3
--fc-warning:        #EAB308   /* yellow-500 */
--fc-warning-dark:   #CA8A04

/* Danger / Error */
--fc-danger-light:   #FEE2E2
--fc-danger:         #EF4444   /* red-500 */
--fc-danger-dark:    #DC2626

/* Info */
--fc-info-light:     #DBEAFE
--fc-info:           #3B82F6   /* blue-500 */
--fc-info-dark:      #2563EB
```

---

### Neutral / UI Colors

```
/* Light mode */
--fc-white:          #FFFFFF
--fc-surface:        #F9FAFB   /* gray-50 — page background */
--fc-surface-raised: #FFFFFF   /* cards, panels */
--fc-border:         #E5E7EB   /* gray-200 */
--fc-border-strong:  #D1D5DB   /* gray-300 */
--fc-muted:          #9CA3AF   /* gray-400 — placeholder text */
--fc-secondary:      #6B7280   /* gray-500 — secondary text */
--fc-body:           #374151   /* gray-700 — body text */
--fc-heading:        #111827   /* gray-900 — headings */

/* Dark mode equivalents */
--fc-dark-surface:        #0F172A   /* slate-900 */
--fc-dark-surface-raised: #1E293B   /* slate-800 */
--fc-dark-border:         #334155   /* slate-700 */
--fc-dark-muted:          #64748B   /* slate-500 */
--fc-dark-secondary:      #94A3B8   /* slate-400 */
--fc-dark-body:           #CBD5E1   /* slate-300 */
--fc-dark-heading:        #F1F5F9   /* slate-100 */
```

---

### Priority Color Map

```
urgent:   #EF4444   /* red-500 */
high:     #F97316   /* orange-500 */
medium:   #EAB308   /* yellow-500 */
low:      #22C55E   /* green-500 */
```

### Status Color Map

```
open:      #6366F1   /* primary indigo */
pending:   #F97316   /* orange */
snoozed:   #A855F7   /* purple-500 */
resolved:  #22C55E   /* green */
```

### Agent Availability Color Map

```
online:   #22C55E   /* green-500 */
busy:     #EAB308   /* yellow-500 */
offline:  #9CA3AF   /* gray-400 */
```

---

## Typography

### Font Stack

```
/* Display / headings */
font-family: 'Inter', system-ui, -apple-system, sans-serif;

/* Mono (code, JSON viewer, snippets) */
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

Both available on Google Fonts; self-host for production (GDPR).

### Type Scale

| Role | Size | Weight | Line height |
|---|---|---|---|
| Display 2xl | 72 px | 700 | 1.1 |
| Display xl | 60 px | 700 | 1.1 |
| Heading 1 | 36 px | 700 | 1.25 |
| Heading 2 | 30 px | 600 | 1.3 |
| Heading 3 | 24 px | 600 | 1.35 |
| Heading 4 | 20 px | 600 | 1.4 |
| Body lg | 18 px | 400 | 1.75 |
| Body md | 16 px | 400 | 1.5 |
| Body sm | 14 px | 400 | 1.5 |
| Caption | 12 px | 400 | 1.4 |
| Label | 11 px | 500 | 1.4 — uppercase + tracking |

---

## Iconography

Use **Heroicons v2** (MIT licence) as the primary icon set — matches the Tailwind ecosystem perfectly.

- Outline variant for UI chrome (navigation, labels, empty states)
- Solid variant for interactive indicators (status dots, notification badges, active states)
- Size grid: 16 px, 20 px, 24 px

Supplement with **Lucide** for domain-specific icons not in Heroicons (channel logos, AI spark, etc.).

---

## Spacing & Layout

Based on a **4 px base grid** (Tailwind default).

```
2   →   8 px   tight inline spacing
3   →  12 px   compact padding
4   →  16 px   standard element padding
6   →  24 px   section gap
8   →  32 px   card padding
12  →  48 px   section separation
16  →  64 px   hero spacing
```

### Border Radius

```
--fc-radius-sm:   4 px    (badges, chips)
--fc-radius:      8 px    (buttons, inputs, cards)
--fc-radius-lg:  12 px    (modals, panels)
--fc-radius-xl:  16 px    (sidebars, large cards)
--fc-radius-2xl: 24 px    (floating panels)
--fc-radius-full: 9999 px (avatars, status dots, pill tags)
```

---

## Shadows & Elevation

```
--fc-shadow-xs:  0 1px 2px 0 rgb(0 0 0 / 0.05)
--fc-shadow-sm:  0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
--fc-shadow:     0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
--fc-shadow-md:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
--fc-shadow-lg:  0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
--fc-shadow-xl:  0 25px 50px -12px rgb(0 0 0 / 0.25)
```

---

## Motion & Animation

**Principle:** Fast and purposeful. No decoration for its own sake.

```
--fc-duration-fast:    100ms   (hover state transitions)
--fc-duration-base:    200ms   (panel open/close, button press)
--fc-duration-slow:    300ms   (modal enter/exit, page transition)
--fc-easing-standard: cubic-bezier(0.4, 0, 0.2, 1)   (standard)
--fc-easing-enter:    cubic-bezier(0, 0, 0.2, 1)       (decelerate)
--fc-easing-exit:     cubic-bezier(0.4, 0, 1, 1)       (accelerate)
```

---

## Component Defaults

### Buttons

```
Primary:   bg-primary-500   text-white   hover:bg-primary-600
Secondary: bg-white         text-body    border border-border   hover:bg-surface
Danger:    bg-danger        text-white   hover:bg-danger-dark
Ghost:     bg-transparent   text-body    hover:bg-surface
```

All buttons: `rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-base`

### Inputs

```
border border-border rounded-lg px-3 py-2 text-sm
focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
placeholder:text-muted
```

### Badges / Status Chips

```
Rounded-full, text-xs font-medium, px-2 py-0.5
Color: semantic background at 100, text at 700
```

---

## Tailwind Config Snippet

```js
// tailwind.config.js — FlowChat
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE',
          300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1',
          600: '#4F46E5', 700: '#4338CA', 800: '#3730A3', 900: '#312E81',
          DEFAULT: '#6366F1',
        },
        accent: {
          50: '#F0FDFA', 100: '#CCFBF1', 200: '#99F6E4',
          300: '#5EEAD4', 400: '#2DD4BF', 500: '#14B8A6',
          600: '#0D9488', 700: '#0F766E', 800: '#115E59', 900: '#134E4A',
          DEFAULT: '#14B8A6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
    },
  },
}
```

---

*Last updated: 2026-06-01*
