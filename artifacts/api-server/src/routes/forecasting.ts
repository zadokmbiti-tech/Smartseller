import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, productsTable, saleItemsTable, salesTable } from "@workspace/db";

const router: IRouter = Router();

async function computeAvgDailySales(productId: number, days = 30): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({ total: sql<number>`sum(${saleItemsTable.quantity})` })
    .from(saleItemsTable)
    .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .where(and(eq(saleItemsTable.productId, productId), gte(salesTable.createdAt, since)));

  return Number(row?.total ?? 0) / days;
}

router.get("/forecasting/reorder-recommendations", async (req, res) => {
  const products = await db
    .select({ id: productsTable.id, sku: productsTable.sku, name: productsTable.name, stockQty: productsTable.stockQty, reorderLevel: productsTable.reorderLevel })
    .from(productsTable)
    .where(eq(productsTable.isActive, true));

  const recommendations = await Promise.all(products.map(async (p) => {
    const avgDailySales = await computeAvgDailySales(p.id, 30);
    const daysUntilStockout = avgDailySales > 0 ? p.stockQty / avgDailySales : null;
    const recommendedOrderQty = Math.max(0, Math.ceil(avgDailySales * 14 - p.stockQty + p.reorderLevel));
    let urgency: "critical" | "high" | "medium" | "low" = "low";
    if (daysUntilStockout !== null && daysUntilStockout <= 3) urgency = "critical";
    else if (daysUntilStockout !== null && daysUntilStockout <= 7) urgency = "high";
    else if (p.stockQty <= p.reorderLevel) urgency = "medium";

    return { productId: p.id, sku: p.sku, name: p.name, currentStock: p.stockQty, reorderLevel: p.reorderLevel, avgDailySales, daysUntilStockout, recommendedOrderQty, urgency };
  }));

  res.json(recommendations.filter(r => r.urgency !== "low" || r.currentStock <= r.reorderLevel).sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2, low: 3 };
    return rank[a.urgency] - rank[b.urgency];
  }));
});

router.get("/forecasting/demand/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  const [product] = await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(eq(productsTable.id, productId));
  if (!product) { res.status(404).json({ error: "not_found", message: "Product not found" }); return; }

  const days = 90;
  const since = new Date(); since.setDate(since.getDate() - days); since.setHours(0,0,0,0);

  const dailyData = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${salesTable.createdAt}), 'YYYY-MM-DD')`,
      qty: sql<number>`sum(${saleItemsTable.quantity})`,
    })
    .from(saleItemsTable)
    .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .where(and(eq(saleItemsTable.productId, productId), gte(salesTable.createdAt, since)))
    .groupBy(sql`date_trunc('day', ${salesTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${salesTable.createdAt})`);

  const totalSold = dailyData.reduce((s, d) => s + Number(d.qty), 0);
  const avgDaily = totalSold / days;
  const confidence = dailyData.length >= 30 ? "high" : dailyData.length >= 14 ? "medium" : "low";

  const forecastPoints = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return { date: d.toISOString().slice(0, 10), forecastedQty: avgDaily };
  });

  return res.json({
    productId, productName: product.name, forecastPeriodDays: 30,
    avgDailySales: avgDaily, forecastedDemand: Math.ceil(avgDaily * 30),
    confidence, dataPointsUsed: dailyData.length, dailyPoints: forecastPoints,
  });
});

router.get("/forecasting/stockout-risk", async (req, res) => {
  const products = await db
    .select({ id: productsTable.id, sku: productsTable.sku, name: productsTable.name, stockQty: productsTable.stockQty })
    .from(productsTable)
    .where(eq(productsTable.isActive, true));

  const risks = await Promise.all(products.map(async (p) => {
    const avg = await computeAvgDailySales(p.id, 14);
    if (avg <= 0) return null;
    const daysLeft = p.stockQty / avg;
    if (daysLeft > 14) return null;
    const riskLevel: "critical" | "high" | "medium" = daysLeft <= 3 ? "critical" : daysLeft <= 7 ? "high" : "medium";
    return { productId: p.id, sku: p.sku, name: p.name, currentStock: p.stockQty, avgDailySales: avg, estimatedDaysLeft: daysLeft, riskLevel };
  }));

  res.json(risks.filter(Boolean).sort((a, b) => (a!.estimatedDaysLeft) - (b!.estimatedDaysLeft)));
});

export default router;
