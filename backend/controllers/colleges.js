/**
 * College Registration API
 * Implements complete registration, approval, and ID generation workflow
 * 
 * NUMERIC CODE SYSTEM:
 * - All IDs use numeric codes (no letters except in database tables)
 * - State codes (2-digit): 55-89 from master state_codes table (55=MP, 56=UP, ..., 89=A&N Islands)
 * - Custom states (new, not in master): auto-assigned 90+
 * - District codes (3-digit): auto-generated per state (100+)
 * - Sector codes (3-digit): from Aadhaar zones (user input)
 * - University codes (3-digit): auto-generated per district (001+)
 * - College codes (3-digit): auto-generated per university (001+)
 * - Course codes (2-digit): auto-generated per college (01+)
 * 
 * STATE CODE MASTER LIST (Updated 31-Mar-2026):
 * 55=Madhya Pradesh, 56=Uttar Pradesh, 57=Chhattisgarh, 58=Maharashtra, 59=Rajasthan,
 * 60=Uttarakhand, 61=Bihar, 62=Karnataka, 63=Gujarat, 64=Himachal Pradesh,
 * 65=West Bengal, 66=Telangana, 67=Punjab, 68=Jammu & Kashmir, 69=Odisha,
 * 70=Andhra Pradesh, 71=Haryana, 72=Ladakh, 73=Assam, 74=Tamil Nadu,
 * 75=Delhi, 76=Chandigarh, 77=Arunachal Pradesh, 78=Kerala, 79=Goa,
 * 80=Sikkim, 81=Meghalaya, 82=Puducherry, 83=Dadra & Nagar Haveli and Daman & Diu,
 * 84=Nagaland, 85=Manipur, 86=Mizoram, 87=Lakshadweep, 88=Tripura, 89=Andaman & Nicobar Islands
 * 
 * Endpoints:
 * POST /api/college/register - Submit college registration
 * POST /api/college/admin/approve - Approve registration (admin)
 * POST /api/college/admin/reject - Reject registration (admin)
 * GET /api/college/registrations - Get pending registrations (admin)
 */

const express = require('express');
const supabase = require('./_supabase');
const csvGenerator = require('./csvGenerator');
const passwordUtil = require('./passwordUtil');
const emailService = require('./emailService');

/**
 * Helper: Normalize string for duplicate detection
 * (case-insensitive, spaces removed)
 */
function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '');
}

/**
 * Helper: Levenshtein distance (string similarity)
 */
function levenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Helper: Calculate string similarity score (0-1)
 */
function stringSimilarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Helper: Generate next sequential code with leading zeros
 * Example: generateNextCode('states', 'code', 2) => '24' (if max is 23)
 */
async function generateNextCode(tableName, columnName, length) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .order(columnName, { ascending: false })
      .limit(1);

    if (error) throw error;

    let maxNum = 0;
    if (data && data.length > 0) {
      const maxCode = data[0][columnName];
      if (maxCode) {
        maxNum = parseInt(maxCode, 10);
      }
    }

    const nextNum = maxNum + 1;
    return String(nextNum).padStart(length, '0');
  } catch (error) {
    console.error(`Error generating next code for ${tableName}.${columnName}:`, error);
    throw error;
  }
}

/**
 * Helper: Get state code from state name (case-insensitive)
 * Uses master state_codes table. If not found, generates next available code (90+)
 */
async function getStateCode(stateName) {
  try {
    const { data, error } = await supabase
      .from('state_codes')
      .select('code')
      .ilike('name', stateName)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    
    if (data) {
      return data.code;
    }
    
    // Not found in master list - generate next available code (90+)
    return null; // Will be handled by generateNextCode with fallback
  } catch (error) {
    console.error(`Error fetching state code for ${stateName}:`, error);
    return null;
  }
}

/**
 * POST /api/college/register
 * Validates and stores pending college registration
 */
