// Fictional local demo data only. No production users, sessions or OTPs.
export const database = {
  "version": 1,
  "members": {
    "records": [
      {
        "id": "66001239",
        "name": "สมาชิก ตัวอย่าง",
        "email": "member@example.test",
        "phone": "0000000000",
        "active": 1,
        "joined": "2023-01-15",
        "profile": {
          "firstName": "สมาชิก",
          "lastName": "ตัวอย่าง",
          "company": "สหกรณ์ตัวอย่าง",
          "occupation": "พนักงาน",
          "income": "30000"
        },
        "demoProfile": true
      },
      {
        "id": "66001240",
        "name": "ผู้ค้ำ ตัวอย่างหนึ่ง",
        "email": "66001240@example.test",
        "phone": "0000000000",
        "active": 1,
        "joined": "2023-01-15",
        "profile": {
          "income": "30000"
        },
        "demoProfile": true
      },
      {
        "id": "66001241",
        "name": "ผู้ค้ำ ตัวอย่างสอง",
        "email": "66001241@example.test",
        "phone": "0000000000",
        "active": 1,
        "joined": "2023-01-15",
        "profile": {
          "income": "30000"
        },
        "demoProfile": true
      }
    ],
    "applications": [],
    "profileChanges": []
  },
  "shares": {
    "rules": [
      {
        "id": 1,
        "price": 100,
        "min": 500
      }
    ],
    "accounts": [
      {
        "member": "66001239",
        "monthly": 2000,
        "opening_amount": 50000,
        "opening_units": 500,
        "opening_date": "2026-01-01",
        "initial_payment_required": false
      },
      {
        "member": "66001240",
        "monthly": 2000,
        "opening_amount": 50000,
        "opening_units": 500,
        "opening_date": "2026-01-01",
        "initial_payment_required": false
      },
      {
        "member": "66001241",
        "monthly": 2000,
        "opening_amount": 50000,
        "opening_units": 500,
        "opening_date": "2026-01-01",
        "initial_payment_required": false
      }
    ],
    "payments": [],
    "changeRequests": []
  },
  "returns": {
    "allocations": [],
    "dividends": [],
    "rebates": [],
    "settings": {
      "dividendPercent": 4,
      "rebatePercent": 5,
      "depositRates": {
        "savings": 1.25,
        "special": 2,
        "monthly": 2.25
      },
      "updated": "2026-01-01T00:00:00.000Z",
      "updatedBy": "demo-admin"
    }
  },
  "deposits": {
    "accounts": [
      {
        "id": "SA-66001239",
        "member": "66001239",
        "type": "savings",
        "balanceCents": 3500000,
        "status": "active",
        "created": "2026-01-01T00:00:00.000Z"
      },
      {
        "id": "SP-66001239",
        "member": "66001239",
        "type": "special",
        "balanceCents": 1000000,
        "status": "active",
        "created": "2026-01-01T00:00:00.000Z"
      }
    ],
    "transactions": [
      {
        "id": "demo-pending-deposit",
        "member": "66001239",
        "account": "SA-66001239",
        "type": "deposit",
        "amountCents": 100000,
        "requestId": "demo-deposit-request",
        "status": "pending",
        "description": "รายการสมมุติสำหรับทดลองตรวจสอบ",
        "channel": "transfer",
        "created": "2026-01-01T00:00:00.000Z"
      }
    ],
    "withdrawalOtps": [],
    "settings": {
      "revision": 5,
      "monthlyTerms": [
        {
          "id": "term-12",
          "months": 12,
          "rate": 2.25,
          "active": true
        },
        {
          "id": "term-24",
          "months": 24,
          "rate": 2.75,
          "active": true
        },
        {
          "id": "term-36",
          "months": 36,
          "rate": 3,
          "active": true
        }
      ],
      "openingEnabled": {
        "savings": true,
        "special": true,
        "monthly": true
      },
      "minimumMonthlyCents": 50000,
      "updated": "2026-01-01T00:00:00.000Z",
      "updatedBy": "demo-admin"
    }
  },
  "loans": {
    "products": [
      {
        "id": "ordinary",
        "name": "สินเชื่อสามัญ",
        "description": "ใช้จ่ายส่วนบุคคลและเพิ่มสภาพคล่องตามความจำเป็น",
        "annualRate": 5.5,
        "minAmount": 1000,
        "maxAmount": 300000,
        "minMonths": 3,
        "maxMonths": 60,
        "active": true,
        "assetPercent": 95,
        "policyUpdated": "2026-11-21T07:16:27.951Z",
        "policyUpdatedBy": "admin"
      },
      {
        "id": "emergency",
        "name": "สินเชื่อฉุกเฉิน",
        "description": "รองรับเหตุจำเป็นเร่งด่วนและค่าใช้จ่ายที่ไม่ได้วางแผนไว้",
        "annualRate": 6,
        "minAmount": 1000,
        "maxAmount": 50000,
        "minMonths": 1,
        "maxMonths": 12,
        "active": true,
        "assetPercent": 60,
        "policyUpdated": "2026-11-21T07:16:27.951Z",
        "policyUpdatedBy": "admin"
      },
      {
        "id": "special",
        "name": "สินเชื่อพิเศษ",
        "description": "สำหรับสมาชิกที่มีหลักประกัน รอทีมกำหนดเงื่อนไขก่อนเปิดรับคำขอ",
        "annualRate": 6,
        "minAmount": 1000,
        "maxAmount": null,
        "minMonths": 1,
        "maxMonths": 120,
        "active": true,
        "assetPercent": 90,
        "policyUpdated": "2026-11-21T07:31:00.201Z",
        "policyUpdatedBy": "demo-admin"
      }
    ],
    "applications": [],
    "documents": [],
    "handoffs": [],
    "decisions": [],
    "contracts": [],
    "payments": [],
    "schedules": [],
    "submissionOtps": [],
    "repaymentOtps": []
  },
  "auth": {
    "users": [
      {
        "id": "demo-member",
        "username": "member",
        "passwordHash": "coop-finance-local-demo:c1adec0a9e809d8b1eb7f28d1c884dd68bb111d2680c78220b3cfabb8b9bcdc66b7291847d0a1e5b1ebe6f7f7a836ff16990cf65e78b34873774a38dc13eb0a0",
        "role": "member",
        "member": "66001239",
        "active": true,
        "sessions": []
      },
      {
        "id": "demo-admin",
        "username": "admin",
        "passwordHash": "coop-finance-local-demo:c1adec0a9e809d8b1eb7f28d1c884dd68bb111d2680c78220b3cfabb8b9bcdc66b7291847d0a1e5b1ebe6f7f7a836ff16990cf65e78b34873774a38dc13eb0a0",
        "role": "admin",
        "member": "66001239",
        "active": true,
        "sessions": []
      }
    ],
    "auditLogs": []
  }
};
