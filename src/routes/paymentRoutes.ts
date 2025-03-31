import express, { RequestHandler } from "express";
import { PaymentController } from "../controllers/PaymentController";

const router = express.Router();
const paymentController = new PaymentController();

router.post(
  "/",
  paymentController.createPayment.bind(paymentController) as RequestHandler,
);

export { router as paymentRouter };
