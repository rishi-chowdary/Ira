/**
 * Student API Module
 * Handles student registration, KYC, wallet activation, and college verification
 * 
 * Endpoints:
 * POST   /api/student/register - Student sign-up
 * POST   /api/student/verify-otp - Verify email/phone OTP
 * POST   /api/student/kyc - Submit KYC (Aadhaar, PAN)
 * POST   /api/student/activate-batua - Pay activation fee
 * POST   /api/student/college-verification - College code + fee receipt
 * GET    /api/student/dashboard - Get profile and balances
 * POST   /api/student/login - Student login
 * POST   /api/student/change-password - Change password
 */

const crypto = require('crypto');
const supabase = require('./_supabase');
const passwordUtil = require('./passwordUtil');
const emailService = require('./emailService');
const trustScore = require('./trustScore');

/**
 * Helper: Generate Borrowing Account ID
 * Format: IN/StateCode/DistrictCode/UniversityCode/CollegeCode/CoursCode/EnrollmentSeq
 */
function generateBorrowingAccountId(collegeCode, enrollmentNumber) {
  // Format: 91 SS DD UUU CCC CC YYYYMM enrollmentSeq
  // For now, generate from college code
  const timestamp = new Date();
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const seq = String(enrollmentNumber || Math.random().toString(36).substr(2, 5)).padStart(5, '0');
  
  return `91_${collegeCode}_${year}${month}_${seq}`;
}

/**
 * Helper: Generate OTP (6 digits)
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Helper: Send OTP email/SMS
 */
async function sendOTP(email, otp, type = 'email') {
  console.log(`\n📧 OTP sent to ${email}: ${otp}`);
  // TODO: Integrate with actual email/SMS service
  return { success: true, otp_sent: true };
}

/**
 * POST /api/student/register
 * Create new student account
 * 
 * Request:
 * {
 *   email: "student@college.edu",
 *   phone: "9876543210",
 *   full_name: "John Doe"
 * }
 */
