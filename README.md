# StudyFlow AI

A full-stack study material recommender for computing students. It combines a curated academic catalog with explainable content ranking, learning history, ratings, reviews, subject preferences, and administrator analytics.

## Features

### Students
- Email/password and Google sign-in
- Personalized dashboard and cold-start recommendations
- Search by keyword, subject, and material format
- Explainable hybrid recommendation scores
- Material details, external resource opening, ratings, and reviews
- Learning history and editable subject enrollment

### Administrators
- Role-protected administration area
- Catalog and subject management
- Live catalog metrics and rating reports
- CSV report export

## Recommendation approach

The ranking engine tokenizes titles, descriptions, tags, subjects, and learner-interest text. Cosine similarity supplies the content signal, combined with peer popularity, enrolled-subject fit, and rating quality using these weights:

- Content relevance: 50%
- Peer signals: 25%
- Subject fit: 15%
- Quality: 10%

Each result includes a plain-language reason. New learners receive quality- and popularity-based results until their own signals are available.

## Data and security

The Lovable Cloud database contains profiles, separate role assignments, subjects, enrollments, materials, ratings, searches, views, and recommendations. Row-level access rules restrict private activity to its owner and all administrator writes require a verified administrator role. Public catalog reads expose only learning-resource data.

The starter dataset contains 8 subjects and 48 learning materials.

## Local development

```sh
npm install
npm run dev
```

The application expects the Lovable Cloud environment variables supplied by the project environment.
