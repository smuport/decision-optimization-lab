import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const localDatabaseUrl =
  'postgresql://decision_lab:decision_lab_dev@127.0.0.1:55432/decision_lab?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DECISION_LAB_DATABASE_URL ?? localDatabaseUrl,
  },
});
