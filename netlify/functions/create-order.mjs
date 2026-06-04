const COMPANY_NAME = "TIAN YI INTERNATIONAL TRADING PTE. LTD";
const ORDER_EMAIL_TO = "tianyi011224@gmail.com";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(Number(value || 0));
}

function createOrderNumber(now = new Date()) {
  const date = now
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const suffix = `${now.getTime()}`.slice(-5);
  return `TY-${date}-${suffix}`;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 0);
      return {
        id: String(item.id || ""),
        name: String(item.name || ""),
        price,
        unit: String(item.unit || ""),
        quantity,
        subtotal: Number((price * quantity).toFixed(2)),
      };
    })
    .filter((item) => item.name && item.quantity > 0);
}

function documentStyles() {
  return `
    <style>
      body { color: #1d2a22; font-family: Arial, "Microsoft YaHei", sans-serif; line-height: 1.55; margin: 0; padding: 24px; }
      h1 { font-size: 24px; margin: 0 0 8px; }
      h2 { font-size: 18px; margin: 26px 0 10px; }
      p { margin: 4px 0; }
      .meta { background: #f2f7f1; border: 1px solid #dfeade; padding: 14px; }
      table { border-collapse: collapse; margin-top: 12px; width: 100%; }
      th, td { border: 1px solid #d7e2d6; padding: 9px; text-align: left; vertical-align: top; }
      th { background: #edf6ee; }
      .total { font-size: 18px; font-weight: 700; text-align: right; }
      .muted { color: #607166; }
    </style>
  `;
}

function itemRows(items, includePrice) {
  return items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</td>
          ${
            includePrice
              ? `<td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.subtotal)}</td>`
              : ""
          }
        </tr>
      `,
    )
    .join("");
}

function createPackingSlip(order) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>配货单 ${escapeHtml(order.orderNumber)}</title>
    ${documentStyles()}
  </head>
  <body>
    <h1>${COMPANY_NAME} 配货单</h1>
    <p class="muted">Packing Slip</p>
    <div class="meta">
      <p><strong>订单编号：</strong>${escapeHtml(order.orderNumber)}</p>
      <p><strong>下单时间：</strong>${escapeHtml(order.createdAt)}</p>
      <p><strong>客户：</strong>${escapeHtml(order.customerName)}</p>
      <p><strong>联系方式：</strong>${escapeHtml(order.contact)}</p>
      <p><strong>配送地址：</strong>${escapeHtml(order.address)}</p>
      <p><strong>备注：</strong>${escapeHtml(order.notes || "无")}</p>
    </div>
    <h2>配货明细</h2>
    <table>
      <thead>
        <tr><th>#</th><th>商品</th><th>数量</th></tr>
      </thead>
      <tbody>${itemRows(order.items, false)}</tbody>
    </table>
  </body>
</html>`;
}

function createInvoice(order) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${escapeHtml(order.orderNumber)}</title>
    ${documentStyles()}
  </head>
  <body>
    <h1>${COMPANY_NAME} Invoice</h1>
    <p class="muted">订单发票 / Invoice</p>
    <div class="meta">
      <p><strong>Invoice No.：</strong>${escapeHtml(order.orderNumber)}</p>
      <p><strong>Date：</strong>${escapeHtml(order.createdAt)}</p>
      <p><strong>Bill To：</strong>${escapeHtml(order.customerName)}</p>
      <p><strong>Contact：</strong>${escapeHtml(order.contact)}</p>
      <p><strong>Address：</strong>${escapeHtml(order.address)}</p>
    </div>
    <h2>Items</h2>
    <table>
      <thead>
        <tr><th>#</th><th>Item</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr>
      </thead>
      <tbody>${itemRows(order.items, true)}</tbody>
    </table>
    <p class="total">Total: ${formatCurrency(order.orderTotal)}</p>
  </body>
</html>`;
}

function createEmailHtml(order, packingSlipHtml, invoiceHtml) {
  return `<!doctype html>
<html lang="zh-CN">
  <body style="font-family: Arial, 'Microsoft YaHei', sans-serif; color: #1d2a22;">
    <h2>${COMPANY_NAME} 新订单</h2>
    <p><strong>订单编号：</strong>${escapeHtml(order.orderNumber)}</p>
    <p><strong>客户：</strong>${escapeHtml(order.customerName)}</p>
    <p><strong>联系方式：</strong>${escapeHtml(order.contact)}</p>
    <p><strong>地址：</strong>${escapeHtml(order.address)}</p>
    <p><strong>总金额：</strong>${formatCurrency(order.orderTotal)}</p>
    <p><strong>备注：</strong>${escapeHtml(order.notes || "无")}</p>
    <h3>商品</h3>
    <ul>
      ${order.items
        .map(
          (item) =>
            `<li>${escapeHtml(item.name)} x ${escapeHtml(item.quantity)} ${escapeHtml(item.unit)} - ${formatCurrency(item.subtotal)}</li>`,
        )
        .join("")}
    </ul>
    <hr />
    <h3>配货单</h3>
    ${packingSlipHtml}
    <hr />
    <h3>Invoice</h3>
    ${invoiceHtml}
  </body>
</html>`;
}

async function sendOrderEmail(order, packingSlipHtml, invoiceHtml) {
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
      subject: `${COMPANY_NAME} 新订单 ${order.orderNumber}`,
      html: createEmailHtml(order, packingSlipHtml, invoiceHtml),
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
    const items = normalizeItems(payload.items);

    if (!payload.customerName || !payload.contact || !payload.address) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing customer details" }),
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
    const submittedTotal = Number(payload.orderTotal);
    const orderTotal = Number(
      (Number.isFinite(submittedTotal) ? submittedTotal : calculatedTotal).toFixed(2),
    );

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

    const packingSlipHtml = createPackingSlip(order);
    const invoiceHtml = createInvoice(order);
    const email = await sendOrderEmail(order, packingSlipHtml, invoiceHtml);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order,
        packingSlipHtml,
        invoiceHtml,
        email,
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
