import { Router, type IRouter } from "express";
import { and, desc, eq, lte } from "drizzle-orm";
import { db, productsTable, stockAdjustmentsTable, stockMovementsTable, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/inventory/adjustments", async (req, res) => {
  const { productId, limit } = req.query;
  const conditions = [];
  if (productId) conditions.push(eq(stockAdjustmentsTable.productId, Number(productId)));

  const rows = await db
    .select({
      id: stockAdjustmentsTable.id,
      productId: stockAdjustmentsTable.productId,
      productName: productsTable.name,
      adjustmentType: stockAdjustmentsTable.adjustmentType,
      quantityChange: stockAdjustmentsTable.quantityChange,
      quantityBefore: stockAdjustmentsTable.quantityBefore,
      quantityAfter: stockAdjustmentsTable.quantityAfter,
      reason: stockAdjustmentsTable.reason,
      createdAt: stockAdjustmentsTable.createdAt,
    })
    .from(stockAdjustmentsTable)
    .leftJoin(productsTable, eq(stockAdjustmentsTable.productId, productsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(stockAdjustmentsTable.createdAt))
    .limit(Number(limit) || 50);

  res.json(rows);
});

router.post("/inventory/adjustments", async (req, res) => {
  const { productId, adjustmentType, quantityChange, reason } = req.body;
  if (!productId || !adjustmentType || quantityChange == null) {
    res.status(400).json({ error: "validation", message: "productId, adjustmentType, quantityChange are required" }); return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(productId)));
  if (!product) { res.status(404).json({ error: "not_found", message: "Product not found" }); return; }

  const before = product.stockQty;
  const after = before + Number(quantityChange);

  await db.transaction(async (tx) => {
    await tx.update(productsTable).set({ stockQty: after, updatedAt: new Date() }).where(eq(productsTable.id, Number(productId)));
    await tx.insert(stockAdjustmentsTable).values({
      productId: Number(productId),
      adjustmentType,
      quantityChange: Number(quantityChange),
      quantityBefore: before,
      quantityAfter: after,
      reason,
    });
    await tx.insert(stockMovementsTable).values({
      productId: Number(productId),
      movementType: "adjustment",
      quantityChange: Number(quantityChange),
      quantityAfter: after,
      note: reason,
    });
  });

  const [adj] = await db.select({
    id: stockAdjustmentsTable.id,
    productId: stockAdjustmentsTable.productId,
    productName: productsTable.name,
    adjustmentType: stockAdjustmentsTable.adjustmentType,
    quantityChange: stockAdjustmentsTable.quantityChange,
    quantityBefore: stockAdjustmentsTable.quantityBefore,
    quantityAfter: stockAdjustmentsTable.quantityAfter,
    reason: stockAdjustmentsTable.reason,
    createdAt: stockAdjustmentsTable.createdAt,
  })
    .from(stockAdjustmentsTable)
    .leftJoin(productsTable, eq(stockAdjustmentsTable.productId, productsTable.id))
    .orderBy(desc(stockAdjustmentsTable.id))
    .limit(1);

  return res.status(201).json(adj);
});

router.get("/inventory/low-stock", async (req, res) => {
  const rows = await db
    .select({
      productId: productsTable.id,
      sku: productsTable.sku,
      name: productsTable.name,
      stockQty: productsTable.stockQty,
      reorderLevel: productsTable.reorderLevel,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(and(
      eq(productsTable.isActive, true),
      lte(productsTable.stockQty, productsTable.reorderLevel)
    ))
    .orderBy(productsTable.stockQty);

  res.json(rows.map(r => ({ ...r, deficit: r.reorderLevel - r.stockQty })));
});

router.get("/inventory/movements/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  const limit = Number(req.query.limit) || 30;

  const rows = await db
    .select()
    .from(stockMovementsTable)
    .where(eq(stockMovementsTable.productId, productId))
    .orderBy(desc(stockMovementsTable.createdAt))
    .limit(limit);

  res.json(rows);
});

export default router;