async function handleStudentRegister(req, res) {
  try {
    const { email, phone, full_name } = req.body;

    // Validation
    if (!email || !phone || !full_name) {
      return res.status(400).json({
        error: 'Email, phone, and full name required'
      });
    }

    // Normalize inputs
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim().replace(/\D/g, '');

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // Generate temporary password based on current timestamp
    const registrationTimestamp = new Date();
    const tempPassword = passwordUtil.generateTemporaryPassword(registrationTimestamp);
    const passwordHash = passwordUtil.hashPassword(tempPassword);

    // Create user account
    const { data: newUser, error: userError } = await supabase
      .from('user_accounts')
      .insert([{
        email: normalizedEmail,
        phone: normalizedPhone,
        full_name: full_name,
        password_hash: passwordHash,
        kyc_status: 'pending',
        college_approval_status: 'pending',
        batua_activated: false,
        role: 'student',
        approval_timestamp: registrationTimestamp.toISOString(),
        is_password_changed: false
      }])
      .select()
      .single();

    if (userError) throw userError;

    // Generate and send OTP
    const otp = generateOTP();
    await sendOTP(normalizedEmail, otp, 'email');

    // TODO: Store OTP in cache (Redis) with 10-minute expiry
    // For now, log it
    console.log(`OTP for ${normalizedEmail}: ${otp}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Check email for OTP.',
      user_id: newUser.id,
      email: normalizedEmail,
      otp_sent: true,
      next_step: 'verify_otp'
    });
  } catch (error) {
    console.error('Student register error:', error);
    res.status(500).json({
      error: error.message || 'Registration failed'
    });
  }
}

/**
 * POST /api/student/verify-otp
 * Verify email/phone OTP
 * 
 * Request:
 * {
 *   user_id: 1,
 *   otp: "123456"
 * }
 */
async function handleVerifyOTP(req, res) {
  try {
    const { user_id, otp } = req.body;

    if (!user_id || !otp) {
      return res.status(400).json({
        error: 'User ID and OTP required'
      });
    }

    // TODO: Check OTP from cache/database
    // For now, accept any 6-digit OTP
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        error: 'Invalid OTP format'
      });
    }

    // Mark as verified (in real system, check cache)
    const { error: updateError } = await supabase
      .from('user_accounts')
      .update({
        // OTP verified flag would go here
      })
      .eq('id', user_id);

    if (updateError) throw updateError;

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      next_step: 'kyc'
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      error: error.message || 'Verification failed'
    });
  }
}

/**
 * POST /api/student/kyc
 * Submit KYC data (Aadhaar, PAN)
 * 
 * Request:
 * {
 *   user_id: 1,
 *   aadhaar_number: "123456789012",
 *   aadhaar_name: "John Doe",
 *   pan_number: "ABCDE1234F",
 *   pan_name: "John Doe",
 *   date_of_birth: "2004-01-15",
 *   gender: "M",
 *   address: { street, city, state, pincode }
 * }
 */
async function handleKYC(req, res) {
  try {
    const {
      user_id,
      aadhaar_number,
      aadhaar_name,
      pan_number,
      pan_name,
      date_of_birth,
      gender,
      address
    } = req.body;

    // Validation
    if (!user_id || !aadhaar_number || !pan_number) {
      return res.status(400).json({
        error: 'User ID, Aadhaar, and PAN required'
      });
    }

    // Validate Aadhaar (12 digits)
    if (!/^\d{12}$/.test(aadhaar_number.replace(/\D/g, ''))) {
      return res.status(400).json({
        error: 'Invalid Aadhaar number (must be 12 digits)'
      });
    }

    // Validate PAN (alphanumeric, 10 chars)
    if (!/^[A-Z0-9]{10}$/.test(pan_number.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid PAN number'
      });
    }

    // Check existing KYC
    const { data: existingKYC } = await supabase
      .from('kyc_data')
      .select('id')
      .eq('user_id', user_id)
      .single();

    let kycData;
    if (existingKYC) {
      // Update existing
      const { data, error } = await supabase
        .from('kyc_data')
        .update({
          aadhaar_number: aadhaar_number.replace(/\D/g, ''),
          aadhaar_name,
          pan_number: pan_number.toUpperCase(),
          pan_name,
          date_of_birth,
          gender,
          address
        })
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;
      kycData = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('kyc_data')
        .insert([{
          user_id,
          aadhaar_number: aadhaar_number.replace(/\D/g, ''),
          aadhaar_name,
          pan_number: pan_number.toUpperCase(),
          pan_name,
          date_of_birth,
          gender,
          address
        }])
        .select()
        .single();

      if (error) throw error;
      kycData = data;
    }

    // Update KYC status to verified (in real system, mock DigiLocker verification)
    await supabase
      .from('user_accounts')
      .update({
        kyc_status: 'verified'
      })
      .eq('id', user_id);

    res.status(200).json({
      success: true,
      message: 'KYC verified successfully',
      kyc_id: kycData.id,
      next_step: 'activate_batua'
    });
  } catch (error) {
    console.error('KYC error:', error);
    res.status(500).json({
      error: error.message || 'KYC submission failed'
    });
  }
}

/**
 * POST /api/student/activate-batua
 * Pay <3 activation fee to activate wallet (₹1 locked, ₹1 unlocked, ₹1 platform fee)
 * 
 * Request:
 * {
 *   user_id: 1,
 *   payment_method: "upi|credit_card|debit_card",
 *   upi_ref_id: "UPI123456" (optional, for UPI)
 * }
 */
async function handleActivateBatua(req, res) {
  try {
    const { user_id, payment_method, upi_ref_id } = req.body;
    const ACTIVATION_FEE = 3.00;

    if (!user_id || !payment_method) {
      return res.status(400).json({
        error: 'User ID and payment method required'
      });
    }

    // Simulate payment processing
    if (!['upi', 'credit_card', 'debit_card'].includes(payment_method)) {
      return res.status(400).json({
        error: 'Invalid payment method'
      });
    }

    // Check if wallet already exists
    const { data: existingWallet } = await supabase
      .from('batua_wallet')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (existingWallet) {
      return res.status(409).json({
        error: 'Wallet already activated'
      });
    }

    // Create wallet
    const wallet_id = `BATUA_${user_id}_${Date.now()}`;
    const activationTimestamp = new Date();

    const { data: wallet, error: walletError } = await supabase
      .from('batua_wallet')
      .insert([{
        user_id,
        wallet_id,
        locked_balance: 1.00,      // ₹1 locked
        unlocked_balance: 1.00     // ₹1 unlocked
      }])
      .select()
      .single();

    if (walletError) throw walletError;

    // Create payment transaction
    const transactionId = `TXN_${user_id}_${Date.now()}`;
    await supabase
      .from('transactions')
      .insert([{
        transaction_id: transactionId,
        user_id,
        wallet_id: wallet.id,
        transaction_type: 'activation_fee',
        amount: ACTIVATION_FEE,
        status: 'completed',
        description: 'Batua wallet activation fee',
        upi_ref_id: upi_ref_id || null,
        completed_at: activationTimestamp.toISOString()
      }]);

    // Update user account
    await supabase
      .from('user_accounts')
      .update({
        batua_activated: true,
        activation_timestamp: activationTimestamp.toISOString()
      })
      .eq('id', user_id);

    // Initialize trust score
    await supabase
      .from('trust_score')
      .insert([{
        user_id,
        shri_score: 500  // Starting score
      }])
      .on('*', (payload) => {}) // Ignore duplicates
      .then(() => {}, () => {});

    res.status(201).json({
      success: true,
      message: 'Batua wallet activated successfully',
      wallet: {
        wallet_id: wallet.wallet_id,
        locked_balance: 1.00,
        unlocked_balance: 1.00,
        total_balance: 2.00
      },
      activation_fee: ACTIVATION_FEE,
      transaction_id: transactionId,
      next_step: 'college_verification'
    });
  } catch (error) {
    console.error('Batua activation error:', error);
    res.status(500).json({
      error: error.message || 'Activation failed'
    });
  }
}

/**
 * POST /api/student/college-verification
 * Submit college code and fee receipt for college approval
 * 
 * Request:
 * {
 *   user_id: 1,
 *   college_code: "001",
 *   enrollment_number: "123456",
 *   fee_receipt_url: "https://...",
 *   fee_amount: 50000
 * }
 */
async function handleCollegeVerification(req, res) {
  try {
    const { user_id, college_code, enrollment_number, fee_receipt_url, fee_amount } = req.body;

    // Validation
    if (!user_id || !college_code || !enrollment_number || !fee_amount) {
      return res.status(400).json({
        error: 'All fields required: college_code, enrollment_number, fee_amount, fee_receipt_url'
      });
    }

    // Find college by code
    const { data: college, error: collegeError } = await supabase
      .from('colleges')
      .select('id')
      .eq('code', college_code)
      .single();

    if (collegeError || !college) {
      return res.status(404).json({
        error: 'College not found'
      });
    }

    // Create approval record (status: pending)
    const { data: approval, error: approvalError } = await supabase
      .from('college_student_approval')
      .insert([{
        student_id: user_id,
        college_id: college.id,
        fee_receipt_url,
        fee_amount,
        status: 'pending'
      }])
      .select()
      .single();

    if (approvalError) throw approvalError;

    // Update user account
    await supabase
      .from('user_accounts')
      .update({
        college_id: college.id,
        enrollment_number,
        college_approval_status: 'pending'
      })
      .eq('id', user_id);

    res.status(201).json({
      success: true,
      message: 'College verification submitted. Awaiting college admin approval.',
      approval_id: approval.id,
      status: 'pending',
      next_step: 'wait_for_college_approval'
    });
  } catch (error) {
    console.error('College verification error:', error);
    res.status(500).json({
      error: error.message || 'Verification submission failed'
    });
  }
}

/**
 * GET /api/student/dashboard
 * Get student profile, balances, loans, and trust score
 * 
 * Headers: Authorization: Bearer <token>
 */
async function handleStudentDashboard(req, res) {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        error: 'User ID required'
      });
    }

    // Get user account
    const { data: user, error: userError } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Get wallet
    const { data: wallet } = await supabase
      .from('batua_wallet')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Get trust score
    const { data: score } = await supabase
      .from('trust_score')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Get active loans (as borrower)
    const { data: loans } = await supabase
      .from('loans')
      .select('*')
      .eq('borrower_id', user_id)
      .in('status', ['active', 'repaying']);

    // Get guarantor nominations
    const { data: guarantors } = await supabase
      .from('guarantors')
      .select('*')
      .eq('borrower_id', user_id)
      .eq('status', 'approved');

    res.status(200).json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        borrowing_account_id: user.borrowing_account_id,
        college_approval_status: user.college_approval_status,
        kyc_status: user.kyc_status,
        batua_activated: user.batua_activated
      },
      wallet: wallet ? {
        wallet_id: wallet.wallet_id,
        locked_balance: wallet.locked_balance,
        unlocked_balance: wallet.unlocked_balance,
        total_balance: wallet.total_balance
      } : null,
      trust_score: score ? {
        shri_score: score.shri_score,
        total_borrowed: score.total_borrowed,
        total_repaid: score.total_repaid,
        on_time_payments: score.on_time_payments,
        late_payments: score.late_payments
      } : null,
      active_loans: loans ? loans.length : 0,
      guarantors: guarantors ? guarantors.length : 0
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({
      error: error.message || 'Dashboard fetch failed'
    });
  }
}

/**
 * POST /api/student/login
 * Student login
 */
async function handleStudentLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required'
      });
    }

    // Get user
    const { data: user, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const passwordMatches = passwordUtil.verifyPassword(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Check if using temporary password
    const isUsingTempPassword = !user.is_password_changed &&
      passwordUtil.isTemporaryPassword(password, new Date(user.approval_timestamp));

    const sessionToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        borrowing_account_id: user.borrowing_account_id
      },
      sessionToken,
      isTemporaryPassword: isUsingTempPassword,
      message: isUsingTempPassword
        ? 'Login successful. Please change your temporary password.'
        : 'Login successful'
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      error: error.message || 'Login failed'
    });
  }
}

/**
 * POST /api/student/change-password
 * Change student password
 */
async function handleChangePassword(req, res) {
  try {
    const { user_id, currentPassword, newPassword, confirmPassword } = req.body;

    if (!user_id || !currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'All fields required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'Passwords do not match'
      });
    }

    // Validate strength
    const validation = passwordUtil.validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        requirements: validation.errors
      });
    }

    // Get user
    const { data: user } = await supabase
      .from('user_accounts')
      .select('password_hash')
      .eq('id', user_id)
      .single();

    // Verify current password
    if (!passwordUtil.verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = passwordUtil.hashPassword(newPassword);

    // Update
    await supabase
      .from('user_accounts')
      .update({
        password_hash: newPasswordHash,
        is_password_changed: true
      })
      .eq('id', user_id);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: error.message || 'Password change failed'
    });
  }
}

module.exports = {
  handleStudentRegister,
  handleVerifyOTP,
  handleKYC,
  handleActivateBatua,
  handleCollegeVerification,
  handleStudentDashboard,
  handleStudentLogin,
  handleChangePassword,
  generateBorrowingAccountId
};
