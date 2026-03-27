import { supabase } from "./supabase";

export type PurchaseItemInput = {
  product_id: string;
  quantity: number;
  cost_price: number;
};

export type PurchaseInvoiceInput = {
  supplier_name: string;
  invoice_number: string;
  date: string;
};

/**
 * Increases a product's stock by the given quantity.
 */
export async function updateStockOnPurchase(
  productId: string,
  quantity: number
): Promise<{ error?: string }> {
  const { data: product, error: fetchErr } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .single();

  if (fetchErr || !product) {
    return { error: fetchErr?.message ?? "Product not found" };
  }

  const { error } = await supabase
    .from("products")
    .update({ stock: product.stock + quantity })
    .eq("id", productId);

  if (error) return { error: error.message };
  return {};
}

/**
 * Creates a purchase invoice, inserts all items, and increases stock for each product.
 */
export async function addPurchaseInvoice(
  invoice: PurchaseInvoiceInput,
  items: PurchaseItemInput[]
): Promise<{ error?: string }> {
  if (items.length === 0) return { error: "Add at least one product item." };

  const { data: inv, error: invErr } = await supabase
    .from("purchase_invoices")
    .insert([{
      supplier_name: invoice.supplier_name || null,
      invoice_number: invoice.invoice_number || null,
      date: invoice.date || null,
    }])
    .select("id")
    .single();

  if (invErr || !inv) return { error: invErr?.message ?? "Failed to create invoice." };

  const purchaseItems = items.map((item) => ({
    invoice_id: inv.id,
    product_id: item.product_id,
    quantity: item.quantity,
    cost_price: item.cost_price,
  }));

  const { error: itemsErr } = await supabase.from("purchase_items").insert(purchaseItems);
  if (itemsErr) return { error: itemsErr.message };

  for (const item of items) {
    const { error: stockErr } = await updateStockOnPurchase(item.product_id, item.quantity);
    if (stockErr) return { error: `Stock update failed: ${stockErr}` };
  }

  return {};
}

/**
 * Deducts stock for each item in an order when it is marked as Shipped.
 * Prevents stock from going negative — returns an error if any product has insufficient stock.
 */
export async function updateStockOnShipment(
  orderId: string
): Promise<{ error?: string }> {
  const { data: orderItems, error: fetchErr } = await supabase
    .from("order_items")
    .select("product_id, quantity, product:products(id, name, stock)")
    .eq("order_id", orderId);

  if (fetchErr) return { error: fetchErr.message };
  if (!orderItems || orderItems.length === 0) return {};

  for (const item of orderItems) {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    if (!product) return { error: "Could not find product for an order item." };
    if ((product.stock ?? 0) < item.quantity) {
      return {
        error: `Insufficient stock for "${product.name}". Available: ${product.stock ?? 0}, Required: ${item.quantity}.`,
      };
    }
  }

  for (const item of orderItems) {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    const newStock = (product.stock ?? 0) - item.quantity;
    const { error } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", item.product_id);
    if (error) return { error: error.message };
  }

  return {};
}
