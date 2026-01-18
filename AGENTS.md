# Repository Guidelines

This repository contains an Obsidian plugin that syncs the active note to Confluence using the REST API. Keep changes small and explicit, and preserve the Obsidian plugin scaffold.

## Project Structure & Module Organization
- `src/main.ts` is the plugin entry point (commands, sync flow, settings load/save).
- `src/confluence.ts` wraps Confluence REST API calls.
- `src/markdown.ts` converts Obsidian-flavored Markdown to Confluence storage HTML.
- `src/settings.ts` defines settings and the settings tab UI.
- `manifest.json`, `styles.css`, and built `main.js` make up the Obsidian plugin bundle.
- Build tooling lives in `rollup.config.js`, `tsconfig.json`, and `package.json`.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run build` produces `main.js` and `main.js.map` for distribution.
- `npm run dev` runs Rollup in watch mode for local iteration.
- `npm test` runs the Vitest suite.

## Coding Style & Naming Conventions
- TypeScript with 2-space indentation, semicolons, and double quotes (match existing files).
- Classes use `PascalCase` (e.g., `ConfluenceClient`), functions and variables use `camelCase`.
- Keep module filenames lowercase (e.g., `src/markdown.ts`).

## Testing Guidelines
- Tests live in `tests/` and run with Vitest.
- Prefer unit tests for conversion and API request shaping; integration tests should be optional and documented.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`) to keep history consistent.
- PRs should include a short description, steps to verify (e.g., sync a note), and screenshots only if UI changes are introduced.

## Security & Configuration Tips
- Confluence credentials are stored by Obsidian in the plugin data file (commonly `data.json` under `.obsidian/plugins/confluence-publisher/`); never commit secrets.
- Validate the Confluence base URL includes `/wiki` for Confluence Cloud (e.g., `https://your-domain.atlassian.net/wiki`).
