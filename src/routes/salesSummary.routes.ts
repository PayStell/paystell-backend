import { Router, RequestHandler } from "express";
import { SalesSummaryController } from "../controllers/SalesSummary.controller";
import { authenticateMerchant } from "../middlewares/merchantAuth";
import asyncHandler from "express-async-handler";

const router = Router();
const salesSummaryController = new SalesSummaryController();

router.get(
  "/total",
  authenticateMerchant as RequestHandler,
  asyncHandler(
    salesSummaryController.getTotalSales.bind(
      salesSummaryController,
    ) as unknown as RequestHandler,
  ),
);

router.get(
  "/by-period/:timePeriod",
  authenticateMerchant as RequestHandler,
  asyncHandler(
    salesSummaryController.getSalesByTimePeriod.bind(
      salesSummaryController,
    ) as unknown as RequestHandler,
  ),
);

router.get(
  "/top-products",
  authenticateMerchant as RequestHandler,
  asyncHandler(
    salesSummaryController.getTopSellingProducts.bind(
      salesSummaryController,
    ) as unknown as RequestHandler,
  ),
);

router.get(
  "/",
  authenticateMerchant as RequestHandler,
  asyncHandler(
    salesSummaryController.getSalesSummary.bind(
      salesSummaryController,
    ) as unknown as RequestHandler,
  ),
);

export default router;
