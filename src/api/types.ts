export type Role = "TENANT_ADMIN" | "ADM" | "STAFF";

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: string;
  role: Role;
  name: string;
  language: string;
  mustChangePassword: boolean;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type InterestMethod = "FLAT" | "REDUCING_BALANCE" | "INTEREST_ONLY" | "COMPOUND" | "CUSTOM_SCHEDULE" | "CHIT_AUCTION";
export type RateBasis = "PER_ANNUM" | "PER_MONTH";
export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type TenureUnit = "DAYS" | "WEEKS" | "MONTHS" | "YEARS";
export type CompoundingPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
export type RepaymentOption = "BULLET" | "EQUAL";
export type PenaltyType = "NONE" | "FIXED_ONE_TIME" | "FIXED_PER_DAY" | "PERCENT_ONE_TIME" | "PERCENT_PER_DAY" | "PENAL_INTEREST_PA";
export type InstallmentStatus = "UPCOMING" | "DUE_TODAY" | "PARTIALLY_PAID" | "OVERDUE" | "PAID";
export type LoanStatus = "ACTIVE" | "CLOSED" | "CANCELLED";

export interface PenaltyConfig {
  type: PenaltyType;
  value: number;
  graceDays: number;
  capAmount?: number | null;
  capPercent?: number | null;
  waivable: boolean;
  source?: "LOAN" | "CUSTOMER" | "TENANT" | "NONE";
}

export interface Address {
  line?: string; village?: string; taluk?: string; district?: string; pincode?: string;
}
export type IdProofType = "AADHAAR" | "PAN" | "RATION" | "OTHER";
export interface IdProofEntry { type: IdProofType; otherTypeName?: string; number?: string; documentUrl?: string }

export interface LoanDefaults {
  method?: InterestMethod;
  params?: Record<string, unknown>;
  ratePercent?: number;
  rateBasis?: RateBasis;
  frequency?: Frequency;
  tenureValue?: number;
  tenureUnit?: string;
  skipSunday?: boolean;
  dayOfMonth?: number;
  penalty?: PenaltyConfig;
}

export interface Customer {
  id: string; customerNo: string; photoUrl?: string; name: string; phone: string; altPhone?: string;
  addressCurrent?: Address; addressPermanent?: Address; occupation?: string;
  idProofs: IdProofEntry[]; notes?: string;
  loanDefaults?: LoanDefaults; penaltyProfile?: PenaltyConfig; status: "ACTIVE" | "INACTIVE";
}

export interface Guarantor {
  id: string; customerId: string; photoUrl?: string; name: string; phone: string;
  addressCurrent?: Address; addressPermanent?: Address;
  idProofs: IdProofEntry[]; status: "ACTIVE" | "INACTIVE";
}

export interface ScheduleRow {
  seq: number; dueDate: string; principal: number; interest: number; amount: number; balanceAfter: number;
}
export interface ScheduleResult {
  instalmentCount: number; instalmentAmount: number; totalInterest: number; totalPayable: number;
  effectiveAnnualRatePercent: number; rows: ScheduleRow[];
}

export interface Loan {
  id: string; loanNo: string; kind: "LOAN" | "CHIT"; customerId: string; principalAmount: number;
  method: InterestMethod; ratePercent: number; rateBasis: RateBasis; frequency: Frequency;
  tenure?: { value: number; unit: TenureUnit }; instalmentCount: number; startDate: string; firstDueDate: string;
  instalmentAmount: number; totalInterestAmount: number; totalPayableAmount: number; paidAmount: number;
  penalty?: PenaltyConfig; defaultsSource: "FORM" | "CUSTOMER" | "TENANT" | "SYSTEM"; status: LoanStatus; notes?: string;
  customerNo?: string; customerName?: string; customerPhone?: string;
}

export interface Installment {
  id: string; loanId: string; customerId: string; seq: number; dueDate: string;
  principalDue: number; interestDue: number; amountDue: number; amountPaid: number;
  penaltyAccrued: number; penaltyPaid: number; penaltyWaived: number; provisional: boolean;
  status: InstallmentStatus; paidOn?: string;
}

