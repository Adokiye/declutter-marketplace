import { Global, Module, OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import knex, { Knex } from "knex";
import { knexSnakeCaseMappers } from "objection";
import { BaseModel } from "../database/models";
import { KNEX } from "./knex.constants";

@Global()
@Module({
  providers: [
    {
      provide: KNEX,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connection = config.get<string>("DATABASE_URL");
        const db = knex({
          client: "pg",
          connection,
          pool: { min: 0, max: 10 },
          ...knexSnakeCaseMappers()
        });
        BaseModel.knex(db);
        return db;
      }
    },
    {
      provide: "KNEX_SHUTDOWN",
      inject: [KNEX],
      useFactory: (db: Knex) =>
        new (class implements OnApplicationShutdown {
          async onApplicationShutdown() {
            await db.destroy();
          }
        })()
    }
  ],
  exports: [KNEX]
})
export class KnexModule {}
