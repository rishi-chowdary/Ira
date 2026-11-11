# 🪙 IRA — Student P2P Lending Platform
## 04. Visual Theme, UI/UX & Design System

---

## 🎨 Visual Identity & Brand Philosophy

IRA's visual language merges the sleek authority of modern fintech (Stripe, Mercury) with the dynamic energy of university campus culture. It is designed to feel trustworthy to educational authorities while feeling fresh, fast, and exciting to Gen-Z students.

---

## 🌈 Color Palette

```
┌─────────────────────────────────────────────────────────────┐
│                       IRA BRAND PALETTE                     │
├─────────────────────┬─────────────────────┬─────────────────┤
│  Primary Electric   │   Growth / Lender   │ Borrow / Urgent │
│      #3B82F6        │       #10B981       │     #EF4444     │
│    (Trust Blue)     │   (Emerald Green)   │   (Coral Red)   │
├─────────────────────┼─────────────────────┼─────────────────┤
│  Platinum Metallic  │    Dark Surface     │  Light Canvas   │
│       #6366F1       │       #0F172A       │     #F8FAFC     │
│   (Shri Platinum)   │    (Deep Slate)     │  (Pure Canvas)  │
└─────────────────────┴─────────────────────┴─────────────────┘
```

### Color Token Reference

| Role | HEX Code | Tailwind Class | Application |
|---|---|---|---|
| **Primary Brand** | `#3B82F6` | `bg-blue-600` | Header navigation, primary action buttons, active tabs |
| **Secondary Accent** | `#1D4ED8` | `bg-blue-700` | Button hover states, key statistics focus |
| **Lender / Returns** | `#10B981` | `text-emerald-500` | Lender returns, positive wallet balance, earnings charts |
| **Borrower / Urgent**| `#EF4444` | `text-red-500` | Loan request triggers, repayment due alerts, urgent badges |
| **Gold Tier** | `#F59E0B` | `text-amber-500` | Gold Shri Score badges, top-tier investor achievements |
| **Platinum Tier** | `#8B5CF6` | `text-purple-500`| Platinum badges, maximum borrow limits |
| **Background Dark** | `#0F172A` | `bg-slate-900` | Dark mode backdrops, card shells, modal overlays |
| **Background Light**| `#F8FAFC` | `bg-slate-50` | Card interiors, input backgrounds |
| **Text Primary** | `#0F172A` / `#F8FAFC` | `text-slate-900` | High-contrast body copy and headings |
| **Text Secondary** | `#64748B` | `text-slate-500` | Subtitles, field hints, timestamp labels |

---

## ✨ Signature Interactive Micro-Animations

### 1. The Dynamic Coin Cursor (`₹`)
- When the user navigates to **Lender** views, the cursor displays a glowing **Emerald Green Rupee symbol (`₹`)**, symbolizing wealth generation and investment returns.
- When navigating to **Borrower** views, the cursor transitions into a glowing **Coral Red Rupee symbol (`₹`)**, symbolizing immediate liquidity injection.
- Triggered dynamically via page context and CSS cursor transforms.

### 2. Floating Coins Particle Effect (`FloatingCoins.tsx`)
- On page load and hero banner displays, subtle gold and silver coin particles drift upward with smooth ease-in-out translation.
- Provides tactile delight on landing and dashboard entry without impairing accessibility or CPU performance.

### 3. Animated Number Rollers (`CountUp.tsx`)
- Numerical figures (e.g., wallet balances, loan amounts, Shri scores) animate from 0 to the target number using an easing curve when entering the viewport.

### 4. Interactive Loan Calculator (`LiveCalculator.tsx`)
- Dual-slider UI allowing students to drag Amount (₹500 to ₹10,000) and Days (1 to 90).
- Instantly updates:
  - Repayment due date
  - Total interest payable
  - Lender return (85%)
  - Platform fee (15%)
  - Hourly rate comparison against traditional bank overdrafts

---

## 🔤 Typography & Grid

- **Font Family:** `Inter`, system `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`.
- **Base Font Size:** `16px` for body copy; `14px` for input hints; `20px` to `36px` for page headings.
- **Card Radius:** Standard `16px` (`rounded-2xl`) with subtle `1px` borders (`border-slate-200 / border-slate-800`).
- **Elevation:** Soft ambient box shadows (`shadow-sm`, `shadow-md`, `shadow-xl`) creating clear spatial hierarchy.
