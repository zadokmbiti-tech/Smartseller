import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, purchaseOrdersTable, purchaseOrderItemsTable, productsTable, suppliersTable } from "@workspace/db";

const router: IRouter = Router();

async function fetchOrder(id: number) {
  const [order] = await db
    .select({
      id: purchaseOrdersTable.id,
      supplierId: purchaseOrdersTable.supplierId,
      supplierName: suppliersTable.name,
      status: purchaseOrdersTable.status,
      totalAmount: purchaseOrdersTable.totalAmount,
      notes: purchaseOrdersTable.notes,
      orderedAt: purchaseOrdersTable.orderedAt,
      receivedAt: purchaseOrdersTable.receivedAt,
      createdAt: purchaseOrdersTable.createdAt,
    })
    .from(purchaseOrdersTable)
    .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
    .where(eq(purchaseOrdersTable.id, id));

  if (!order) return null;

  const items = await db
    .select({
      id: purchaseOrderItemsTable.id,
      productId: purchaseOrderItemsTable.productId,
      productName: productsTable.name,
      sku: productsTable.sku,
      quantityOrdered: purchaseOrderItemsTable.quantityOrdered,
      quantityReceived: purchaseOrderItemsTable.quantityReceived,
      unitCost: purchaseOrderItemsTable.unitCost,
      lineTotal: purchaseOrderItemsTable.lineTotal,
    })
    .from(purchaseOrderItemsTable)
    .leftJoin(productsTable, eq(purchaseOrderItemsTable.productId, productsTable.id))
    .where(eq(purchaseOrderItemsTable.purchaseOrderId, id));

  return { ...order, items };
}

router.get("/purchase-orders", async (req, res) => {
  const { status, supplierId } = req.query;
  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(purchaseOrdersTable.status, status as "draft" | "ordered" | "received" | "cancelled"));
  if (supplierId) conditions.push(eq(purchaseOrdersTable.supplierId, Number(supplierId)));

  const orders = await db
    .select({
      id: purchaseOrdersTable.id,
      supplierId: purchaseOrdersTable.supplierId,
      supplierName: suppliersTable.name,
      status: purchaseOrdersTable.status,
      totalAmount: purchaseOrdersTable.totalAmount,
      notes: purchaseOrdersTable.notes,
      orderedAt: purchaseOrdersTable.orderedAt,
      receivedAt: purchaseOrdersTable.receivedAt,
      createdAt: purchaseOrdersTable.createdAt,
    })
    .from(purchaseOrdersTable)
    .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(purchaseOrdersTable.createdAt);

  const result = await Promise.all(orders.map(o => fetchOrder(o.id)));
  res.json(result.filter(Boolean));
});

router.post("/purchase-orders", async (req, res) => {
  const { supplierId, notes, items } = req.body;
  if (!supplierId || !items?.length) {
    res.status(400).json({ error: "validation", message: "supplierId and items are required" }); return;
  }
  const totalAmount = items.reduce((sum: number, i: { unitCost: number; quantityOrdered: number }) => sum + i.unitCost * i.quantityOrdered, 0);
  const [order] = await db.insert(purchaseOrdersTable).values({
    supplierId, notes, totalAmount: String(totalAmount),
  }).returning();

  await db.insert(purchaseOrderItemsTable).values(
    items.map((i: { productId: number; quantityOrdered: number; unitCost: number }) => ({
      purchaseOrderId: order.id,
      productId: i.productId,
      quantityOrdered: i.quantityOrdered,
      quantityReceived: 0,
      unitCost: String(i.unitCost),
      lineTotal: String(i.unitCost * i.quantityOrdered),
    }))
  );

  const full = await fetchOrder(order.id);
  return res.status(201).json(full);
});

router.get("/purchase-orders/:id", async (req, res) => {
  const order = await fetchOrder(Number(req.params.id));
  if (!order) { res.status(404).json({ error: "not_found", message: "Purchase order not found" }); return; }
  return res.json(order);
});

router.put("/purchase-orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (status === "ordered") updates.orderedAt = new Date();

  const [row] = await db.update(purchaseOrdersTable).set(updates).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "not_found", message: "Purchase order not found" }); return; }
  const full = await fetchOrder(id);
  return res.json(full);
});

router.post("/purchase-orders/:id/receive", async (req, res) => {
  const id = Number(req.params.id);
  const order = await fetchOrder(id);
  if (!order) { res.status(404).json({ error: "not_found", message: "Purchase order not found" }); return; }
  if (order.status === "received") { res.status(400).json({ error: "already_received", message: "Order already received" }); return; }

  await db.transaction(async (tx) => {
    for (const item of order.items) {
      await tx.update(productsTable)
        .set({ stockQty: db.$count(productsTable) })
        .where(eq(productsTable.id, item.productId));
      const [product] = await tx.select({ stockQty: productsTable.stockQty }).from(productsTable).where(eq(productsTable.id, item.productId));
      await tx.update(productsTable)
        .set({ stockQty: (product?.stockQty ?? 0) + item.quantityOrdered, updatedAt: new Date() })
        .where(eq(productsTable.id, item.productId));
      await tx.update(purchaseOrderItemsTable)
        .set({ quantityReceived: item.quantityOrdered })
        .where(eq(purchaseOrderItemsTable.id, item.id));
    }
    await tx.update(purchaseOrdersTable)
      .set({ status: "received", receivedAt: new Date() })
      .where(eq(purchaseOrdersTable.id, id));
  });

  const full = await fetchOrder(id);
  res.json(full);
});

export default router;
