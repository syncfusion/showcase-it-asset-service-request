# IT Asset and Service Request Portal

The IT Asset and Service Request Portal is an enterprise-grade Syncfusion showcase application built as a Syncfusion-powered React client that runs entirely in the browser.

The application demonstrates how a mid-sized IT organization can visualize, track, and manage assets, service requests, knowledge articles, and handovers from a single-page workspace. Every dashboard, grid, chart, workflow, form, and notification is driven by deterministic local fixtures — there is no Web API, no backend service, and no database required to run or explore the showcase. It showcases how Syncfusion UI components and Syncfusion Code Studio accelerate enterprise application development.

> This is a showcase application with deterministic sample data. It is not intended to be used as a production IT service management system without adding production authentication, authorization, audit logging, ticket ownership, secrets management, and operational controls.

## What the showcase includes

- Operations dashboard with KPI cards, 14-day request-volume column chart, and SLA health doughnut chart
- Asset inventory page with filter rail, toolbar, and a detail modal that exposes per-asset timeline and documents
- Service Requests page with a kanban board, column filtering, priority chips, and a "New request" dialog
- Knowledge base page with category rail, search, result grid, and an article side panel with feedback
- Handover page with a three-section enterprise form (Asset & custody, Transfer details, Acknowledgment)
- Responsive layout with light/dark theme toggle, collapsible sidebar, accessible top app bar, and breadcrumb trail
- Toast notifications, inline loading skeletons, and placeholder affordances for future PDF / export surfaces

## Technology

| Layer | Technology |
| --- | --- |
| API | None — the application is a static React SPA with no backend, no Web API, and no database |
| React client | React 19, TypeScript, Vite, Syncfusion React UI 34.x |
| Data | Deterministic JSON fixtures under `src/data/` imported directly into the UI layer |

The UI implementation uses Syncfusion components specifically chosen for the IT asset and service-request workflow:
- DataGrid and Kanban (asset inventory and request board)
- Charts — Column and Pie (request volume and SLA health)
- Dialog, Sidebar, and Toast (modals, mobile drawer, notifications)
- Button, DropDownButton, TextBox, and DropDownList (actions, filters, forms)
- AppBar and Sidebar (top-level application shell and navigation)

Because every feature consumes local JSON fixtures directly, the showcase compiles and runs with only Node.js and npm — no service startup, no connection strings, and no CORS configuration are required.

## Why Syncfusion Code Studio and UI components?

