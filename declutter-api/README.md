# Declutter API

NestJS API for Declutter, a Lagos-based peer-to-peer used-items marketplace.

## Local Setup

This workspace currently needs Node.js, PostgreSQL, Redis, and a repaired Git/Xcode CLI installation before commands can run. Once available:

```bash
npm install
cp .env.example .env
npm run knex:migrate
npm run start:dev
```

The Bani integration is implemented behind `PaymentProvider`. Fill in Bani merchant credentials and exact endpoint paths once the private merchant docs are available.
