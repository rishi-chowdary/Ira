import { useEffect, useState } from 'react';
import {
  Bell,
  Coins,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

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

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await withAuth((token) => apiClient.getNotifications(token));
      setNotifications(payload || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getNotificationIcon = (title: string, message: string) => {
    const combined = (title + ' ' + message).toLowerCase();
    if (combined.includes('loan') || combined.includes('disburs') || combined.includes('repay')) {
      return <Coins className="w-5 h-5 text-blue-600" />;
    }
    if (combined.includes('guarantor') || combined.includes('back')) {
      return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
    }
    if (combined.includes('score') || combined.includes('shri')) {
      return <Sparkles className="w-5 h-5 text-indigo-600" />;
    }
    return <Bell className="w-5 h-5 text-slate-500" />;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Layout
      title="Notifications & Alerts"
      subtitle="Real-time updates for loan matching, guarantor requests, and campus alerts"
      onCloseRoute="/dashboard"
      actions={
        <button
          type="button"
          onClick={loadNotifications}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-5">
        {/* Unread Summary Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                : 'All caught up!'}
            </span>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Total {notifications.length} updates
          </span>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-semibold text-rose-900 shadow-xs">
            {error}
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading notifications…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No notifications yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              We will send you updates here when student lenders match your loan requests or when peers
              request your guarantor backing.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  notification.is_read
                    ? 'bg-white border-slate-200/80'
                    : 'bg-blue-50/40 border-blue-200 shadow-xs'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    notification.is_read ? 'bg-slate-100' : 'bg-white shadow-2xs'
                  }`}
                >
                  {getNotificationIcon(notification.title, notification.message)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{notification.title}</h4>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {new Date(notification.created_at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notification.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
