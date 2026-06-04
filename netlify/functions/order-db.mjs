import { createClient } from "@supabase/supabase-js";

const ORDER_SELECT_FIELDS = `
  order_number,
  created_at,
  display_date,
  customer_name,
  contact,
  address,
  notes,
  order_total,
  item_count,
  status,
  email_sent,
  email_reason,
  packing_slip_filename,
  invoice_filename,
  items,
  packing_slip_pdf_base64,
  invoice_spreadsheet_base64
`;

export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

function mapRow(row) {
  return {
    order: {
      orderNumber: row.order_number,
      createdAt: row.display_date,
      customerName: row.customer_name,
      contact: row.contact,
      address: row.address,
      notes: row.notes || "",
      orderTotal: Number(row.order_total || 0),
      items: row.items || [],
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

export function summarizeRecord(record) {
  return {
    orderNumber: record.order.orderNumber,
    createdAt: record.createdAt,
    displayDate: record.order.createdAt,
    customerName: record.order.customerName,
    contact: record.order.contact,
    address: record.order.address,
    orderTotal: record.order.orderTotal,
    itemCount: record.order.items.reduce((sum, item) => sum + item.quantity, 0),
    status: record.status || "pending",
    emailSent: Boolean(record.email?.sent),
    packingSlipFilename: record.packingSlipFilename,
    invoiceFilename: record.invoiceFilename,
  };
}

export async function saveOrderToDatabase(record) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { saved: false, configured: false };
  }

  const { error } = await supabase.from("orders").upsert({
    order_number: record.order.orderNumber,
    created_at: record.createdAt,
    display_date: record.order.createdAt,
    customer_name: record.order.customerName,
    contact: record.order.contact,
    address: record.order.address,
    notes: record.order.notes,
    order_total: record.order.orderTotal,
    item_count: record.order.items.reduce((sum, item) => sum + item.quantity, 0),
    status: record.status,
    email_sent: Boolean(record.email?.sent),
    email_reason: record.email?.reason || null,
    packing_slip_filename: record.packingSlipFilename,
    invoice_filename: record.invoiceFilename,
    items: record.order.items,
    packing_slip_pdf_base64: record.packingSlipPdfBase64,
    invoice_spreadsheet_base64: record.invoiceSpreadsheetBase64,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  return { saved: true, configured: true };
}

export async function listOrdersFromDatabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function getOrderFromDatabase(orderNumber) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT_FIELDS)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function updateOrderStatusInDatabase(orderNumber, status) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("order_number", orderNumber)
    .select(ORDER_SELECT_FIELDS)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function deleteOrderFromDatabase(orderNumber) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("orders")
    .delete()
    .eq("order_number", orderNumber)
    .select("order_number")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
