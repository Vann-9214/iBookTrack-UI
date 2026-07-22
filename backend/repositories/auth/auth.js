/**
 * repositories/auth.js
 *
 * Database access layer for authentication using standard PostgreSQL.
 */

import { db } from '../../config/db.js';

export const getUserByEmail = async (email) => {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
};

export const getUserById = async (userId) => {
    if (!userId) return null;
    const { rows } = await db.query('SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1', [userId]);
    return rows[0] || null;
};

export const createUser = async (name, email, passwordHash, role = 'user') => {
    const { rows } = await db.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
        [name, email, passwordHash, role]
    );
    return rows[0];
};

export const updateProfile = async (userId, name, email) => {
    const { rows } = await db.query(
        'UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, email, role',
        [name, email, userId]
    );
    return { data: rows[0] || null, error: null };
};

export const updatePassword = async (userId, passwordHash) => {
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
    return { error: null };
};
