# AI-Powered Study Material Recommender

## Goal
Build the complete academic project described in the PDF: a responsive student learning portal and administrator console backed by real authentication, persistent data, explainable recommendations, ratings, activity history, and analytics.

## Product experience
- Replace the placeholder with a polished public welcome page for **StudyFlow AI**, with direct sign-in and registration paths.
- Use a clean, professional academic design: warm off-white canvas, deep ink navigation, teal primary actions, coral highlights, crisp cards, accessible typography, and restrained motion.
- Provide adaptive navigation and layouts for mobile, tablet, and desktop.
- Include complete loading, empty, validation, success, error, unauthorized, and not-found states.

## Student experience
- Email/password and Google authentication, registration with enrolled subjects, secure session persistence, logout, and account-aware redirects.
- Student dashboard with welcome summary, learning statistics, recommendations, continue-learning history, popular and recent materials, and enrolled subjects.
- Search across title, description, subject, topic, and tags with subject/type/rating filters, sorting, pagination, recent searches, result totals, and clear filters.
- Material details with external resource access, view tracking, rating distribution, reviews, and one editable 1–5 star rating per student.
- Dedicated recommendations page grouped by personalized, enrolled-subject, recent-search, highly-rated, and recently-added signals.
- Profile and history pages for profile details, enrolled subjects, preferences, searches, viewed materials, ratings, reviews, and activity.

## Explainable recommendation engine
- Implement separate profile analysis, keyword extraction, TF-IDF vectorization, cosine similarity, collaborative scoring, subject preference, rating quality, recent-interest scoring, and score aggregation modules.
- Rank and persist the top 10 recommendations using centralized weights: content 50%, collaborative 25%, subject 15%, rating 10%, with recent-interest folded into relevant signals.
- Generate truthful explanations from the signals that contributed to each score.
- Include cold-start behavior based on enrolled subjects, relevance, ratings, popularity, and recency.
- Refresh affected recommendations after searches, subject changes, material views, ratings, and material edits.

## Administrator experience
- Server-validated administrator access using a separate role table; ordinary registration always creates students.
- Dashboard with real totals, trends, popular subjects, rating distribution, most-recommended materials, user activity, and quick actions.
- Complete material management: create, view, search, filter, sort, edit, categorize, validate, and safely delete.
- Subject management with unique names, material/enrollment/popularity counts, editing, and guarded deletion.
- Reports for student activity, recommendation ranking, subject popularity, ratings, and system usage, plus CSV export.

## Data and security
- Create normalized tables for profiles, user roles, subjects, enrollments, materials, ratings, search logs, recommendations, and material views.
- Add indexes, foreign keys, timestamps, rating constraints, uniqueness rules, aggregate-maintenance functions, and safe deletion behavior.
- Enable row-level security and explicit grants on every table; public catalog reads remain narrow, student data is self-scoped, and all administration is role-checked server-side.
- Seed 8 required subjects, 48 realistic learning resources, and enough rating/search/view/recommendation activity to populate the experience and reports.
- Use Lovable Cloud authentication; no passwords, secrets, or privileged credentials appear in browser code.

## Technical implementation
- Keep TanStack Start file-based routing and use authenticated route layouts for student and admin sections.
- Use generated Cloud clients in the browser and authenticated server functions for writes, recommendation generation, and reports.
- Use Zod validation, TanStack Query caching/invalidation, Sonner notifications, Recharts, semantic Tailwind tokens, and reusable design-system controls.
- Add route-specific metadata for every content page and update the root document language/branding.
- Add focused tests for text processing, cosine similarity, weighted scoring, validation, rating aggregation, and key access rules.
- Replace the starter README with project overview, architecture, DFD mapping, schema, recommendation method, routes, setup, demo flow, and testing checklist.

## Validation
- Verify schema grants and security policies with the database linter.
- Run targeted automated tests.
- Exercise registration/login, search/filter/pagination, recommendations, resource viewing, ratings, profile updates, admin CRUD, reports, and CSV export.
- Visually inspect the main student and admin journeys at desktop and mobile widths, correcting overflow, overlap, and accessibility issues.
