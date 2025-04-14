const express = require("express");
const pool = require ("../config/db"); //database connection file
const { auth_JWT } = require("../middleware/authMiddleware");  

const router = express.Router();

//'GET' stock movements
router.get("/movements",auth_JWT, async (req, res) => {
    try{
        const [rows] = await pool.query("SELECT * from stock_movements");
        res.json(rows);
    } 
    catch(error){
        console.error(error);
        res.status(500).json({error: "Database error"});

    }
});
// POST - Create new product
router.post("/products", auth_JWT, async (req, res) => {
    const { name, description, price } = req.body;
    
    if (!name || !price) {
        return res.status(400).json({ error: "Name and price are required" });
    }

    try {
        const [result] = await pool.query(
            "INSERT INTO products (name, description, price) VALUES (?, ?, ?)",
            [name, description || null, price]
        );
        
        res.status(201).json({
            message: "Product created",
            productId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create product" });
    }
});

//'POST' new stock movements
router.post("/movements",auth_JWT, async(req, res)=>{
    const {product_id, type, quantity}=req.body;
    if(!product_id || !type || !quantity){
        return res.status(400).json({error: "Missing required fields"});
    }
    try {
        const [result]=await pool.query(
            "select ifnull (sum(case when type = 'stock_in' then quantity else -quantity END), 0) as stock from stock_movements where product_id = ?", 
            [product_id]
        );
        let currentStock = result[0].stock;

        //preventinmg negative stock for 'sale' and 'manual removal'
        if((type==="sale" || type === "manual_removal") && currentStock<quantity){
            return res.status(400).json({error: "Insufficient Stock"});
        }
        //
        const [insertResult] = await pool.query(
            "Insert INto stock_movements (product_id, type, quantity) VALUES (?,?,?)",[product_id,type,quantity]
        );
        res.status(201).json({message: "stock movement recorded", id: insertResult.insertId});
    }
    catch(error){
        console.error(error);
        res.status(500).json({error: "Failed to record stock movement"});
    }
})  ;

router.put("/movements/:id", auth_JWT, async (req, res )=>{
    const {quantity}= req.body;
    const {id} =req.params;

    if(!quantity){
        return res.status(400).json({error: "Quantity is requred"});
    }
    try{
        const[movement]=await pool.query("select * from stock_movements where id = ?", [id]);
        if (movement.length === 0){
            return res.status(400).json({error: "Stock movement not found"});
        }
        await pool.query("Update stock_movements set quantity = ? where id =?", [quantity, id]);
        res.status(200).json({message: "Stock movement updated successfully"});
    }
    catch(error){
        console.error(error);
        res.status(500).json({error: "Failed to update stock movemnts"});
    }
});

router.delete("/movements/:id",auth_JWT, async (req, res)=>{
    const { id}= req.params;
    try{
        //movement exists?
        const[movement]=await pool.query("select * from stock_movements where id = ?", [id]);
        if(movement.length===0){
            return res.status(404).json({error: "Stock movement not found"});
        }

        const {product_id, type, quantity}= movement[0];

        //current stock value?
        const[result]=await pool.query("select ifnull (sum(case when type = 'stock_in' then quantity else -quantity end),0) as stock from stock_movements where product_id =?", [product_id]);

        let currentStock = result[0].stock;

        //negative stock prevention
        if ((type==="sale"|| type ==="manual_removal") && currentStock<quantity){
            return res.status(400).json({error: "Cannot delete movement, would cause neg stock"});
        }
        await pool.query("Delete from stock_movements where id = ? ", [id]);

        res.status(200).json({message: "Stock movement deleted successfully"});

    }
     catch(error){
        console.error(error);
        res.status(500).json({error: "Failed to delete stock movements"});
     }
});

router.get("/products",auth_JWT, async (req, res)=>{
    try{
        const[rows]=await pool.query("Select * from products");
        res.json(rows);
    }
    catch(error){
        console.error(error);
        res.status(500).json({error: "Database error"});
    }
});

router.get("/products/low-stock",auth_JWT, async (req, res) => {
    const threshold = req.query.threshold || 5; // Default threshold 5 units
    try {
        const [rows] = await pool.query(
            "SELECT p.id, p.name, IFNULL(SUM(CASE WHEN sm.type = 'stock_in' THEN sm.quantity ELSE -sm.quantity END), 0) AS stock FROM products p LEFT JOIN stock_movements sm ON p.id = sm.product_id GROUP BY p.id, p.name HAVING stock < ?",
            [threshold] 
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error" });
    }
});




module.exports = router;