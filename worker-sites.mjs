const COMPANY_NAME = "TIAN YI INTERNATIONAL TRADING PTE. LTD";
const DEFAULT_ORDER_EMAIL_TO = "tianyi011224@gmail.com";
const MAX_QUANTITY_PER_ITEM = 999;

const STATUS_LABELS = {
  pending: "\u5f85\u786e\u8ba4",
  confirmed: "\u5df2\u786e\u8ba4",
  packing: "\u914d\u8d27\u4e2d",
  shipped: "\u5df2\u53d1\u8d27",
  completed: "\u5df2\u5b8c\u6210",
  cancelled: "\u5df2\u53d6\u6d88",
};

const PRODUCT_CATALOG = Object.freeze([
  { id: "apple-fuji", name: "\u5c71\u4e1c\u7ea2\u5bcc\u58eb\u82f9\u679c", price: 18.8, unit: "\u65a4" },
  { id: "orange-navel", name: "\u8d63\u5357\u8110\u6a59", price: 16.9, unit: "\u65a4" },
  { id: "banana", name: "\u9ad8\u5c71\u9999\u8549", price: 9.8, unit: "\u65a4" },
  { id: "strawberry", name: "\u7cbe\u54c1\u8349\u8393", price: 28.8, unit: "\u76d2" },
  { id: "tomato", name: "\u6c99\u74e4\u756a\u8304", price: 7.9, unit: "\u65a4" },
  { id: "lettuce", name: "\u6709\u673a\u751f\u83dc", price: 6.6, unit: "\u9897" },
  { id: "broccoli", name: "\u897f\u5170\u82b1", price: 8.8, unit: "\u9897" },
  { id: "carrot", name: "\u80e1\u841d\u535c", price: 5.2, unit: "\u65a4" },
  { id: "family-box", name: "\u4e09\u65e5\u5bb6\u5ead\u9c9c\u98df\u7bb1", price: 89, unit: "\u7bb1" },
  { id: "office-box", name: "\u529e\u516c\u5ba4\u6c34\u679c\u8865\u7ed9\u7bb1", price: 128, unit: "\u7bb1" },
]);

const PRODUCT_BY_ID = new Map(PRODUCT_CATALOG.map((product) => [product.id, product]));

const CREATE_ORDERS_TABLE = `
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
)`;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createOrderNumber(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = `${now.getTime()}`.slice(-5);
  return `TY-${date}-${suffix}`;
}

function formatSingaporeDate(now = new Date()) {
  return now.toLocaleString("zh-CN", { timeZone: "Asia/Singapore" });
}

function formatCurrency(value) {
  return `SGD ${Number(value || 0).toFixed(2)}`;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return { items: [], unknownProductIds: [], invalidProductIds: [] };
  }

  const quantitiesById = new Map();
  const unknownProductIds = new Set();
  const invalidProductIds = new Set();

  for (const item of items) {
    const id = String(item?.id || "").trim();
    const product = PRODUCT_BY_ID.get(id);

    if (!product) {
      unknownProductIds.add(id || "(missing id)");
      continue;
    }

    const quantity = Number(item?.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      invalidProductIds.add(id);
      continue;
    }

    const normalizedQuantity = Number(quantity.toFixed(2));
    const nextQuantity = Number(((quantitiesById.get(id) || 0) + normalizedQuantity).toFixed(2));
    quantitiesById.set(id, nextQuantity);
  }

  const normalizedItems = [];
  for (const [id, quantity] of quantitiesById) {
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      invalidProductIds.add(id);
      continue;
    }

    const product = PRODUCT_BY_ID.get(id);
    normalizedItems.push({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      quantity,
      subtotal: Number((product.price * quantity).toFixed(2)),
    });
  }

  return {
    items: normalizedItems,
    unknownProductIds: [...unknownProductIds],
    invalidProductIds: [...invalidProductIds],
  };
}

