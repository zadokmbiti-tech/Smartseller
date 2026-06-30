import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/suppliers", async (req, res) => {
  const rows = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
  res.json(rows);
});

router.post("/suppliers", async (req, res) => {
  const { name, contactName, phone, email, address, notes } = req.body;
  if (!name) { res.status(400).json({ error: "validation", message: "name is required" }); return; }
  const [row] = await db.insert(suppliersTable).values({ name, contactName, phone, email, address, notes }).returning();
  return res.status(201).json(row);
});

router.get("/suppliers/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
  if (!row) { res.status(404).json({ error: "not_found", message: "Supplier not found" }); return; }
  return res.json(row);
});

router.put("/suppliers/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, contactName, phone, email, address, notes } = req.body;
  if (!name) { res.status(400).json({ error: "validation", message: "name is required" }); return; }
  const [row] = await db.update(suppliersTable).set({ name, contactName, phone, email, address, notes }).where(eq(suppliersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "not_found", message: "Supplier not found" }); return; }
  return res.json(row);
});

router.delete("/suppliers/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
  res.status(204).send();
});

export default router;
