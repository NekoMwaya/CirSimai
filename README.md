# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## AI Assistant (Gemma 4)

The app includes an AI assistant chatbox that can call these AI Studio models:

- `gemma-4-26b-a4b-it`
- `gemma-4-31b-it`

### Setup

1. Install dependencies:

```bash
npm install
```

2. Set your API key in the same terminal session before running dev server:

```powershell
$env:GEMINI_API_KEY="your_api_key_here"
```

Or create `.env.local` in the project root:

```env
GEMINI_API_KEY=your_api_key_here
```

3. Start the app:

```bash
npm run dev
```

Open the left sidebar section **AI assistant** and click **Open chatbox**.