function base64Utf8(value) {
  let binary = "";
  for (const byte of new TextEncoder().encode(String(value))) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function pdfEscape(value) {
  return String(value)
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/[\\()]/g, "\\$&");
}

function createPackingSlipPdfBase64(order) {
  const contentLines = [
    `${COMPANY_NAME} Packing Slip`,
    `Order No.: ${order.orderNumber}`,
    `Date: ${order.createdAt}`,
    `Customer: ${order.customerName}`,
    `Contact: ${order.contact}`,
    `Address: ${order.address}`,
    `Notes: ${order.notes || "None"}`,
    "Items:",
    ...order.items.map((item, index) => `${index + 1}. ${item.name} x ${item.quantity} ${item.unit} (${item.id})`),
  ];
  let y = 800;
  const stream = contentLines
    .slice(0, 48)
    .map((line, index) => {
      const size = index === 0 ? 15 : 9;
      const command = `BT /F1 ${size} Tf 42 ${y} Td (${pdfEscape(line)}) Tj ET`;
      y -= index === 0 ? 24 : 15;
      return command;
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return base64Utf8(pdf);
}

function createInvoiceSpreadsheetBase64(order) {
  const rows = [
    ["Invoice No.", order.orderNumber],
    ["Company", COMPANY_NAME],
    ["Date", order.createdAt],
    ["Customer", order.customerName],
    ["Contact", order.contact],
    ["Address", order.address],
    [],
    ["#", "Item", "Qty", "Unit", "Unit Price (SGD)", "Subtotal (SGD)"],
    ...order.items.map((item, index) => [index + 1, item.name, item.quantity, item.unit, item.price, item.subtotal]),
    [],
    ["Total (SGD)", "", "", "", "", order.orderTotal],
    [],
    ["Notes", "Final payment and delivery arrangements are subject to confirmation by TIAN YI."],
  ];

  const tableRows = rows
    .map((row) => `<Row>${row.map((cell) => {
      const isNumber = typeof cell === "number";
      return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeHtml(cell)}</Data></Cell>`;
    }).join("")}</Row>`)
    .join("");

  return base64Utf8(`<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Invoice">
    <Table>${tableRows}</Table>
  </Worksheet>
</Workbook>`);
}

function createEmailHtml(order) {
  return `<!doctype html>
<html lang="zh-CN">
  <body style="font-family: Arial, 'Microsoft YaHei', sans-serif; color: #1d2a22;">
    <h2>${COMPANY_NAME} New Order</h2>
    <p><strong>Order No.:</strong> ${escapeHtml(order.orderNumber)}</p>
    <p><strong>Customer:</strong> ${escapeHtml(order.customerName)}</p>
    <p><strong>Contact:</strong> ${escapeHtml(order.contact)}</p>
    <p><strong>Address:</strong> ${escapeHtml(order.address)}</p>
    <p><strong>Total:</strong> ${escapeHtml(formatCurrency(order.orderTotal))}</p>
    <p><strong>Notes:</strong> ${escapeHtml(order.notes || "None")}</p>
    <h3>Items</h3>
    <ul>${order.items.map((item) => `<li>${escapeHtml(item.name)} x ${escapeHtml(item.quantity)} ${escapeHtml(item.unit)} - ${escapeHtml(formatCurrency(item.subtotal))}</li>`).join("")}</ul>
  </body>
</html>`;
}

async function sendOrderEmail(env, order, packingSlipPdfBase64, invoiceSpreadsheetBase64) {
  if (!env.RESEND_API_KEY) {
    return { sent: false, reason: "RESEND_API_KEY is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.ORDER_EMAIL_FROM || "onboarding@resend.dev",
      to: env.ORDER_EMAIL_TO || DEFAULT_ORDER_EMAIL_TO,
      subject: `${COMPANY_NAME} New Order ${order.orderNumber}`,
      html: createEmailHtml(order),
      attachments: [
        { filename: `packing-slip-${order.orderNumber}.pdf`, content: packingSlipPdfBase64 },
        { filename: `invoice-${order.orderNumber}.xls`, content: invoiceSpreadsheetBase64 },
      ],
    }),
  });

  if (!response.ok) {
    return { sent: false, reason: await response.text() };
  }

  return { sent: true };
}

async function ensureDatabase(env) {
  if (!env.DB) return false;
  await env.DB.batch([
    env.DB.prepare(CREATE_ORDERS_TABLE),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS orders_customer_name_idx ON orders (customer_name)"),
  ]);
  return true;
}

function rowToRecord(row) {
  const items = JSON.parse(row.items || "[]");
  return {
    order: {
      orderNumber: row.order_number,
      createdAt: row.display_date,
      customerName: row.customer_name,
      contact: row.contact,
      address: row.address,
      notes: row.notes || "",
      orderTotal: Number(row.order_total || 0),
      items,
    },
    status: row.status || "pending",
    createdAt: row.created_at,
    packingSlipPdfBase64: row.packing_slip_pdf_base64 || "",
    invoiceSpreadsheetBase64: row.invoice_spreadsheet_base64 || "",
    packingSlipFilename: row.packing_slip_filename || "",
    invoiceFilename: row.invoice_filename || "",
    email: {
      sent: Boolean(row.email_sent),
      reason: row.email_reason || undefined,
    },
  };
}

function summarizeRecord(record) {
  const status = record.status || "pending";
  return {
    orderNumber: record.order.orderNumber,
    createdAt: record.createdAt,
    displayDate: record.order.createdAt,
    customerName: record.order.customerName,
    contact: record.order.contact,
    address: record.order.address,
    orderTotal: record.order.orderTotal,
    itemCount: record.order.items.reduce((sum, item) => sum + item.quantity, 0),
    status,
    statusLabel: STATUS_LABELS[status] || status,
    emailSent: Boolean(record.email?.sent),
    packingSlipFilename: record.packingSlipFilename,
    invoiceFilename: record.invoiceFilename,
  };
}

async function saveOrder(env, record) {
  if (!(await ensureDatabase(env))) return { saved: false, reason: "D1 binding DB is not configured" };
  await env.DB.prepare(`
    INSERT OR REPLACE INTO orders (
      order_number, created_at, updated_at, display_date, customer_name, contact, address, notes,
      order_total, item_count, status, email_sent, email_reason, packing_slip_filename, invoice_filename,
      items, packing_slip_pdf_base64, invoice_spreadsheet_base64
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.order.orderNumber,
    record.createdAt,
    new Date().toISOString(),
    record.order.createdAt,
    record.order.customerName,
    record.order.contact,
    record.order.address,
    record.order.notes,
    record.order.orderTotal,
    record.order.items.reduce((sum, item) => sum + item.quantity, 0),
    record.status,
    record.email?.sent ? 1 : 0,
    record.email?.reason || null,
    record.packingSlipFilename,
    record.invoiceFilename,
    JSON.stringify(record.order.items),
    record.packingSlipPdfBase64,
    record.invoiceSpreadsheetBase64,
  ).run();
  return { saved: true };
}

