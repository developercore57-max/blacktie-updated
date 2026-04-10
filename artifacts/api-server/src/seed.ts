import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminsTable, companySettingsTable } from "@workspace/db";
import { eq } from "@workspace/db";

async function seed() {
  const passwordHash = await bcrypt.hash("Admin1234!", 10);

  const existing = await db.select().from(adminsTable).where(eq(adminsTable.email, "admin@blacktievoip.co.za"));
  if (existing.length > 0) {
    await db.update(adminsTable).set({ passwordHash }).where(eq(adminsTable.email, "admin@blacktievoip.co.za"));
    console.log("Admin password updated with bcryptjs hash");
  } else {
    await db.insert(adminsTable).values({
      email: "admin@blacktievoip.co.za",
      passwordHash,
      name: "Super Admin",
      phone: "+27 11 000 0000",
      role: "admin",
      isActive: true,
    });
    console.log("Admin user created");
  }

  console.log("Login credentials:");
  console.log("  Email: admin@blacktievoip.co.za");
  console.log("  Password: Admin1234!");

  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