async function handleCollegeRegister(req, res) {
  try {
    const { university, college, location, courses, contact } = req.body;

    // Validation
    if (!university?.name || !location?.state || !location?.district || !contact?.email) {
      return res.status(400).json({
        error: 'Missing required fields: university.name, location.state, location.district, contact.email'
      });
    }

    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({
        error: 'At least one course is required'
      });
    }

    // Validate course structure
    for (const course of courses) {
      if (!course.name || !course.duration) {
        return res.status(400).json({
          error: 'Each course must have name and duration'
        });
      }
      if (!Array.isArray(course.branches) || course.branches.length === 0) {
        return res.status(400).json({
          error: 'Each course must have at least one branch'
        });
      }
    }

    // Duplicate detection - University
    const normUnivName = normalize(university.name);
    const normUnivShort = normalize(university.shortName || '');

    const { data: existingUnivs, error: univError } = await supabase
      .from('universities')
      .select('*');

    if (univError) throw univError;

    let isDuplicate = false;
    if (existingUnivs && existingUnivs.length > 0) {
      for (const existing of existingUnivs) {
        const nameSimilarity = stringSimilarity(normUnivName, normalize(existing.name));
        const shortSimilarity = normUnivShort && existing.short_name
          ? stringSimilarity(normUnivShort, normalize(existing.short_name))
          : 0;

        if (nameSimilarity > 0.85 || shortSimilarity > 0.85) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (isDuplicate) {
      return res.status(409).json({
        error: 'Institution with similar name already exists. Please contact colleges@ira.co.in',
        isDuplicate: true
      });
    }

    // Duplicate detection - College (if provided)
    if (college?.name) {
      const normCollegeName = normalize(college.name);
      const normCollegeShort = normalize(college.shortName || '');

      const { data: existingColleges, error: collegeError } = await supabase
        .from('colleges')
        .select('*');

      if (collegeError) throw collegeError;

      if (existingColleges && existingColleges.length > 0) {
        for (const existing of existingColleges) {
          const nameSimilarity = stringSimilarity(normCollegeName, normalize(existing.name));
          const shortSimilarity = normCollegeShort && existing.short_name
            ? stringSimilarity(normCollegeShort, normalize(existing.short_name))
            : 0;

          if (nameSimilarity > 0.85 || shortSimilarity > 0.85) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (isDuplicate) {
        return res.status(409).json({
          error: 'College with similar name already exists. Please contact colleges@ira.co.in',
          isDuplicate: true
        });
      }
    }

    // ML Validation (mock score for now)
    let mlScore = 0.90;
    const emailDomain = contact.email.split('@')[1] || '';
    if (
      emailDomain.includes('.ac.in') ||
      emailDomain.includes('.edu') ||
      emailDomain.includes('.education')
    ) {
      mlScore = 0.95;
    }

    // Store in pending_colleges table
    const { data: insertData, error: insertError } = await supabase
      .from('pending_colleges')
      .insert([{
        submitted_data: {
          university,
          college: college || null,
          location,
          courses,
          contact
        },
        status: 'pending_admin',
        ml_score: mlScore
      }])
      .select();

    if (insertError) throw insertError;

    const registrationId = insertData[0].id;

    res.status(201).json({
      status: 'pending_admin_review',
      registrationId: registrationId,
      message: 'Registration submitted. Awaiting admin approval.'
    });
  } catch (error) {
    console.error('College register error:', error);
    res.status(500).json({
      error: error.message || 'Registration failed'
    });
  }
}

/**
 * POST /api/college/admin/approve
 * Approves registration and generates all IDs
 * 
 * College Program ID Format (9 components, numeric, space-separated):
 * 91 SS DD SSS UUU CCC DD YYYY YYYY
 * └─ └──────────────────────────────── Hierarchical administrative codes
 * Country State District Sector University College Degree StartYear EndYear
 * 
 * Code Ranges:
 * - Country: 91 (India, fixed)
 * - State: 55-89 (master list from state_codes table), 90+ for custom states
 * - District: auto-generated 3-digit (100+) per state
 * - Sector: user-provided 3-digit (Aadhaar zones)
 * - University: auto-generated 3-digit (001+) per district
 * - College: auto-generated 3-digit (001+) per university
 * - Degree: auto-generated 2-digit (01+) per college
 */
async function handleApproveCollege(req, res) {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: 'Registration ID required' });
    }

    // Get the pending registration
    const { data: registration, error: regError } = await supabase
      .from('pending_colleges')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (regError || !registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const data = registration.submitted_data;
    const countryCode = '91'; // India
    let stateCode = data.location.stateCode;
    let districtCode = data.location.districtCode;
    const sectorCode = (data.location.areaCode || '').padStart(3, '0');

    // ---------- COUNTRY ----------
    const { data: countryData } = await supabase
      .from('countries')
      .select('id')
      .eq('code', countryCode)
      .single();

    if (!countryData) {
      const { data: newCountry } = await supabase
        .from('countries')
        .insert([{ code: countryCode, name: 'India' }])
        .select()
        .single();
      var countryId = newCountry.id;
    } else {
      var countryId = countryData.id;
    }

    // ---------- STATE ----------
    // First, try to look up state code from master state_codes table
    if (!stateCode) {
      stateCode = await getStateCode(data.location.state);
    }

    // If still not found, generate next available code (starting from 90 for custom states)
    if (!stateCode) {
      // Get max existing state code to determine next value
      const { data: maxStateResult } = await supabase
        .from('states')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
      
      let nextCodeNum = 90; // Start custom codes from 90 (after master list 55-89)
      if (maxStateResult && maxStateResult.length > 0) {
        const maxCode = parseInt(maxStateResult[0].code, 10);
        nextCodeNum = Math.max(90, maxCode + 1);
      }
      stateCode = String(nextCodeNum).padStart(2, '0');
      
      console.warn(`State "${data.location.state}" not in master list, assigned custom code: ${stateCode}`);
    }

    let stateId;
    const { data: existingState } = await supabase
      .from('states')
      .select('id')
      .ilike('name', data.location.state)
      .eq('country_id', countryId)
      .single();

    if (existingState) {
      stateId = existingState.id;
    } else {
      const { data: newState } = await supabase
        .from('states')
        .insert([{
          code: stateCode,
          name: data.location.state,
          country_id: countryId
        }])
        .select()
        .single();
      stateId = newState.id;
    }

    // ---------- DISTRICT ----------
    if (!districtCode) {
      districtCode = await generateNextCode('districts', 'code', 3);
    }

    let districtId;
    const { data: existingDistrict } = await supabase
      .from('districts')
      .select('id')
      .ilike('name', data.location.district)
      .eq('state_id', stateId)
      .single();

    if (existingDistrict) {
      districtId = existingDistrict.id;
    } else {
      const { data: newDistrict } = await supabase
        .from('districts')
        .insert([{
          code: districtCode,
          name: data.location.district,
          state_id: stateId
        }])
        .select()
        .single();
      districtId = newDistrict.id;
    }

    // ---------- SECTOR ----------
    let sectorId;
    const { data: existingSector } = await supabase
      .from('sectors')
      .select('id')
      .eq('code', sectorCode)
      .eq('district_id', districtId)
      .single();

    if (existingSector) {
      sectorId = existingSector.id;
    } else {
      const { data: newSector } = await supabase
        .from('sectors')
        .insert([{
          code: sectorCode,
          name: data.location.areaCode,
          district_id: districtId
        }])
        .select()
        .single();
      sectorId = newSector.id;
    }

    // ---------- UNIVERSITY ----------
    let universityCode = await generateNextCode('universities', 'code', 3);
    let universityId;

    const { data: existingUniv } = await supabase
      .from('universities')
      .select('id, code')
      .ilike('name', data.university.name)
      .eq('district_id', districtId)
      .single();

    if (existingUniv) {
      universityId = existingUniv.id;
      universityCode = existingUniv.code;
    } else {
      const { data: newUniv } = await supabase
        .from('universities')
        .insert([{
          code: universityCode,
          name: data.university.name,
          short_name: data.university.shortName,
          district_id: districtId
        }])
        .select()
        .single();
      universityId = newUniv.id;
    }

    // ---------- COLLEGE ----------
    let collegeId, collegeCode = '000';
    if (data.college?.name) {
      collegeCode = await generateNextCode('colleges', 'code', 3);

      const { data: existingCollege } = await supabase
        .from('colleges')
        .select('id, code')
        .ilike('name', data.college.name)
        .eq('university_id', universityId)
        .single();

      if (existingCollege) {
        collegeId = existingCollege.id;
        collegeCode = existingCollege.code;
      } else {
        const { data: newCollege } = await supabase
          .from('colleges')
          .insert([{
            code: collegeCode,
            name: data.college.name,
            short_name: data.college.shortName,
            university_id: universityId
          }])
          .select()
          .single();
        collegeId = newCollege.id;
      }
    }

    // ---------- COURSES & BRANCHES ----------
    const courseCodes = {};
    for (const courseData of data.courses) {
      let courseCode = await generateNextCode('courses', 'code', 2);

      const { data: existingCourse } = await supabase
        .from('courses')
        .select('id, code')
        .ilike('name', courseData.name)
        .eq('college_id', collegeId || null)
        .single();

      let courseId;
      if (existingCourse) {
        courseId = existingCourse.id;
        courseCode = existingCourse.code;
      } else {
        const { data: newCourse } = await supabase
          .from('courses')
          .insert([{
            code: courseCode,
            name: courseData.name,
            duration_years: courseData.duration,
            college_id: collegeId || null
          }])
          .select()
          .single();
        courseId = newCourse.id;
      }

      courseCodes[courseData.name] = courseCode;

      // Add branches
      for (const branchName of (courseData.branches || [])) {
        const { data: existingBranch } = await supabase
          .from('branches')
          .select('id')
          .ilike('name', branchName)
          .eq('course_id', courseId)
          .single();

        if (!existingBranch) {
          await supabase
            .from('branches')
            .insert([{
              name: branchName,
              course_id: courseId
            }]);
        }
      }
    }

    // ---------- GENERATE COLLEGE PROGRAM ID ----------
    const currentYear = new Date().getFullYear();
    const endYear = currentYear + 4;
    const firstCourseCode = Object.values(courseCodes)[0] || '01';

    const programId = [
      countryCode,
      stateCode,
      districtCode,
      sectorCode,
      universityCode,
      collegeCode,
      firstCourseCode,
      currentYear,
      endYear
    ].join(' ');

    // Update college with program_id
    if (collegeId) {
      await supabase
        .from('colleges')
        .update({ program_id: programId })
        .eq('id', collegeId);
    }

    // Store program_id in college_programs table
    await supabase
      .from('college_programs')
      .insert([{
        college_id: collegeId,
        program_id: programId,
        start_year: currentYear,
        end_year: endYear
      }]);

    // ---------- UPDATE REGISTRATION STATUS ----------
    await supabase
      .from('pending_colleges')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString()
      })
      .eq('id', registrationId);

    // ---------- LOG AUDIT ----------
    await supabase
      .from('admin_audit_log')
      .insert([{
        action: 'college_approved',
        registration_id: registrationId,
        changes: {
          program_id: programId,
          college_name: data.college?.name || data.university.name,
          state: data.location.state,
          district: data.location.district
        }
      }]);

    // ---------- GENERATE CSV FILES ----------
    try {
      await csvGenerator.generateAllCSVs({
        state: data.location.state,
        stateCode: stateCode,
        district: data.location.district,
        districtCode: districtCode,
        sector: data.location.areaCode,
        university: data.university,
        universityCode: universityCode,
        college: data.college,
        collegeCode: collegeCode,
        courses: data.courses.map((c, i) => ({
          code: Object.values(courseCodes)[i] || '01',
          name: c.name,
          duration_years: c.duration,
          branches: c.branches
        })),
        programId: programId
      });
    } catch (csvError) {
      console.warn('CSV generation warning (non-blocking):', csvError.message);
    }

    // ---------- GENERATE PASSWORD & SEND APPROVAL EMAIL ----------
    const approvalTimestamp = new Date();
    const tempPassword = passwordUtil.generateTemporaryPassword(approvalTimestamp);
    const passwordHash = passwordUtil.hashPassword(tempPassword);

    // Update college with email, password hash and approval timestamp
    if (collegeId) {
      await supabase
        .from('colleges')
        .update({
          email: data.contact.email,
          password_hash: passwordHash,
          approval_timestamp: approvalTimestamp.toISOString(),
          is_password_changed: false
        })
        .eq('id', collegeId);
    }

    // Send approval email
    try {
      await emailService.sendApprovalEmail(
        data.contact.email,
        data.college?.name || data.university.name,
        data.university.name,
        programId,
        tempPassword,
        {
          dashboardUrl: 'https://yourapp.com/college/login',
          appName: 'IRA College Registration System'
        }
      );
    } catch (emailError) {
      console.warn('Approval email warning (non-blocking):', emailError.message);
    }

    res.status(200).json({
      message: 'College approved successfully',
      collegeProgramId: programId,
      collegeName: data.college?.name || data.university.name,
      universityName: data.university.name,
      collgeEmail: data.contact.email,
      passwordSent: true
    });
  } catch (error) {
    console.error('Approve college error:', error);
    res.status(500).json({
      error: error.message || 'Approval failed'
    });
  }
}

