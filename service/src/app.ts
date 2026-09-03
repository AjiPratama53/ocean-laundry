import express from "express";
import { ordersRouter } from "./routes/orders.ts";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = express();
app.use(express.json());
app.use("/v1", ordersRouter);

app.get("/health", (_req, res) => res.sendStatus(200));

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`listening on ${port}`));