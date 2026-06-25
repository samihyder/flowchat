---
name: FlowChat Campaign System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d0daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff3ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fd'
  surface-container-highest: '#d9e3f7'
  on-surface: '#121c2a'
  on-surface-variant: '#464554'
  inverse-surface: '#273140'
  inverse-on-surface: '#ebf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#904900'
  on-tertiary: '#ffffff'
  tertiary-container: '#b55d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#f9f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f7'
  primary-hover: '#4F46E5'
  primary-surface: '#EEF2FF'
  primary-border: '#C7D2FE'
  gray-900: '#111827'
  gray-500: '#6B7280'
  gray-400: '#9CA3AF'
  gray-200: '#E5E7EB'
  gray-50: '#F9FAFB'
  status-draft-bg: '#F3F4F6'
  status-draft-text: '#4B5563'
  status-scheduled-bg: '#DBEAFE'
  status-scheduled-text: '#2563EB'
  status-paused-bg: '#FEF9C3'
  status-paused-text: '#CA8A04'
  status-success-bg: '#DCFCE7'
  status-success-text: '#16A34A'
  status-danger-bg: '#FEE2E2'
  status-danger-text: '#DC2626'
  status-bounced-bg: '#FEF3C7'
  status-bounced-text: '#D97706'
  status-reply-text: '#A855F7'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gap-section: 24px
  gap-form: 16px
  padding-card: 24px
  container-max-list: 1280px
  container-max-wizard: 1024px
---

## Brand & Style

The design system is engineered for high-stakes marketing automation where precision and clarity are paramount. The brand personality is **authoritative, professional, and confident**, prioritizing utility over decoration to ensure users can manage complex campaign sequences without cognitive overload.

The aesthetic follows a **Corporate / Modern** style, characterized by a "light dashboard shell" that utilizes a high-contrast foundation of white surfaces and soft gray backgrounds. Visual interest is introduced through purposeful brand injections and a sophisticated semantic color system. The interface remains "utility-first," using structural grid alignment and crisp borders to establish a sense of reliability and enterprise-grade performance.

## Colors

The color architecture is built on a foundation of **Indigo (Primary)** for interactivity and **Teal (Accent)** for positive metrics and success states.

- **Primary & Neutral**: The `primary-500` (#6366F1) serves as the anchor for all primary actions. Neutral grays range from `gray-50` for page backgrounds to `gray-900` for high-importance typography.
- **Semantic Logic**: Status indicators follow a strict mapping:
    - **Blue/Information**: Scheduled or upcoming events.
    - **Indigo**: Active "Running" states.
    - **Green**: Successful completion or positive engagement.
    - **Yellow/Amber**: Warnings, pauses, or soft failures (bounces).
    - **Red**: Hard failures, cancellations, or suppressed actions.
- **Gradients**: Use the `Marketing Hero` gradient (Indigo-50 to Accent-50) sparingly for empty states and high-level marketing headers to provide a subtle "brand lift" without compromising the dashboard's professional tone.

## Typography

This design system employs a dual-font strategy to separate interface logic from technical data.

- **Inter (UI)**: Used for all functional interface elements. Weights are strategically applied: `600` for titles to establish hierarchy and `400` for body and metadata to ensure legibility.
- **JetBrains Mono (Data)**: Reserved exclusively for technical identifiers, campaign IDs, and merge tags. This distinction helps users quickly identify "system variables" within the campaign editor.
- **Hierarchy Notes**: Large metrics (`headline-lg`) are set at 30px with a bold 700 weight to command attention in analytics views. Table headers use `label-caps` in `gray-500` with an uppercase transformation for a distinct structural separation from data rows.

## Layout & Spacing

The layout utilizes a **Fixed Grid** approach for internal content modules to maintain a focused reading experience, while the dashboard shell expands fluidly to the screen width.

- **Rhythm**: A 4px/8px incremental system is enforced. Vertical gaps between major section cards are set to `24px` (gap-6), while internal form elements use a tighter `16px` (gap-4) rhythm.
- **Form Factors**:
    - **Desktop**: Content is centered with max-widths of `7xl` (1280px) for lists/analytics and `5xl` (1024px) for the step-by-step wizard to prevent line lengths from becoming unreadable.
    - **Responsive**: On mobile devices, container padding scales to `16px`, and the wizard's horizontal stepper transitions to a vertical or simplified numeric indicator.
- **Fixed Elements**: The Wizard footer is fixed at `64px` height with a `gray-200` top border to provide constant access to navigation controls.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** supplemented by subtle ambient shadows.

- **Surface Levels**: The base page background is `gray-50`. Content sits on white (`#FFFFFF`) cards, creating a natural "lift" without heavy shadows.
- **Shadow Profiles**:
    - **Step Cards**: Use a `shadow-sm` for a subtle, flat-style separation.
    - **Overlays**: Dropdowns use `shadow-md`, while critical Modals use `shadow-lg` to significantly pull them forward.
    - **Composer**: The full-screen editor overlay uses `shadow-xl` to emphasize it as the top-most layer in the application stack (z-index 50).
- **Interactions**: Active step cards use a `2px` primary-200 ring rather than an elevation increase, keeping the experience grounded in a professional dashboard aesthetic.

## Shapes

The shape language is primarily **Rounded**, conveying a modern but structured feel.

- **Standard Containers**: All cards, panels, and input fields use `rounded-lg` (0.5rem) to soften the professional layout.
- **Modals**: High-importance overlays use `rounded-xl` (1.5rem) for a more approachable, distinct appearance.
- **System Components**: Status badges, merge chips, and timeline nodes utilize `rounded-full` to create a "pill" aesthetic that distinguishes interactive or status-based elements from structural ones.
- **Connectors**: Timeline lines and dividers are strictly `2px` solid `gray-200`, maintaining the "grid-based" precision of the system.

## Components

- **Buttons**: Primary buttons are solid `primary-500` with `gray-900` text on hover (if contrast allows) or `primary-600` for standard hover. Ghost buttons are used for secondary actions like "Copy" or "Search."
- **Status Badges**: Use the `rounded-full` shape with the semantic background/text pairs defined in the color section. These are the primary indicators of campaign health.
- **Input Fields**: Standard `1px` border in `gray-200`. On focus, transition to a `2px` ring using `primary-200`. Placeholders must use `gray-400`.
- **Step Cards**: These are the building blocks of the wizard. They feature a `shadow-sm` and a `gray-200` border. Active steps are highlighted with a `primary-200` outline.
- **Merge Chips**: Used in the composer; these use `primary-50` background, `primary-200` border, and `JetBrains Mono` for the internal text.
- **Alert Banners**: Use a `4px` left-border accent corresponding to the semantic status color (Red for danger, Yellow for warning) and a matching light background tint.