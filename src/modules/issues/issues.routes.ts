import { Router } from 'express';
import { createIssue, getAllIssues, getSingleIssue, updateIssue, deleteIssue } from './issues.controller';
import { authenticateToken, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.post('/', authenticateToken, createIssue);
router.get('/', getAllIssues);
router.get('/:id', getSingleIssue);
router.patch('/:id', authenticateToken, updateIssue);
router.delete('/:id', authenticateToken, requireRole(['maintainer']), deleteIssue);

export default router;