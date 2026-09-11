# Educator Portal and Group Progress

## Goal
Add a secure teacher experience for submitting and tracking authored resources, deepen study-group progress with note completion and shared resources, and populate learner activity so recommendations and statistics show realistic data.

## Educator access
- Add a `teacher` role in the separate role table and link one signed-in account to one verified educator profile.
- Support both entry paths:
  - teacher applications submitted during registration and approved or rejected by administrators;
  - administrator invitations that link an existing account to an educator profile.
- Keep ordinary registration student-only unless the applicant explicitly requests educator review; applicants receive no teacher privileges until approval.
- Add an administrator educator-access queue for applications, invitations, profile linking, and access status.
- Enforce every teacher action on the server and through row-level access rules; browser-supplied account or author identifiers never establish ownership.

## Educator portal
- Add a role-aware Educator navigation entry and dashboard.
- Show the teacher’s profile, submission totals by status, recent decisions, and all approved resources linked to their educator profile.
- Provide an educator submission form with title, description, subject, tags, type, URL/file upload, and automatic author attribution.
- Add submission history with pending, approved, and rejected states plus administrator feedback.
- Teachers can edit their own educator biography, affiliation, expertise, website, and image; administrators retain directory control.

## Group progress
- Add group-shared resources, created by joined members and linked to approved catalog materials.
- Add per-member note completion records so each learner can mark shared notes complete or incomplete.
- Expand group totals to include completed notes, shared resources, subject views, and ratings.
- Add a focused group dashboard with:
  - overview totals and recent activity;
  - shared notes and completion controls;
  - approved shared resources;
  - a member activity table visible only to the group owner and administrators.
- Member activity will contain group-relevant counts only. Raw personal searches, views, or ratings remain private.

## Realistic learner activity
- Retain the existing three synthetic student accounts and add or refresh realistic enrollments, searches, material views, ratings, recommendations, group memberships, notes, completion records, and shared resources.
- Use clearly labeled demo identities and generated credentials that never enter browser code or project files.
- Recompute and verify material rating aggregates and recommendation rows after seeding.

## Security and validation
- Apply additive schema changes through the managed migration workflow, with explicit grants, indexes, constraints, and row-level policies.
- Derive submission ownership, educator identity, group membership, and completion identity from the authenticated session.
- Restrict educator application review and account linking to administrators.
- Restrict member-level group analytics to the group creator and administrators; joined members receive aggregate progress and their own completion state.
- Validate teacher profiles, applications, submissions, group resources, and completion mutations with Zod in browser and server paths.

## Verification
- Test student, applicant, teacher, group-owner, member, and administrator access boundaries.
- Walk teacher application approval, educator submission, administrator material review, and linked-resource visibility.
- Walk group join, resource sharing, note completion, aggregate progress, and owner-only member activity.
- Confirm seeded searches, views, ratings, recommendations, and dashboard statistics persist in the database.
- Run focused tests, type checks, database linting, and desktop/mobile browser checks without console errors.
