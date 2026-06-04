import { connectLambda, getStore } from "@netlify/blobs";
import {
  deleteOrderFromDatabase,
  getOrderFromDatabase,
  listOrdersFromDatabase,
  summarizeRecord,
  updateOrderStatusInDatabase,
} from "./order-db.mjs";

const STATUS_LABELS = {
  pending: "待确认",
  confirmed: "已确认",
  packing: "配货中",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function requireAdmin(event) {
  const expected = process.env.ADMIN_PASSWORD;
  const supplied =
    event.headers?.["x-admin-password"] ||
    event.headers?.["X-Admin-Password"] ||
    "";

  if (!expected) {
    return { ok: false, error: "ADMIN_PASSWORD is not configured" };
  }

  if (supplied !== expected) {
    return { ok: false, error: "Invalid admin password" };
  }

  return { ok: true };
}

async function getOrdersStore(event) {
  connectLambda(event);
  return getStore("orders");
}

function summarize(record) {
  const summary = summarizeRecord(record);
  return {
    ...summary,
    statusLabel: STATUS_LABELS[summary.status] || summary.status,
  };
}

export async function handler(event) {
  const auth = requireAdmin(event);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const store = await getOrdersStore(event);

    if (event.httpMethod === "GET") {
      const orderNumber = event.queryStringParameters?.orderNumber;

      if (orderNumber) {
        const databaseRecord = await getOrderFromDatabase(orderNumber);
        if (databaseRecord) return json(200, { order: databaseRecord });

        const record = await store.get(`orders/${orderNumber}.json`, {
          type: "json",
        });
        if (!record) return json(404, { error: "Order not found" });
        return json(200, { order: record });
      }

      const databaseOrders = await listOrdersFromDatabase();
      if (databaseOrders) {
        return json(200, { orders: databaseOrders.map(summarize) });
      }

      const { blobs } = await store.list({ prefix: "orders/" });
      const records = await Promise.all(
        blobs.map((blob) => store.get(blob.key, { type: "json" })),
      );
      const orders = records
        .filter(Boolean)
        .map(summarize)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

      return json(200, { orders });
    }

    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const orderNumber = String(body.orderNumber || "");
      const status = String(body.status || "");

      if (!orderNumber || !STATUS_LABELS[status]) {
        return json(400, { error: "Invalid orderNumber or status" });
      }

      const databaseRecord = await updateOrderStatusInDatabase(orderNumber, status);
      if (databaseRecord) {
        return json(200, { order: databaseRecord });
      }

      const key = `orders/${orderNumber}.json`;
      const record = await store.get(key, { type: "json" });
      if (!record) return json(404, { error: "Order not found" });

      const updated = {
        ...record,
        status,
        updatedAt: new Date().toISOString(),
      };
      await store.setJSON(key, updated, {
        metadata: {
          orderNumber,
          customerName: updated.order.customerName,
          createdAt: updated.order.createdAt,
          status,
        },
      });

      return json(200, { order: updated });
    }

    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const orderNumber = String(body.orderNumber || "");

      if (!orderNumber) {
        return json(400, { error: "Invalid orderNumber" });
      }

      const deletedFromDatabase = await deleteOrderFromDatabase(orderNumber);
      const key = `orders/${orderNumber}.json`;
      await store.delete(key);

      if (deletedFromDatabase === false) {
        return json(404, { error: "Order not found" });
      }

      return json(200, {
        deleted: true,
        orderNumber,
        database: Boolean(deletedFromDatabase),
      });
    }

    return json(405, { error: "Method not allowed" });
  } catch (error) {
    return json(500, {
      error: "Could not load orders",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
