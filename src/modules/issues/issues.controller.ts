import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { pool } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';

export const createIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, type } = req.body;
    const reporter_id = req.user?.id;

    if (!title || title.length > 150) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Validation errors', 'Title is mandatory and must not exceed 150 characters.');
    }

    if (!description || description.length < 20) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Validation errors', 'Description is mandatory and must be at least 20 characters.');
    }

    if (type !== 'bug' && type !== 'feature_request') {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Validation errors', "Type field must be 'bug' or 'feature_request'.");
    }

    const insertIssueQuery = `
      INSERT INTO issues (title, description, type, status, reporter_id)
      VALUES ($1, $2, $3, 'open', $4)
      RETURNING id, title, description, type, status, reporter_id, created_at, updated_at
    `;

    const newIssueRes = await pool.query(insertIssueQuery, [title, description, type, reporter_id]);
    return sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', newIssueRes.rows[0]);

  } catch (error) {
    next(error);
  }
};

export const getAllIssues = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sort, type, status } = req.query;

    let queryText = 'SELECT * FROM issues WHERE 1=1';
    const queryParams: unknown[] = [];
    let paramCounter = 1;

    if (type === 'bug' || type === 'feature_request') {
      queryText += ` AND type = $${paramCounter}`;
      queryParams.push(type);
      paramCounter++;
    }

    if (status === 'open' || status === 'in_progress' || status === 'resolved') {
      queryText += ` AND status = $${paramCounter}`;
      queryParams.push(status);
      paramCounter++;
    }

    if (sort === 'oldest') {
      queryText += ' ORDER BY created_at ASC';
    } else {
      queryText += ' ORDER BY created_at DESC';
    }

    const issuesRes = await pool.query(queryText, queryParams);
    const issues = issuesRes.rows;

    if (issues.length === 0) {
      return sendSuccess(res, StatusCodes.OK, 'Issues retrieved successfully', []);
    }

    const reporterIds = [...new Set(issues.map(issue => issue.reporter_id))];
    
    const usersText = `SELECT id, name, role FROM users WHERE id = ANY($1::int[])`;
    const usersRes = await pool.query(usersText, [reporterIds]);
    
    const userMap: Record<number, { id: number; name: string; role: string }> = {};
    usersRes.rows.forEach(user => {
      userMap[user.id] = user;
    });

    const populatedIssues = issues.map(issue => {
      const { reporter_id, ...rest } = issue;
      return {
        ...rest,
        reporter: userMap[reporter_id] || null
      };
    });

    return sendSuccess(res, StatusCodes.OK, 'Issues retrieved successfully', populatedIssues);

  } catch (error) {
    next(error);
  }
};

export const getSingleIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const issueRes = await pool.query('SELECT * FROM issues WHERE id = $1', [id]);
    if (issueRes.rows.length === 0) {
      return sendError(res, StatusCodes.NOT_FOUND, 'Resource not found', `Issue with ID ${id} does not exist.`);
    }

    const issue = issueRes.rows[0];

    const userRes = await pool.query('SELECT id, name, role FROM users WHERE id = $1', [issue.reporter_id]);
    const reporter = userRes.rows.length > 0 ? userRes.rows[0] : null;

    const { reporter_id, ...issueData } = issue;
    const finalResponseData = {
      ...issueData,
      reporter
    };

    return sendSuccess(res, StatusCodes.OK, 'Issue retrieved successfully', finalResponseData);

  } catch (error) {
    next(error);
  }
};

export const updateIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, type, status } = req.body;
    const user = req.user;

    if (!user) return sendError(res, StatusCodes.UNAUTHORIZED, 'Authentication required');

    const issueRes = await pool.query('SELECT * FROM issues WHERE id = $1', [id]);
    if (issueRes.rows.length === 0) {
      return sendError(res, StatusCodes.NOT_FOUND, 'Resource not found', `Issue with ID ${id} does not exist.`);
    }

    const currentIssue = issueRes.rows[0];

    if (user.role === 'contributor') {
      if (currentIssue.reporter_id !== user.id) {
        return sendError(res, StatusCodes.FORBIDDEN, 'Access denied', 'Contributors can only edit their own issues.');
      }
      if (currentIssue.status !== 'open') {
        return sendError(res, StatusCodes.CONFLICT, 'Business logic conflict', 'Contributors cannot edit issues unless their status is open.');
      }
      if (status && status !== currentIssue.status) {
        return sendError(res, StatusCodes.FORBIDDEN, 'Access denied', 'Contributors are not permitted to update workflow statuses.');
      }
    }

    const updatedTitle = title !== undefined ? title : currentIssue.title;
    const updatedDescription = description !== undefined ? description : currentIssue.description;
    const updatedType = type !== undefined ? type : currentIssue.type;
    const updatedStatus = (user.role === 'maintainer' && status !== undefined) ? status : currentIssue.status;

    if (updatedTitle.length > 150) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Validation errors', 'Title length cannot exceed 150 characters.');
    }
    if (updatedDescription.length < 20) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Validation errors', 'Description must contain at least 20 characters.');
    }
    if (updatedType !== 'bug' && updatedType !== 'feature_request') {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Validation errors', 'Invalid Issue category specified.');
    }
    if (!['open', 'in_progress', 'resolved'].includes(updatedStatus)) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Validation errors', 'Invalid workflow target status.');
    }

    const patchQuery = `
      UPDATE issues
      SET title = $1, description = $2, type = $3, status = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, title, description, type, status, reporter_id, created_at, updated_at
    `;

    const updatedRes = await pool.query(patchQuery, [updatedTitle, updatedDescription, updatedType, updatedStatus, id]);
    return sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', updatedRes.rows[0]);

  } catch (error) {
    next(error);
  }
};

export const deleteIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      return sendError(res, StatusCodes.UNAUTHORIZED, 'Authentication required');
    }

    if (user.role !== 'maintainer') {
      return sendError(res, StatusCodes.FORBIDDEN, 'Access denied', 'Only maintainers possess authorization rights to purge issue assets.');
    }

    const issueRes = await pool.query('SELECT id FROM issues WHERE id = $1', [id]);
    if (issueRes.rows.length === 0) {
      return sendError(res, StatusCodes.NOT_FOUND, 'Resource not found', `Issue with ID ${id} does not exist.`);
    }

    await pool.query('DELETE FROM issues WHERE id = $1', [id]);
    return sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully', null);

  } catch (error) {
    next(error);
  }
};