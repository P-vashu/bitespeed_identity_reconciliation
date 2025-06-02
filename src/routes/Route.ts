import express from 'express';
import { identifyContact } from '../controllers/Controller';

const router = express.Router();

router.post('/', identifyContact);

export default router;
