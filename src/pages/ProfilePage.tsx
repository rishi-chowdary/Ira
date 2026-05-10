import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { college, user } = useAuth();

  return (
    <Layout title="Profile" subtitle="Unified user record from the new backend" onCloseRoute="/dashboard">
      <div className="content-grid">
        <section className="card span-6 stack">
          <div className="field">
            <label>Full name</label>
            <div className="input">{user?.full_name}</div>
          </div>
          <div className="field">
            <label>College email</label>
            <div className="input">{user?.college_email}</div>
          </div>
          <div className="field">
            <label>WhatsApp</label>
            <div className="input">{user?.whatsapp}</div>
          </div>
          <div className="field">
            <label>UPI ID</label>
            <div className="input">{user?.upi_id}</div>
          </div>
        </section>

        <section className="card span-6 stack">
          <div className="field">
            <label>Borrowing Account ID</label>
            <div className="input">{user?.borrowing_account_id || 'Pending'}</div>
          </div>
          <div className="field">
            <label>Lending Account ID</label>
            <div className="input">{user?.lending_account_id || 'Pending'}</div>
          </div>
          <div className="field">
            <label>Course</label>
            <div className="input">
              {user?.course_name || 'Not assigned'} {user?.year ? `· Year ${user.year}` : ''}
            </div>
          </div>
          <div className="field">
            <label>College verification</label>
            <div className="input">{user?.college_verified ? 'Approved' : 'Pending'}</div>
          </div>
        </section>

        <section className="card span-12">
          <div className="card__header">
            <h2>College mapping</h2>
          </div>
          {college ? (
            <div className="grid-two">
              <div className="field">
                <label>Institution</label>
                <div className="input">{college.collegeName}</div>
              </div>
              <div className="field">
                <label>University</label>
                <div className="input">{college.universityName}</div>
              </div>
              <div className="field">
                <label>State</label>
                <div className="input">{college.state}</div>
              </div>
              <div className="field">
                <label>District</label>
                <div className="input">{college.district}</div>
              </div>
            </div>
          ) : (
            <p className="muted">No college record linked yet.</p>
          )}
        </section>
      </div>
    </Layout>
  );
}
