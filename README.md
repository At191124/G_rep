# Workout & Training Dashboard

A private, responsive dashboard for tracking workout sessions, exercise details, weekly progress, and training history.

This version is designed for GitHub Pages only. There is no local machine service, no backend, and no Node process required.

## Features

- Clean dashboard layout with summary metrics
- Workout type filters for strength, cardio, mobility, and HIIT
- Expandable workout entries for quick review
- Message editor hidden behind a password-protected admin page
- Public dashboard reads from a GitHub-hosted data file, so it does not rely on browser storage for live data
- Static deployment only, so the app runs from GitHub without a machine staying on

## GitHub Pages deployment

1. Push this project to a GitHub repository.
2. Open the repository in GitHub.
3. Go to Settings > Pages.
4. Set the source to the main branch and the root folder (`/`).
5. Save and wait for the site to publish.

The site will be available at a GitHub Pages URL like:

```text
https://your-user-name.github.io/your-repo-name/
```

## Admin access

The admin page is intentionally hidden from the public dashboard. It lives at:

```text
https://your-user-name.github.io/your-repo-name/admin.html
```

Use the password:

```text
workout-admin-2026
```

## Notes

- This is a static GitHub-only project, so there is no live backend or remote database.
- The public dashboard reads the live workout data from the repository file at `data/workouts.json`.
- The admin page can optionally sync that same file to GitHub by pasting a personal access token in the hidden editor.
- The admin page is not linked from the public screen to keep it less visible.

## Project structure

```text
.
├── index.html
├── admin.html
├── script.js
├── styles.css
├── README.md
``` 
