import { Router } from 'express';
import { UserController } from '../controllers/UserController';

const router = Router();
const userController = new UserController();

router.post('/', (req, res) => userController.createUser(req, res)); 
router.get('/:id', async (req, res) => userController.getUserById(req, res)); 
router.put('/:id', (req, res) => userController.updateUser(req, res)); 
router.delete('/:id', (req, res) => userController.deleteUser(req, res)); 
router.get('/', (req, res) => userController.getAllUsers(req, res)); 

export default router;