/**
 * POST /api/college/admin/reject
 * Rejects a pending registration
 */
async function handleRejectCollege(req, res) {
  try {
    const { registrationId, reason } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: 'Registration ID required' });
    }

    // Get registration for audit log
    const { data: registration } = await supabase
      .from('pending_colleges')
      .select('submitted_data')
      .eq('id', registrationId)
      .single();

    // Update status
    const { error: updateError } = await supabase
      .from('pending_colleges')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString()
      })
      .eq('id', registrationId);

    if (updateError) throw updateError;

    // Log audit
    await supabase
      .from('admin_audit_log')
      .insert([{
        action: 'college_rejected',
        registration_id: registrationId,
        changes: {
          reason: reason || 'No reason provided',
          university: registration?.submitted_data?.university?.name,
          college: registration?.submitted_data?.college?.name
        }
      }]);

    // Send rejection email
    try {
      await emailService.sendRejectionEmail(
        registration?.submitted_data?.contact?.email,
        registration?.submitted_data?.college?.name || registration?.submitted_data?.university?.name,
        registration?.submitted_data?.university?.name,
        reason || 'Under review',
        {
          supportEmail: 'support@yourapp.com',
          appName: 'IRA College Registration System'
        }
      );
    } catch (emailError) {
      console.warn('Rejection email warning (non-blocking):', emailError.message);
    }

    res.status(200).json({
      message: 'Registration rejected',
      emailSent: true
    });
  } catch (error) {
    console.error('Reject college error:', error);
    res.status(500).json({
      error: error.message || 'Rejection failed'
    });
  }
}

