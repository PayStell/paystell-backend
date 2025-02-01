import { Router } from 'express';
import { UserController } from '../controllers/UserController';

const router = Router();
const userController = new UserController();

// Define routes
router.post('/users', (req, res) => userController.createUser (req, res)); 
router.get('/users/:id', (req, res) => userController.getUserById(req, res)); 
router.put('/users/:id', (req, res) => userController.updateUser (req, res)); 
router.delete('/users/:id', (req, res) => userController.deleteUser (req, res)); 

export default router;