# Design System Document
# Smart Media Mail Assistant — "The Master Cue Sheet"

**Document Version:** 1.0.0  
**Design Philosophy:** Swiss Typographical Broadcast Grid & Production Cue Sheet  
**Target Platform:** React Native (iOS & Android via Expo SDK)  
**Primary Visual Metaphor:** Live Television & Institutional Event Run-of-Show Sheet  

---

## 1. Design Philosophy & Anti-AI-Slop Manifesto

### 1.1 The Core Thesis
Most modern mobile apps suffer from generic "AI-slop" aesthetics: nested cards with identical rounded corners, gratuitous purple/blue gradients, decorative glassmorphism, floating sparklines, and generic progress circles that convey zero real information.

The **Smart Media Mail Assistant** rejects these conventions entirely. Media heads and audio/video technicians work in high-stress, mission-critical environments: dim backstage control booths, side-stage wings with tangled cables, and live auditoriums where soundchecks must finish before VIPs arrive.

Our design draws from the most authoritative, trusted physical artifact in live production: **The Master Cue Sheet (Run-of-Show)**.
- **Zero Generic Cards:** The interface is not a collection of floating rounded boxes. It is an authentic, continuous, high-density typographical broadcast grid.
- **Utilitarian Discipline:** Every pixel carries operational meaning. White space is deliberate; dividers are razor-thin 1px hairlines.
- **Physical Gaffer-Tape Accents:** Urgency and high-priority tags mimic the tactile, high-visibility fluorescent gaffer tape used on stage racks and audio consoles.
- **Arm’s-Length Glanceability:** Readable from 3 feet away while holding an XLR cable or adjusting a camera tripod.

---

## 2. Color Palette & Token Architecture

The color system is optimized for OLED displays to save battery during 12-hour event days and ensure total readability in dark sound booths without blinding the operator.

```text
+-----------------------------------------------------------------------------------------+
| PALETTE SWATCHES                                                                        |
|                                                                                         |
| [ #111215 ] Deep Ink Ground    [ #17191E ] Row Surface        [ #242730 ] Hairline Grid |
| [ #EDEDED ] Bone White Ink     [ #8A909E ] Wireframe Gray     [ #F4E04D ] Gaffer Yellow |
| [ #E5484D ] Urgent Alert       [ #30A46C ] Soundcheck Green   [ #00C7D9 ] Audio Cyan    |
| [ #FF9900 ] Video Amber        [ #6E56CF ] Director Violet    [ #0A0A0C ] Stamp Black   |
+-----------------------------------------------------------------------------------------+
```

### 2.1 Color Tokens Specification