/**
 * GET /api/college/registrations
 * Fetch pending registrations (admin only)
 */
async function handleGetRegistrations(req, res) {
  try {
    // TODO: Add auth check - verify admin token
    // const adminId = req.headers['x-admin-id'];
    // if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

    const { status = 'pending_admin' } = req.query;

    const { data, error } = await supabase
      .from('pending_colleges')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to include extracted data
    const registrations = (data || []).map(reg => ({
      id: reg.id,
      status: reg.status,
      ml_score: reg.ml_score,
      created_at: reg.created_at,
      processed_at: reg.processed_at,
      ...reg.submitted_data
    }));

    res.status(200).json({
      registrations: registrations
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch registrations'
    });
  }
}

/**
 * GET /api/college/registrations/:id
 * Fetch a single registration by ID
 */
async function handleGetRegistration(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('pending_colleges')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const registration = {
      id: data.id,
      status: data.status,
      ml_score: data.ml_score,
      created_at: data.created_at,
      processed_at: data.processed_at,
      ...data.submitted_data
    };

    res.status(200).json(registration);
  } catch (error) {
    console.error('Get registration error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch registration'
    });
  }
}

/**
 * POST /api/college/login
 * Authenticate college user with college code and password
 * Returns college info and temporary password status
 */
async function handleCollegeLogin(req, res) {
  try {
    const { collegeCode, password } = req.body;

    if (!collegeCode || !password) {
      return res.status(400).json({
        error: 'College code and password required'
      });
    }

    // Fetch college by code
    const { data: college, error } = await supabase
      .from('colleges')
      .select('id, code, name, email, password_hash, approval_timestamp, is_password_changed')
      .eq('code', collegeCode)
      .single();

    if (error || !college) {
      return res.status(401).json({
        error: 'Invalid college code or password'
      });
    }

    // Verify password
    const passwordMatches = passwordUtil.verifyPassword(password, college.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Invalid college code or password'
      });
    }

    // Check if using temporary password (force change on first login)
    const isUsingTempPassword = !college.is_password_changed &&
      passwordUtil.isTemporaryPassword(password, new Date(college.approval_timestamp));

    // Generate session token (optional - implement proper JWT if needed)
    const sessionToken = Buffer.from(`${college.id}:${Date.now()}`).toString('base64');

    res.status(200).json({
      success: true,
      college: {
        id: college.id,
        code: college.code,
        name: college.name,
        email: college.email
      },
      sessionToken: sessionToken,
      isTemporaryPassword: isUsingTempPassword,
      message: isUsingTempPassword
        ? 'Login successful. Please change your temporary password immediately.'
        : 'Login successful'
    });
  } catch (error) {
    console.error('College login error:', error);
    res.status(500).json({
      error: error.message || 'Login failed'
    });
  }
}

