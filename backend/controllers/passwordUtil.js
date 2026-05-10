const crypto = require('crypto');

/**
 * Password Utility Module
 * Provides password hashing, generation, and verification functions
 */

/**
 * Generate temporary password based on approval timestamp
 * Format: DDMMYYYYHHMMSS (day, month, year, hour, minute, second)
 * 
 * Example: If approved on 31 March 2026 at 14:05:07
 * Result: "31032026140507"
 * 
 * @param {Date|null} timestamp - The approval timestamp (defaults to current time)
 * @returns {string} Temporary password in DDMMYYYYHHMMSS format
 */
function generateTemporaryPassword(timestamp = new Date()) {
  const date = new Date(timestamp);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${day}${month}${year}${hours}${minutes}${seconds}`;
}

/**
 * Hash a password using PBKDF2
 * Uses SHA-256 algorithm with 100,000 iterations
 * 
 * @param {string} password - Plain text password to hash
 * @returns {string} Hashed password in format: algorithm$iterations$salt$hash
 */
function hashPassword(password) {
  const algorithm = 'sha256';
  const iterations = 100000;
  const saltLength = 32;
  
  // Generate random salt
  const salt = crypto.randomBytes(saltLength).toString('hex');
  
  // Derive key using PBKDF2
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, 64, algorithm)
    .toString('hex');
  
  // Return in format: algorithm$iterations$salt$hash (for easy parsing on verify)
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

/**
 * Verify a password against its hash
 * 
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Stored hash from database
 * @returns {boolean} True if password matches hash
 */
function verifyPassword(password, hash) {
  try {
    // Parse the hash format: algorithm$iterations$salt$hash
    const parts = hash.split('$');
    if (parts.length !== 4) {
      console.error('Invalid hash format');
      return false;
    }
    
    const algorithm = 'sha256';
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const storedHash = parts[3];
    
    // Derive key using same parameters
    const computedHash = crypto
      .pbkdf2Sync(password, salt, iterations, 64, algorithm)
      .toString('hex');
    
    // Compare hashes using constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(storedHash),
      Buffer.from(computedHash)
    );
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Check if a password is the temporary one that was generated
 * Useful for forcing password change on first login
 * 
 * @param {string} password - Plain text password to check
 * @param {Date} approvalTimestamp - The approval timestamp
 * @returns {boolean} True if password matches the temporary password
 */
function isTemporaryPassword(password, approvalTimestamp) {
  const tempPassword = generateTemporaryPassword(approvalTimestamp);
  return password === tempPassword;
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character (!@#$%^&*)
 * 
 * @param {string} password - Password to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
  isTemporaryPassword,
  validatePasswordStrength
};
