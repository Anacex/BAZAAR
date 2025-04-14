const express = require("express");
const pool = require("../config/db");
const { auth_JWT } = require("../middleware/authMiddleware");

const router = express.Router();

// Helper for error handling
const handleDbError = (error, res) => {
  console.error(error);
  res.status(500).json({ error: error.message }); // Show actual error
};

// GET stock movements (now store-specific)
router.get("/movements", auth_JWT, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM stock_movements WHERE store_id = $1",
      [req.user.store_id] // Assuming JWT contains store_id
    );
    res.json(rows);
  } catch (error) {
    handleDbError(error, res);
  }
});

// POST - Create product (central catalog)
router.post("/products", auth_JWT, async (req, res) => {
  const { name, description, price } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: "Name and price are required" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO products (name, description, price) 
       VALUES ($1, $2, $3) RETURNING id`,
      [name, description || null, price]
    );
    res.status(201).json({
      message: "Product created",
      productId: rows[0].id // PostgreSQL uses RETURNING
    });
  } catch (error) {
    handleDbError(error, res);
  }
});

// POST stock movements (store-specific)
router.post("/movements", auth_JWT, async (req, res) => {
  const { product_id, type, quantity } = req.body;
  const store_id = req.user.store_id; // From JWT

  if (!product_id || !type || !quantity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Check stock for THIS STORE only
    const stockResult = await pool.query(
      `SELECT COALESCE(
        SUM(CASE WHEN type='stock_in' THEN quantity ELSE -quantity END), 
        0
      ) AS stock 
      FROM stock_movements 
      WHERE product_id = $1 AND store_id = $2`,
      [product_id, store_id]
    );

    const currentStock = stockResult.rows[0].stock;

    if ((type === "sale" || type === "manual_removal") && currentStock < quantity) {
      return res.status(400).json({ error: "Insufficient Stock" });
    }

    // Record with store_id
    const { rows } = await pool.query(
      `INSERT INTO stock_movements 
       (store_id, product_id, type, quantity) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [store_id, product_id, type, quantity]
    );

    res.status(201).json({ 
      message: "Stock movement recorded", 
      id: rows[0].id 
    });
  } catch (error) {
    handleDbError(error, res);
  }
});

// PUT update movement
router.put("/movements/:id", auth_JWT, async (req, res) => {
  const { quantity } = req.body;
  const { id } = req.params;
  const store_id = req.user.store_id;

  if (!quantity) {
    return res.status(400).json({ error: "Quantity is required" });
  }

  try {
    // Verify movement exists in THIS STORE
    const { rows } = await pool.query(
      "SELECT * FROM stock_movements WHERE id = $1 AND store_id = $2",
      [id, store_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Stock movement not found" });
    }

    await pool.query(
      "UPDATE stock_movements SET quantity = $1 WHERE id = $2",
      [quantity, id]
    );

    res.status(200).json({ message: "Stock movement updated" });
  } catch (error) {
    handleDbError(error, res);
  }
});

// DELETE movement
router.delete("/movements/:id", auth_JWT, async (req, res) => {
  const { id } = req.params;
  const store_id = req.user.store_id;

  try {
    // Verify movement belongs to this store
    const { rows: [movement] } = await pool.query(
      `SELECT product_id, type, quantity 
       FROM stock_movements 
       WHERE id = $1 AND store_id = $2`,
      [id, store_id]
    );

    if (!movement) {
      return res.status(404).json({ error: "Stock movement not found" });
    }

    const { product_id, type, quantity } = movement;

    // Check stock impact for THIS STORE
    const { rows: [stock] } = await pool.query(
      `SELECT COALESCE(
        SUM(CASE WHEN type='stock_in' THEN quantity ELSE -quantity END),
        0
      ) AS current_stock
      FROM stock_movements
      WHERE product_id = $1 AND store_id = $2`,
      [product_id, store_id]
    );

    if ((type === "sale" || type === "manual_removal") && stock.current_stock < quantity) {
      return res.status(400).json({ 
        error: "Cannot delete - would cause negative stock" 
      });
    }

    await pool.query(
      "DELETE FROM stock_movements WHERE id = $1",
      [id]
    );

    res.status(200).json({ message: "Movement deleted" });
  } catch (error) {
    handleDbError(error, res);
  }
});

// GET products (central catalog)
router.get("/products", auth_JWT, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM products");
    res.json(rows);
  } catch (error) {
    handleDbError(error, res);
  }
});

// GET low stock (store-specific)
router.get("/products/low-stock", auth_JWT, async (req, res) => {
  const threshold = req.query.threshold || 5;
  const store_id = req.user.store_id;

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, 
       COALESCE(
         SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE -sm.quantity END),
         0
       ) AS stock
       FROM products p
       LEFT JOIN stock_movements sm ON p.id = sm.product_id AND sm.store_id = $1
       GROUP BY p.id, p.name
       HAVING COALESCE(SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE -sm.quantity END), 0) < $2`,
      [store_id, threshold]
    );
    res.json(rows);
  } catch (error) {
    handleDbError(error, res);
  }
});

module.exports = router;