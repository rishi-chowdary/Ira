import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  GraduationCap,
  Wallet,
} from 'lucide-react';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { college, user } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Layout
      title="Student Profile"
      subtitle="Verified academic affiliation, campus identity, and linked financial accounts"
      onCloseRoute="/dashboard"
    >
      <div className="space-y-6">
        {/* Profile Identity Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {(user?.full_name || user?.email || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{user?.full_name || 'Student'}</h2>
                {user?.college_verified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Campus Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Approval Pending</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {user?.college_email} · Role:{' '}
                <span className="capitalize font-bold text-slate-700">
                  {user?.role === 'both' ? 'Borrower & Lender' : user?.role}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 block">Shri Score</span>
              <span className="text-xl font-black text-blue-600">{user?.shri_score || 0}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Academic & Institution Details */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Academic Affiliation</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Enrolled Institution</span>
                <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-800 border border-slate-100">
                  {college?.collegeName || user?.collegeCode || 'Institution pending assignment'}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Affiliated University</span>
                <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-800 border border-slate-100">
                  {college?.universityName || 'University mapping in progress'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 font-medium block mb-1">Course & Year</span>
                  <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-800 border border-slate-100">
                    {user?.course_name || 'B.Tech'} {user?.year ? `· Year ${user.year}` : ''}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium block mb-1">Enrollment Number</span>
                  <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-800 border border-slate-100">
                    {user?.enrollment_number || 'Pending verification'}
                  </div>
                </div>
              </div>

              {college && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 font-medium block mb-1">State</span>
                    <div className="p-3 bg-slate-50 rounded-xl font-semibold text-slate-700 border border-slate-100">
                      {college.state}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block mb-1">District</span>
                    <div className="p-3 bg-slate-50 rounded-xl font-semibold text-slate-700 border border-slate-100">
                      {college.district}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Campus Financial IDs & Status */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Campus Financial IDs</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Borrowing Account ID</span>
                <div className="p-3 bg-slate-50 rounded-xl font-mono font-bold text-slate-800 border border-slate-100 flex items-center justify-between">
                  <span>{user?.borrowing_account_id || 'Generating ID...'}</span>
                  {user?.borrowing_account_id && (
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(user.borrowing_account_id || '', 'borrowing_account_id')
                      }
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {copiedField === 'borrowing_account_id' ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Lending Account ID</span>
                <div className="p-3 bg-slate-50 rounded-xl font-mono font-bold text-slate-800 border border-slate-100 flex items-center justify-between">
                  <span>{user?.lending_account_id || 'Generating ID...'}</span>
                  {user?.lending_account_id && (
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(user.lending_account_id || '', 'lending_account_id')
                      }
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {copiedField === 'lending_account_id' ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 font-medium block mb-1">UPI ID</span>
                  <div className="p-3 bg-slate-50 rounded-xl font-medium text-slate-800 border border-slate-100 truncate">
                    {user?.upi_id || 'Not linked'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium block mb-1">WhatsApp</span>
                  <div className="p-3 bg-slate-50 rounded-xl font-medium text-slate-800 border border-slate-100">
                    {user?.whatsapp || 'Not linked'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 font-medium block mb-1">KYC Status</span>
                  <div className="p-3 bg-slate-50 rounded-xl font-bold capitalize text-slate-800 border border-slate-100 flex items-center gap-1.5">
                    {user?.kyc_status === 'verified' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Verified</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-amber-700">Pending</span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium block mb-1">Wallet Status</span>
                  <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-800 border border-slate-100 flex items-center gap-1.5">
                    {user?.wallet_activated ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Activated</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-amber-700">Setup Needed</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
