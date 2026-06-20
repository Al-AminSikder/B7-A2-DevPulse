import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { pool } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Validation errors', 'Name, email, and password are required.');
    }

    const assignedRole = role || 'contributor';
    if (assignedRole !== 'contributor' && assignedRole !== 'maintainer') {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Validation errors', 'Role must be either contributor or maintainer.');
    }

    const checkUserRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkUserRes.rows.length > 0) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Duplicate entry', 'An account with this email already exists.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const insertUserQuery = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at, updated_at
    `;
    
    const newUserRes = await pool.query(insertUserQuery, [name, email, hashedPassword, assignedRole]);
    return sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', newUserRes.rows[0]);

  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Validation errors', 'Email and password fields are required.');
    }

    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid credentials', 'The email or password provided is incorrect.');
    }

    const user = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid credentials', 'The email or password provided is incorrect.');
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      role: user.role
    };

    const token = jwt.sign(
      tokenPayload, 
      process.env.JWT_SECRET as string, 
      { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as jwt.SignOptions['expiresIn'] }
    );

    return sendSuccess(res, StatusCodes.OK, 'Login successful', {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });

  } catch (error) {
    next(error);
  }
};