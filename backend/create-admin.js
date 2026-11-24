
require("dotenv").config();

const pool = require("./db");
const bcrypt = require("bcryptjs");

async function createAdmin() {
    const fullname = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!fullname || !email || !password) {
        throw new Error("Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.execute(
        `INSERT INTO users (fullname, email, password_hash, role)
         VALUES (?, ?, ?, 'Admin')
         ON DUPLICATE KEY UPDATE
         fullname = VALUES(fullname),
         password_hash = VALUES(password_hash),
         role = 'Admin'`,
        [fullname, email.toLowerCase(), hash]
    );

    console.log("Admin account created successfully.");
    await pool.end();
}

createAdmin().catch(error => {
    console.error(error);
    process.exit(1);
});