async function getOrder(env, orderNumber) {
  if (!(await ensureDatabase(env))) return null;
  const row = await env.DB.prepare("SELECT * FROM orders WHERE order_number = ?").bind(orderNumber).first();
  return row ? rowToRecord(row) : null;
}

async function handleCreateOrder(request, env) {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const payload = await request.json();
  const { items, unknownProductIds, invalidProductIds } = normalizeItems(payload.items);

  if (!payload.customerName || !payload.contact || !payload.address) {
    return json(400, { error: "Missing customer details" });
  }
  if (unknownProductIds.length > 0) {
    return json(400, { error: "Order contains unknown products", productIds: unknownProductIds });
  }
  if (invalidProductIds.length > 0) {
    return json(400, { error: "Order contains invalid item quantities", productIds: invalidProductIds, maxQuantityPerItem: MAX_QUANTITY_PER_ITEM });
  }
  if (items.length === 0) {
    return json(400, { error: "Order has no items" });
  }

  const orderTotal = Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  const order = {
    orderNumber: createOrderNumber(),
    createdAt: formatSingaporeDate(),
    customerName: String(payload.customerName),
    contact: String(payload.contact),
    address: String(payload.address),
    notes: String(payload.notes || ""),
    items,
    orderTotal,
  };
  const packingSlipPdfBase64 = createPackingSlipPdfBase64(order);
  const invoiceSpreadsheetBase64 = createInvoiceSpreadsheetBase64(order);
  const email = await sendOrderEmail(env, order, packingSlipPdfBase64, invoiceSpreadsheetBase64);
  const record = {
    order,
    status: "pending",
    createdAt: new Date().toISOString(),
    packingSlipPdfBase64,
    invoiceSpreadsheetBase64,
    packingSlipFilename: `packing-slip-${order.orderNumber}.pdf`,
    invoiceFilename: `invoice-${order.orderNumber}.xls`,
    email,
  };
  const storage = await saveOrder(env, record);

  return json(200, {
    order,
    packingSlipPdfBase64,
    invoiceSpreadsheetBase64,
    packingSlipFilename: record.packingSlipFilename,
    invoiceFilename: record.invoiceFilename,
    email,
    storage,
  });
}

