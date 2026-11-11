import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  History,
  LayoutDashboard,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

interface NavItem {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

export default function StudentNavigation() {
  const location = useLocation();
  const { user, withAuth } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    withAuth((token) => apiClient.getNotifications(token))
      .then((notifications) => {
        if (!isMounted) return;
        const unread = (notifications || []).filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      })
      .catch(() => {
        // Silently catch background poll error
      });

    return () => {
      isMounted = false;
    };
  }, [user, withAuth, location.pathname]);

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Guarantors', path: '/guarantors', icon: ShieldCheck },
    { name: 'Transactions', path: '/transaction-history', icon: History },
    { name: 'Friends Network', path: '/friends', icon: Users },
    {
      name: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { name: 'My Profile', path: '/profile', icon: User },
    { name: 'Account Closure', path: '/account-closure', icon: AlertCircle },
  ];

  return (
    <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-16 z-40 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600/20'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.name}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full leading-none ${
                      isActive
                        ? 'bg-white text-blue-600'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

