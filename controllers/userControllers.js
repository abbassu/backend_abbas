const bcrypt = require("bcrypt");
const pool = require("../database/db");

const signUpUser = async (req, res) => {
  try {
    const { username, password, phone } = req.body; // Extract user data
    console.log("username, password", username, phone, password);
    if (!username || !password || !phone) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const hashedPassword = await bcrypt.hash(password, 10); // Adjust cost factor as needed
    const [existingUser] = await pool.query(
      "SELECT * FROM Users WHERE phone = ?",
      [phone]
    );
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }
    const [rows] = await pool.query(
      "INSERT INTO Users (username,phone , password) VALUES (?, ?, ?)",
      [username, phone, hashedPassword]
    );
    const createdUserId = rows.insertId; // Get the ID of the newly created user

    res.json({ message: "User created successfully!", userId: createdUserId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating user" });
  }
};

const signInUser = async (req, res) => {
  try {
    const { phone, password } = req.body; // Extract credentials
    if (!phone || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const [rows] = await pool.query("SELECT * FROM Users WHERE phone = ?", [
      phone,
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
};
