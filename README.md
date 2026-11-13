# Weight Tally Calculator

A minimal, high-contrast, mobile-first 20-column weighing tally calculator built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **20-Column Tally Sheet**: Organized into two 10-column tiers (5 rows per column) with automatic column sums (shows `---` until all 5 rows in a column are filled).
- **Custom Built-in Keypad**: Large touch-friendly numeric keypad (`0–9`, `.5` shortcut button, and `Enter`) with physical keyboard support.
- **Total & Multiplier**: Displays total weight above the keypad, with optional multiplier calculation shown as `(total weight × multiplier = answer)`.
- **Save & Manage Lists**: Save completed sheets by name, view all saved weights, copy summaries to clipboard, or load any saved sheet back onto the grid.
- **Local Persistence**: Automatically saves your active sheet, multiplier, and saved lists in browser `localStorage`.

## Local Development

```bash
npm install
npm run dev
```

## Build & Typecheck

```bash
npm run lint
npm run build
```

## Deploy to Vercel

1. Push this repository to **GitHub**.
2. Import the repository in **Vercel** (`vercel.com/new`).
3. Vercel will automatically detect **Vite** using `vercel.json`:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy** (no environment variables are required).
