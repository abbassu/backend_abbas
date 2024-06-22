const bcrypt = require("bcrypt");
const pool = require("../database/db");
const moment = require("moment"); // Assuming you're using moment.js for date formatting

const getAllCategories = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT name,category_id FROM Categories");
    res.json({ rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving category names" });
  }
};

const getAllCommentForPost = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);

    if (!postId) {
      return res
        .status(400)
        .json({ message: "Missing required field: postId" });
    }
    const [rows] = await pool.query(
      `SELECT c.content, c.timestamp, c.user_id, u.username, u.photo_url
       FROM Comments c
       INNER JOIN Users u ON c.user_id = u.user_id
       WHERE c.post_id = ?`,
      [postId]
    );
    console.log("roiq", rows);

    const comments = rows.map((row) => {
      const timestamp = moment(row.timestamp);
      const formattedHours = timestamp.hours().toString().padStart(2, "0");
      const formattedMinutes = timestamp.minutes().toString().padStart(2, "0");
      const formattedSeconds = timestamp.seconds().toString().padStart(2, "0");
      const formattedDate = moment(row.timestamp).format("YYYY-MM-DD"); // Format date

      return {
        username: row.username,
        photo_url: row.photo_url,
        user_id: row.user_id,
        content: row.content,
        timestamp: [
          formattedDate,
          `${formattedHours}:${formattedMinutes}:${formattedSeconds}`, // Include formatted time
        ],
      };
    });

    res.json({ message: "Successfully retrieved comments", comments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving comments" });
  }
};

const getNumCommentForPost = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);

    if (!postId) {
      return res
        .status(400)
        .json({ message: "Missing required field: postId" });
    }
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS comment_count FROM Comments WHERE post_id = ?",
      [postId]
    );
    const commentCount = rows[0].comment_count;
    res.json({ message: "Successfully retrieved comment count", commentCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving comment count" });
  }
};

const getNumLikeForPost = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);

    if (!postId) {
      return res
        .status(400)
        .json({ message: "Missing required field: postId" });
    }
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS like_count FROM Likes WHERE post_id = ?",
      [postId]
    );
    const likeCount = rows[0].like_count;
    res.json({ message: "Successfully retrieved like count", likeCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving like count" });
  }
};

const getUsersWhoPutLike = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    if (!postId) {
      return res
        .status(400)
        .json({ message: "Missing required field: postId" });
    }
    const [users] = await pool.query(
      `SELECT u.user_id, u.username,u.photo_url
       FROM Likes l
       INNER JOIN Users u ON l.user_id = u.user_id
       WHERE l.post_id = ?`,
      [postId]
    );

    if (!users.length) {
      return res.json({ message: "No users liked this post" }); // Or handle differently
    }

    res.json({ message: "Successfully retrieved user details", users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving user details" });
  }
};
const getAllShop = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT shop_id, shop_name, photo_url,followers FROM Shop"
    );

    const shops = rows.map((row) => ({
      shopId: row.shop_id,
      shopName: row.shop_name,
      photoUrl: row.photo_url,
      followers: row.followers,
    }));

    res.json(shops);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching shops" });
  }
};

const numberFollowersForShop = async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId); // Extract shop ID from URL parameter

    const [rows] = await pool.query(
      "SELECT followers FROM Shop WHERE shop_id = ?",
      [shopId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const followers = rows[0].followers;

    res.json({ followers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching follower count" });
  }
};

module.exports = {
  getAllCategories,
  getAllCommentForPost,
  getNumCommentForPost,
  getNumLikeForPost,
  getUsersWhoPutLike,
  getAllShop,
  numberFollowersForShop,
};
