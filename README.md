# CHAMPION

Race your friends to the solution. Everyone gets a workspace, everyone watches
everyone, first correct submission wins.

## What exists so far (Step 1)

The project skeleton, the database schema, and a landing page. Nothing is
functional yet — no accounts, no rooms, no judging. That's deliberate: the data
model is the foundation everything else sits on, so it comes first.

## Getting it running

You need **Node 18.18 or newer** and a **Postgres database**.

### 1. Install dependencies

```bash
cd champion
npm install
```

### 2. Get a Postgres database

Easiest option — a free hosted one from [Neon](https://neon.tech) or
[Supabase](https://supabase.com). Sign up, create a project, copy the connection
string.

Or run one locally with Docker:

```bash
docker run --name champion-db \
  -e POSTGRES_USER=champion \
  -e POSTGRES_PASSWORD=champion \
  -e POSTGRES_DB=champion \
  -p 5432:5432 -d postgres:16
```

### 3. Point the app at it

```bash
cp .env.example .env
```

Open `.env` and paste your connection string into `DATABASE_URL`.

### 4. Create the tables

```bash
npm run db:generate   # builds the typed client from schema.prisma
npm run db:push       # creates the tables in your database
```

### 5. Start it

```bash
npm run dev
```

Open http://localhost:3000

To see your tables with actual rows in them, run `npm run db:studio`.

## Project map

```
champion/
├── prisma/
│   └── schema.prisma      the database design — start reading here
├── src/
│   ├── app/
│   │   ├── layout.tsx     wraps every page (fonts, <html>, metadata)
│   │   ├── page.tsx       the landing page at /
│   │   └── globals.css    design tokens and base styles
│   └── components/
│       └── WorkspaceGrid.tsx
├── .env                   your secrets — never commit this
└── package.json           dependencies and the npm scripts above
```

## Roadmap

- [x] **Step 1** — skeleton and data model
- [ ] **Step 2** — accounts, room creation, live presence
- [ ] **Step 3** — the workspace grid with real editors
- [ ] **Step 4** — problem bank and the judge
- [ ] **Step 5** — match logic and winner detection
- [ ] **Step 6** — voice chat
