import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { withAuth } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await withAuth((token) => apiClient.getNotifications(token));
        setNotifications(payload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to load notifications');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [withAuth]);

  return (
    <Layout title="Notifications" subtitle="Keep track of loan and guarantor updates." onCloseRoute="/dashboard">
      <div className="nav-links" style={{ marginBottom: 20 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/guarantors">Guarantors</Link>
        <Link to="/transaction-history">Transaction history</Link>
      </div>

      {loading ? <div className="feedback">Loading notifications…</div> : null}
      {error ? <div className="feedback feedback--error">{error}</div> : null}

      {!loading && notifications.length === 0 ? (
        <div className="feedback">No notifications yet. We will send updates here for loan activity and guarantor requests.</div>
      ) : null}

      <div className="stack">
        {notifications.map((notification) => (
          <article key={notification.id} className={`card ${notification.is_read ? 'is-muted' : ''}`}>
            <div className="card__header">
              <h3>{notification.title}</h3>
              <span className="pill">{new Date(notification.created_at).toLocaleString()}</span>
            </div>
            <p>{notification.message}</p>
          </article>
        ))}
      </div>
    </Layout>
  );
}
