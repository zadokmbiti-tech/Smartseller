import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/categories", async (req, res) => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(rows);
});

router.post("/categories", async (req, res) => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "validation", message: "name is required" }); return; }
  const [row] = await db.insert(categoriesTable).values({ name, description }).returning();
  return res.status(201).json(row);
});

router.get("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!row) { res.status(404).json({ error: "not_found", message: "Category not found" }); return; }
  return res.json(row);
});

router.put("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "validation", message: "name is required" }); return; }
  const [row] = await db.update(categoriesTable).set({ name, description }).where(eq(categoriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "not_found", message: "Category not found" }); return; }
  return res.json(row);
});

router.delete("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).send();
});

export default router;
