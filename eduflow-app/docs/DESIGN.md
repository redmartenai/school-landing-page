# EduFlow — Design & Build Conventions

> **EduFlow doesn't just manage schools. It continuously monitors them.**
> Most ERPs answer *"what happened?"*. Every EduFlow screen answers *"what needs attention right now?"*

## Product shape

| Role | Surface | Demo identity |
|---|---|---|
| Principal | Web + Mobile | Dr. Meera Iyer |
| Admin (fees, salary/payroll, admissions, access control) | Web + Mobile | Rakesh Menon |
| Staff / Teacher | Mobile | Ms. Kavya Rao — Mathematics, class teacher 9B |
| Parent | Mobile | Sunita Kulkarni — mother of Ananya (9B) and Vihaan (6A) |
| Student | Mobile | Ananya Kulkarni — 9B, Willow House, Bus 17 |

Monitoring chain: **Owner → Principal → Staff → Student → Parent.** One shared school store; an action
in one role (teacher marks a register) shows up everywhere else (principal wall, parent feed) instantly — including across browser tabs.

Demo day: **Wednesday 7 October 2026, 08:24**, clock running in real time. 9B, 7A and 10B have not taken the register yet.

## Architecture

```
src/
  data/types.ts        domain model
  data/seed.ts         deterministic Greenfield School (≈320 students, 20 staff)
  store/school.ts      zustand store + every write action (logs activity, audit, notifications)
  store/hooks.ts       useData, useAlerts, usePulse, useMe, useNotifications, useNow, useScorecard, useStudentRisk
  engine/monitoring.ts Monitoring Intelligence Layer — rules → Alerts, student risk, teacher scorecards, school pulse
  engine/ask.ts        "Ask EduFlow" natural-language queries
  components/ui        design system (Card, Button, Pill, Stat, Ring, Sparkline, Bars, Tabs, Sheet, Toast, Table…)
  components/shell     WebShell (sidebar + topbar + ⌘K), MobileApp/MobileScreen/PhoneFrame (stack navigator)
  roles/<role>/<web|mobile>/   one folder per role surface
  pages/               Landing, MobileStage, LiveDemo
```

## Visual language (from AfterOn.html)

- **Paper, not chrome.** Background `bg-ivory`; cards `bg-ivory-2 border-line rounded-[14px]`; subtle `shadow-1`.
- **Type.** Headlines and big numbers in Zodiak (`font-display`), body in General Sans. Eyebrows: 11px uppercase tracked `text-stone`.
- **Colour has meaning — never decoration.**
  - `forest` — good, present, done, primary action
  - `copper` — needs attention, accent, the "one thing to look at"
  - `amber` — waiting / pending
  - `rust` — critical / overdue / absent
  - `slate` — information, neutral metadata
  - `stone` — secondary text
  No blues, no purples, no gradients-for-their-own-sake, no emoji.
- **Voice.** Human, short, specific. "Ananya has reached school." — not "Attendance record created".
  Never write "Module workspace…". Name people. Use numbers.
- **Density.** Web pages: rich but calm; one clear focal point per page. Mobile: thumb-first, 15px rows, big tap targets, bottom sheets for actions.

## Motion (Framer Motion)

- Entrance: wrap web pages in `<Page>`; Cards and PageHeader stagger in automatically (`fadeUp`).
- Selection: shared `layoutId` pills (tabs, nav, segmented controls).
- Lists: `AnimatePresence` + `listItem` so approved/removed items slide away — motion confirms the action.
- Numbers: `AnimatedNumber` for KPIs; `Ring`/`Progress`/`Sparkline` animate on mount.
- Mobile navigation: `useMobileNav().push({ title, render })` slides a screen in; back slides it out.
- Springs from `ui/motion.ts`; easing `ease.out` / `ease.calm`. Reduced motion is respected globally.
- Motion must **show causality** (an item leaves the queue when approved, a register tile turns green when marked) — never decorative loops except LiveDot.

## Rules for code

- TypeScript strict; `import type` for types (verbatimModuleSyntax); no enums.
- All writes go through store actions so they propagate to other roles and are audited.
- Confirm actions with `useToast()`.
- Every list has an empty state. Web works 360px → 1440px.
- Icons: `lucide-react`.
