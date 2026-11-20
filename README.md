# Glam & Graph — Algebra 1 OST Makeup Studio

An interactive Algebra 1 Ohio State Test (OST) review game paired with a realistic makeup studio featuring 6 models (light to deep skin tones), 13 makeup zones, physical cursor brush/wipe painting, 300 playbook-aligned problems with vertical fractions and raised exponents, mandatory same-type redo on missed questions, and per-topic + daily correct/incorrect tracking.

## Features

- **300 Algebra 1 OST Problems** organized across all 10 Playbook topic sheets (30 problems per sheet) with vertical fractions and proper raised superscript exponents.
- **Same-Type Redo Practice**: Missing a question generates a fresh variation of the exact same skill subtype before moving on.
- **Correct & Incorrect Over Time**: Tracks overall correct/incorrect counts, accuracy percentages, per-topic breakdowns, and a daily stacked history chart in the **OST Topics (300)** tab.
- **Physical Cursor Makeup Studio**: Apply foundation, concealer, contour, blush, highlighter, eyebrows, eyeshadow, eyeliner, mascara, lipliner, lipstick, and lip gloss directly with your cursor across 6 realistic models.
- **Earnable Tools & Tiered Shades**: Answer OST problems to earn Glam Stars (`1★`) to unlock brushes (`Fine Detail`, `Fluffy Blend`), `Makeup Remover Wipe`, extra zones, Pro finishes (`Classic`, `Glam`), and unique shades (`1★`–`5★`).
- **Google Sign-In & Saved Looks Gallery**: Sign in with Google (Firebase Auth + Firestore) to save painted model figures and sync progress across devices. Progress is also saved locally in `localStorage` so students can practice immediately even without signing in.

## Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server (port 3000):**
   ```bash
   npm run dev
   ```

3. **Type-check and build for production:**
   ```bash
   npm run lint
   npm run build
   ```

## Publishing to GitHub & GitHub Pages

1. Push this repository to GitHub (default branch `main`).
2. In your GitHub repository, go to **Settings -> Pages**.
3. Under **Build and deployment -> Source**, select **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` workflow automatically runs `npm ci`, `npm run build`, and deploys `dist/` to `https://<your-username>.github.io/<your-repo>/`.
   - `vite.config.ts` uses `base: './'` so all assets resolve correctly on any GitHub Pages subpath.

### Enabling Google Sign-In on Your GitHub Pages URL

Firebase Authentication restricts Google Sign-In popups to authorized domains:

1. Open [Firebase Console](https://console.firebase.google.com/) and select project **`gen-lang-client-0363503334`**.
2. Go to **Authentication -> Settings -> Authorized domains**.
3. Click **Add domain** and add `<your-username>.github.io`.

Until the domain is added, students can still practice all 300 OST problems, paint makeup, and track their topic/daily stats locally in the browser.
