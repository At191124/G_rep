# Workout & Training Dashboard

A private, responsive dashboard for tracking workout sessions, exercise details, weekly progress, and training history.

## Features

- Clean dashboard layout with summary metrics
- Workout type filters for strength, cardio, mobility, and HIIT
- Expandable workout entries for quick review
- Local data storage using browser `localStorage`
- Minimal UI optimized for personal training journaling
- Ready for GitHub Pages hosting

## Run locally

Open the project folder in a browser directly or serve it locally:

```bash
cd c:\workdir\G_rep
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## GitHub Pages deployment

1. Create a new GitHub repository for this project.
2. Push the contents of this folder to the repository.
3. In GitHub, open the repository settings.
4. Navigate to Pages.
5. Set the source to the main branch and root folder (`/`).
6. Save and wait for the site to publish.

Your dashboard will then be available at a GitHub Pages URL such as:

```text
https://<your-user-name>.github.io/<repository-name>/
```

## Notes

- The app stores training data in the browser for privacy and simplicity.
- Data is not synced to a backend by default.
- To keep it private, maintain this project in a separate repository from work or research material.

## Project structure

```text
.
├── index.html
├── styles.css
├── script.js
├── README.md
```
