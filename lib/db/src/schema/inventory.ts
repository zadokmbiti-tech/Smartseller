import { integer, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { productsTable } from "./products";

export const adjustmentTypeEnum = pgEnum("adjustment_type", [
  "damage",
  "shrinkage",
  "correction",
  "opening_stock",
  "return",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "sale",
  "purchase",
  "adjustment",
  "return",
]);

export const stockAdjustmentsTable = pgTable("stock_adjustments", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id),
  adjustmentType: adjustmentTypeEnum("adjustment_type").notNull(),
  quantityChange: integer("quantity_change").notNull(),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id),
  movementType: movementTypeEnum("movement_type").notNull(),
  quantityChange: integer("quantity_change").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  referenceId: integer("reference_id"),
  referenceType: text("reference_type"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStockAdjustmentSchema = createInsertSchema(stockAdjustmentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStockAdjustment = z.infer<typeof insertStockAdjustmentSchema>;
export type StockAdjustment = typeof stockAdjustmentsTable.$inferSelect;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
