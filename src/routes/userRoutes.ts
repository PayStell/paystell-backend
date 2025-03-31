import { Router, Request, Response } from "express";
import { UserController } from "../controllers/UserController";

const router = Router();
const userController = new UserController();

router.post("/", (req, res) =>
  userController.createUser(req as Request, res as Response),
);
router.get("/:id", async (req, res) =>
  userController.getUserById(req as Request, res as Response),
);
router.put("/:id", (req, res) =>
  userController.updateUser(req as Request, res as Response),
);
router.delete("/:id", (req, res) =>
  userController.deleteUser(req as Request, res as Response),
);
router.get("/", (req, res) =>
  userController.getAllUsers(req as Request, res as Response),
);

export default router;