export interface DueRow {
  installmentId: string; loanId: string; loanNo: string; chit: boolean; customerId: string;
  customerNo: string; customerName: string; customerPhone: string; village?: string; dueDate: string;
  frequency: string; method: string; instalmentDue: number; penaltyDue: number; paid: number;
  balance: number; status: InstallmentStatus; provisional: boolean; reminderActive: boolean;
}

export interface Payment {
  id: string; receiptNo: string; loanId: string; customerId: string; amount: number; paidOn: string;
  mode: "CASH" | "UPI" | "BANK"; reference?: string; note?: string; reversed: boolean; reversedReason?: string;
}

export interface PaymentAllocation {
  installmentId: string; penaltyAmount: number; interestAmount: number; principalAmount: number;
}

/** Enriched payment row served by /payments - a receipt, with the loan/customer names a history list needs. */
export interface PaymentRow {
  id: string; receiptNo: string; loanId: string; loanNo?: string; customerId: string; customerNo?: string; customerName?: string;
  amount: number; paidOn: string; mode: "CASH" | "UPI" | "BANK"; reference?: string; note?: string;
  reversed: boolean; reversedReason?: string; allocations: PaymentAllocation[];
}

export interface ChitMember { memberNo: number; customerId: string; loanId: string; prizedPeriod?: number | null; }
export interface ChitAuctionRecord {
  period: number; auctionDate: string; winnerMemberNo: number; discountAmount: number; commissionAmount: number;
  dividendPoolAmount: number; dividendPerMemberAmount: number; prizeAmount: number; prizePaidOn?: string; prizeMode?: string;
}
export interface ChitGroup {
  id: string; groupNo: string; name: string; chitValueAmount: number; memberCount: number; frequency: Frequency;
  subscriptionAmount: number; startDate: string; commissionPercent: number; maxDiscountPercent: number;
  postPrizeRule: "SAME_AS_OTHERS" | "FULL_SUBSCRIPTION"; status: "ACTIVE" | "CLOSED";
  members: ChitMember[]; auctions: ChitAuctionRecord[];
}

export interface User {
  id: string; name: string; email: string; phone?: string; role: "ADM" | "STAFF";
  status: "INVITED" | "ACTIVE" | "DISABLED"; language: string; lastLoginAt?: string;
}

export interface Notification {
  id: string; key?: string; type: "DIGEST" | "EMAIL_FAILED" | "SYSTEM"; title: string; message: string;
  link?: string; read: boolean; createdAt: string;
}

export interface DashboardSummary {
  dueTodayCount: number; dueTodayAmount: number; collectedToday: number; overdueCount: number; overdueAmount: number;
  upcoming7DaysCount: number; upcoming7DaysAmount: number; activeLoans: number; totalOutstanding: number;
  penaltyAccruedUnpaid: number; penaltyCollectedThisFy: number;
}

export interface ReminderSettings {
  sendTime: string; emailEnabled: boolean; inAppEnabled: boolean;
  includeOverdue: boolean; overdueDays: number; recipients: string[]; digestLanguage: string;
}

export interface SettingsDocument {
  businessName: string; currency: string; defaultLanguage: string; skipSundayDefault: boolean;
  financialYear: { startMonth: number; startDay: number }; defaults: LoanDefaults; reminders: ReminderSettings;
}

export interface TenantSummary {
  code: string; name: string; status: "ACTIVE" | "SUSPENDED"; createdAt: string; adminEmail: string;
  seatsUsed: number; maxUsers: number; customersUsed: number; maxCustomers: number; activeLoans: number;
}

export interface CapacitySummary {
  storageUsedMb: number; totalAllocatedQuota: number; totalActualCustomers: number;
  perTenant: { code: string; customers: number; quota: number }[]; thresholdStatus: string;
}

export interface AuditLogEntry {
  id: string; at: string; userId: string; entity: string; entityId: string; action: string; summary: string;
}

/** Generic shape every /reports/{type} endpoint returns - pre-formatted rows, ready to render as-is. */
export interface ReportResult {
  title: string; columns: string[]; rows: string[][]; summary: string[];
}