function requireAdmin(request, env) {
  const expected = env.ADMIN_PASSWORD;
  const supplied = request.headers.get("x-admin-password") || "";
  if (!expected) return { ok: false, error: "ADMIN_PASSWORD is not configured" };
  if (supplied !== expected) return { ok: false, error: "Invalid admin password" };
  return { ok: true };
}

async function handleAdminOrders(request, env) {
  const auth = requireAdmin(request, env);
  if (!auth.ok) return json(401, { error: auth.error });
  if (!(await ensureDatabase(env))) return json(500, { error: "D1 binding DB is not configured" });

  const url = new URL(request.url);

  if (request.method === "GET") {
    const orderNumber = url.searchParams.get("orderNumber");
    if (orderNumber) {
      const record = await getOrder(env, orderNumber);
      return record ? json(200, { order: record }) : json(404, { error: "Order not found" });
    }

    const result = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500").all();
    const orders = (result.results || []).map(rowToRecord).map(summarizeRecord);
    return json(200, { orders });
  }

  if (request.method === "PATCH") {
    const body = await request.json();
    const orderNumber = String(body.orderNumber || "");
    const status = String(body.status || "");
    if (!orderNumber || !STATUS_LABELS[status]) return json(400, { error: "Invalid orderNumber or status" });

    await env.DB.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE order_number = ?")
      .bind(status, new Date().toISOString(), orderNumber)
      .run();
    const record = await getOrder(env, orderNumber);
    return record ? json(200, { order: record }) : json(404, { error: "Order not found" });
  }

  if (request.method === "DELETE") {
    const body = await request.json();
    const orderNumber = String(body.orderNumber || "");
    if (!orderNumber) return json(400, { error: "Invalid orderNumber" });
    await env.DB.prepare("DELETE FROM orders WHERE order_number = ?").bind(orderNumber).run();
    return json(200, { deleted: true, orderNumber, database: true });
  }

  return json(405, { error: "Method not allowed" });
}

async function serveStatic(request, env) {
  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname === "/") return new Response(null, { status: 204 });
  if (!env.ASSETS) return new Response("Asset binding is not configured", { status: 500 });

  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404) return response;

  if (request.method === "GET" && !url.pathname.startsWith("/api/") && !url.pathname.includes(".")) {
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  }

  return response;
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === "OPTIONS") return new Response(null, { status: 204 });
      if (url.pathname === "/api/orders") return handleCreateOrder(request, env);
      if (url.pathname === "/api/admin-orders") return handleAdminOrders(request, env);
      return serveStatic(request, env);
    } catch (error) {
      return json(500, {
        error: "Request failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
