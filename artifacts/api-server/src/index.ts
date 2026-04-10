import app from "./app";
import { logger } from "./lib/logger";
import { autoSeedIfEmpty } from "./auto-seed";
import { runMigrations } from "./migrate";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function fixDemoPasswords() {
  const HASH = "$2b$10$7pybBhnXXUJZ8LZcyNZk7ODhL6j1QlKwS./ZPgolyWJSge1sEjonC";
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE admins SET password_hash = $1 WHERE email = 'admin@blacktievoip.co.za'`,
      [HASH]
    );
    await client.query(
      `UPDATE resellers SET password_hash = $1 WHERE email = 'reseller@blacktievoip.co.za'`,
      [HASH]
    );
    logger.info("[startup] Demo account passwords ensured (password123)");
  } catch (err) {
    logger.warn({ err }, "[startup] Could not fix demo passwords");
  } finally {
    client.release();
  }
}

const isProduction = process.env.NODE_ENV === "production";

runMigrations()
  .then(() => isProduction ? Promise.resolve() : autoSeedIfEmpty())
  .then(() => isProduction ? Promise.resolve() : fixDemoPasswords())
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Startup failed, starting server anyway");
    app.listen(port, (err2) => {
      if (err2) {
        logger.error({ err: err2 }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  });
