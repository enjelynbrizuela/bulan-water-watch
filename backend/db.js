
require('dotenv').config();

const mysql = require('mysql2/promise');

if (!process.env.MYSQL_URL) {
    throw new Error('MYSQL_URL is missing in Railway Variables');
}

const pool = mysql.createPool(
    process.env.MYSQL_URL
);

module.exports = pool;
