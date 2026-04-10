import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.PROD_DATABASE_URL) {
  throw new Error("PROD_DATABASE_URL must be set to push schema to production");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.PROD_DATABASE_URL,
  },
});
