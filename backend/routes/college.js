import express from 'express';
import Joi from 'joi';

import { ApiError, assert } from '../lib/errors.js';
import { sendEmail } from '../lib/notifications.js';
import { mutateStore, nextId, readStore, sanitiseCollege } from '../lib/store.js';
import { authenticate, requireCollege, requireRole } from '../middleware/auth.js';
import { queueHierarchyExport } from '../lib/csvExport.js';
import { generateNextCode, generateCollegeProgramId, generateTemporaryPassword } from '../utils/idGenerator.js';
import { hashPassword } from '../lib/passwords.js';

const router = express.Router();

const collegeRegistrationSchema = Joi.object({
  university: Joi.object({
    name: Joi.string().trim().required(),
    shortName: Joi.string().trim().allow('').optional(),
  }).required(),
  college: Joi.object({
    name: Joi.string().trim().allow('').optional(),
    shortName: Joi.string().trim().allow('').optional(),
  }).optional(),
  location: Joi.object({
    state: Joi.string().trim().required(),
    district: Joi.string().trim().required(),
    areaCode: Joi.string().trim().required(),
    pincode: Joi.string().trim().required(),
  }).required(),
  courses: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().required(),
        duration: Joi.number().integer().min(1).max(8).required(),
        branches: Joi.array().items(Joi.string().trim().required()).min(1).required(),
      }),
    )
    .min(1)
    .required(),
  contact: Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().trim().required(),
  }).required(),
});

router.post('/register', async (req, res, next) => {
  try {
    const payload = await collegeRegistrationSchema.validateAsync(req.body, { abortEarly: false });

    const response = await mutateStore(async (store) => {
      const duplicate = store.pendingColleges.find(
        (entry) =>
          entry.submitted_data.university.name.toLowerCase() === payload.university.name.toLowerCase() &&
          entry.submitted_data.location.state.toLowerCase() === payload.location.state.toLowerCase() &&
          entry.status !== 'rejected',
      );
      assert(!duplicate, 409, 'A similar college registration is already pending');

      const pendingCollege = {
        id: nextId(store, 'pendingColleges'),
        submitted_data: payload,
        status: 'pending_admin',
        ml_score: 0.93,
        created_at: new Date().toISOString(),
        processed_at: null,
      };
      store.pendingColleges.push(pendingCollege);
      return pendingCollege;
    });

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/registrations', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const store = await readStore();
    res.json(store.pendingColleges);
  } catch (error) {
    next(error);
  }
});

router.post('/admin/approve', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { pendingCollegeId } = req.body;
    assert(pendingCollegeId, 400, 'pendingCollegeId is required');

    const result = await mutateStore(async (store) => {
      const pending = store.pendingColleges.find((entry) => entry.id === Number(pendingCollegeId));
      assert(pending, 404, 'Pending college not found');
      assert(pending.status === 'pending_admin', 400, 'College has already been processed');

      const stateName = pending.submitted_data.location.state;
      const districtName = pending.submitted_data.location.district;
      let state = store.states.find((entry) => entry.name.toLowerCase() === stateName.toLowerCase());
      if (!state) {
        state = {
          id: store.states.length + 1,
          code: generateNextCode('states', 'code', 2, store),
          name: stateName,
        };
        store.states.push(state);
      }

      let district = store.districts.find(
        (entry) =>
          entry.stateCode === state.code &&
          entry.name.toLowerCase() === districtName.toLowerCase(),
      );
      if (!district) {
        district = {
          id: store.districts.length + 1,
          stateCode: state.code,
          code: generateNextCode('districts', 'code', 3, store),
          name: districtName,
        };
        store.districts.push(district);
      }

      let university = store.universities.find(
        (entry) =>
          entry.name.toLowerCase() === pending.submitted_data.university.name.toLowerCase() &&
          entry.districtCode === district.code,
      );
      if (!university) {
        university = {
          id: store.universities.length + 1,
          stateCode: state.code,
          districtCode: district.code,
          code: generateNextCode('universities', 'code', 3, store),
          name: pending.submitted_data.university.name,
          shortName: pending.submitted_data.university.shortName || '',
        };
        store.universities.push(university);
      }

      const timestamp = new Date();
      const tempPassword = generateTemporaryPassword(timestamp);
      const collegeId = nextId(store, 'colleges');
      const collegeCode = generateNextCode('colleges', 'collegeCode', 3, {
        colleges: store.colleges,
      });
      const college = {
        id: collegeId,
        universityId: university.id,
        universityCode: university.code,
        universityName: university.name,
        universityShortName: university.shortName,
        collegeCode,
        collegeName: pending.submitted_data.college?.name || pending.submitted_data.university.name,
        collegeShortName: pending.submitted_data.college?.shortName || pending.submitted_data.university.shortName || '',
        state: state.name,
        stateCode: state.code,
        district: district.name,
        districtCode: district.code,
        sectorCode: pending.submitted_data.location.areaCode,
        pincode: pending.submitted_data.location.pincode,
        contactEmail: pending.submitted_data.contact.email,
        contactPhone: pending.submitted_data.contact.phone,
        studentEmailDomain: pending.submitted_data.contact.email.split('@')[1],
        loginCode: null,
        passwordHash: await hashPassword(tempPassword),
        status: 'approved',
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      };

      store.colleges.push(college);

      const programs = pending.submitted_data.courses.map((course, index) => {
        const courseCode = String(index + 1).padStart(2, '0');
        const startYear = timestamp.getFullYear();
        const endYear = startYear + course.duration;
        const programId = generateCollegeProgramId(
          state.code,
          district.code,
          pending.submitted_data.location.areaCode,
          university.code,
          collegeCode,
          courseCode,
          startYear,
          endYear,
        );
        return {
          id: nextId(store, 'collegePrograms'),
          collegeId,
          programId,
          startYear,
          endYear,
          courseCode,
          courseName: course.name,
          branches: course.branches,
        };
      });

      store.collegePrograms.push(...programs);
      college.loginCode = programs[0]?.programId || college.collegeCode;
      pending.status = 'approved';
      pending.processed_at = timestamp.toISOString();

      store.adminAuditLog.push({
        id: nextId(store, 'adminAuditLog'),
        admin_id: req.auth.user.id,
        action: 'approve_college',
        target_type: 'pending_college',
        target_id: pending.id,
        details: {
          collegeId,
          loginCode: college.loginCode,
        },
        created_at: timestamp.toISOString(),
      });

      store.users
        .filter((user) => user.college_email.endsWith(`@${college.studentEmailDomain}`) && !user.collegeId)
        .forEach((user) => {
          user.collegeId = collegeId;
          user.stateCode = state.code;
          user.districtCode = district.code;
          user.sectorCode = college.sectorCode;
          user.universityCode = university.code;
          user.collegeCode = college.collegeCode;
          user.student_status = 'pending_college';
        });

      await sendEmail({
        to: college.contactEmail,
        subject: 'IRA college portal approved',
        text: [
          `Your college registration has been approved.`,
          `Program ID: ${college.loginCode}`,
          `Temporary password: ${tempPassword}`,
          `Dashboard: ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/college-portal`,
        ].join('\n'),
      });

      const snapshot = structuredClone(store);
      queueHierarchyExport(snapshot);

      return {
        college: sanitiseCollege(college),
        programs,
        temporaryPassword: tempPassword,
      };
    });

    res.json(result);
  } catch (error) {
    next(error instanceof ApiError ? error : error);
  }
});

