const express = require("express");
const mysql = require("mysql2/promise");

const cors = require("cors");
const app = express();
const port = 3200; // Use environment variable for port or default to 3000
app.use(cors());
app.use(express.json());

const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbDatabase = process.env.DB_DATABASE;

require("dotenv").config();

if (dbHost && dbUser && dbPassword && dbDatabase) {
  console.log(
    "444444444444444444444444444",
    dbHost,
    dbUser,
    dbPassword,
    dbDatabase
  );
} else {
  console.error("Error: Database configuration variables not found");
}

const JWT_SECRET = "05677015161718";

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root123",
  database: "takkeh",
};

const pool = mysql.createPool(dbConfig);
module.exports = pool;
