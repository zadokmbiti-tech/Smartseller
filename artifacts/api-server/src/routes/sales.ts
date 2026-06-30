import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable, stockMovementsTable } from "@workspace/db";

const router: IRouter = Router();

function genReceipt() {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `RCP${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(Math.floor(Math.random() * 999), 3)}`;
}

async function fetchSale(id: number) {
  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
  if (!sale) return null;
  const items = await db
    .select({
      id: saleItemsTable.id,
      productId: saleItemsTable.productId,
      productName: productsTable.name,
      sku: productsTable.sku,
      quantity: saleItemsTable.quantity,
      unitPrice: saleItemsTable.unitPrice,
      costPrice: saleItemsTable.costPrice,
      discountAmount: saleItemsTable.discountAmount,
      lineTotal: saleItemsTable.lineTotal,
    })
    .from(saleItemsTable)
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(eq(saleItemsTable.saleId, id));
  return { ...sale, items };
}

router.get("/sales", async (req, res) => {
  const { startDate, endDate, paymentMethod, limit } = req.query;
  const conditions = [];
  if (startDate) conditions.push(gte(salesTable.createdAt, new Date(String(startDate))));
  if (endDate) {
    const end = new Date(String(endDate));
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(salesTable.createdAt, end));
  }
  if (paymentMethod) conditions.push(eq(salesTable.paymentMethod, paymentMethod as "cash" | "mpesa" | "bank"));

  const rows = await db.select().from(salesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(salesTable.createdAt))
    .limit(Number(limit) || 50);

  const result = await Promise.all(rows.map(r => fetchSale(r.id)));
  res.json(result.filter(Boolean));
});

router.post("/sales", async (req, res) => {
  const { paymentMethod, amountPaid, discountAmount = 0, mpesaPhone, bankRef, customerPhone, customerName, notes, items } = req.body;
  if (!paymentMethod || amountPaid == null || !items?.length) {
    res.status(400).json({ error: "validation", message: "paymentMethod, amountPaid, and items are required" }); return;
  }

  const subtotal = items.reduce((sum: number, i: { unitPrice: number; quantity: number }) => sum + i.unitPrice * i.quantity, 0);
  const total = subtotal - Number(discountAmount);
  const change = Number(amountPaid) - total;

  const saleId = await db.transaction(async (tx) => {
    const [sale] = await tx.insert(salesTable).values({
      receiptNumber: genReceipt(),
      paymentMethod,
      subtotal: String(subtotal),
      discountAmount: String(discountAmount),
      totalAmount: String(total),
      amountPaid: String(amountPaid),
      changeDue: String(Math.max(0, change)),
      mpesaStatus: paymentMethod === "mpesa" ? "pending" : null,
      customerPhone, customerName, notes,
      bankRef: paymentMethod === "bank" ? bankRef : null,
    }).returning();

    for (const item of items as { productId: number; quantity: number; unitPrice: number; discountAmount?: number }[]) {
      const [product] = await tx.select({ costPrice: productsTable.costPrice, stockQty: productsTable.stockQty })
        .from(productsTable).where(eq(productsTable.id, item.productId));
      const itemDiscount = item.discountAmount ?? 0;
      const lineTotal = item.unitPrice * item.quantity - itemDiscount;

      await tx.insert(saleItemsTable).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        costPrice: product?.costPrice ?? "0",
        discountAmount: String(itemDiscount),
        lineTotal: String(lineTotal),
      });

      const newQty = (product?.stockQty ?? 0) - item.quantity;
      await tx.update(productsTable).set({ stockQty: newQty, updatedAt: new Date() }).where(eq(productsTable.id, item.productId));
      await tx.insert(stockMovementsTable).values({
        productId: item.productId,
        movementType: "sale",
        quantityChange: -item.quantity,
        quantityAfter: newQty,
        referenceId: sale.id,
        referenceType: "sale",
      });
    }

    return sale.id;
  });

  const full = await fetchSale(saleId);
  return res.status(201).json(full);
});

router.get("/sales/daily-summary", async (req, res) => {
  const dateParam = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10);
  const start = new Date(dateParam);
  const end = new Date(dateParam);
  end.setHours(23, 59, 59, 999);

  const rows = await db.select().from(salesTable)
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)));

  const items = rows.length > 0
    ? await db.select({
        costPrice: saleItemsTable.costPrice,
        quantity: saleItemsTable.quantity,
      }).from(saleItemsTable).where(
        sql`${saleItemsTable.saleId} = ANY(ARRAY[${sql.join(rows.map(r => sql`${r.id}`), sql`, `)}])`
      )
    : [];

  const totalRevenue = rows.reduce((s, r) => s + Number(r.totalAmount), 0);
  const totalCogs = items.reduce((s, i) => s + Number(i.costPrice) * i.quantity, 0);
  const cashTotal = rows.filter(r => r.paymentMethod === "cash").reduce((s, r) => s + Number(r.totalAmount), 0);
  const mpesaTotal = rows.filter(r => r.paymentMethod === "mpesa").reduce((s, r) => s + Number(r.totalAmount), 0);
  const bankTotal = rows.filter(r => r.paymentMethod === "bank").reduce((s, r) => s + Number(r.totalAmount), 0);

  res.json({
    date: dateParam,
    totalSales: rows.length,
    totalRevenue,
    totalCogs,
    grossProfit: totalRevenue - totalCogs,
    cashTotal,
    mpesaTotal,
    bankTotal,
    avgTransactionValue: rows.length > 0 ? totalRevenue / rows.length : 0,
  });
});

router.get("/sales/:id/mpesa-status", async (req, res) => {
  const id = Number(req.params.id);
  const [sale] = await db.select({ mpesaRef: salesTable.mpesaRef, mpesaStatus: salesTable.mpesaStatus })
    .from(salesTable).where(eq(salesTable.id, id));
  if (!sale) { res.status(404).json({ error: "not_found", message: "Sale not found" }); return; }
  return res.json({ saleId: id, mpesaRef: sale.mpesaRef, status: sale.mpesaStatus ?? "pending" });
});

router.get("/sales/:id", async (req, res) => {
  const sale = await fetchSale(Number(req.params.id));
  if (!sale) { res.status(404).json({ error: "not_found", message: "Sale not found" }); return; }
  return res.json(sale);
});

router.post("/sales/mpesa/callback", async (req, res) => {
  const body = req.body;
  try {
    const result = body?.Body?.stkCallback;
    const checkoutId = result?.CheckoutRequestID;
    const resultCode = result?.ResultCode;
    const mpesaRef = result?.CallbackMetadata?.Item?.find((i: { Name: string }) => i.Name === "MpesaReceiptNumber")?.Value;

    if (checkoutId) {
      await db.update(salesTable).set({
        mpesaStatus: resultCode === 0 ? "confirmed" : "failed",
        mpesaRef: mpesaRef ?? null,
      }).where(eq(salesTable.mpesaRef, checkoutId));
    }
  } catch (_) {}
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

export default router;
