# Hackathon Sponsor Display (GitHub Pages Ready)

A simple static website for hackathon sponsor/event boards with:

- Fullscreen pinned hero image
- Scrollable second image section
- Configurable timer (countdown or stopwatch)
- Timer position controls (horizontal and vertical offsets)
- Timer display modes: floating, inline, hidden
- In-page settings panel
- Shareable config link for use across different devices

## Run locally

Open `index.html` in a browser, or use VS Code Live Server.

## Deploy on GitHub Pages

1. Push this project to a GitHub repository.
2. On GitHub, open repository **Settings**.
3. Go to **Pages**.
4. Under **Build and deployment**, choose:
   - **Source**: Deploy from a branch
   - **Branch**: `main` (or your default), folder `/root`
5. Save and wait for deployment.
6. Your site will be available at:
   - `https://<your-username>.github.io/<repo-name>/`

## Customize while hosted

1. Open the hosted page.
2. Click **Customize View**.
3. Set image URLs, timer type, hours/minutes/seconds, and offset values.
4. Click **Apply**.
5. Use **Copy shareable link** to copy a URL that contains your current setup.

## Notes

- Settings are saved in browser local storage.
- The shareable link is best when using image URLs.
- If you use uploaded files, they are encoded as data URLs and can make links very long.
