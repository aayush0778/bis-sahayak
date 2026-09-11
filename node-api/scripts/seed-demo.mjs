// Seed demo accounts + starter content so the live demo never starts from zero.
// Idempotent: safe to re-run. Usage: node node-api/scripts/seed-demo.mjs
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL || "postgresql://bis:bis@localhost:5432/bis";
const pool = new Pool({ connectionString });

const DEMO_PASSWORD = "Sahayak@123";

const USERS = [
  {
    email: "business@demo.bis",
    role: "business",
    businessName: "Suvidha Appliances Pvt. Ltd.",
    watches: ["household electrical appliances", "aluminium utensils", "pressure cookers"],
  },
  {
    email: "consumer@demo.bis",
    role: "consumer",
    businessName: null,
    watches: [],
  },
];

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const user of USERS) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, role, business_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, business_name = EXCLUDED.business_name
       RETURNING id`,
      [user.email, hash, user.role, user.businessName],
    );
    const userId = rows[0].id;
    for (const category of user.watches) {
      await pool.query(
        `INSERT INTO watches (user_id, product_category) VALUES ($1, $2)
         ON CONFLICT (user_id, product_category) DO NOTHING`,
        [userId, category],
      );
    }
    console.log(`[seed-demo] ensured ${user.email} (role=${user.role}, watches=${user.watches.length})`);
  }
  console.log(`[seed-demo] demo password for both accounts: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("[seed-demo] FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
