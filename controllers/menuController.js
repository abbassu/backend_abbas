const bcrypt = require("bcrypt");
const pool = require("../database/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "05677015161718";

const getAllMealsForMenu = async (req, res) => {
  try {
    // Extract menu ID from URL and validate format
    const menuId = parseInt(req.params.menuId);
    if (isNaN(menuId)) {
      return res.status(400).json({ message: "Invalid menu ID format" });
    }

    // Construct query to retrieve meals with matching menu ID
    const sql = `SELECT * FROM Meals WHERE menu_id = ?`;

    // Execute query using prepared statement
    const [rows] = await pool.execute(sql, [menuId]);

    if (rows.length > 0) {
      res.json(rows); // Return all meals for the menu
    } else {
      res.status(404).json({ message: "No meals found for this menu" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addMenu = async (req, res) => {
  // const shopId = parseInt(req.params.shopId);
  const shopId = parseInt(req.shop.shopId);
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Missing required field: name" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO Menus (shop_id, name) VALUES (?, ?)",
      [shopId, name]
    );
    res.json({ message: "Menu added successfully!", menuId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding menu" });
  }
};

const deleteMenu = async (req, res) => {
  const menuId = parseInt(req.params.menuId);

  if (!menuId) {
    return res.status(400).json({ message: "Missing required field: menuId" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Delete all meals associated with the menu
    const [mealsResult] = await connection.query(
      "DELETE FROM Meals WHERE menu_id = ?",
      [menuId]
    );

    // Delete the menu
    const [menuResult] = await connection.query(
      "DELETE FROM Menus WHERE menu_id = ?",
      [menuId]
    );

    await connection.commit();

    if (menuResult.affectedRows === 0) {
      return res.status(404).json({ message: "Menu not found" });
    }

    res.json({ message: "Menu and associated meals deleted successfully!" });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Error deleting menu and meals" });
  } finally {
    connection.release();
  }
};

const addMeal = async (req, res) => {
  const menuId = parseInt(req.params.menuId);

  const { name, photoUrl, price, content } = req.body;

  if (!name || !price) {
    return res
      .status(400)
      .json({ message: "Missing required fields: name and price" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO Meals (menu_id, name, photo_url, price, content) VALUES (?, ?, ?, ?, ?)",
      [menuId, name, photoUrl, price, content]
    );
    res.json({ message: "Meal added successfully!", mealId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding meal" });
  }
};
const deleteMeal = async (req, res) => {
  const mealId = parseInt(req.params.mealId);

  try {
    // Check if meal exists before deleting
    const [rows] = await pool.query("SELECT * FROM Meals WHERE meal_id = ?", [
      mealId,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Meal not found" });
    }

    await pool.query("DELETE FROM Meals WHERE meal_id = ?", [mealId]);
    res.json({ message: "Meal deleted successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting meal" });
  }
};

const updateMeal = async (req, res) => {
  try {
    // Extract meal ID and validate format
    const mealId = parseInt(req.params.mealId);
    if (isNaN(mealId)) {
      return res.status(400).json({ message: "Invalid meal ID format" });
    }

    // Extract meal information from request body (optional fields)
    const { name, photoUrl, price, content } = req.body || {};

    // Validate and sanitize user input (consider libraries like validator.js)
    // ... (validation and sanitization logic)

    // Build update query with optional parameters
    const updateSetters = [];
    const updateParams = [];

    if (name) {
      updateSetters.push("name = ?");
      updateParams.push(name);
    }
    if (photoUrl) {
      updateSetters.push("photo_url = ?");
      updateParams.push(photoUrl);
    }
    if (price) {
      updateSetters.push("price = ?");
      updateParams.push(price);
    }
    if (content) {
      updateSetters.push("content = ?");
      updateParams.push(content);
    }

    // Check if any fields need updating
    if (updateSetters.length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }

    const updateQuery = `UPDATE Meals SET ${updateSetters.join(
      ", "
    )} WHERE meal_id = ?`;
    updateParams.push(mealId);

    // Execute update using prepared statement
    const [result] = await pool.execute(updateQuery, updateParams);

    if (result.affectedRows > 0) {
      res.json({ message: "Meal information updated successfully" });
    } else {
      res.status(400).json({ message: "No changes made or meal not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllMenusForShop = async (req, res) => {
  try {
    // Extract shop ID from URL and validate format
    const shopId = parseInt(req.params.shopId);
    if (isNaN(shopId)) {
      return res.status(400).json({ message: "Invalid shop ID format" });
    }

    // Construct query to retrieve menus with matching shop ID
    const sql = `SELECT * FROM Menus WHERE shop_id = ?`;

    // Execute query using prepared statement
    const [rows] = await pool.execute(sql, [shopId]);

    if (rows.length > 0) {
      res.json(rows); // Return all menus for the shop
    } else {
      res.status(404).json({ message: "No menus found for this shop" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    // Extract order ID and new status from request body
    const { order_id, new_status } = req.body;

    // Validate order ID format (consider adding checks as needed)
    if (!Number.isInteger(order_id)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    // Validate new status (optional, add checks based on your allowed statuses)
    if (
      !new_status ||
      !["pending", "processing", "completed", "cancelled"].includes(new_status)
    ) {
      return res.status(400).json({ message: "Invalid new order status" });
    }

    // Update order status in database
    const updateQuery = `UPDATE orders SET status = ? WHERE order_id = ?`;
    const updateValues = [new_status, order_id];

    const [updateResult] = await pool.execute(updateQuery, updateValues);

    // Check if update was successful
    if (updateResult.affectedRows > 0) {
      res.json({ message: "Order status updated successfully" });
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addMenu,
  addMeal,
  deleteMeal,
  deleteMenu,
  updateMeal,
  getAllMealsForMenu,
  getAllMenusForShop,
  updateOrderStatus,
};
