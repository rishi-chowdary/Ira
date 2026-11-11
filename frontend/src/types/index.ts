export const API_BASE =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.DEV
      ? ''
      : import.meta.env.VITE_API_URL || '';

export interface User {
  id: number;
  email: string;
  full_name: string;
  whatsapp: string;
  upi_id: string;
  college_email: string;
  shri_score: number;
  batua_locked: number;
  batua_unlocked: number;
  tijori: number;
  mock_upi_balance?: number;
  role: 'admin' | 'college_admin' | 'both' | 'borrower' | 'lender';
  kyc_status: 'pending' | 'verified';
  college_verified: boolean;
  wallet_activated: boolean;
  mode: 'borrower' | 'lender' | 'both';
  can_borrow: boolean;
  can_lend: boolean;
  stateCode?: string;
  districtCode?: string;
  sectorCode?: string;
  universityCode?: string;
  collegeCode?: string;
  course_code?: string;
  course_name?: string;
  branch_name?: string;
  year?: number;
  enrollment_number?: string | null;
  collegeId?: number | null;
  lending_account_id?: string;
  borrowing_account_id?: string;
  student_status?: string;
  created_at: string;
  updated_at: string;
}

export interface College {
  id: number;
  universityId?: number;
  universityCode: string;
  universityName: string;
  universityShortName?: string;
  collegeCode: string;
  collegeName: string;
  collegeShortName?: string;
  state: string;
  stateCode: string;
  district: string;
  districtCode: string;
  sectorCode: string;
  pincode: string;
  contactEmail: string;
  contactPhone: string;
  studentEmailDomain: string;
  loginCode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: number;
  borrower_id: number;
  amount: number;
  tenure_days: number;
  purpose: string;
  status: 'pending' | 'active' | 'repaid' | 'defaulted';
  interest_rate: number;
  interest_amount: number;
  total_repayable: number;
  due_date: string;
  funded_amount: number;
  schedule_frequency?: string;
  upi_autopay_mandate?: { mandate_id: string; active: boolean; created_at: string };
  created_at: string;
  repaid_at?: string;
}

export interface Investment {
  id: number;
  lender_id: number;
  loan_id: number;
  amount: number;
  expected_return: number;
  status: 'active' | 'completed';
  created_at: string;
}

export interface PendingCollege {
  id: number;
  submitted_data: {
    university: { name: string; shortName?: string };
    college?: { name?: string; shortName?: string };
    location: { state: string; district: string; areaCode: string; pincode: string };
    courses: Array<{ name: string; duration: number; branches: string[] }>;
    contact: { email: string; phone: string };
  };
  status: string;
  ml_score: number;
  created_at: string;
  processed_at?: string | null;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export interface DashboardPayload {
  user: User;
  college: College | null;
  loans: Loan[];
  investments: Investment[];
}

export interface AuthSuccessPayload {
  accessToken: string;
  refreshToken?: string;
  user?: User;
  college?: College;
}

export interface AdminStats {
  totalRegisteredColleges: number;
  totalApprovedColleges: number;
  totalPendingRegistrations: number;
  totalUsers: number;
  totalPlatformEarnings: {
    today: number;
    week: number;
    month: number;
  };
}

export interface EarningsPoint {
  date: string;
  amount: number;
}

export interface DemoAccount {
  id: string;
  roleTitle: string;
  name: string;
  email: string;
  password: string;
  badge: string;
  badgeColor: string;
  details: string;
  collegeName?: string;
  icon: string;
  shri_score?: number;
  batua_locked?: number;
  batua_unlocked?: number;
  tijori?: number;
}

export interface Testimonial {
  id: number;
  name: string;
  college: string;
  role: string;
  text: string;
  stars: number;
  color: string;
}

export interface HowItWorksStep {
  id: number;
  step_number: number;
  icon: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
}

export interface ComparisonRate {
  id: number;
  category: 'borrower' | 'lender';
  label: string;
  rate: number;
  color: string;
  note: string;
  order_idx: number;
}

export interface InterestSlab {
  id: number;
  max_days: number;
  rate: number;
  window_label: string;
  row_class: string;
  badge: string;
  penalty_info?: string;
}

export interface ShriTier {
  id: number;
  tier_name: string;
  min_score: number;
  max_score: number;
  rate_multiplier: number;
  borrowing_limit: number;
}

export interface FriendRecord {
  id: number;
  requester_id: number;
  target_id: number;
  status: 'pending' | 'accepted' | 'declined';
  isRequester: boolean;
  peer: {
    id: number;
    full_name: string;
    email: string;
    college_email?: string;
    borrowing_account_id?: string;
    course_name?: string;
    year?: number;
    shri_score?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface PrivateLoanRecord {
  id: number;
  from_user_id: number;
  to_user_id: number;
  amount: number;
  interest_proposed: number;
  tenure_days: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  isFromMe: boolean;
  negotiation_log?: Array<{
    action: string;
    amount?: number;
    interest_proposed?: number;
    tenure_days?: number;
    message?: string;
    created_at: string;
  }>;
  from_user?: {
    id: number;
    full_name: string;
    email: string;
    borrowing_account_id: string;
  } | null;
  to_user?: {
    id: number;
    full_name: string;
    email: string;
    borrowing_account_id: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseStatus {
  databasePath: string;
  engine: string;
  totalTables: number;
  totalRecords: number;
  fileSizeBytes: number;
  syncedAt: string;
  tables: Record<string, number>;
}
