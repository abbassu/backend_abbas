const express = require("express");
const mysql = require("mysql2/promise");
// const mysql = require("mysql");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Create a JSON Web Token
const payload = { userId: 123 };
const secretKey = "your_secret_key"; // Replace with your own secret key
const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });

console.log("Generated token:", token);

const app = express();
// const port = process.env.PORT || 3200; // Use environment variable for port or default to 3000

const port = 3200; // Use environment variable for port or default to 3000
app.use(cors());
app.use(express.json());

const JWT_SECRET = "05677015161718";
// Configure MySQL connection pool (replace with your credentials)
// const db = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "root123",
//   database: "takkeh",
// });

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root123",
  database: "takkeh",
};

const pool = mysql.createPool(dbConfig);

///////////////////////////
app.post("/api/users/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body; // Extract user data
    console.log("username, email, password", username, email, password);
    // Check for required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate email format (optional)

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10); // Adjust cost factor as needed

    // Check for existing user with email (improve error handling)
    const [existingUser] = await pool.query(
      "SELECT * FROM Users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const [rows] = await pool.query(
      "INSERT INTO Users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );
    const createdUserId = rows.insertId; // Get the ID of the newly created user

    res.json({ message: "User created successfully!", userId: createdUserId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating user" });
  }
});

// API route for user sign-in (with JWT generation)
app.post("/api/users/signin", async (req, res) => {
  try {
    const { email, password } = req.body; // Extract credentials
    if (!email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const [rows] = await pool.query("SELECT * FROM Users WHERE email = ?", [
      email,
    ]);
    const user = rows[0]; // Assuming only one user with the email exists
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const payload = { userId: user.user_id }; // JWT payload with user ID
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" }); // Set JWT expiration time
    res.json({ message: "Sign in successful!", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error signing in" });
  }
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log("req.headers.authorization;", req.headers.authorization);
  // Check if authorization header is present and formatted correctly
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1]; // Extract token from Bearer header

  // Verify JWT and extract user data
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach decoded user data (user ID) to the request object
    req.user = decoded;
    next(); // Proceed with the request if JWT is valid
  });
};
///////////////////////////

app.post("/api/posts", verifyJWT, async (req, res) => {
  try {
    const { content, title } = req.body;

    if (!content || !title) {
      return res
        .status(400)
        .json({ message: "Missing required fields: content and title" });
    }

    const [rows] = await pool.query(
      "INSERT INTO Posts (user_id, content, title) VALUES (?, ?, ?)",
      [req.user.userId, content, title]
    );
    const postId = rows.insertId;

    res.json({
      message: "Post created successfully!",
      postId,
      ID: req.user.userId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating post" });
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////

// Protected route for adding categories (requires valid JWT, optional)

////////////////////////////////////////////////////////////////////////////////////////////////////////
// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
