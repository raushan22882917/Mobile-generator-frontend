'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ loginTime?: string; lastCheck?: string }>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loginTime = localStorage.getItem('auth_login_time');
    const lastCheck = localStorage.getItem('auth_last_check');

    setSessionInfo({
      loginTime: loginTime ? new Date(parseInt(loginTime, 10)).toLocaleString() : undefined,
      lastCheck: lastCheck ? new Date(parseInt(lastCheck, 10)).toLocaleString() : undefined,
    });
  }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setStatusMessage(null);
    try {
      await refreshUser();
      setStatusMessage('Profile updated successfully.');
    } catch (error: any) {
      setStatusMessage(error?.message || 'Failed to refresh profile.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const initials = useMemo(() => {
    if (!user?.name && !user?.email) return 'U';
    return (user?.name || user?.email || 'U').charAt(0).toUpperCase();
  }, [user]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-gray-400">Account</p>
              <h1 className="text-3xl font-bold text-white">Profile</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 rounded-lg border border-orange-400/50 text-sm font-semibold hover:bg-orange-500/10 transition disabled:opacity-50"
              >
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/40 text-sm font-semibold text-red-200 hover:bg-red-500/20 transition"
              >
                Logout
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="mb-6 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
              {statusMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-yellow-400 flex items-center justify-center text-3xl font-semibold text-black mb-4">
                {initials}
              </div>
              <h2 className="text-xl font-semibold text-white">{user?.name || 'Unnamed User'}</h2>
              <p className="text-sm text-gray-400">{user?.email || 'No email'}</p>
            </div>

            <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Account Details</h3>
              <div className="space-y-3 text-sm text-gray-200">
                <DetailRow label="User ID" value={user?.id || '—'} />
                <DetailRow label="Email" value={user?.email || '—'} />
                <DetailRow label="Name" value={user?.name || '—'} />
                <DetailRow label="Status" value={user?.is_active ? 'Active' : 'Inactive'} />
                <DetailRow label="Created" value={user?.created_at ? new Date(user.created_at).toLocaleString() : '—'} />
                <DetailRow label="Last Login" value={user?.last_login ? new Date(user.last_login).toLocaleString() : '—'} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Session</h3>
              <div className="space-y-3 text-sm text-gray-200">
                <DetailRow label="Login Time" value={sessionInfo.loginTime || '—'} />
                <DetailRow label="Last Validation" value={sessionInfo.lastCheck || '—'} />
                <DetailRow label="Session Status" value="Active" />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Actions</h3>
              <ul className="space-y-3 text-sm text-gray-200">
                <li className="flex items-center justify-between">
                  <span>Refresh profile data</span>
                  <button
                    onClick={handleRefresh}
                    className="text-orange-400 hover:text-orange-300 text-xs font-semibold"
                    disabled={isRefreshing}
                  >
                    Refresh
                  </button>
                </li>
                <li className="flex items-center justify-between">
                  <span>Force logout on all devices</span>
                  <button onClick={logout} className="text-red-400 hover:text-red-300 text-xs font-semibold">
                    Logout
                  </button>
                </li>
                <li className="flex items-center justify-between">
                  <span>Contact support</span>
                  <a href="mailto:support@example.com" className="text-blue-300 hover:text-blue-200 text-xs font-semibold">
                    Email
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-white text-sm font-medium text-right break-all">{value || '—'}</span>
    </div>
  );
}

