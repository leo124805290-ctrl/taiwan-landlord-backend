-- 台灣房東-越南租客系統資料庫初始化腳本
-- 創建時間: 2026-02-27

-- 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用戶表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'viewer')),
  full_name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 創建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- 登入記錄表
CREATE TABLE login_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX idx_login_logs_created_at ON login_logs(created_at);

-- 物業表
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  owner_name VARCHAR(100),
  owner_phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_name ON properties(name);

-- 房間表
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  room_number VARCHAR(20) NOT NULL,
  floor INTEGER,
  monthly_rent INTEGER NOT NULL CHECK (monthly_rent >= 0),
  deposit INTEGER NOT NULL CHECK (deposit >= 0),
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  tenant_name VARCHAR(100),
  tenant_phone VARCHAR(20),
  check_in_date DATE,
  check_out_date DATE,
  contract_months INTEGER,
  current_electricity_meter INTEGER DEFAULT 0,
  previous_electricity_meter INTEGER DEFAULT 0,
  electricity_rate DECIMAL(10, 2) DEFAULT 6.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 複合約束
  UNIQUE(property_id, room_number),
  CONSTRAINT check_dates_valid CHECK (
    check_in_date IS NULL OR 
    check_out_date IS NULL OR 
    check_in_date <= check_out_date
  )
);

CREATE INDEX idx_rooms_property_id ON rooms(property_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_tenant_name ON rooms(tenant_name);
CREATE INDEX idx_rooms_check_in_date ON rooms(check_in_date);
CREATE INDEX idx_rooms_check_out_date ON rooms(check_out_date);

-- 付款記錄表
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('rent', 'deposit', 'electricity', 'other')),
  month VARCHAR(7) NOT NULL, -- YYYY/MM 格式
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  electricity_usage INTEGER,
  electricity_rate DECIMAL(10, 2),
  electricity_fee DECIMAL(12, 2),
  total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
  due_date DATE NOT NULL,
  paid_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method VARCHAR(50),
  notes TEXT,
  is_backfill BOOLEAN DEFAULT FALSE,
  collected_by VARCHAR(100),
  collection_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 複合索引
  UNIQUE(room_id, payment_type, month)
);

CREATE INDEX idx_payments_room_id ON payments(room_id);
CREATE INDEX idx_payments_payment_type ON payments(payment_type);
CREATE INDEX idx_payments_month ON payments(month);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_is_backfill ON payments(is_backfill);

-- 維護記錄表
CREATE TABLE maintenance (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  estimated_cost DECIMAL(12, 2),
  actual_cost DECIMAL(12, 2),
  estimated_completion_date DATE,
  actual_completion_date DATE,
  technician VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_property_id ON maintenance(property_id);
CREATE INDEX idx_maintenance_room_id ON maintenance(room_id);
CREATE INDEX idx_maintenance_status ON maintenance(status);
CREATE INDEX idx_maintenance_priority ON maintenance(priority);

-- 水電費表
CREATE TABLE utility_expenses (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  utility_type VARCHAR(20) NOT NULL CHECK (utility_type IN ('water', 'electricity', 'gas', 'internet', 'other')),
  period VARCHAR(7) NOT NULL, -- YYYY/MM 格式
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(property_id, utility_type, period)
);

CREATE INDEX idx_utility_expenses_property_id ON utility_expenses(property_id);
CREATE INDEX idx_utility_expenses_period ON utility_expenses(period);

-- 電錶記錄表
CREATE TABLE meter_readings (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- YYYY/MM 格式
  reading_date DATE NOT NULL,
  current_reading INTEGER NOT NULL CHECK (current_reading >= 0),
  previous_reading INTEGER NOT NULL CHECK (previous_reading >= 0),
  usage INTEGER GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
  fee DECIMAL(12, 2) GENERATED ALWAYS AS ((current_reading - previous_reading) * 6.00) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(room_id, month)
);

CREATE INDEX idx_meter_readings_property_id ON meter_readings(property_id);
CREATE INDEX idx_meter_readings_room_id ON meter_readings(room_id);
CREATE INDEX idx_meter_readings_month ON meter_readings(month);

-- 操作日誌表
CREATE TABLE operation_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_action_type ON operation_logs(action_type);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at);
CREATE INDEX idx_operation_logs_resource ON operation_logs(resource_type, resource_id);

-- 更新時間觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 為所有需要 updated_at 的表創建觸發器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_utility_expenses_updated_at BEFORE UPDATE ON utility_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 創建初始管理員用戶（密碼會在應用啟動時創建）
-- 注意：實際密碼哈希會在應用中生成

-- 創建視圖：房間詳細資訊
CREATE VIEW room_details AS
SELECT 
  r.*,
  p.name as property_name,
  p.address as property_address,
  CASE 
    WHEN r.status = 'occupied' AND r.check_out_date < CURRENT_DATE THEN 'overdue'
    WHEN r.status = 'occupied' AND r.check_out_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE r.status
  END as display_status
FROM rooms r
JOIN properties p ON r.property_id = p.id;

-- 創建視圖：月度收入統計
CREATE VIEW monthly_revenue AS
SELECT 
  p.month,
  p.property_id,
  pr.name as property_name,
  COUNT(DISTINCT p.room_id) as room_count,
  SUM(CASE WHEN p.payment_type = 'rent' THEN p.total_amount ELSE 0 END) as rent_revenue,
  SUM(CASE WHEN p.payment_type = 'electricity' THEN p.total_amount ELSE 0 END) as electricity_revenue,
  SUM(CASE WHEN p.payment_type = 'deposit' THEN p.total_amount ELSE 0 END) as deposit_revenue,
  SUM(p.total_amount) as total_revenue,
  COUNT(*) as payment_count
FROM payments p
JOIN rooms r ON p.room_id = r.id
JOIN properties pr ON r.property_id = pr.id
WHERE p.status = 'paid'
GROUP BY p.month, p.property_id, pr.name
ORDER BY p.month DESC;

-- 創建視圖：待處理付款
CREATE VIEW pending_payments AS
SELECT 
  p.*,
  r.room_number,
  r.tenant_name,
  r.tenant_phone,
  pr.name as property_name
FROM payments p
JOIN rooms r ON p.room_id = r.id
JOIN properties pr ON r.property_id = pr.id
WHERE p.status = 'pending'
  AND p.due_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY p.due_date ASC;

-- 輸出完成訊息
SELECT '✅ 資料庫架構創建完成' as message;