"""Seed the two demo accounts (port of node-api/scripts/seed-demo.mjs).

bcrypt hashes are compatible between the Python bcrypt package and bcryptjs,
so node-api login verification works unchanged.

Usage: python seed_demo_users.py   (DATABASE_URL from env)
"""
from common import connect

DEMO_PASSWORD = "Sahayak@123"

USERS = [
    {
        "email": "business@demo.bis",
        "role": "business",
        "businessName": "Suvidha Appliances Pvt. Ltd.",
        "watches": ["household electrical appliances", "aluminium utensils", "pressure cookers"],
    },
    {
        "email": "consumer@demo.bis",
        "role": "consumer",
        "businessName": None,
        "watches": [],
    },
]


def main() -> None:
    import bcrypt

    password_hash = bcrypt.hashpw(DEMO_PASSWORD.encode(), bcrypt.gensalt(rounds=10)).decode()
    with connect() as conn, conn.cursor() as cur:
        for user in USERS:
            cur.execute(
                """
                INSERT INTO users (email, password_hash, role, business_name)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (email) DO UPDATE
                  SET role = EXCLUDED.role, business_name = EXCLUDED.business_name
                RETURNING id
                """,
                (user["email"], password_hash, user["role"], user["businessName"]),
            )
            user_id = cur.fetchone()[0]
            for category in user["watches"]:
                cur.execute(
                    """
                    INSERT INTO watches (user_id, product_category)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id, product_category) DO NOTHING
                    """,
                    (user_id, category),
                )
            print(f"[seed_demo_users] ensured {user['email']} (role={user['role']}, watches={len(user['watches'])})")
    print(f"[seed_demo_users] demo password for both accounts: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
