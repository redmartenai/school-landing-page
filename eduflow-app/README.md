# EduFlow

**EduFlow doesn't just manage schools. It continuously monitors them.**

A School Monitoring Intelligence platform: Principal and Admin on web + mobile, Teachers, Students and
Parents on mobile. Each role shares one live school. Built with React 19, TypeScript, Tailwind v4,
Framer Motion and zustand. The palette and voice come from `AfterOn.html`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

| URL | What |
|---|---|
| `/` | Role picker |
| `/principal` | Principal web: Monitoring Center, Wall, Students, Staff scorecards, Approvals, Ask EduFlow (⌘K) |
| `/principal/campus` | **Campus 3D**, principal only: the eight-storey tower with every classroom live, substitutes, the field and the bus bay |
| `/admin` | Admin web: Fees, Payroll/Salary, Admissions, Access Control (RBAC), Audit |
| `/m/principal` `/m/admin` `/m/staff` `/m/parent` `/m/student` | Mobile apps (phone frame on desktop, full screen on a phone) |
| `/live` | Teacher, Parent and Principal phones side by side |

The demo day is **Wed 7 Oct 2026, 08:24**, and the clock runs in real time. Data is saved in localStorage
and syncs across tabs. Use **Reset demo** (sidebar role menu, or `/live` → Start over) to go back to 08:24.

## 3-minute demo script

1. Open **`/principal`** and read the morning brief. The Monitoring Center shows 5 critical signals:
   3 classrooms haven't taken the register, 3 teachers are late with marks, Bus 21 is 34 min late,
   and there are fee defaulters and attendance risks. Each signal has an owner, a reason and an escalation path.
2. Press **⌘K** and type *"Show unpaid fees above ₹20,000"* or *"Which teachers have pending marks?"*.
3. Open **`/live`**. On the teacher's phone, take the **9B register**. Sunita's phone (parent) buzzes
   with "Ananya marked present", and the principal's wall tile for 9B turns green.
4. On the parent phone, switch to **Vihaan**. "Worth a look" flags the maths drop and the overdue fee. Pay it.
5. In **`/admin`**, the payment appears in the ledger and the audit log. Process October payroll and
   move an admission card along the pipeline.
6. On **`/m/student`**, take the quadratic equations quiz. Ananya earns house points, and her teacher's
   Learn analytics update.

## Campus 3D (principal only)

The whole Greenfield campus in 3D:
- the eight-storey Academic Tower
- the Science Block, whose Physics, Chemistry and Biology labs are where Science classes actually go
- the Junior Wing and its playground
- the Aquatic Arena
- the Auditorium, which fills for 07:50 assembly
- the fountain garden, basketball courts, car park and drop-off loop
- two gates whose barriers lift when buses come and go

Clouds drift past, birds circle, a flag waves, a wind turbine turns, and students walk the covered
walkways at every bell. The "Go to" bar flies the camera to any block.


An eight-storey cutaway of Greenfield School, with everything driven by the same data as the other screens:

- **Every classroom, live.** Children sit at their desks in house colours and the teacher stands at the board.
  The ceiling light shows the room's status:
  - **forest:** the class's own teacher is teaching
  - **copper:** a substitute is covering
  - **rust, with a pulsing alarm and a "ghost" teacher:** no teacher is there
- **Where everyone is.** Games classes play football on the field. Library and Computer Lab periods move
  children to Level 6. At break the whole school spills onto the plaza.
- **Who is missing.** Mr. Bhat is absent with no notice, so his periods appear under **Needs cover**. Click
  one, pick a free teacher (same subject first) and the room turns copper. The covering teacher gets a
  notification and the change goes into the audit log.
- **Moving parts.** A glass lift runs between floors and students walk the corridors between periods.
  The five buses park end to end in the bay, and Bus 21 pulls in late.
- **Controls.**
  - Floor buttons (G–7) lift the floors above out of the way.
  - The timeline replays the school day, and the sun moves with it.
  - Labels and People can be turned on or off.
  - **Cinematic** quality turns on ambient occlusion and bloom; **Fast** is for slower machines.

## Where things live

```
src/engine/monitoring.ts   the Monitoring Intelligence Layer (rules → alerts, risk score, scorecards)
src/engine/ask.ts          Ask EduFlow natural-language queries
src/engine/campus.ts       where every class is, who is teaching it, who is missing, the substitution pool
src/roles/principal/web/campus/   three.js scene (react-three-fiber, drei, postprocessing), lazy-loaded
src/store/school.ts        single source of truth + all write actions (activity, audit, notifications)
src/data/seed.ts           Greenfield School: about 320 students and 20 staff, generated from a fixed seed
src/components/ui          design system
src/components/shell       web shell and mobile stack navigator / phone frame
src/roles/*                one folder per role and surface
docs/DESIGN.md             design and motion conventions
```

## First alert set (engine rules)

| Domain | Rule | Owner → escalation |
|---|---|---|
| Students | Attendance < 75% (60 days) | Class teacher → Principal after 7 days |
| Students | Attendance slipping 20+ pts in 3 weeks | Class teacher → Principal |
| Students | Marks fell 12+ pts in Unit Test 2 | Subject teacher → Coordinator → Principal |
| Students | 3 days absent in a row | Class teacher → Principal by 11:00 |
| Staff | Register not marked by 08:15 | Class teacher → Principal (live) |
| Staff | Marks past deadline | Subject teacher → Principal |
| Staff | Homework submissions unreviewed | Subject teacher → Principal after 5 days |
| Staff | Parent waiting 24h+ | Teacher → Principal after 48h |
| Staff | Absent without leave / frequent late | HR → Principal → Owner |
| Operations | Bus delayed 10+ min | Transport → Principal (live) |
| Operations | Approvals waiting 24h+ | Principal |
| Operations | Repeated negative parent feedback | Admin office → Principal |
| Finance | Overdue fees > ₹10,000 | Accounts → Principal → Owner |

## Roadmap (from the competitive analysis)

- **Done in this build:** Monitoring Center, student risk engine, teacher scorecards, Ask EduFlow,
  parent sentiment, payroll and payslips, admissions pipeline, RBAC matrix with audit, LMS basics
  (lessons, quizzes, homework submission, learning progress).
- **Next:** backend with authorization enforced on every API (Role + Permission + Data Scope),
  visitor management (QR gate passes), vendor and procurement, alumni, live classes, AI question
  generation, WhatsApp and biometric integrations, and the Chrome extension for principals.
