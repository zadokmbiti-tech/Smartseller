import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import suppliersRouter from "./suppliers";
import purchaseOrdersRouter from "./purchase-orders";
import inventoryRouter from "./inventory";
import salesRouter from "./sales";
import analyticsRouter from "./analytics";
import forecastingRouter from "./forecasting";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(suppliersRouter);
router.use(purchaseOrdersRouter);
router.use(inventoryRouter);
router.use(salesRouter);
router.use(analyticsRouter);
router.use(forecastingRouter);

export default router;
