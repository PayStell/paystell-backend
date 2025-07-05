import { Request, Response, Router } from "express"
import { body, param, query } from "express-validator"
import { WalletController } from "../controllers/walletController"
import { authMiddleware } from "../middlewares/authMiddleware"

const router = Router()
const walletController = new WalletController()

router.use(authMiddleware)

// GET endpoints
router.get("/", async (req, res) => {
  await walletController.getWallet(req, res)
})

router.get("/balance", async (req, res) => {
  await walletController.getBalance(req, res)
})

router.get("/address", async (req, res) => {
  await walletController.getAddress(req, res)
})

router.get(
  "/transactions",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sort").optional().isIn(["asc", "desc"]),
  ],
  async (req : Request, res: Response) => {
    await walletController.getTransactions(req, res)
  },
)

router.get(
  "/transactions/:id", 
  [param("id").isUUID()], 
  async (req: Request, res: Response) => {
    await walletController.getTransaction(req, res)
  }
)

// POST endpoints
router.post(
  "/send",
  [
    body("destinationAddress").notEmpty().isString(),
    body("amount").notEmpty().isDecimal({ decimal_digits: "0,7" }),
    body("assetCode").optional().isString(),
    body("assetIssuer").optional().isString(),
    body("memo").optional().isString().isLength({ max: 28 }),
  ],
  async (req: Request, res: Response) => {
    await walletController.sendPayment(req, res)
  },
)

router.post("/activate", async (req, res) => {
  await walletController.activateWallet(req, res)
})

router.post("/verify", async (req, res) => {
  await walletController.verifyWallet(req, res)
})

// PUT endpoints
router.put("/settings", async (req, res) => {
  await walletController.updateSettings(req, res)
})

// Additional routes
router.get("/info", async (req, res) => {
  await walletController.getWalletInfo(req, res)
})

router.get("/estimate-fee", async (req, res) => {
  await walletController.estimateFee(req, res)
})

router.post("/sync", async (req, res) => {
  await walletController.syncTransactions(req, res)
})

export default router