This repository is a practical proof of how [Syncfusion Code Studio](https://www.syncfusion.com/code-studio/) and the [Syncfusion component ecosystem](https://www.syncfusion.com/) can accelerate component-rich enterprise development.

- Code Studio can help teams plan features, generate and refine code, debug issues, and create tests with awareness of the existing codebase.
- Production-oriented UI components reduce the amount of custom code required for advanced grids, charts, kanban boards, dialogs, theming, and interactive assists.
- Built-in capabilities such as filtering, grouping, paging, sorting, responsive rendering, accessibility, and theming help teams focus on service-delivery workflows rather than foundational UI infrastructure.

## Repository structure

```text
showcase-it-assets-service-request/
├── it-assets-service-request/   # React 19 + Vite + TypeScript client (Syncfusion EJ2 34.x)
│   ├── src/                     # App, pages, components, data, hooks, types, styles
│   │   ├── components/          # Shared shell + per-page components
│   │   │   ├── AppBar.tsx
│   │   │   ├── AppShell.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── assets/          # Asset grid, filters, detail modal, handover form
│   │   │   ├── dashboard/       # KPI cards, charts, Grid
│   │   │   ├── knowledge/       # KB category rail, toolbar, grid, side panel
│   │   │   └── requests/        # Kanban board, toolbar, new-request dialog
│   │   ├── data/                # Local mock fixtures
│   │   │   ├── assets.json
│   │   │   ├── assetDetail.json
│   │   │   ├── dashboard.json
│   │   │   ├── knowledge.json
│   │   │   ├── notifications.ts
│   │   │   ├── people.json
│   │   │   └── requests.json
│   │   ├── hooks/               # Shared hooks (theme, etc.)
│   │   ├── pages/               # Dashboard, Assets, Requests, Knowledge, Handover
│   │   ├── types/               # TypeScript models
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── public/                  # Static assets
│   ├── build/                   # Production build output
│   ├── server.cjs               # Optional Node static server for the built client
│   ├── vite.config.ts           # Vite config with base path
│   ├── package.json             # Design system tokens and component specs
└── README.md
```

## Run locally

### Prerequisites

- A current Node.js LTS release and npm
- A valid Syncfusion license or trial where required

### 1. Install dependencies

```bash
cd it-assets-service-request
npm install
```

### 2. Start the React client

```bash
npm run dev
```

- Vite dev server runs at `http://localhost:3000` by default.
- The app is built to be served from the **`/it-asset-service-portal/react/`** base path (set in [vite.config.ts](it-assets-service-request/vite.config.ts)).

The page will hot-reload when you make changes. There is no backend service to start first.

### 3. (Optional) Serve the built React app from the Node static server

```bash
npm run build
npm start            # node server.cjs, listens on 0.0.0.0:8080
```

This is what production hosts use. The browser-side Syncfusion license can be injected either at build time via `VITE_SYNCFUSION_LICENSE` in `.env.local` or at runtime by editing `public/config.js`.

### 4. (Optional) Preview the production build locally

```bash
npm run preview
```

## Pages

The React app is a single-page workspace mounted at the `/it-asset-service-portal/react/` base path. Routes are defined in [src/App.tsx](it-assets-service-request/src/App.tsx) and page files live in [src/pages](it-assets-service-request/src/pages).

| Route | Page | Description |
| --- | --- | --- |
| `/` | **Dashboard** | Operations dashboard — KPI strip, request-volume column chart, SLA health doughnut, and Grid. |
| `/assets` | **Assets** | Asset inventory grid with filter rail, row-click detail modal, and "Start handover" affordance. |
| `/requests` | **Requests** | Service-request kanban board with column filtering, priority chips, search, and a "New request" dialog. |
| `/knowledge` | **Knowledge** | Knowledge-base grid with category rail, search, result list, and article side panel with feedback. |
| `/handover` | **Handover** | Three-section handover form: Asset & custody, Transfer details, and Acknowledgment. |
| `/handover?asset=<id>` | **Handover** | Same handover form with a specific asset preselected from the local fixture. |

## Data

**All data in this application is mocked.** There is no Web API or backend service. Every dashboard, grid, workflow, chart, form, notification, and assistance surface reads from local JSON fixtures under [src/data](it-assets-service-request/src/data).

| Fixture | Purpose |
| --- | --- |
| `src/data/assets.json` | Asset inventory rows, statuses, owners, locations, and purchase dates. |
| `src/data/assetDetail.json` | Per-asset timeline events, documents, and related tickets. |
| `src/data/dashboard.json` | KPI values, 14-day request-volume series, SLA health buckets, and AI assistant seed conversation. |
| `src/data/knowledge.json` | Knowledge-base articles, categories, and article bodies. |
| `src/data/notifications.ts` | AppBar notification dropdown items. |
| `src/data/people.json` | People directory used by the handover form and People Picker. |
| `src/data/requests.json` | Kanban columns, priority filters, owner options, SLA options, and request cards. |

In-memory hooks such as `useDashboardData`, `useAssetsData`, `useRequestsData`, `useKnowledgeData`, and `useAssetDetail` import these fixtures directly. Mutations made in the UI (for example, creating a new request on the kanban board or recording KB feedback) are held only in React state for the current browser session; refreshing the page re-reads the original seed fixtures.

There is no `/api/dashboard`, `/api/assets`, `/api/requests`, `/api/knowledge`, `/api/notifications`, or `/api/handover` surface in this codebase.

## Build

```bash
cd it-assets-service-request
npm run build
```

The production bundle is written to the `build` folder with hashed static asset filenames.

## Resetting demo data

There is no persisted data to reset. All source data lives in the JSON files under [src/data](it-assets-service-request/src/data). A hard reload of the React app re-reads the seed catalogue. Any in-session changes (new requests, kanban moves, KB feedback, form drafts) are discarded when the tab is refreshed.

## Licensing

Syncfusion packages are governed by Syncfusion's licensing terms. Review the [Syncfusion licensing documentation](https://www.syncfusion.com/sales/licensing) before redistributing or deploying the applications. Publishing this source repository does not grant a license to Syncfusion products.

## Intended audience

This showcase is useful for engineering leaders, architects, IT operations teams, and developers evaluating how a modern IT asset and service-request workspace can be implemented entirely on the frontend with local fixtures and Syncfusion components, with Syncfusion Code Studio delivering production-ready UI and data-binding capabilities.
