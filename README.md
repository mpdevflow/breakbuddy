# BreakBuddy: Neon Coffee Edition

Caffeinated, sarcastic break companion built with React, Vite, Tailwind, and Zustand. Install dependencies with `pnpm install` once network access is available, then run `pnpm dev` to start the local server.

## Gemini setup

1. Create an API key in [Google AI Studio](https://makersuite.google.com/app/apikey).
2. Add the key to a `.env` file in project root:
   ```
   VITE_GEMINI_API_KEY=your-key-here
   ```
3. Restart the dev server so Vite exposes the key at runtime.
