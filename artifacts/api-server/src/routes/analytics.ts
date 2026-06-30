import { Router, type IRouter } from "express";
import { and, desc, gte, lte, sql } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

function periodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

router.get("/analytics/overview", async (req, res) => {
  const period = (req.query.period as string) || "month";
  const { start, end } = periodRange(period);

  const sales = await db.select().from(salesTable)
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)));

  const totalRevenue = sales.reduce((s, r) => s + Number(r.totalAmount), 0);
  const allItems = sales.length > 0
    ? await db.select({ costPrice: saleItemsTable.costPrice, quantity: saleItemsTable.quantity })
        .from(saleItemsTable)
        .where(sql`${saleItemsTable.saleId} = ANY(ARRAY[${sql.join(sales.map(r => sql`${r.id}`), sql`, `)}])`)
    : [];

  const totalCogs = allItems.reduce((s, i) => s + Number(i.costPrice) * i.quantity, 0);
  const grossProfit = totalRevenue - totalCogs;

  const lowStockCount = await db.$count(productsTable,
    and(
      sql`${productsTable.stockQty} <= ${productsTable.reorderLevel}`,
      sql`${productsTable.isActive} = true`
    )
  );

  const topSeller = sales.length > 0 ? await db
    .select({ name: productsTable.name, total: sql<number>`sum(${saleItemsTable.lineTotal})` })
    .from(saleItemsTable)
    .leftJoin(productsTable, sql`${saleItemsTable.productId} = ${productsTable.id}`)
    .where(sql`${saleItemsTable.saleId} = ANY(ARRAY[${sql.join(sales.map(r => sql`${r.id}`), sql`, `)}])`)
    .groupBy(productsTable.name)
    .orderBy(desc(sql`sum(${saleItemsTable.lineTotal})`))
    .limit(1) : [];

  res.json({
    period,
    totalRevenue,
    totalTransactions: sales.length,
    grossProfit,
    profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    avgTransactionValue: sales.length > 0 ? totalRevenue / sales.length : 0,
    lowStockCount,
    topSellerName: topSeller[0]?.name ?? null,
    revenueChangePercent: null,
  });
});

router.get("/analytics/sales-trend", async (req, res) => {
  const groupBy = (req.query.groupBy as string) || "day";
  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; })();
  const endDate = req.query.endDate ? (() => { const d = new Date(String(req.query.endDate)); d.setHours(23,59,59,999); return d; })() : new Date();

  let truncExpr = sql`date_trunc('day', ${salesTable.createdAt})`;
  if (groupBy === "week") truncExpr = sql`date_trunc('week', ${salesTable.createdAt})`;
  if (groupBy === "month") truncExpr = sql`date_trunc('month', ${salesTable.createdAt})`;

  const rows = await db
    .select({
      label: sql<string>`to_char(${truncExpr}, 'YYYY-MM-DD')`,
      revenue: sql<number>`sum(${salesTable.totalAmount})`,
      transactions: sql<number>`count(*)`,
    })
    .from(salesTable)
    .where(and(gte(salesTable.createdAt, startDate), lte(salesTable.createdAt, endDate)))
    .groupBy(truncExpr)
    .orderBy(truncExpr);

  res.json(rows.map(r => ({
    label: r.label,
    revenue: Number(r.revenue),
    transactions: Number(r.transactions),
    profit: Number(r.revenue) * 0.3,
  })));
});

router.get("/analytics/top-products", async (req, res) => {
  const period = (req.query.period as string) || "month";
  const limit = Number(req.query.limit) || 10;
  const { start, end } = periodRange(period);

  const rows = await db
    .select({
      productId: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      totalRevenue: sql<number>`sum(${saleItemsTable.lineTotal})`,
      totalUnits: sql<number>`sum(${saleItemsTable.quantity})`,
      totalCost: sql<number>`sum(${saleItemsTable.costPrice}::numeric * ${saleItemsTable.quantity})`,
    })
    .from(saleItemsTable)
    .leftJoin(productsTable, sql`${saleItemsTable.productId} = ${productsTable.id}`)
    .leftJoin(salesTable, sql`${saleItemsTable.saleId} = ${salesTable.id}`)
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)))
    .groupBy(productsTable.id, productsTable.name, productsTable.sku)
    .orderBy(desc(sql`sum(${saleItemsTable.lineTotal})`));

  const mapped = rows.map(r => ({
    productId: r.productId,
    name: r.name ?? "",
    sku: r.sku ?? "",
    totalRevenue: Number(r.totalRevenue),
    totalUnits: Number(r.totalUnits),
    grossProfit: Number(r.totalRevenue) - Number(r.totalCost),
    margin: Number(r.totalRevenue) > 0 ? ((Number(r.totalRevenue) - Number(r.totalCost)) / Number(r.totalRevenue)) * 100 : 0,
  }));

  res.json({
    topByRevenue: mapped.slice(0, limit),
    bottomByRevenue: [...mapped].reverse().slice(0, limit),
  });
});

router.get("/analytics/payment-breakdown", async (req, res) => {
  const period = (req.query.period as string) || "month";
  const { start, end } = periodRange(period);

  const rows = await db
    .select({
      method: salesTable.paymentMethod,
      totalAmount: sql<number>`sum(${salesTable.totalAmount})`,
      count: sql<number>`count(*)`,
    })
    .from(salesTable)
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)))
    .groupBy(salesTable.paymentMethod);

  const grandTotal = rows.reduce((s, r) => s + Number(r.totalAmount), 0);
  res.json(rows.map(r => ({
    method: r.method,
    totalAmount: Number(r.totalAmount),
    transactionCount: Number(r.count),
    percentage: grandTotal > 0 ? (Number(r.totalAmount) / grandTotal) * 100 : 0,
  })));
});

router.get("/analytics/category-performance", async (req, res) => {
  const period = (req.query.period as string) || "month";
  const { start, end } = periodRange(period);

  const rows = await db
    .select({
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      totalRevenue: sql<number>`sum(${saleItemsTable.lineTotal})`,
      totalUnits: sql<number>`sum(${saleItemsTable.quantity})`,
      totalCost: sql<number>`sum(${saleItemsTable.costPrice}::numeric * ${saleItemsTable.quantity})`,
    })
    .from(saleItemsTable)
    .leftJoin(productsTable, sql`${saleItemsTable.productId} = ${productsTable.id}`)
    .leftJoin(categoriesTable, sql`${productsTable.categoryId} = ${categoriesTable.id}`)
    .leftJoin(salesTable, sql`${saleItemsTable.saleId} = ${salesTable.id}`)
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)))
    .groupBy(categoriesTable.id, categoriesTable.name)
    .orderBy(desc(sql`sum(${saleItemsTable.lineTotal})`));

  res.json(rows.map(r => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName ?? "Uncategorized",
    totalRevenue: Number(r.totalRevenue),
    totalUnits: Number(r.totalUnits),
    grossProfit: Number(r.totalRevenue) - Number(r.totalCost),
    margin: Number(r.totalRevenue) > 0 ? ((Number(r.totalRevenue) - Number(r.totalCost)) / Number(r.totalRevenue)) * 100 : 0,
  })));
});

export default router;
