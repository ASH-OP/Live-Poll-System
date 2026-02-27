import express from 'express';
import pollRestController from '../controllers/pollRestController.js';

const router = express.Router();

router.post('/', pollRestController.createPoll);
router.get('/active', pollRestController.getActivePoll);
router.get('/history', pollRestController.getAllPolls);

export default router;
