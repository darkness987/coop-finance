# loans

| File                                                 | Exported functions / types                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [calculator/calculator.ts](calculator/calculator.ts) | calculateMonthlyInstallment, calculateDailyInterest, estimate                                |
| [calculator/repayment.ts](calculator/repayment.ts)   | addMonths, buildSchedule, Outstanding, Allocation, allocatePayment                           |
| [loan-capacity.ts](loan-capacity.ts)                 | borrowingMode, assetBorrowingCapacity                                                        |
| [loan-disbursement.ts](loan-disbursement.ts)         | loanDisbursement                                                                             |
| [loan-guarantor.ts](loan-guarantor.ts)               | loanSecurity, findGuarantor, guarantorRows, findGuarantors, requireGuarantor, readGuarantees |
| [loan-policy.ts](loan-policy.ts)                     | defaultLoanPolicy, validateLoanPolicy, readLoanPolicy                                        |
| [loan-repayment.ts](loan-repayment.ts)               | loanOutstanding, applyLoanRepayment, linkedAccount, changeRepayment                          |
| [loans.ts](loans.ts)                                 | readLoans, loanEstimate, changeLoans                                                         |

[System code guide](../../CODE_GUIDE.md)
