# Brain Monitor Dashboard

An ultra-modern, dark-mode React dashboard that visualizes the internal state of a custom AI Cognitive Architecture in real time.

## Features

- **Interaction Arena** — Chat terminal with AI responses, thumbs up/down reinforcement feedback, and memory source badges
- **Working Memory Viewer** — Syntax-highlighted JSON viewer showing the AI's active context
- **Catastrophic Forgetting Monitor** — Line chart tracking Task A vs Task B accuracy across training episodes
- **Semantic Memory Graph** — SVG node-edge graph of concept relationships
- **Episodic Memory Clusters** — Scatter chart plotting past experiences in vector space
- **Sleep Cycle Consolidation** — Animated progress bar for memory consolidation

## Tech Stack

- React 18 + Vite
- TypeScript
- Tailwind CSS v4
- Recharts
- Lucide React

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

## Local Setup

### 1. Clone / extract the project

```bash
unzip brain-monitor.zip
cd brain-monitor
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start the development server

```bash
pnpm dev
```

The app will be available at **http://localhost:5173** (or the next available port shown in your terminal).

## Project Structure

```
brain-monitor/
├── src/
│   ├── pages/
│   │   └── Dashboard.tsx   # Main dashboard with all panels
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles + Tailwind theme
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Standalone Setup (outside the monorepo)

If you extracted just the `brain-monitor` folder from the monorepo, create this `package.json` in the root:

```json
{
  "name": "brain-monitor",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.511.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "recharts": "^2.15.3"
  },
  "devDependencies": {
    "@types/react": "^19.1.5",
    "@types/react-dom": "^19.1.5",
    "@vitejs/plugin-react": "^4.5.2",
    "tailwindcss": "^4.1.7",
    "typescript": "~5.9.2",
    "vite": "^7.3.1"
  }
}
```

Then run:

```bash
pnpm install
pnpm dev
```

## Build for Production

```bash
pnpm build
```

Output goes to the `dist/` folder. Serve it with any static file server:

```bash
pnpm preview
# or
npx serve dist
```
