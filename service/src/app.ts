import "dotenv/config";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

import express from "express";
import { ordersRouter } from "./routes/orders.js";
import { packagesRouter } from "./routes/packages.js";
import { paymentsRouter } from "./routes/payments.js";
import { authenticate } from "./auth/authenticate.js";

const app = express();
app.use(express.json());
app.use(authenticate);
app.use("/v1", ordersRouter);
app.use("/v1", packagesRouter);
app.use("/v1", paymentsRouter);
app.get("/health", (_req, res) => res.sendStatus(200));

if (require.main === module) {
  const port = process.env.PORT ?? 3000;
  app.listen(port, () =>
    console.log(`Listening on http://localhost:${port}/v1/`),
  );
}

export default app;
