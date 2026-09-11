# Submission workflow, onboarding, and notifications

## What will be built

- Expand the administrator material form to capture title, description, subject, tags, type, and either an uploaded file or trusted resource link.
- Add secure file storage with validation for allowed formats and size; pending uploads remain restricted until approval.
- Add several realistic student-submitted materials in pending, approved, and rejected states so the queue and history are populated.
- Improve the approval queue with clear submitter details, file/resource inspection, approve/reject actions, and rejection reasons.
- Add a dedicated student submission history page showing pending, approved, and rejected resources, review dates, and rejection feedback.
- Add first-time recommendation onboarding that asks for one subject, a topic, and a study goal before recommendations appear.
- Save these choices to the learner profile and use them with enrolled subjects in cold-start ranking and explanations.
- Refresh recommendations after onboarding and material approval changes.
- Send branded administrator emails when a submission arrives and when a review decision is made.

## Security and validation

- Move submission and review writes behind authenticated server functions.
- Verify administrator roles on the server before publishing, approving, rejecting, or deleting resources.
- Validate every form with Zod in the browser and again on the server, including text lengths, tags, URLs, file types, and rejection reasons.
- Keep uploaded files private while pending or rejected; access will follow submitter, administrator, and approved-material rules.
- Preserve existing row-level access controls and add the minimum storage and schema rules needed for files and onboarding preferences.

## Technical details

- Add optional file metadata to materials while retaining URL resources.
- Use a private `study-materials` storage bucket and short-lived authenticated download links.
- Add focused server functions for student submission, admin publishing, queue decisions, history reads, and notification sending.
- Add focused tests for validation and cold-start profile scoring, then run type checks, tests, database linting, and desktop/mobile queue walkthroughs.
- Email templates and sending will be scaffolded after a sender domain is configured; the rest of the workflow can be completed independently.
