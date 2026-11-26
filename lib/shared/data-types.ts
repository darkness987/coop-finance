// ระบบ: เครื่องมือและข้อมูลที่ใช้ร่วมกัน | ไฟล์: data-types.ts
export type MemberProfile = Partial<
  Record<
    | "citizenNumber"
    | "citizenLast4"
    | "prefix"
    | "firstName"
    | "lastName"
    | "birthDate"
    | "company"
    | "occupation"
    | "income"
    | "address"
    | "provincePostal"
    | "bank"
    | "bankLast4",
    string
  >
>;
export type ReviewStatus = "pending" | "approved" | "rejected";
export type Identity = {
  id: string;
  name: string;
  email: string;
  phone: string;
};
export type ShareRules = { price: number; min: number };
export type SharePayment = {
  initial?: boolean;
  requestId?: string;
  id: number;
  member: string;
  period: string;
  amount: number;
  price: number;
  method: string;
  date: string;
  received: string | null;
  reference: string | null;
};
export type CoopData = {
  profile_change_requests?: Record<string, any>[];
  rules: (ShareRules & { id: number })[];
  members: (Identity & {
    active: number;
    joined: string;
    profile?: MemberProfile;
  })[];
  share_accounts: {
    member: string;
    monthly: number;
    opening_amount: number;
    opening_units: number;
    opening_date: string;
    initial_payment_required?: boolean;
    initial_payment_completed?: string;
  }[];
  share_payments: SharePayment[];
  share_change_requests: {
    id: number;
    member: string;
    amount: number;
    previous: number;
    date: string;
    status: ReviewStatus;
  }[];
  member_applications: (Identity & {
    status: ReviewStatus;
    profile?: MemberProfile;
    submitted?: string;
  })[];
  allocations: {
    year: number;
    dividend_rate: number;
    rebate_rate: number;
    approved: number;
  }[];
  member_dividends: {
    year: number;
    member: string;
    basis: number;
    cents: number;
  }[];
  member_rebates: {
    year: number;
    member: string;
    basis: number;
    cents: number;
  }[];
};
