/**
 * repositories/auth.js
 *
 * Database access layer for authentication using standard PostgreSQL.
 */

import { db } from '../../config/db.js';

export const getUserByEmail = async (email) => {
    const { rows } = await db.query('SELECT id, name, email, role, password_hash, token_version, created_at, updated_at FROM users WHERE email = $1', [email]);
    return rows[0] || null;
};

export const getUserById = async (userId) => {
    if (!userId) return null;
    const { rows } = await db.query('SELECT id, name, email, role, token_version, created_at, updated_at FROM users WHERE id = $1', [userId]);
    return rows[0] || null;
};

/**
 * Returns the current token_version for a user, or null if the user is gone.
 * Kept separate so the hot auth path only fetches the columns it needs.
 */
export const getTokenVersion = async (userId) => {
    if (!userId) return null;
    const { rows } = await db.query('SELECT token_version FROM users WHERE id = $1', [userId]);
    return rows[0] ? rows[0].token_version : null;
};

/**
 * Bumps token_version, invalidating every JWT previously issued to the user.
 * Returns the new version.
 */
export const incrementTokenVersion = async (userId) => {
    const { rows } = await db.query(
        'UPDATE users SET token_version = token_version + 1, updated_at = NOW() WHERE id = $1 RETURNING token_version',
        [userId]
    );
    return rows[0] ? rows[0].token_version : null;
};

export const createUser = async (name, email, passwordHash, role = null) => {
    const { rows } = await db.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
        [name, email, passwordHash, role]
    );
    return rows[0];
};

// Updates only the display name. The email column is deliberately left out of
// this statement so no code path can rewrite a user's login identity through
// the profile screen.
export const updateProfile = async (userId, name) => {
    const { rows } = await db.query(
        'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
        [name, userId]
    );
    return { data: rows[0] || null, error: null };
};

export const updatePassword = async (userId, passwordHash) => {
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
    return { error: null };
};
