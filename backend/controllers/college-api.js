/**
 * College Admin API Module
 * Handles college registration, student approval, and college-specific settings
 * 
 * Endpoints:
 * POST   /api/college/register - Register a college
 * POST   /api/college/admin-register - Register college admin
 * GET    /api/college/:collegeId/pending-students - Get pending student approvals
 * POST   /api/college/approve-student - Approve a student
 * POST   /api/college/reject-student - Reject a student application
 * GET    /api/college/:collegeId/stats - Get college statistics
 * POST   /api/college/:collegeId/settings - Update college settings
 */

const supabase = require('./_supabase');
const passwordUtil = require('./passwordUtil');

/**
 * POST /api/college/register
 * Register a new college (institution)
 * 
 * Request:
 * {
 *   college_name: "MIT Pondicherry",
 *   college_code: "MITY001",
 *   city: "Pondicherry",
 *   state: "Puducherry",
 *   university_code: "PU001",
 *   university_name: "Pondicherry University"
 * }
 */
async function handleCollegeRegister(req, res) {
  try {
    const {
      college_name,
      college_code,
      city,
      state,
      university_code,
      university_name,
      principal_email,
      principal_name
    } = req.body;

    // Validation
    if (!college_name || !college_code || !city || !state || !university_code) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Check if college code already exists
    const { data: existingCollege } = await supabase
      .from('colleges')
      .select('id')
      .eq('code', college_code)
      .single();

    if (existingCollege) {
      return res.status(409).json({
        error: 'College code already registered'
      });
    }

    // Create college record
    const { data: college, error: collegeError } = await supabase
      .from('colleges')
      .insert([{
        name: college_name,
        code: college_code,
        city,
        state,
        university_code,
        university_name,
        principal_email,
        principal_name,
        status: 'pending',  // Await verification by Agora admin
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (collegeError) throw collegeError;

    res.status(201).json({
      success: true,
      message: 'College registered awaiting admin verification',
      college: {
        id: college.id,
        name: college.name,
        code: college.code,
        status: college.status
      },
      next_step: 'admin_verification'
    });
  } catch (error) {
    console.error('College register error:', error);
    res.status(500).json({
      error: error.message || 'Registration failed'
    });
  }
}

/**
 * POST /api/college/admin-register
 * Register a college admin user
 * 
 * Request:
 * {
 *   college_id: 1,
 *   full_name: "Dr. Ramesh Kumar",
 *   email: "admin@college.edu",
 *   phone: "9876543210",
 *   designation: "Dean of Academics"
 * }
 */
async function handleAdminRegister(req, res) {
  try {
    const { college_id, full_name, email, phone, designation } = req.body;

    // Validation
    if (!college_id || !full_name || !email || !phone) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Check if college exists
    const { data: college } = await supabase
      .from('colleges')
      .select('id')
      .eq('id', college_id)
      .single();

    if (!college) {
      return res.status(404).json({
        error: 'College not found'
      });
    }

    // Check if admin email already exists
    const { data: existingAdmin } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingAdmin) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // Generate temporary password
    const tempPassword = passwordUtil.generateTemporaryPassword();
    const passwordHash = passwordUtil.hashPassword(tempPassword);

    // Create admin account
    const { data: admin, error: adminError } = await supabase
      .from('user_accounts')
      .insert([{
        email: email.toLowerCase(),
        full_name,
        phone,
        password_hash: passwordHash,
        role: 'college_admin',
        college_id,
        kyc_status: 'verified',  // Admins pre-verified
        college_approval_status: 'approved',
        batua_activated: false,
        is_password_changed: false,
        approval_timestamp: new Date().toISOString()
      }])
      .select()
      .single();

    if (adminError) throw adminError;

    res.status(201).json({
      success: true,
      message: 'College admin registered. Check email for temporary password.',
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
        college_id: admin.college_id
      },
      temporary_password: tempPassword,
      note: 'Share this temporary password securely with the admin'
    });
  } catch (error) {
    console.error('Admin register error:', error);
    res.status(500).json({
      error: error.message || 'Admin registration failed'
    });
  }
}

/**
 * GET /api/college/:collegeId/pending-students
 * Get list of students pending approval at a college
 */
async function handleGetPendingStudents(req, res) {
  try {
    const { collegeId } = req.params;

    if (!collegeId) {
      return res.status(400).json({
        error: 'College ID required'
      });
    }

    // Get pending approvals
    const { data: approvals, error } = await supabase
      .from('college_student_approval')
      .select('*, student:user_accounts(id, full_name, email, phone)')
      .eq('college_id', collegeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.status(200).json({
      college_id: collegeId,
      pending_students: approvals || [],
      count: approvals?.length || 0
    });
  } catch (error) {
    console.error('Get pending students error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch pending students'
    });
  }
}

/**
 * POST /api/college/approve-student
 * Approve a student for a college
 * 
 * Request:
 * {
 *   approval_id: 1,
 *   college_id: 1,
 *   student_id: 5,
 *   notes: "Approved - valid documents"
 * }
 */
async function handleApproveStudent(req, res) {
  try {
    const { approval_id, college_id, student_id, notes } = req.body;

    // Validation
    if (!approval_id || !college_id || !student_id) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Get approval record
    const { data: approval, error: approvalError } = await supabase
      .from('college_student_approval')
      .select('*')
      .eq('id', approval_id)
      .single();

    if (approvalError || !approval) {
      return res.status(404).json({
        error: 'Approval record not found'
      });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot approve. Status is: ${approval.status}`
      });
    }

    const approvalTimestamp = new Date();

    // Update approval status
    const { error: updateApprovalError } = await supabase
      .from('college_student_approval')
      .update({
        status: 'approved',
        approved_at: approvalTimestamp.toISOString(),
        notes
      })
      .eq('id', approval_id);

    if (updateApprovalError) throw updateApprovalError;

    // Update user account
    const { error: updateUserError } = await supabase
      .from('user_accounts')
      .update({
        college_approval_status: 'approved',
        college_id
      })
      .eq('id', student_id);

    if (updateUserError) throw updateUserError;

    // Send notification to student
    await supabase
      .from('notifications')
      .insert([{
        user_id: student_id,
        type: 'college_approved',
        title: 'College Approval Confirmed!',
        message: 'Your college verification has been approved. You can now request loans!',
        is_read: false
      }])
      .catch(() => {}); // Ignore notification errors

    res.status(200).json({
      success: true,
      message: 'Student approved successfully',
      approval_id,
      student_id,
      timestamp: approvalTimestamp.toISOString()
    });
  } catch (error) {
    console.error('Approve student error:', error);
    res.status(500).json({
      error: error.message || 'Approval failed'
    });
  }
}

/**
 * POST /api/college/reject-student
 * Reject a student's college verification
 */
async function handleRejectStudent(req, res) {
  try {
    const { approval_id, student_id, reason } = req.body;

    // Validation
    if (!approval_id || !student_id) {
      return res.status(400).json({
        error: 'Approval ID and Student ID required'
      });
    }

    // Update approval status
    const { error } = await supabase
      .from('college_student_approval')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        notes: reason
      })
      .eq('id', approval_id);

    if (error) throw error;

    // Update user account
    await supabase
      .from('user_accounts')
      .update({
        college_approval_status: 'rejected'
      })
      .eq('id', student_id);

    // Send notification
    await supabase
      .from('notifications')
      .insert([{
        user_id: student_id,
        type: 'college_rejected',
        title: 'College Verification Not Approved',
        message: `Your college verification was not approved. Reason: ${reason || 'Invalid documents'}`,
        is_read: false
      }])
      .catch(() => {}); // Ignore notification errors

    res.status(200).json({
      success: true,
      message: 'Student rejected',
      approval_id,
      student_id
    });
  } catch (error) {
    console.error('Reject student error:', error);
    res.status(500).json({
      error: error.message || 'Rejection failed'
    });
  }
}

/**
 * GET /api/college/:collegeId/stats
 * Get college statistics
 */
async function handleGetCollegeStats(req, res) {
  try {
    const { collegeId } = req.params;

    if (!collegeId) {
      return res.status(400).json({
        error: 'College ID required'
      });
    }

    // Get college info
    const { data: college } = await supabase
      .from('colleges')
      .select('*')
      .eq('id', collegeId)
      .single();

    if (!college) {
      return res.status(404).json({
        error: 'College not found'
      });
    }

    // Count students
    const { count: totalApproved } = await supabase
      .from('user_accounts')
      .select('id', { count: 'exact' })
      .eq('college_id', collegeId)
      .eq('college_approval_status', 'approved');

    const { count: pendingCount } = await supabase
      .from('college_student_approval')
      .select('id', { count: 'exact' })
      .eq('college_id', collegeId)
      .eq('status', 'pending');

    const { count: rejectedCount } = await supabase
      .from('user_accounts')
      .select('id', { count: 'exact' })
      .eq('college_id', collegeId)
      .eq('college_approval_status', 'rejected');

    // Get active loans
    const { data: loans } = await supabase
      .from('loans')
      .select('borrower_id, principal_amount')
      .eq('college_id', collegeId)
      .in('status', ['active', 'repaying']);

    const totalLoansAmount = (loans || []).reduce((sum, loan) => sum + loan.principal_amount, 0);

    res.status(200).json({
      college: {
        id: college.id,
        name: college.name,
        code: college.code,
        city: college.city,
        state: college.state
      },
      statistics: {
        approved_students: totalApproved || 0,
        pending_approvals: pendingCount || 0,
        rejected_applications: rejectedCount || 0,
        active_loans: loans?.length || 0,
        total_loans_amount: totalLoansAmount
      }
    });
  } catch (error) {
    console.error('Get college stats error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch statistics'
    });
  }
}

/**
 * POST /api/college/:collegeId/settings
 * Update college settings
 */
async function handleUpdateCollegeSettings(req, res) {
  try {
    const { collegeId } = req.params;
    const updates = req.body;

    if (!collegeId) {
      return res.status(400).json({
        error: 'College ID required'
      });
    }

    // Only allow certain fields to be updated
    const allowedFields = ['principal_name', 'principal_email', 'phone', 'website'];
    const updateObj = {};

    allowedFields.forEach(field => {
      if (field in updates) {
        updateObj[field] = updates[field];
      }
    });

    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    const { data: updated, error } = await supabase
      .from('colleges')
      .update(updateObj)
      .eq('id', collegeId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'College settings updated',
      college: updated
    });
  } catch (error) {
    console.error('Update college settings error:', error);
    res.status(500).json({
      error: error.message || 'Update failed'
    });
  }
}

module.exports = {
  handleCollegeRegister,
  handleAdminRegister,
  handleGetPendingStudents,
  handleApproveStudent,
  handleRejectStudent,
  handleGetCollegeStats,
  handleUpdateCollegeSettings
};
