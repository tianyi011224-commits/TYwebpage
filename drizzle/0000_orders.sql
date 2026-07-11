CREATE TABLE IF NOT EXISTS orders (
  order_number TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  display_date TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT,
  order_total REAL NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  email_sent INTEGER NOT NULL DEFAULT 0,
  email_reason TEXT,
  packing_slip_filename TEXT,
  invoice_filename TEXT,
  items TEXT NOT NULL DEFAULT '[]',
  packing_slip_pdf_base64 TEXT,
  invoice_spreadsheet_base64 TEXT
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx
  ON orders (created_at DESC);

CREATE INDEX IF NOT EXISTS orders_status_idx
  ON orders (status);

CREATE INDEX IF NOT EXISTS orders_customer_name_idx
  ON orders (customer_name);
