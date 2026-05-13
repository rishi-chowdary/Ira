import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

interface CourseForm {
  name: string;
  duration: number;
  branches: string;
}

export default function CollegePortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const { college, loginCollege, sessionType, withAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({
    loginCode: '91 58 101 450 001 001 01 2024 2028',
    password: 'college123',
  });
  const [registerForm, setRegisterForm] = useState({
    university: { name: '', shortName: '' },
    college: { name: '', shortName: '' },
    location: { state: '', district: '', areaCode: '', pincode: '' },
    contact: { email: '', phone: '' },
  });
  const [courses, setCourses] = useState<CourseForm[]>([
    { name: 'B.Tech', duration: 4, branches: 'Computer Science, AI & DS' },
  ]);
  const [states, setStates] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [districts, setDistricts] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [students, setStudents] = useState<Array<Record<string, unknown>>>([]);
  const [filters, setFilters] = useState({
    course: '',
    year: '',
    search: '',
    status: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.getStates().then(setStates).catch(() => {});
  }, []);

  useEffect(() => {
    if (registerForm.location.state) {
      apiClient.getDistricts(registerForm.location.state).then(setDistricts).catch(() => {});
    }
  }, [registerForm.location.state]);

  const loadStudents = async () => {
    if (sessionType !== 'college') return;

    const params = new URLSearchParams();
    if (filters.course) params.set('course', filters.course);
    if (filters.year) params.set('year', filters.year);
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    const query = params.toString() ? `?${params.toString()}` : '';

    try {
      const response = await withAuth((token) => apiClient.getCollegeStudents(token, query));
      setStudents(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load students');
    }
  };

  useEffect(() => {
    if (sessionType === 'college' || location.pathname === '/college-portal/dashboard') {
      loadStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionType, location.pathname, filters]);

  const courseOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map((student) => String(student.course_name || ''))
            .filter(Boolean),
        ),
      ),
    [students],
  );

  const courseSelectionRequired = !filters.course;

  const submitCollegeRegistration = async () => {
    try {
      await apiClient.registerCollege({
        university: registerForm.university,
        college: registerForm.college,
        location: registerForm.location,
        contact: registerForm.contact,
        courses: courses.map((course) => ({
          name: course.name,
          duration: Number(course.duration),
          branches: course.branches.split(',').map((branch) => branch.trim()).filter(Boolean),
        })),
      });
      setMessage('College registration submitted for admin review.');
      setError('');
      setActiveTab('login');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Registration failed');
    }
  };

  const handleCollegeLogin = async () => {
    try {
      await loginCollege(loginForm.loginCode, loginForm.password);
      navigate('/college-portal/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'College login failed');
    }
  };

  const approveStudent = async (student: Record<string, unknown>) => {
    try {
      await withAuth((token) =>
        apiClient.approveCollegeStudent(token, Number(student.id), {
          enrollment_number: String(student.enrollment_number || `AUTO${student.id}`),
          course_name: String(student.course_name || 'B.Tech'),
          year: Number(student.year || 1),
        }),
      );
      setMessage('Student approved.');
      await loadStudents();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Approval failed');
    }
  };

  const rejectStudent = async (studentId: number) => {
    try {
      await withAuth((token) => apiClient.rejectCollegeStudent(token, studentId));
      setMessage('Student rejected.');
      await loadStudents();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Rejection failed');
    }
  };

  if (sessionType === 'college' || location.pathname === '/college-portal/dashboard') {
    return (
      <Layout
        title="College Dashboard"
        subtitle={college ? `${college.collegeName} · ${college.loginCode}` : 'Institution view'}
        onCloseRoute="/"
      >
        {message ? <div className="feedback" style={{ marginBottom: 20 }}>{message}</div> : null}
        {error ? <div className="feedback feedback--error" style={{ marginBottom: 20 }}>{error}</div> : null}
        <div className="content-grid">
          <section className="card span-12 stack">
            <div className="filters-row">
              <select
                className="select"
                value={filters.course}
                onChange={(event) => setFilters((current) => ({ ...current, course: event.target.value }))}
              >
                <option value="">Select course first</option>
                {courseOptions.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Year"
                disabled={courseSelectionRequired}
                value={filters.year}
                onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
              />
              <input
                className="input"
                placeholder="Search name or enrollment"
                disabled={courseSelectionRequired}
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
              <select
                className="select"
                disabled={courseSelectionRequired}
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="">All statuses</option>
                <option value="pending_college">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            {courseSelectionRequired ? (
              <div className="feedback" style={{ marginTop: 12 }}>
                Select a course to enable year, search, and status filters.
              </div>
            ) : null}

            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Enrollment</th>
                    <th>Course</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={String(student.id)}>
                      <td>{String(student.full_name || '')}</td>
                      <td>{String(student.enrollment_number || 'Pending')}</td>
                      <td>{String(student.course_name || 'Unassigned')}</td>
                      <td>{String(student.year || '—')}</td>
                      <td>{String(student.student_status || 'pending')}</td>
                      <td>
                        <div className="inline-actions">
                          <button className="button button--secondary" type="button" onClick={() => approveStudent(student)}>
                            Approve
                          </button>
                          <button className="button button--danger" type="button" onClick={() => rejectStudent(Number(student.id))}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </Layout>
    );
  }

  return (
    <div className="page page--center">
      <div className="content-shell">
        <div className="tabs">
          <button className={activeTab === 'login' ? 'is-active' : ''} onClick={() => setActiveTab('login')}>
            Login
          </button>
          <button className={activeTab === 'register' ? 'is-active' : ''} onClick={() => setActiveTab('register')}>
            Register
          </button>
        </div>

        {message ? <div className="feedback" style={{ marginBottom: 20 }}>{message}</div> : null}
        {error ? <div className="feedback feedback--error" style={{ marginBottom: 20 }}>{error}</div> : null}

        {activeTab === 'login' ? (
          <section className="card stack">
            <div className="section-heading">
              <h1>College login</h1>
              <p>Use the approved program ID and temporary password from the admin email.</p>
            </div>
            <div className="field">
              <label htmlFor="loginCode">Program ID</label>
              <input
                id="loginCode"
                className="input"
                value={loginForm.loginCode}
                onChange={(event) => setLoginForm((current) => ({ ...current, loginCode: event.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            <button className="button button--primary" type="button" onClick={handleCollegeLogin}>
              Open dashboard
            </button>
          </section>
        ) : (
          <section className="card stack">
            <div className="section-heading">
              <h1>Register a college</h1>
              <p>Submissions land in `pending_colleges` and wait for admin approval.</p>
            </div>
            <div className="grid-two">
              <div className="field">
                <label>University name</label>
                <input
                  className="input"
                  value={registerForm.university.name}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      university: { ...current.university, name: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>University short name</label>
                <input
                  className="input"
                  value={registerForm.university.shortName}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      university: { ...current.university, shortName: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>College name</label>
                <input
                  className="input"
                  value={registerForm.college.name}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      college: { ...current.college, name: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>College short name</label>
                <input
                  className="input"
                  value={registerForm.college.shortName}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      college: { ...current.college, shortName: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>State</label>
                <select
                  className="select"
                  value={registerForm.location.state}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      location: { ...current.location, state: event.target.value },
                    }))
                  }
                >
                  <option value="">Select state</option>
                  {states.map((state) => (
                    <option key={state.code} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>District</label>
                <select
                  className="select"
                  value={registerForm.location.district}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      location: { ...current.location, district: event.target.value },
                    }))
                  }
                >
                  <option value="">Select district</option>
                  {districts.map((district) => (
                    <option key={district.code} value={district.name}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Area code</label>
                <input
                  className="input"
                  value={registerForm.location.areaCode}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      location: { ...current.location, areaCode: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>Pincode</label>
                <input
                  className="input"
                  value={registerForm.location.pincode}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      location: { ...current.location, pincode: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>Contact email</label>
                <input
                  className="input"
                  value={registerForm.contact.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      contact: { ...current.contact, email: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  className="input"
                  value={registerForm.contact.phone}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      contact: { ...current.contact, phone: event.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="stack">
              <div className="card__header">
                <h3>Courses</h3>
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() =>
                    setCourses((current) => [...current, { name: '', duration: 4, branches: '' }])
                  }
                >
                  Add course
                </button>
              </div>
              {courses.map((course, index) => (
                <div className="grid-two" key={`${course.name}-${index}`}>
                  <div className="field">
                    <label>Degree name</label>
                    <input
                      className="input"
                      value={course.name}
                      onChange={(event) =>
                        setCourses((current) =>
                          current.map((entry, position) =>
                            position === index ? { ...entry, name: event.target.value } : entry,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Duration (years)</label>
                    <input
                      className="input"
                      type="number"
                      value={course.duration}
                      onChange={(event) =>
                        setCourses((current) =>
                          current.map((entry, position) =>
                            position === index ? { ...entry, duration: Number(event.target.value) } : entry,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>Branches</label>
                    <input
                      className="input"
                      value={course.branches}
                      onChange={(event) =>
                        setCourses((current) =>
                          current.map((entry, position) =>
                            position === index ? { ...entry, branches: event.target.value } : entry,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <button className="button button--primary" type="button" onClick={submitCollegeRegistration}>
              Submit registration
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
