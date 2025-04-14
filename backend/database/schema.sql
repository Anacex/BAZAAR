-- Stores table (500+ store support focused)
CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255)
);

-- Products (Central catalog focused)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stock movements (Store-specific)
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id),  -- NEW FIELD
  product_id INTEGER NOT NULL REFERENCES products(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('stock_in', 'sale', 'manual_removal')),  -- ENUM → CHECK
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  time_stamp TIMESTAMP DEFAULT NOW()
);

-- Users (Add store_id for access control)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  store_id INTEGER REFERENCES stores(id),  -- NEW FIELD
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  store_id INTEGER,
  action VARCHAR(50),
  details TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
