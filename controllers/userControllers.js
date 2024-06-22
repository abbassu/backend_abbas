const bcrypt = require("bcrypt");
const pool = require("../database/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "05677015161718";

const signUpUser = async (req, res) => {
  try {
    const {
      username,
      password,
      phone,
      city,
      address,
      photo_url,
      lat_t,
      lon_t,
    } = req.body;

    console.log(
      "Received sign-up request:",
      username,
      phone,
      password,
      city,
      address,
      lat_t,
      lon_t
    );

    // Validate required fields
    if (!username || !password || !phone) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the user already exists
    const [existingUser] = await pool.query(
      "SELECT * FROM Users WHERE phone = ?",
      [phone]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "This phone already exists" });
    }

    // Insert new user into the database
    const [rows] = await pool.query(
      `INSERT INTO Users (username, phone, password, city, address, photo_url, num_order, points, lat_t, lon_t) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        phone,
        hashedPassword,
        city,
        address,
        photo_url,
        0,
        0,
        lat_t,
        lon_t,
      ] // Default values for num_order and points
    );

    const createdUserId = rows.insertId;

    res.json({ message: "User created successfully!", userId: createdUserId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating user" });
  }
};

const signInUser = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const [rows] = await pool.query("SELECT * FROM Users WHERE phone = ?", [
      phone,
    ]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const payload = { userId: user.user_id }; // JWT payload with user ID
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" }); // Set JWT expiration time
    res.json({ message: "Sign in successful!", token, userId: user.user_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error signing in" });
  }
};

const getPopularPost = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM Posts ORDER BY timestamp DESC"
    );
    res.json({ posts: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving posts" });
  }
};

const addComment = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId); // Extract post ID from URL parameter
    const { content } = req.body; // Extract comment content
    if (!postId || !content) {
      return res
        .status(400)
        .json({ message: "Missing required fields: postId or content" });
    }
    const [postExists] = await pool.query(
      "SELECT * FROM Posts WHERE post_id = ?",
      [postId]
    );
    if (postExists.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    const [rows] = await pool.query(
      "INSERT INTO Comments (post_id, user_id, content) VALUES (?, ?, ?)",
      [postId, req.user.userId, content] // Use user ID from JWT
    );
    const commentId = rows.insertId;
    res.json({ message: "Comment created successfully!", commentId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating comment" });
  }
};

const deleteComment = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId); // Extract post ID from URL parameter
    const commentId = parseInt(req.params.commentId); // Extract comment ID from URL parameter

    if (!postId || !commentId) {
      return res
        .status(400)
        .json({ message: "Missing required fields: postId or commentId" });
    }
    const [comment] = await pool.query(
      "SELECT * FROM Comments WHERE comment_id = ? AND post_id = ?",
      [commentId, postId]
    );
    if (comment.length === 0 || comment[0].user_id !== req.user.userId) {
      return res
        .status(404)
        .json({ message: "Comment not found or unauthorized deletion" });
    }
    await pool.query("DELETE FROM Comments WHERE comment_id = ?", [commentId]);
    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting comment" });
  }
};

const addLike = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.user.userId; // Extract from JWT

    if (!postId || !userId) {
      return res
        .status(400)
        .json({ message: "Missing required fields: postId or userId" });
    }

    // Check if post exists
    const [postExists] = await pool.query(
      "SELECT * FROM Posts WHERE post_id = ?",
      [postId]
    );
    if (postExists.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user already liked the post
    const [existingLike] = await pool.query(
      "SELECT * FROM Likes WHERE post_id = ? AND user_id = ?",
      [postId, userId]
    );

    if (existingLike.length > 0) {
      return res.status(400).json({ message: "You already liked this post" });
    }

    // Insert like into database
    await pool.query("INSERT INTO Likes (post_id, user_id) VALUES (?, ?)", [
      postId,
      userId,
    ]);

    res.json({ message: "Post liked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error liking post" });
  }
};

const deleteLike = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.user.userId; // Extract from JWT

    if (!postId || !userId) {
      return res
        .status(400)
        .json({ message: "Missing required fields: postId or userId" });
    }

    // Check if user previously liked the post
    const [existingLike] = await pool.query(
      "SELECT * FROM Likes WHERE post_id = ? AND user_id = ?",
      [postId, userId]
    );

    if (existingLike.length === 0) {
      return res
        .status(400)
        .json({ message: "You haven't liked this post yet" });
    }

    // Delete like from database
    await pool.query("DELETE FROM Likes WHERE post_id = ? AND user_id = ?", [
      postId,
      userId,
    ]);

    res.json({ message: "Post unliked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error unliking post" });
  }
};

const followShop = async (req, res) => {
  try {
    const { userId } = req.user; // Get user ID from JWT
    const shopId = parseInt(req.params.shopId); // Extract shop ID from URL parameter

    // Check if user already follows the shop
    const [rows] = await pool.query(
      "SELECT * FROM UserShopFollows WHERE user_id = ? AND shop_id = ?",
      [userId, shopId]
    );

    if (rows.length > 0) {
      return res
        .status(400)
        .json({ message: "User already follows this shop" });
    }

    // Insert new follow record
    await pool.query(
      "INSERT INTO UserShopFollows (user_id, shop_id) VALUES (?, ?)",
      [userId, shopId]
    );

    // Update followers count in Shop table (increment)
    await pool.query(
      "UPDATE Shop SET followers = followers + 1 WHERE shop_id = ?",
      [shopId]
    );

    res.json({ message: "Shop followed successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error following shop" });
  }
};

const unfollowShop = async (req, res) => {
  try {
    const { userId } = req.user; // Get user ID from JWT
    const shopId = parseInt(req.params.shopId); // Extract shop ID from URL parameter

    const [rows] = await pool.query(
      "SELECT * FROM UserShopFollows WHERE user_id = ? AND shop_id = ?",
      [userId, shopId]
    );
    console.log("row", rows);
    if (rows.length >= 0) {
      return res
        .status(400)
        .json({ message: "User already unfollows this shop" });
    }

    // Delete follow record
    await pool.query(
      "DELETE FROM UserShopFollows WHERE user_id = ? AND shop_id = ?",
      [userId, shopId]
    );

    // Update followers count in Shop table (decrement)
    await pool.query(
      "UPDATE Shop SET followers = followers - 1 WHERE shop_id = ?",
      [shopId]
    );

    res.json({ message: "Shop unfollowed successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error unfollowing shop" });
  }
};

const updateUserAddress = async (req, res) => {
  try {
    const { user_id, address, city } = req.body; // Extract user ID, address, and city

    // Validate user ID (optional, add checks as needed)
    if (!Number.isInteger(user_id)) {
      return res.status(400).json({ message: "Invalid user_id" });
    }

    // Validate address and city (optional, adjust as needed)
    if (!address || !city) {
      return res
        .status(400)
        .json({ message: "Missing required fields: address or city" });
    }

    // Check if user exists (optional, based on your requirements)
    const [existingUser] = await pool.query(
      "SELECT * FROM Users WHERE user_id = ?",
      [user_id]
    );
    if (!existingUser.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const [rows] = await pool.execute(
      "UPDATE Users SET address = ?, city = ? WHERE user_id = ?",
      [address, city, user_id]
    );

    if (rows.affectedRows > 0) {
      return res.status(200).json({ message: "Address updated successfully" });
    } else {
      return res.status(400).json({ message: "No changes made" }); // Or other appropriate message
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateUserInformation = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId); // Extract user ID from parameters

    // Validate user ID (adjust as needed)
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const { username, email, phone } = req.body;

    // Validate and sanitize user input (consider libraries like validator.js)
    // ... (validation and sanitization logic)

    // Build update query using prepared statement (recommended for security)
    const updateQuery = `UPDATE users
                         SET username = ?,
                             email = ?,
                             phone = ?
                         WHERE user_id = ?`;
    const updateParams = [username, email, phone, userId];

    // Execute update using prepared statement
    const [result] = await pool.execute(updateQuery, updateParams);

    if (result.affectedRows > 0) {
      res.json({ message: "User information updated successfully" });
    } else {
      res.status(400).json({ message: "No changes made or user not found" }); // Or other appropriate message
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const makeOrder = async (req, res) => {
  try {
    // Extract user ID, shop ID, meals, and special instructions from request body
    const { user_id, shop_id, meals, special_instructions = "" } = req.body;

    // Validate request body format
    if (!user_id || !shop_id || !Array.isArray(meals)) {
      return res.status(400).json({ message: "Invalid request body format" });
    }

    // Prepare order data
    const orderData = {
      user_id,
      shop_id,
      special_instructions,
      created_at: new Date(),
      total_price: 0, // Initialize total price
      order_meals: [], // Array to store order meal details
    };

    // Loop through each meal in the request
    for (const meal of meals) {
      // Extract meal ID and quantity
      const { meal_id, quantity } = meal;

      // Validate meal data format
      if (!meal_id || typeof quantity !== "number" || quantity <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid meal data in request" });
      }

      // Fetch meal details (including price) from database
      const [mealResult] = await pool.query(
        "SELECT price FROM meals WHERE meal_id = ?",
        [meal_id]
      );

      if (!mealResult.length) {
        return res
          .status(404)
          .json({ message: `Meal with ID ${meal_id} not found` });
      }

      const mealPrice = mealResult[0].price;

      // Add meal details with price to order_meals array
      orderData.order_meals.push({
        meal_id,
        quantity,
        price: mealPrice,
      });

      // Update total price
      orderData.total_price += mealPrice * quantity;
    }
    // const [userInfo] = await pool.query(
    //   "SELECT users.user_id , users.lat_t , users.lon_t, user.address FROM users user_id = ?",
    //   [user_id]
    // );
    // console.log("userinfo", userInfo);

    // Build insert query with prepared statement
    const insertQuery = `INSERT INTO orders (user_id, shop_id, special_instructions, created_at, total_price) VALUES (?, ?, ?, ?, ?)`;
    const insertValues = [
      orderData.user_id,
      orderData.shop_id,
      orderData.special_instructions,
      orderData.created_at,
      orderData.total_price,
    ];

    // Execute insert using prepared statement
    const [insertResult] = await pool.execute(insertQuery, insertValues);

    // Check if order insertion was successful
    if (insertResult.affectedRows > 0) {
      const orderId = insertResult.insertId;
      res.json({ message: "Order placed successfully!", order_id: orderId });
    } else {
      res.status(500).json({ message: "Failed to create order" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const makeFavorite = async (req, res) => {
  const { user_id, shop_id } = req.body;
  try {
    const [results] = await pool.query(
      "INSERT INTO favorites (user_id, shop_id) VALUES (?, ?)",
      [user_id, shop_id]
    );
    res.json({ id: results.insertId, user_id, shop_id });
  } catch (err) {
    res.status(500).send(err);
  }
};

const getAllShopFavorite = async (req, res) => {
  const { user_id } = req.body; // Assuming user_id is sent in the request body

  try {
    const [favorites] = await pool.query(
      "SELECT shop.shop_id, shop.shop_name, shop.background_photo_url, shop.photo_url, shop.lat_t, shop.lon_t,shop.classification " +
        "FROM favorites " +
        "JOIN shop ON favorites.shop_id = shop.shop_id " +
        "WHERE favorites.user_id = ?",
      [user_id]
    );
    res.json(favorites);
  } catch (err) {
    console.error("Error fetching favorite shops:", err);
    res.status(500).send("Internal Server Error");
  }
};
module.exports = {
  signUpUser,
  signInUser,
  getPopularPost,
  addComment,
  deleteComment,
  addLike,
  deleteLike,
  followShop,
  unfollowShop,
  updateUserAddress,
  updateUserInformation,
  makeOrder,
  makeFavorite,
  getAllShopFavorite,
};
