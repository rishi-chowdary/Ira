/**
 * College Authentication Routes
 * Handles college login, logout, and password management
 * 
 * Endpoints:
 * POST /api/college/login - College login with code and password
 * POST /api/college/change-password - Change password
 */

const express = require('express');
const colleges = require('./colleges');

const router = express.Router();

/**
 * POST /api/college/login
 * College login endpoint
 * 
 * Request body:
 * {
 *   collegeCode: "001",
 *   password: "31032026140507" (temporary) or user's chosen password
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   college: { id, code, name, email },
 *   sessionToken: "...",
 *   isTemporaryPassword: true/false,
 *   message: "..."
 * }
 */
router.post('/login', colleges.handleCollegeLogin);

/**
 * POST /api/college/change-password
 * Change college password
 * 
 * Request body:
 * {
 *   collegeCode: "001",
 *   currentPassword: "31032026140507",
 *   newPassword: "SecurePass123!",
 *   confirmPassword: "SecurePass123!"
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Password changed successfully..."
 * }
 * 
 * Password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character (!@#$%^&*)
 */
router.post('/change-password', colleges.handleChangePassword);

module.exports = router;
