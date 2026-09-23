import "dotenv/config";
import { Pool } from "pg";
import { fileURLToPath } from "url";

const databaseUrl = process.env.DATABASE_URL ?? "";
const isLocalDb = /localhost|127\.0\.0\.1/.test(databaseUrl);

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

import express from "express";
import { ordersRouter } from "./routes/orders.js";
import { packagesRouter } from "./routes/packages.js";
import { paymentsRouter } from "./routes/payments.js";
import { authenticate } from "./auth/authenticate.js";
import { httpLogger, logger } from "./logger.js";

const app = express();
app.use(httpLogger);
app.use(express.json());
app.use(authenticate);
app.use("/v1", ordersRouter);
app.use("/v1", packagesRouter);
app.use("/v1", paymentsRouter);
app.get("/health", (_req, res) => res.sendStatus(200));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT ?? 3000;
  app.listen(port, () =>
    logger.info(`Listening on http://localhost:${port}/v1/`),
  );
}

export default app;
