import { connectLambda, getStore } from "@netlify/blobs";
import { saveOrderToDatabase } from "./order-db.mjs";
import { getCatalogProductById } from "./product-catalog.mjs";

const COMPANY_NAME = "TIAN YI INTERNATIONAL TRADING PTE. LTD";
const ORDER_EMAIL_TO = "tianyi011224@gmail.com";
const MAX_QUANTITY_PER_ITEM = 999;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value) {
  return `SGD ${Number(value || 0).toFixed(2)}`;
}

function createOrderNumber(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = `${now.getTime()}`.slice(-5);
  return `TY-${date}-${suffix}`;
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
    const product = getCatalogProductById(id);

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
    const nextQuantity = Number(
      ((quantitiesById.get(id) || 0) + normalizedQuantity).toFixed(2),
    );
    quantitiesById.set(id, nextQuantity);
  }

  const normalizedItems = [];
  for (const [id, quantity] of quantitiesById) {
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      invalidProductIds.add(id);
      continue;
    }

    const product = getCatalogProductById(id);
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

function wrapText(text, maxChars = 72) {
  const input = String(text || "");
  const lines = [];
  let current = "";

  for (const char of input) {
    const weight = char.charCodeAt(0) > 255 ? 2 : 1;
    const currentWeight = [...current].reduce(
      (sum, item) => sum + (item.charCodeAt(0) > 255 ? 2 : 1),
      0,
    );

    if (currentWeight + weight > maxChars && current) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function toPdfHex(text) {
  const bytes = Buffer.from(String(text), "utf16le");
  let hex = "FEFF";
  for (let index = 0; index < bytes.length; index += 2) {
    hex += bytes[index + 1].toString(16).padStart(2, "0").toUpperCase();
    hex += bytes[index].toString(16).padStart(2, "0").toUpperCase();
  }
  return `<${hex}>`;
}

function pdfTextLine(text, x, y, size = 10) {
  return `BT /F1 ${size} Tf ${x} ${y} Td ${toPdfHex(text)} Tj ET`;
}

function createSimplePdf({ title, subtitle, sections }) {
  const pageWidth = 595;
  const pageHeight = 842;
  const lines = [];
  let y = 800;

  lines.push(pdfTextLine(title, 42, y, 16));
  y -= 22;
  lines.push(pdfTextLine(subtitle, 42, y, 10));
  y -= 28;

  for (const section of sections) {
    if (y < 90) break;
    lines.push(pdfTextLine(section.heading, 42, y, 12));
    y -= 18;

    for (const row of section.rows) {
      for (const line of wrapText(row, 84)) {
        if (y < 52) break;
        lines.push(pdfTextLine(line, 54, y, 9));
        y -= 14;
      }
      y -= 2;
    }
    y -= 10;
  }

  const stream = lines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 8 0 R >>`,
    "<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [5 0 R] >>",
    "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 5 >> /FontDescriptor 6 0 R >>",
    "<< /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [-260 -174 1043 826] /ItalicAngle 0 /Ascent 752 /Descent -271 /CapHeight 737 /StemV 58 >>",
    "<< /Producer (TIAN YI Order Function) >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function createPackingSlipPdf(order) {
  return createSimplePdf({
    title: `${COMPANY_NAME} Packing Slip`,
    subtitle: order.orderNumber,
    sections: [
      {
        heading: "Order Information",
        rows: [
          `Order No.: ${order.orderNumber}`,
          `Date: ${order.createdAt}`,
          `Customer: ${order.customerName}`,
          `Contact: ${order.contact}`,
          `Address: ${order.address}`,
          `Notes: ${order.notes || "None"}`,
        ],
      },
      {
        heading: "Items to Pack",
        rows: order.items.map(
          (item, index) =>
            `${index + 1}. ${item.name} | Qty: ${item.quantity} ${item.unit} | SKU: ${item.id}`,
        ),
      },
    ],
  });
}

function createInvoiceSpreadsheet(order) {
  const rows = [
    ["Invoice No.", order.orderNumber],
    ["Company", COMPANY_NAME],
    ["Date", order.createdAt],
    ["Customer", order.customerName],
    ["Contact", order.contact],
    ["Address", order.address],
    [],
    ["#", "Item", "Qty", "Unit", "Unit Price (SGD)", "Subtotal (SGD)"],
    ...order.items.map((item, index) => [
      index + 1,
      item.name,
      item.quantity,
      item.unit,
      item.price,
      item.subtotal,
    ]),
    [],
    ["Total (SGD)", "", "", "", "", order.orderTotal],
    [],
    ["Notes", "This invoice is editable in Microsoft Excel."],
    ["Payment", "Final payment and delivery arrangements are subject to confirmation by TIAN YI."],
  ];

  const tableRows = rows
    .map(
      (row) => `
        <Row>
          ${row
            .map((cell) => {
              const isNumber = typeof cell === "number";
              return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeHtml(cell)}</Data></Cell>`;
            })
            .join("")}
        </Row>`,
    )
    .join("");

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Invoice">
    <Table>${tableRows}</Table>
  </Worksheet>
</Workbook>`;

  return Buffer.from(workbook, "utf8");
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
    <ul>
      ${order.items
        .map(
          (item) =>
            `<li>${escapeHtml(item.name)} x ${escapeHtml(item.quantity)} ${escapeHtml(item.unit)} - ${escapeHtml(formatCurrency(item.subtotal))}</li>`,
        )
        .join("")}
    </ul>
    <p>The packing slip PDF and editable Invoice Excel file are attached.</p>
  </body>
</html>`;
}

async function sendOrderEmail(order, packingSlipPdf, invoiceSpreadsheet) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured" };
  }

  const from = process.env.ORDER_EMAIL_FROM || "onboarding@resend.dev";
  const to = process.env.ORDER_EMAIL_TO || ORDER_EMAIL_TO;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `${COMPANY_NAME} New Order ${order.orderNumber}`,
      html: createEmailHtml(order),
      attachments: [
        {
          filename: `packing-slip-${order.orderNumber}.pdf`,
          content: packingSlipPdf.toString("base64"),
        },
        {
          filename: `invoice-${order.orderNumber}.xls`,
          content: invoiceSpreadsheet.toString("base64"),
        },
      ],
    }),
  });

  if (!response.ok) {
    return {
      sent: false,
      reason: await response.text(),
    };
  }

  return { sent: true };
}

