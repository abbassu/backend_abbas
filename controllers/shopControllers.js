const bcrypt = require("bcrypt");
const pool = require("../database/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "05677015161718";
const addNewPost = async (req, res) => {
  try {
    const { content, title, URL_photo, categoryId } = req.body; // Include URL_photo in request body

    if (!content || !title || !URL_photo || !categoryId) {
      return res.status(400).json({
        message: "Missing required fields: content, title, and URL_photo",
      });
    }

    const [rows] = await pool.query(
      "INSERT INTO Posts (shop_id, content, title, URL_photo) VALUES (?, ?, ?, ?)",
      [req.shop.shopId, content, title, URL_photo] // Add URL_photo to query
    );
    const postId = rows.insertId;

    // Insert post-category relationship into postcategories table
    await pool.query(
      "INSERT INTO postcategories (post_id, category_id) VALUES (?, ?)",
      [postId, categoryId]
    );

    res.json({
      message: "Post created successfully!",
      postId,
      ID: req.shop.shopId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating post" });
  }
};

const addNewCategory = async (req, res) => {
  try {
    const { name } = req.body; // Extract category name
    // Validate required field
    if (!name) {
      return res.status(400).json({ message: "Missing required field: name" });
    }

    // Check for duplicate category using prepared statement
    const [existingCategory] = await pool.query(
      "SELECT * FROM Categories WHERE name = ?",
      [name]
    );

    if (existingCategory.length > 0) {
      return res.status(409).json({ message: "Category already exists" });
    }

    // Insert category into database
    const [rows] = await pool.query(
      "INSERT INTO Categories (name) VALUES (?)",
      [name]
    );
    const categoryId = rows.insertId;

    res.json({ message: "Category created successfully!", categoryId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating category" });
  }
};

const signupShop = async (req, res) => {
  try {
    const {
      shop_name,
      description,
      location,
      email,
      phone_number,
      password,
      photo_url,
      background_photo_url,
    } = req.body;

    // Basic validation (consider adding more as needed)
    if (!shop_name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Hash password for security (replace with your hashing method)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert shop data
    await pool.query(
      "INSERT INTO Shop (shop_name, description, location, email, phone_number, password_hash, photo_url, followers, background_photo_url, num_orders) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        shop_name,
        description,
        location,
        email,
        phone_number,
        hashedPassword,
        photo_url,
        0, // Set followers to 0 initially
        background_photo_url,
        0, // Set num_orders to 0 initially
      ]
    );

    res.json({ message: "Shop signup successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating shop" });
  }
};

const signInShop = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if shop exists with the provided email
    const [rows] = await pool.query(
      "SELECT shop_id, email ,password_hash FROM Shop WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const shop = rows[0]; // Get shop data
    console.log("password ", password, "\n", "shop ", shop);
    // Verify password (replace with your password comparison method)
    const passwordMatch = await bcrypt.compare(password, shop.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    console.log("vvvvvvvv\n");

    const isTaken = rows.length > 1; // Check if multiple shops have the same email

    const payload = { shopId: shop.shop_id }; // JWT payload with user ID
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" }); // Set JWT expiration time
    // res.json({
    //   message: "Shop signed in successfully!",
    //   token,
    //   shop_id,
    // });

    res.json({
      message: "Shop signed in successfully!",
      shopId: shop.shop_id,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error signing in shop" });
  }
};

const updateShopInfo = async (req, res) => {
  try {
    const shopId = parseInt(req.shop.shopId); // Extract shop ID from parameters
    console.log("req.shop.shop_id", req.shop.shopId);
    // Validate shopID (adjust as needed)
    if (isNaN(shopId)) {
      return res.status(400).json({ message: "Invalid shop ID format" });
    }

    const {
      shopName,
      description,
      location,
      phoneNumber,
      photoUrl,
      backgroundPhotoUrl,
    } = req.body;

    // Validate and sanitize user input (consider libraries like validator.js)
    // ... (validation and sanitization logic)

    // Build update query with optional parameters
    const updateQuery = `UPDATE shop
                         SET shop_name = ?,
                             description = ?,
                             location = ?,
                             phone_number = ?,
                             photo_url = ?,
                             background_photo_url = ?
                         WHERE shop_id = ?`;
    const updateParams = [
      shopName,
      description,
      location,
      phoneNumber,
      photoUrl,
      backgroundPhotoUrl,
      shopId,
    ];

    // Execute update using prepared statement (recommended for security)
    const [result] = await pool.execute(updateQuery, updateParams);

    if (result.affectedRows > 0) {
      res.json({ message: "Shop information updated successfully" });
    } else {
      res.status(400).json({ message: "No changes made or shop not found" }); // Or other appropriate message
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addNewPost,
  addNewCategory,
  signupShop,
  signInShop,
  updateShopInfo,
};
