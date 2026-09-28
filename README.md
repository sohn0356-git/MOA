# MOA

MOA means **My Own Apps**. It is a personal web app platform designed to host many small, independent sub apps in one installable PWA.

This initial setup focuses on the platform foundation: React, TypeScript, Vite, PWA support, GitHub Pages deployment, and an app registry that makes future sub apps easy to add.

## Tech Stack

- React
- TypeScript
- Vite
- vite-plugin-pwa
- Firebase
- Firebase Realtime Database
- GitHub Pages
- GitHub Actions
- npm

## Local Development

```bash
npm install
npm run dev
```

The development server will print a local URL, usually `http://localhost:5173/MOA/`.

For Firebase-backed apps, create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Then fill in the six Vite Firebase variables. Do not commit `.env`.

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

## Firebase Configuration

Firebase initialization lives in `src/services/firebase.ts`.

The project uses exactly these six environment variables:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Local values belong in `.env`, which is ignored by Git. The committed template is `.env.example`.

For GitHub Pages production builds, `.github/workflows/deploy.yml` maps the same six GitHub Actions Secrets into the `npm run build` step so Vite exposes them through `import.meta.env.VITE_FIREBASE_*`.

Firebase Console must also be configured for Authentication:

1. Open **Authentication > Get started**.
2. Open **Sign-in method** and enable **Google**.
3. Open **Settings > Authorized domains** and add:
   - `localhost`
   - `sohn0356-git.github.io`
4. Confirm the six `VITE_FIREBASE_*` values come from the same Firebase Web app and project.

If login shows `auth/configuration-not-found`, Google Authentication is not enabled for the Firebase project behind the deployed API key, or the deployed secrets point at the wrong project.

## Do List Realtime Database Structure

The Do List app stores tasks and categories by authenticated user in Firebase Realtime Database:

```text
users
  {uid}
    categories
      {categoryId}
        name
        parentId
        order
        createdAt
        updatedAt
    tasks
      {taskId}
        categoryId
        content
        status
        createdAt
        updatedAt
```

Allowed task statuses:

```ts
type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'
```

Realtime Database access is separated from UI code:

```text
src/apps/do-list/
  components/
  hooks/useTasks.ts
  services/taskService.ts
  types/task.ts
  DoListApp.tsx
```

`taskService.ts` uses `push()`, `set()`, `update()`, `remove()`, `serverTimestamp()`, and `onValue()` for realtime synchronization.

The project intentionally keeps the Firebase environment contract to the six existing Vite variables. Realtime Database is initialized from `VITE_FIREBASE_PROJECT_ID` using the default instance URL pattern:

```text
https://{projectId}-default-rtdb.firebaseio.com
```

Create the default Realtime Database instance in Firebase Console before using the Do List app.

## GitHub Repository Settings

In GitHub, open **Settings > Pages** and set:

- Source: **GitHub Actions**

For Firebase-backed production builds, add these **Actions Secrets**:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