/**
 * POST /api/college/change-password
 * Change college password from temporary to permanent
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character (!@#$%^&*)
 */
async function handleChangePassword(req, res) {
  try {
    const { collegeCode, currentPassword, newPassword, confirmPassword } = req.body;

    if (!collegeCode || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'College code, current password, new password, and confirmation required'
      });
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'New passwords do not match'
      });
    }

    // Validate new password strength
    const passwordValidation = passwordUtil.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        requirements: passwordValidation.errors
      });
    }

    // Prevent reusing old password
    const { data: college, error: fetchError } = await supabase
      .from('colleges')
      .select('id, password_hash')
      .eq('code', collegeCode)
      .single();

    if (fetchError || !college) {
      return res.status(401).json({
        error: 'College not found'
      });
    }

    // Verify current password
    const currentPasswordMatches = passwordUtil.verifyPassword(currentPassword, college.password_hash);
    if (!currentPasswordMatches) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Prevent reusing same password
    const newPasswordSame = passwordUtil.verifyPassword(newPassword, college.password_hash);
    if (newPasswordSame) {
      return res.status(400).json({
        error: 'New password cannot be the same as current password'
      });
    }

    // Hash new password
    const newPasswordHash = passwordUtil.hashPassword(newPassword);

    // Update password in database
    const { error: updateError } = await supabase
      .from('colleges')
      .update({
        password_hash: newPasswordHash,
        is_password_changed: true
      })
      .eq('id', college.id);

    if (updateError) throw updateError;

    // Send password change confirmation email
    try {
      const { data: collegeData } = await supabase
        .from('colleges')
        .select('name, email')
        .eq('id', college.id)
        .single();

      await emailService.sendPasswordChangeEmail(
        collegeData.email,
        collegeData.name,
        {
          appName: 'IRA College Registration System'
        }
      );
    } catch (emailError) {
      console.warn('Password change email warning (non-blocking):', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: error.message || 'Password change failed'
    });
  }
}

module.exports = {
  handleCollegeRegister,
  handleApproveCollege,
  handleRejectCollege,
  handleGetRegistrations,
  handleGetRegistration,
  handleCollegeLogin,
  handleChangePassword,
  generateNextCode,
  getStateCode
};
