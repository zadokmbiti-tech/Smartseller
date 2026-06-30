import { Router, type IRouter } from "express";
import { and, eq, ilike, lte, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

const withCategory = {
  id: productsTable.id,
  sku: productsTable.sku,
  barcode: productsTable.barcode,
  name: productsTable.name,
  categoryId: productsTable.categoryId,
  categoryName: categoriesTable.name,
  costPrice: productsTable.costPrice,
  sellingPrice: productsTable.sellingPrice,
  stockQty: productsTable.stockQty,
  reorderLevel: productsTable.reorderLevel,
  unit: productsTable.unit,
  isActive: productsTable.isActive,
  createdAt: productsTable.createdAt,
  updatedAt: productsTable.updatedAt,
};

router.get("/products", async (req, res) => {
  const { categoryId, search, lowStock } = req.query;
  const conditions = [eq(productsTable.isActive, true)];
  if (categoryId) conditions.push(eq(productsTable.categoryId, Number(categoryId)));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (lowStock === "true") conditions.push(lte(productsTable.stockQty, productsTable.reorderLevel));

  const rows = await db
    .select(withCategory)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(and(...conditions))
    .orderBy(productsTable.name);
  res.json(rows);
});

router.post("/products", async (req, res) => {
  const { sku, barcode, name, categoryId, costPrice, sellingPrice, stockQty, reorderLevel, unit } = req.body;
  if (!sku || !name || costPrice == null || sellingPrice == null) {
    res.status(400).json({ error: "validation", message: "sku, name, costPrice and sellingPrice are required" }); return;
  }
  const [row] = await db.insert(productsTable).values({
    sku, barcode, name,
    categoryId: categoryId ?? null,
    costPrice: String(costPrice),
    sellingPrice: String(sellingPrice),
    stockQty: stockQty ?? 0,
    reorderLevel: reorderLevel ?? 10,
    unit: unit ?? "pcs",
  }).returning();
  const [full] = await db.select(withCategory).from(productsTable).leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id)).where(eq(productsTable.id, row.id));
  return res.status(201).json(full);
});

router.get("/products/barcode/:barcode", async (req, res) => {
  const [row] = await db
    .select(withCategory)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.barcode, req.params.barcode));
  if (!row) { res.status(404).json({ error: "not_found", message: "Product not found" }); return; }
  return res.json(row);
});

router.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select(withCategory).from(productsTable).leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id)).where(eq(productsTable.id, id));
  if (!row) { res.status(404).json({ error: "not_found", message: "Product not found" }); return; }
  return res.json(row);
});

router.put("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { sku, barcode, name, categoryId, costPrice, sellingPrice, stockQty, reorderLevel, unit } = req.body;
  const [row] = await db.update(productsTable).set({
    sku, barcode, name,
    categoryId: categoryId ?? null,
    costPrice: costPrice != null ? String(costPrice) : undefined,
    sellingPrice: sellingPrice != null ? String(sellingPrice) : undefined,
    stockQty, reorderLevel, unit,
    updatedAt: new Date(),
  }).where(eq(productsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "not_found", message: "Product not found" }); return; }
  const [full] = await db.select(withCategory).from(productsTable).leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id)).where(eq(productsTable.id, id));
  return res.json(full);
});

router.delete("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, id));
  res.status(204).send();
});

export default router;
