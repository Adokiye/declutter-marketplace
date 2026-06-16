# Declutter MVP Workspace

This workspace contains two separate project directories:

- `declutter-api`: NestJS, Knex, Objection, PostgreSQL, BullMQ, Socket.IO, Bani payment adapter.
- `declutter-web`: Next.js App Router, TypeScript, Tailwind, shadcn-style components.

## Current Machine Notes

The projects are scaffolded as source files. This machine does not currently have `node`, `npm`, `pnpm`, Docker, Postgres, Redis, or a working `git` command available on `PATH`. Git fails because the Apple Command Line Tools path is broken:

```bash
xcrun: error: invalid active developer path (/Library/Developer/CommandLineTools)
```

After installing the toolchain, initialize each directory separately:

```bash
cd declutter-api && git init
cd ../declutter-web && git init
```

## Expected Local Run

```bash
cd declutter-api
npm install
docker compose up -d
cp .env.example .env
npm run knex:migrate
npm run start:dev
```

```bash
cd declutter-web
npm install
cp .env.example .env.local
npm run dev
```