async function saveOrder(event, record) {
  try {
    connectLambda(event);
    const store = getStore("orders");
    await store.setJSON(`orders/${record.order.orderNumber}.json`, record, {
      metadata: {
        orderNumber: record.order.orderNumber,
        customerName: record.order.customerName,
        createdAt: record.order.createdAt,
        status: record.status,
      },
    });
    return { saved: true };
  } catch (error) {
    return {
      saved: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const {
      items,
      unknownProductIds,
      invalidProductIds,
    } = normalizeItems(payload.items);

    if (!payload.customerName || !payload.contact || !payload.address) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing customer details" }),
      };
    }

    if (unknownProductIds.length > 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Order contains unknown products",
          productIds: unknownProductIds,
        }),
      };
    }

    if (invalidProductIds.length > 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Order contains invalid item quantities",
          productIds: invalidProductIds,
          maxQuantityPerItem: MAX_QUANTITY_PER_ITEM,
        }),
      };
    }

    if (items.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Order has no items" }),
      };
    }

    const calculatedTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const orderTotal = Number(calculatedTotal.toFixed(2));

    const order = {
      orderNumber: createOrderNumber(),
      createdAt: new Date().toLocaleString("zh-CN", {
        timeZone: "Asia/Singapore",
      }),
      customerName: String(payload.customerName),
      contact: String(payload.contact),
      address: String(payload.address),
      notes: String(payload.notes || ""),
      items,
      orderTotal,
    };

    const packingSlipPdf = createPackingSlipPdf(order);
    const invoiceSpreadsheet = createInvoiceSpreadsheet(order);
    const email = await sendOrderEmail(order, packingSlipPdf, invoiceSpreadsheet);
    const record = {
      order,
      status: "pending",
      createdAt: new Date().toISOString(),
      packingSlipPdfBase64: packingSlipPdf.toString("base64"),
      invoiceSpreadsheetBase64: invoiceSpreadsheet.toString("base64"),
      packingSlipFilename: `packing-slip-${order.orderNumber}.pdf`,
      invoiceFilename: `invoice-${order.orderNumber}.xls`,
      email,
    };
    let storage = await saveOrderToDatabase(record);
    if (!storage.saved) {
      storage = await saveOrder(event, record);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order,
        packingSlipPdfBase64: record.packingSlipPdfBase64,
        invoiceSpreadsheetBase64: record.invoiceSpreadsheetBase64,
        packingSlipFilename: record.packingSlipFilename,
        invoiceFilename: record.invoiceFilename,
        email,
        storage,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not create order",
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}
