import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// In production (NODE_ENV=production), PROD_DATABASE_URL is required — no fallback.
// This ensures the production app never accidentally connects to the dev database.
// In development, DATABASE_URL is used exclusively.
const isProduction = process.env.NODE_ENV === "production";

let connectionString: string | undefined;
if (isProduction) {
  if (!process.env.PROD_DATABASE_URL) {
    throw new Error(
      "PROD_DATABASE_URL must be set in production. " +
      "Configure this secret in your deployment environment."
    );
  }
  connectionString = process.env.PROD_DATABASE_URL;
  console.log("[db] Connected to PRODUCTION database");
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }
  connectionString = process.env.DATABASE_URL;
  console.log("[db] Connected to DEVELOPMENT database");
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[db] Pool client error (will reconnect automatically):", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
export { eq, and, or, ne, sql, gte, lte, inArray, isNull, isNotNull, desc, asc, count, like, ilike, notInArray } from "drizzle-orm";
