import { Router } from "express"
import { ReferralProgramController } from "../controllers/ReferralProgramController"
import { authMiddleware } from "../middlewares/authMiddleware"
import { body, param } from "express-validator"
import { ProgramStatus } from "../enums/ProgramStatus";

const router = Router()
const programController = new ReferralProgramController()

// Validation middleware
const createProgramValidation = [
  body("name").notEmpty().withMessage("Program name is required"),
  body("referrerReward").isNumeric().withMessage("Referrer reward must be a number"),
  body("refereeReward").isNumeric().withMessage("Referee reward must be a number"),
  body("startDate").isISO8601().withMessage("Invalid start date"),
  body("endDate").optional().isISO8601().withMessage("Invalid end date"),
  body("rewardCurrency").optional().isString(),
  body("maxRewardsPerUser").optional().isInt({ min: 1 }),
  body("totalBudget").optional().isNumeric(),
]

const updateProgramValidation = [
  param("id").isInt().withMessage("Invalid program ID"),
  body("name").optional().notEmpty().withMessage("Program name cannot be empty"),
  body("referrerReward").optional().isNumeric().withMessage("Referrer reward must be a number"),
  body("refereeReward").optional().isNumeric().withMessage("Referee reward must be a number"),
  body("startDate").optional().isISO8601().withMessage("Invalid start date"),
  body("endDate").optional().isISO8601().withMessage("Invalid end date"),


// … later in your validation chain …
  body("status").optional().isIn(Object.values(ProgramStatus)),
]

const programIdValidation = [param("id").isInt().withMessage("Invalid program ID")]

// Routes - Admin only (you may want to add admin middleware)
router.post("/programs", authMiddleware, createProgramValidation, programController.createProgram)
router.put("/programs/:id", authMiddleware, updateProgramValidation, programController.updateProgram)
router.get("/programs", authMiddleware, programController.getPrograms)
router.get("/programs/active", programController.getActiveProgram)
router.get("/programs/:id", authMiddleware, programIdValidation, programController.getProgramById)
router.put("/programs/:id/activate", authMiddleware, programIdValidation, programController.activateProgram)
router.put("/programs/:id/deactivate", authMiddleware, programIdValidation, programController.deactivateProgram)

export default router