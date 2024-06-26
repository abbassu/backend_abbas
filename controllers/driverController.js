const express = require("express");
const bodyParser = require("body-parser");
const pool = require("../database/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "05677015161718";
const bcrypt = require("bcrypt"); // For password hashing
const mysql = require("mysql2/promise"); // Using promises for cleaner syntax

const signupDriver = async (req, res) => {
  console.log("1234567");
  try {
    const {
      name,
      phone_number,
      vehicle_type,
      availability,
      password,
      long_t,
      lat_t,
    } = req.body;

    // Validate input data (add more validations as needed)
    if (
      !name ||
      !phone_number ||
      !vehicle_type ||
      typeof availability !== "boolean" ||
      !password ||
      typeof long_t !== "number" ||
      typeof lat_t !== "number"
    ) {
      return res.status(400).json({ message: "Missing or invalid data" });
    }

    // Hash password securely before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const [existingUser] = await pool.query(
      "SELECT * FROM Drivers WHERE phone_number = ?",
      [phone_number]
    );

    if (existingUser.length > 0) {
      return res
        .status(409)
        .json({ message: "This phone number already exists" });
    }

    const [rows] = await pool.query(
      "INSERT INTO Drivers (name, phone_number, vehicle_type, availability, password, long_t, lat_t) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        phone_number,
        vehicle_type,
        availability,
        hashedPassword,
        long_t,
        lat_t,
      ] // Add default values for num_order and points
    );

    const createdUserId = rows.insertId;
    res.json({
      message: "Driver created successfully!",
      DriverId: createdUserId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating driver" });
  }
};

const signinDriver22 = async (req, res) => {
  const { name, password } = req.body;

  // Validate input data

  if (!name || !password) {
    return res.status(400).json({ message: "Missing username or password" });
  }

  // Find driver from database by username
  const query = {
    text: "SELECT * FROM Drivers WHERE name = ? ",
    values: [name],
  };

  try {
    const result = await pool.query(query);
    const driver = result.rows[0];

    // Check if driver exists
    if (!driver) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Compare hashed passwords
    const isPasswordValid = await bcrypt.compare(password, driver.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Generate JWT on successful login
    const payload = {
      driver_id: driver.id, // Replace 'id' with your actual driver ID field name
    };
    const secret = process.env.JWT_SECRET; // Replace with your secret key (store securely)
    const options = {
      expiresIn: "24h", // Set expiration time for the token
    };

    try {
      const token = jwt.sign(payload, secret, options);
      res.status(200).json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error generating token" });
    }
  } catch (err) {
    handleDbError(err, res);
  }
};

const signinDriver = async (req, res) => {
  try {
    const { phone_number, password } = req.body;
    if (!phone_number || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const [rows] = await pool.query(
      "SELECT * FROM Drivers WHERE phone_number = ?",
      [phone_number]
    );
    const Driver = rows[0];
    if (!Driver) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, Driver.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const payload = { Driver_id: Driver.driver_id }; // JWT payload with user ID
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" }); // Set JWT expiration time
    res.json({
      message: "Sign in successful!",
      token,
      Driver_id: Driver.driver_id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error signing in" });
  }
};

const getAllNottakenOrder = async (req, res) => {
  const { city } = req.body;

  if (!city) {
    return res
      .status(400)
      .json({ message: "City name is required in the request body" });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT o.order_id, o.user_id, o.shop_id, o.status, o.created_at, o.total_price, o.delivery_fee, o.special_instructions, o.taken, o.promocode_id, o.lon_t, o.lat_t, o.address
      FROM orders o
      WHERE o.address = ? AND o.taken <> 1;
    `,
      [city]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  signupDriver,
  signinDriver,
  getAllNottakenOrder,
};
