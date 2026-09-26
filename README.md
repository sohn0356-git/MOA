# MOA

MOA means **My Own Apps**. It is a personal web app platform designed to host many small, independent sub apps in one installable PWA.

This initial setup focuses on the platform foundation: React, TypeScript, Vite, PWA support, GitHub Pages deployment, and an app registry that makes future sub apps easy to add.

## Tech Stack

- React
- TypeScript
- Vite
- vite-plugin-pwa
- GitHub Pages
- GitHub Actions
- npm

## Local Development

```bash
npm install
npm run dev
```

The development server will print a local URL, usually `http://localhost:5173/MOA/`.

## Build

```bash
npm run build
```

The production build is written to `dist/`.

## Lint

```bash
npm run lint
```

## GitHub Pages Deployment

This repository is named `MOA`, so Vite is configured with:

```ts
base: '/MOA/'
```

The PWA manifest also uses `/MOA/` for `start_url` and `scope`, so the deployed app works at:

```text
https://sohn0356-git.github.io/MOA/
```

Deployment is handled by `.github/workflows/deploy.yml`. On every push to `main`, GitHub Actions runs:

1. Checkout
2. Setup Node
3. `npm ci`
4. `npm run build`
5. Upload the `dist` artifact
6. Deploy to GitHub Pages

## PWA

MOA is configured as an installable PWA through `vite-plugin-pwa`.

Current PWA defaults:

- `name`: `MOA - My Own Apps`
- `short_name`: `MOA`
- `display`: `standalone`
- `theme_color`: `#146c43`
- `background_color`: `#f6f7f4`
- Offline support through Workbox precaching
- App icons in `public/`

To install it in Chrome after deployment, open the GitHub Pages URL and use Chrome's install button in the address bar or app menu.

## Project Structure

```text
src/
  app/          Root application shell
  apps/         Independent sub apps and app registry
  components/   Shared UI components
  hooks/        Shared React hooks
  services/     Shared service modules
  store/        Shared state modules
  types/        Shared TypeScript types
  utils/        Shared utilities
```

## Adding a Sub App

Create a new folder under `src/apps/`.

Example:

```text
src/apps/memo/
  MemoApp.tsx
  MemoIcon.tsx
```

Then register it in `src/apps/registry.ts`:

```ts
import { MemoApp } from './memo/MemoApp'
import { MemoIcon } from './memo/MemoIcon'

export const appRegistry: AppMeta[] = [
  {
    id: 'memo',
    name: 'Memo',
    description: 'Capture quick notes.',
    icon: MemoIcon,
    route: '#/memo',
    component: MemoApp,
  },
]
```

Each registry item supports:

- `id`
- `name`
- `description`
- `icon`
- `route`
- `component`

The home screen renders the app grid from this registry.

## GitHub Repository Settings

In GitHub, open **Settings > Pages** and set:

- Source: **GitHub Actions**

No API keys or repository secrets are required for the current setup.