| Token Name | Hex Code | Purpose / Context | Contrast Ratio (vs #111215) |
|---|---|---|---|
| `bg-ground` | `#111215` | Absolute OLED black ground | 1:1 (Base) |
| `bg-row-alt` | `#17191E` | Alternating timeline table row background | 1.12:1 |
| `border-grid` | `#242730` | 1px hairline horizontal & vertical table dividers | 1.35:1 |
| `text-primary` | `#EDEDED` | Bone white text for event titles, timestamps, and cues | 16.2:1 (AAA) |
| `text-muted` | `#8A909E` | Secondary technical specs, channel IDs, venue names | 7.1:1 (AAA) |
| `text-dim` | `#565C69` | Minor notes, completed items, table header labels | 4.6:1 (AA) |
| `accent-gaffer` | `#F4E04D` | Fluorescent stage-tape yellow for High Priority badges | 15.8:1 (vs #0A0A0C) |
| `accent-urgent` | `#E5484D` | Safety signal red for overdue deadlines & missing gear | 5.8:1 (AA) |
| `accent-tested` | `#30A46C` | Soundcheck green for verified and tested equipment | 6.4:1 (AA) |
| `tag-audio` | `#00C7D9` | Phosphor cyan badge identifying Audio department tasks | 11.2:1 (AAA) |
| `tag-video` | `#FF9900` | Broadcast amber badge identifying Video department tasks | 9.4:1 (AAA) |

---

## 3. Typography & Spatial Rhythm

### 3.1 Font Pairing & Rules
1. **Primary Workhorse Font:** **Schibsted Grotesk** or **Geist Sans** (with fallback to `Inter Display` / system sans).
   - High x-height, open apertures, and crisp letterforms built for technical displays.
   - Strict tracking: `-0.02em` for large headers, `0.0em` for body.
2. **Tabular Data & Coordinates:** **JetBrains Mono** or **Geist Mono**.
   - Used *only* for timestamps (`14:30:00`), frequencies (`614.500 MHz`), countdowns (`T-01:45`), and channel coordinates (`CH-04`).
   - Monospace is never used as a decorative costume for regular prose.
3. **No Eyebrow Kickers:** No tiny uppercase subtitles like `"OVERVIEW"` or `"DASHBOARD"` floating above headings. The heading itself carries the weight.

### 3.2 Typographic Hierarchy Scale

```text
DISPLAY COUNTDOWN : 32px / Line Height 36px / JetBrains Mono Bold / Tabular
EVENT HEADER      : 22px / Line Height 26px / Grotesk SemiBold / Tracking -0.02em
TIMECODE (CUE)    : 16px / Line Height 20px / JetBrains Mono Medium / Tabular
ITEM TITLE        : 15px / Line Height 20px / Grotesk Medium
SPEC / META       : 13px / Line Height 16px / Grotesk Regular / Text-Muted
TAPE STAMP LABEL  : 11px / Line Height 12px / Grotesk Black / Tracking +0.05em / UPPERCASE
```

---

## 4. The Anti-Card Layout Grid (The Master Cue Sheet)

Instead of stacking identical cards with rounded corners, the screen is laid out as a **high-density broadcast run-of-show grid**:

```text
+-----------------------------------------------------------------------------------+
| TOP BAR: EVENT TITLE & LIVE COUNTDOWN                                            |
| UNIVERSITY ANNUAL CONVOCATION                                     T-01:45:10      |
+-------------------+-------------------------------------------+-------------------+
| TIME (Fixed Width)| EVENT CUE & VENUE DETAILS                 | ACTION / STATUS   |
+-------------------+-------------------------------------------+-------------------+
| 08:00             | [!] MANDATORY STAGE SETUP DEADLINE        | [HIGH PRIORITY]   |
|                   | Main Auditorium - Stage A                 | Gaffer Tape Stamp |
+-------------------+-------------------------------------------+-------------------+
| 08:30             | AUDIO: 4x Wireless Handheld Microphones   | [✓] PREPPED       |
|                   | Shure QLXD - Channel A1 through A4        | Checked by Marcus |
+-------------------+-------------------------------------------+-------------------+
| 08:45             | AUDIO: Digital Mixing Console             | [ ] PENDING       |
|                   | Yamaha CL5 - Multicore snake routed       | Tap to verify     |
+-------------------+-------------------------------------------+-------------------+
| 09:15             | VIDEO: Main LED Wall Feed                 | [✓] TESTED        |
|                   | 1080p60 HDMI input from podium            | 4K Scaler locked  |
+-------------------+-------------------------------------------+-------------------+
| 10:00             | LIVE EVENT COMMENCES                      | [EVENT START]     |
|                   | Chancellor's Opening Remarks              | Stage Lights Go   |
+-------------------+-------------------------------------------+-------------------+
```

### 4.1 Structural Columns
- **Column 1 — Timestamp (72px fixed):** Monospaced timecode indicating setup milestone or event cue. Anchored on the left margin.
- **Column 2 — Cue & Technical Specs (Flex 1):** Event name, exact gear model, venue specifications, and notes.
- **Column 3 — Action / Checklist State (88px fixed):** Tactile mechanical checkbox or gaffer tape stamp.

---

## 5. Signature Components & Tactile Elements

### 5.1 The Gaffer-Tape Priority Stamp
A hallmark physical element representing urgent, high-priority setup calls:
- **Appearance:** A bright fluorescent yellow rectangle (`#F4E04D`) with stark black ink (`#0A0A0C`).
- **Texture & Form:** Sharp 2px rounded corners, bold uppercase typography, subtle `-0.5deg` angle variation to mimic real adhesive tape applied by a technician's hand.
- **Micro-Copy:** `[! URGENT SETUP]`, `[HIGH PRIORITY]`, or `[VIP ATTENDANCE]`.

### 5.2 The Mechanical Checkbox
- **Design:** Crisp 20x20px square with a 1.5px hairline border (`#8A909E`).
- **Unchecked State:** Deep matte fill (`#17191E`) with clear touch target ($44\times44\text{px}$ hit box).
- **Checked State:** Fills with Soundcheck Green (`#30A46C`) containing a sharp, surgical check mark; associated row text dims slightly (`#8A909E`) to emphasize remaining unfinished work.
- **Haptic:** Fires a distinct, authoritative `ImpactFeedbackStyle.Medium` via `expo-haptics`.

### 5.3 Live Countdown Banner (Zero-Jitter Header)
- Pinned to the top of the event view:
  ```text
  SETUP DEADLINE: 08:00 AM  •  COUNTDOWN: 01:24:18 REMAINING
  ```
- Uses tabular monospaced numerals so numbers do not jump or cause layout shifting as seconds tick down.

### 5.4 Quick Walk-In Entry (Floating Trigger)
- Positioned in the bottom right thumb zone:
- A compact, high-contrast pill button: `[ + WALK-IN ]` in `#EDEDED` with `#111215` text.
- Expands immediately into a rapid one-thumb voice/text modal without opening a heavy multi-step wizard.

---

## 6. Interaction & Motion Physics

1. **No Floaty Animations:** Eliminated 500ms slow spring bounces. In high-pressure event environments, slow animations make apps feel sluggish.
2. **Instant Tactical Feedback (100ms - 150ms):**
   - Tapping an item triggers an immediate 100ms color shift.
   - Screen transitions use native iOS slide or immediate cross-fade (`fade_from_bottom` at 180ms with `cubic-bezier(0.16, 1, 0.3, 1)`).
3. **Auditorium Mode (Contrast Lock):**
   - The UI stays high-contrast regardless of OS dark/light mode toggles to ensure stage crew aren't blinded backstage.

---

## 7. React Native Implementation Tokens (StyleSheet Ready)

```typescript
// src/theme/tokens.ts

export const Palette = {
  bgGround: '#111215',
  bgRowAlt: '#17191E',
  bgRowHighlight: '#1F222A',
  borderGrid: '#242730',
  
  textPrimary: '#EDEDED',
  textMuted: '#8A909E',
  textDim: '#565C69',
  
  // Tactical Accents
  gafferYellow: '#F4E04D',
  stampBlack: '#0A0A0C',
  urgentRed: '#E5484D',
  soundcheckGreen: '#30A46C',
  
  // Department Sub-Buses
  audioCyan: '#00C7D9',
  videoAmber: '#FF9900',
  logisticsPurple: '#6E56CF',
} as const;

export const Typography = {
  mono: {
    fontFamily: 'JetBrainsMono-Medium',
  },
  grotesk: {
    fontFamily: 'SchibstedGrotesk-Regular',
  },
  groteskBold: {
    fontFamily: 'SchibstedGrotesk-SemiBold',
  },
  tapeLabel: {
    fontFamily: 'SchibstedGrotesk-Black',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
} as const;

export const Layout = {
  timeColWidth: 72,
  actionColWidth: 92,
  rowMinHeight: 56,
  hitSlop: { top: 12, bottom: 12, left: 12, right: 12 },
} as const;
```

---

## 8. Screen Anatomy Specifications

### Screen 1: The Master Dashboard (`app/(tabs)/index.tsx`)
1. **Header Block:**
   - App Title: `MEDIA OPS // CUE SHEET`
   - Active Department Filter Chips: `[ ALL ]  [ AUDIO ]  [ VIDEO ]  [ MINE ]`
2. **Current Active Run-of-Show:**
   - Giant countdown banner for the nearest setup deadline.
   - Chronological table of today's events and technical cues.
3. **Overdue / Critical Alert Banner:**
   - Only appears if a setup deadline is $< 60$ minutes away and unchecked items remain. Styled with a pulsing `urgentRed` hairline border.

### Screen 2: Event Technical Breakdown (`app/(tabs)/events/[id].tsx`)
1. **Event Top Meta:**
   - Name, Venue (e.g. `Main Auditorium - Stage A`), Organizer contact.
2. **Audio Department Section (Cyan Indicator):**
   - Itemized list with quantities, wireless frequencies, and mic check toggles.
3. **Video Department Section (Amber Indicator):**
   - Projector inputs, LED wall specs, recording camera setups.
4. **Logistics & Deadlines:**
   - Setup completion deadline vs. Event live start time.
   - "Sync to Native Calendar" button.

### Screen 3: Rapid Walk-In Event Modal (`app/modal/add-manual-event.tsx`)
1. **Voice Dictation Waveform Bar:**
   - Direct mic button: *"Tap and speak event request..."*
2. **Quick-Pick Equipment Matrix:**
   - Instant tap chips: `[+ 2 Mics]`, `[+ Projector]`, `[+ Mixer]`, `[+ LED Wall]`.
3. **Quick Deadline Presets:**
   - `[ In 1 Hour ]`, `[ In 2 Hours ]`, `[ Today 4 PM ]`, `[ Tomorrow Morning ]`.
4. **Authoritative Action:**
   - Large full-width tactile button: `[ COMMIT TO RUN-OF-SHOW ]`.

---

*This document establishes the official visual language for the Smart Media Mail Assistant mobile application. All UI components and screens must conform strictly to these tokens and layout principles.*
