-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  note TEXT, -- Added for special instructions
  status order_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL
);

-- Strict Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products Policies
-- Public can view active products
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (is_active = true);
-- Only authenticated users can manage products
CREATE POLICY "Admin manage products" ON products FOR ALL USING (auth.role() = 'authenticated');

-- Orders Policies
-- Public can ONLY insert orders (no select allowed)
CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);
-- Only authenticated users can view/manage orders
CREATE POLICY "Admin manage orders" ON orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin update orders" ON orders FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete orders" ON orders FOR DELETE USING (auth.role() = 'authenticated');

-- Order Items Policies
-- Public can ONLY insert order items
CREATE POLICY "Public can insert order items" ON order_items FOR INSERT WITH CHECK (true);
-- Only authenticated users can view/manage order items
CREATE POLICY "Admin manage order items" ON order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin update order items" ON order_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete order items" ON order_items FOR DELETE USING (auth.role() = 'authenticated');
