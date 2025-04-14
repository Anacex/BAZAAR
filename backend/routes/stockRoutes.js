const express = require("express");
const redis = require("../config/redisClient");
const pool = require("../config/db");
const { auth_JWT } = require("../middleware/authMiddleware");
const emitter = require("../config/eventEmitter");

const router = express.Router();

// Helper for error handling
const handleDbError = (error, res) => {
  console.error(error);
  res.status(500).json({ error: error.message }); // Show actual error
};

// GET stock movements (stage 2: now store-specific) (stage 3: date filtered)
router.get("/movements", auth_JWT, async (req, res) => {
  const store_id = req.user.store_id;
  const { start, end, product_id } = req.query;

  let baseQuery = 'SELECT * FROM stock_movements WHERE store_id = $1';
  const values = [store_id];
  let idx = 2;

  if (start) {
    baseQuery += ` AND time_stamp >= $${idx}`;
    values.push(start);
    idx++;
  }

  if (end) {
    baseQuery += ` AND time_stamp <= $${idx}`;
    values.push(end);
    idx++;
  }

  if (product_id) {
    baseQuery += ` AND product_id = $${idx}`;
    values.push(product_id);
  }

  try {
    const { rows } = await pool.query(baseQuery, values);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stock movements" });
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
    // Log the update
    /*await pool.query(
      `INSERT INTO audit_logs (user_id, store_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        req.user.store_id,
        'create_product',
        `created product: Name: ${name}, Price: ${price}`
      ]
    );*/
    emitter.emit("audit", {
      user_id: req.user.id,
      store_id: req.user.store_id,
      action: "create_product",
      details: "create product: Name: ${name}, price: ${price}"
    });

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
    /*// Log the update
    await pool.query(
      `INSERT INTO audit_logs (user_id, store_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        req.user.store_id,
        'add_stock_movement',
        `New movement ID: ${id}, New Quantity: ${quantity}`
      ]
    );*/
    const movementID = rows[0].id;
    emitter.emit("audit", {
      user_id : req.user_id,
      store_id: req.user.store_id,
      action: "add_stock_movement",
      details: 'Product ID: ${product_id}, Type: ${type}, Qty: ${quantity}, Movement ID: ${movementID}'
    });


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
     /*// Log the update
     await pool.query(
      `INSERT INTO audit_logs (user_id, store_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        req.user.store_id,
        'update_stock',
        `Updated movement ID: ${id}, New Quantity: ${quantity}`
      ]
    );*/
    emitter.emit("audit", {
      user_id: req.user.id,
      store_id: req.user.store_id,
      action: "update_stock",
      details: `Updated movement ID: ${id}, New Quantity: ${quantity}`
    });
    
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
    /*// Log the update
    await pool.query(
      `INSERT INTO audit_logs (user_id, store_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        req.user.store_id,
        'delete_movement',
        `deleted movement ID: ${id}, New Quantity: ${quantity}`
      ]
    );*/
    emitter.emit("audit", {
      user_id: req.user.id,
      store_id: req.user.store_id,
      action: "delete_movement",
      details: `Deleted movement ID: ${id}, Quantity before deletion: ${quantity}`
    });
    

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

  const cacheKey = 'low_stock_${store_id}_${threshold}';

  try {
    const cached = await redis.get(cacheKey);
    if(cached){
      return res.json(JSON.parse(cached));
    }
    const { rows } = await pool.query(
      `SELECT p.id, p.name, 
       COALESCE(
         SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE -sm.quantity END),
         0)
       AS stock
       FROM products p
       LEFT JOIN stock_movements sm ON p.id = sm.product_id AND sm.store_id = $1
       GROUP BY p.id, p.name
       HAVING COALESCE(SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE -sm.quantity END), 0) < $2`,
      [store_id, threshold]
    );

    //caching result for 10mins
    await redis.setEx(cacheKey,600, JSON.stringify(rows));

    res.json(rows);
  } catch (error) {
    handleDbError(error, res);
  }
});

// STORE MANAGEMENT ENDPOINTS

// Create new store (admin only functionality to be added ideally)
router.post("/stores", auth_JWT, async (req, res) => {
  const { name, location } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Store name is required" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO stores (name, location) 
       VALUES ($1, $2) RETURNING id`,
      [name, location || null]
    );

   /* // Log the update
    await pool.query(
      `INSERT INTO audit_logs (user_id, store_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        req.user.store_id,
        'create_store',
        `created store ID: ${name}, Location: ${location}`
      ]
    );*/
    emitter.emit("audit", {
      user_id: req.user.id,
      store_id: req.user.store_id,
      action: "create_store",
      details: `Created store: Name = ${name}, Location = ${location || "N/A"}`
    });
    
    res.status(201).json({
      message: "Store created",
      storeId: rows[0].id
    });
  } catch (error) {
    handleDbError(error, res);
  }
});

// Get all stores
router.get("/stores", auth_JWT, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM stores");
    res.json(rows);
  } catch (error) {
    handleDbError(error, res);
  }
});

// Get single store
router.get("/stores/:id", auth_JWT, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM stores WHERE id = $1",
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Store not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    handleDbError(error, res);
  }
});

module.exports = router;