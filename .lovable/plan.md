# Submission alerts, onboarding, previews, and authors

## Goal
Complete the review lifecycle so new learners are onboarded before seeing personalized recommendations, administrators can inspect and attribute submissions, and approved work appears immediately in the student catalog.

## Build
- Add a required first-login onboarding page for subject, topic, and study goal; redirect incomplete student profiles there before the dashboard or recommendations.
- Save onboarding choices to the learner profile and enrollment, then rank real approved catalog materials from those signals on both dashboard and recommendations pages.
- Add educator author profiles with name, affiliation, biography, expertise, website, and image link; link each material to an optional author.
- Add an administrator author-management page and author selector to material publishing/editing and review workflows.
- Add an in-queue preview panel with full submission text, metadata, author, tags, and safe PDF/video/link inspection using short-lived file access.
- Wire server-side submission and decision alerts: new submissions notify the designated administrator; approval/rejection emails notify the submitting learner with the decision and rejection feedback.
- Seed credible educator profiles and link existing and newly submitted resources to them.

## Validation
- Submit a real learning resource as a student.
- Open and inspect it in the administrator queue, approve it, and verify it appears in student search/catalog results.
- Exercise rejection messaging, first-login onboarding, personalized recommendations, and author editing.
- Run focused validation/recommendation tests, type checks, security checks, and desktop/mobile browser checks.

## Technical details
- Use authenticated server functions for onboarding, author writes, preview access, submission, and review decisions; administrator actions remain role-validated on the server.
- Add normalized author data and a nullable material-author relationship with explicit grants, row-level access rules, indexes, and safe deletion behavior.
- Keep pending/rejected uploads private; generate short-lived signed preview URLs only after administrator authorization.
- Use managed app-email templates and idempotent event keys. Email delivery starts only after an owned sender domain is configured and verified.
