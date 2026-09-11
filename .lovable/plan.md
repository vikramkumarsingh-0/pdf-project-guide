# Study groups, feedback, educator data, and verified alerts

## What will be built

- Expand the educator directory with credible public educator profiles and link relevant approved materials to them, so review cards and material details show clear attribution.
- Add managed app-email alerts: notify administrators when a student submits a material and when an administrator approves or rejects it. Use one event per recipient with duplicate-send protection.
- Add subject-based study groups where students can browse and join groups, share notes, view members, and compare group activity with their own searches, views, and ratings.
- Add a questions/comments form to each approved material. Students can see their own submissions and administrators can review feedback counts and recent items in reports.
- Create several clearly labeled demo student accounts, complete their onboarding, perform realistic searches, open materials, rate resources, and confirm all activity persists and affects recommendations.

## Student experience

- Add a Study groups destination to desktop and mobile navigation.
- Show available groups by subject, membership state, member count, shared notes, and recent activity.
- Let members post and edit their own notes; calculate progress from actual group views, ratings, and notes rather than a placeholder percentage.
- Replace hard-coded dashboard totals with counts from the signed-in student's stored activity.
- Save search actions when students submit a query, then refresh their recommendation signals.
- Add an accessible question/comment form on material details with validation, success, error, and empty states.

## Administrator experience

- Seed and display educator affiliation, biography, expertise, and source website details; link existing approved catalog entries where attribution is accurate.
- Keep author editing server-validated and administrator-only.
- Extend reports with feedback totals, status/type breakdowns, recent questions/comments, material context, and CSV export.
- Preserve the existing material preview and show linked educator context while reviewing submissions.

## Data and security

- Add normalized `study_groups`, `study_group_members`, `study_group_notes`, and `material_feedback` data with indexes, timestamps, explicit grants, and row-level access rules.
- Allow authenticated students to discover groups, join/leave as themselves, read notes for joined groups, and manage only their own notes.
- Scope material feedback to the submitting student and administrators; only approved materials accept new feedback.
- Keep roles in the existing separate role table and require server-side administrator checks for reports, author edits, and review actions.
- Seed groups, educators, links, and demo activity through controlled backend operations; do not place passwords or privileged credentials in browser code.

## Email prerequisite and delivery

- Sender setup requires a real domain owned by the user; no project or workspace email domain is currently configured.
- After the sender-domain setup dialog is completed, scaffold branded StudyFlow email templates and wire them into authenticated submission/review functions.
- Resolve recipients from administrator accounts in the backend, never from browser input. Treat suppressed recipients as a normal non-send result and keep material actions successful.
- Verify a real submission, review decision, and delivery event after DNS verification. If verification is still pending, complete all code and report that live delivery begins when the domain becomes active.

## Verification

- Create three demo students with distinct subjects, topics, and goals, then exercise onboarding for each.
- Perform searches, resource views, and editable ratings; verify the stored profile preferences, enrollments, searches, views, ratings, and generated recommendation rows.
- Walk one new submission through administrator preview and approval, confirm the approved item appears in the student catalog, and verify the expected email event.
- Exercise joining a group, posting a note, submitting material feedback, and viewing both in administrator reports.
- Run focused tests, type checks, database linting, and desktop/mobile browser walkthroughs for the affected student and administrator pages.

## Technical details

- Use additive database migrations only and regenerate generated database types after schema changes.
- Use authenticated server functions for writes and privileged report reads; keep public catalog queries limited to approved material data.
- Reuse the existing recommendation engine and enrich its inputs from persisted onboarding, searches, views, ratings, and subject membership.
- Add route-specific metadata for the new study-group page and preserve the existing StudyFlow design system.