router.post('/admin/reject', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { pendingCollegeId, reason } = req.body;
    assert(pendingCollegeId, 400, 'pendingCollegeId is required');

    await mutateStore(async (store) => {
      const pending = store.pendingColleges.find((entry) => entry.id === Number(pendingCollegeId));
      assert(pending, 404, 'Pending college not found');
      pending.status = 'rejected';
      pending.processed_at = new Date().toISOString();

      await sendEmail({
        to: pending.submitted_data.contact.email,
        subject: 'IRA college registration update',
        text: `Your registration was not approved${reason ? `: ${reason}` : '.'}`,
      });
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get('/students', authenticate, async (req, res, next) => {
  try {
    const store = await readStore();
    const collegeId = req.auth.college?.id || req.query.collegeId;
    assert(collegeId, 400, 'College context required');

    const { course, year, search, status } = req.query;
    const students = store.users.filter((user) => {
      if (Number(user.collegeId) !== Number(collegeId)) return false;
      if (course && user.course_name !== String(course)) return false;
      if (year && Number(user.year) !== Number(year)) return false;
      if (status && user.student_status !== String(status)) return false;
      if (search) {
        const term = String(search).toLowerCase();
        return (
          user.full_name.toLowerCase().includes(term) ||
          String(user.enrollment_number || '').toLowerCase().includes(term)
        );
      }
      return true;
    });

    res.json(students);
  } catch (error) {
    next(error);
  }
});

router.post('/students/:userId/approve', authenticate, requireCollege, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { enrollment_number, course_name, year } = req.body;

    const response = await mutateStore(async (store) => {
      const college = store.colleges.find((entry) => entry.id === req.auth.college.id);
      const user = store.users.find((entry) => entry.id === Number(userId));
      assert(user, 404, 'Student not found');
      assert(user.collegeId === college.id, 403, 'Student does not belong to this college');

      const matchingProgram =
        store.collegePrograms.find(
          (program) => program.collegeId === college.id && program.courseName === (course_name || user.course_name),
        ) || store.collegePrograms.find((program) => program.collegeId === college.id);

      user.enrollment_number = enrollment_number || user.enrollment_number || `AUTO${user.id}`;
      user.course_name = course_name || user.course_name;
      user.course_code = matchingProgram?.courseCode || user.course_code;
      user.year = Number(year || user.year || 1);
      user.college_verified = true;
      user.can_borrow = true;
      user.student_status = 'approved';
      user.updated_at = new Date().toISOString();
      return user;
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/students/:userId/reject', authenticate, requireCollege, async (req, res, next) => {
  try {
    const { userId } = req.params;
    await mutateStore(async (store) => {
      const user = store.users.find((entry) => entry.id === Number(userId));
      assert(user, 404, 'Student not found');
      assert(user.collegeId === req.auth.college.id, 403, 'Student does not belong to this college');
      user.college_verified = false;
      user.can_borrow = false;
      user.student_status = 'rejected';
      user.updated_at = new Date().toISOString();
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
