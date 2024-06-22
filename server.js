const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const moment = require("moment"); // Assuming you're using moment.js for date formatting
const pool = require("./database/db");
const payload = { userId: 123 };
const secretKey = "your_secret_key"; // Replace with your own secret key
const token = jwt.sign(payload, secretKey, { expiresIn: "3h" });

console.log("Generated token:", token);

const app = express();
const port = 3200; // Use environment variable for port or default to 3000
app.use(cors());
app.use(express.json());

const JWT_SECRET = "05677015161718";

const userControllers = require("./controllers/userControllers");
const shopControllers = require("./controllers/shopControllers");
const systemControllers = require("./controllers/systemControllers");
const menuControllers = require("./controllers/menuController");
const driverControllers = require("./controllers/driverController");

app.post("/api/users/signup", userControllers.signUpUser);
app.post("/api/users/makeorder", userControllers.makeOrder);

app.post("/api/users/signin", userControllers.signInUser);
app.get("/api/posts/popular", userControllers.getPopularPost);

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

const verifyJWTShop = (req, res, next) => {
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
    req.shop = decoded;
    next(); // Proceed with the request if JWT is valid
  });
};

///////////////////////////
//add new posts
app.post("/api/posts", verifyJWTShop, shopControllers.addNewPost);
app.post("/api/categories", verifyJWTShop, shopControllers.addNewCategory);
app.get("/api/categories", systemControllers.getAllCategories);
app.put("/api/shops/update", verifyJWTShop, shopControllers.updateShopInfo);

app.put("/api/user/update", verifyJWT, userControllers.updateUserInformation);

//////////////////////////////////////////////////////////////////////////////////////////////////////
app.post("/api/posts/:postId/comments", verifyJWT, userControllers.addComment);

app.delete(
  "/api/posts/:postId/comments/:commentId",
  verifyJWT,
  userControllers.deleteComment
);

app.patch(
  "/api/users/updateUserAddress",
  verifyJWT,
  userControllers.updateUserAddress
);

app.get("/api/posts/:postId/comments", systemControllers.getAllCommentForPost);

app.get(
  "/api/posts/:postId/comments/count",
  systemControllers.getNumCommentForPost
);

////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post("/api/posts/:postId/like", verifyJWT, userControllers.addLike);
app.delete("/api/posts/:postId/like", verifyJWT, userControllers.deleteLike);

app.get("/api/posts/:postId/likes", systemControllers.getNumLikeForPost);

app.get("/api/posts/:postId/likes/users", systemControllers.getUsersWhoPutLike);

////////////////////////////////////////////////////////////////////////////////////////////////////////
// shop table
app.post("/api/shops/:shopId/follow", verifyJWT, userControllers.followShop);

app.post(
  "/api/shops/:shopId/unfollow",
  verifyJWT,
  userControllers.unfollowShop
);

////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post("/api/shops/signup", shopControllers.signupShop);

app.post("/api/shops/signin", shopControllers.signInShop);

app.get("/api/shops", systemControllers.getAllShop);

app.get(
  "/api/shops/:shopId/numberfollowers",
  systemControllers.numberFollowersForShop
);

app.get("/api/shops/:shopId/allPosts", shopControllers.getAllPostsForShop);

/// get all users which is follow page
app.get(
  "/api/shops/:shopId/followers",
  shopControllers.getFollowersInfoForShop
);

app.post("/api/shops/menus", verifyJWTShop, menuControllers.addMenu);

app.post("/api/shop/:menuId/meal", verifyJWTShop, menuControllers.addMeal);

app.delete(
  "/api/shop/menus/meal/:mealId",
  verifyJWTShop,
  menuControllers.deleteMeal
);

app.put(
  "/api/shop/menus/meal/:mealId",
  verifyJWTShop,
  menuControllers.updateMeal
);

app.get("/api/menus/:menuId/meal", menuControllers.getAllMealsForMenu);

app.get("/api/shop/:shopId/menus", menuControllers.getAllMenusForShop);
app.get("/api/shop/orderstatus", shopControllers.updateOrderStatus);

////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post("/api/driver/signup", driverControllers.signupDriver);
app.post("/api/driver/signin", driverControllers.signinDriver);

////////////////////////////////////////////////////////////////////////////////////////////////////////

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
