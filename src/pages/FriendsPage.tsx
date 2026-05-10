import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export default function FriendsPage() {
  const { user } = useAuth();

  return (
    <Layout title="Friends" subtitle="Friend lending is the next slice after the new auth/dashboard foundation" onCloseRoute="/dashboard">
      <div className="content-grid">
        <section className="card span-8 stack">
          <div className="card__header">
            <h2>Borrowing Account ID</h2>
          </div>
          <div className="input">{user?.borrowing_account_id || 'Will appear after college mapping'}</div>
          <p className="muted">
            The dedicated friend request, private loan negotiation, and chat flow still need a
            separate implementation pass. This route is in place so the app navigation is clean and
            consistent.
          </p>
        </section>
      </div>
    </Layout>
  );
}
