-- Clear existing data (optional)
TRUNCATE users, stores, products, stock_movements RESTART IDENTITY CASCADE;

-- Insert stores
INSERT INTO stores (name, location) VALUES 
('Main Store', 'Karachi'),
('Downtown Branch', 'Lahore'),
('Mall Outlet', 'Islamabad');

-- Insert products
INSERT INTO products (name, description, price) VALUES
('Premium Rice', '5kg bag', 12.99),
('Mineral Water', '1L bottle', 0.75),
('Energy Drink', '250ml can', 1.50);

-- Insert users (passwords are bcrypt hashed "pass123")
INSERT INTO users (username, password, store_id) VALUES
('admin_main', '$1234', 1),  -- Store 1 admin
('manager_downtown', '$5678', 2), -- Store 2
('cashier_mall', '$9012', 3);  -- Store 3

-- Insert stock movements
INSERT INTO stock_movements (store_id, product_id, type, quantity) VALUES
(1, 1, 'stock_in', 100),  -- Main Store Rice
(1, 2, 'stock_in', 200),  -- Main Store Water
(2, 1, 'stock_in', 50),   -- Downtown Rice
(3, 3, 'stock_in', 150);  -- Mall Energy Drinks