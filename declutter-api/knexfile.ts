import "dotenv/config";
import type { Knex } from "knex";

const config: Record<string, Knex.Config> = {
  development: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: "./src/database/migrations",
      extension: "ts"
    },
    pool: {
      min: 0,
      max: 10
    }
  },
  test: {
    client: "pg",
    connection: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL,
    migrations: {
      directory: "./src/database/migrations",
      extension: "ts"
    }
  },
  production: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: "./dist/database/migrations",
      extension: "js"
    },
    pool: {
      min: 2,
      max: 20
    }
  }
};

export default config;
