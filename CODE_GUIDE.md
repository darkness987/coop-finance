# คู่มือค้นหาโค้ดระบบสหกรณ์

โค้ดเว็บปัจจุบันทำงานตามลำดับ app → components → lib → database

| ระบบ | หน้าจอ | ฟังก์ชันหลังบ้าน |
|---|---|---|
| สมาชิกและใบสมัคร | components/members/ | lib/members/ |
| หุ้นและส่งหุ้นครั้งแรก | components/shares/ | lib/shares/ |
| เงินฝากและถอน | components/deposits/ | lib/deposits/ |
| สินเชื่อ ผู้ค้ำ ชำระเงิน | components/loans/ | lib/loans/ |
| ปันผลและเฉลี่ยคืน | components/returns/ | lib/returns/ |
| ภาพรวมและกราฟ | components/home/ | lib/reports/ |
| ประวัติธุรกรรม | components/documents/ | lib/reports/transactions.ts |
| บัญชีผู้ใช้ สิทธิ์ รหัสผ่าน | components/settings/ | lib/auth/ |
| Sidebar และโครงหน้า | components/layout/ | lib/auth/permissions.ts |
| โหลดข้อมูลหน้าจอ | components/shared/ | lib/api/ |

## ตำแหน่งที่แก้บ่อย

- ยอดฝากรวมจำลอง: database/demo-admin-overview.ts → depositTotal และ monthlyDeposits
- ข้อมูลจริงทั้งระบบ: database/data.ts
- เปอร์เซ็นต์กู้เริ่มต้น: lib/loans/loan-policy.ts → defaultLoanPolicy
- เปอร์เซ็นต์ที่บันทึกจากเว็บ: database/data.ts → loans.policy
- ตรวจวงเงินที่กู้ได้: lib/loans/loan-capacity.ts
- หักเงินฝากชำระหนี้: lib/loans/loan-repayment.ts
- สูตรตารางผ่อนและลดต้นลดดอก: lib/loans/calculator/repayment.ts
- มูลค่าหุ้นและส่งขั้นต่ำ: database/data.ts → shares.rules
- ยอดหุ้นสะสม: lib/shares/shares.ts รวมยอดยกมากับรายการรับเงินแล้ว
- ปันผลและบัญชีรับผลตอบแทน: lib/returns/benefits.ts
- สิทธิ์ 6 บทบาท: lib/auth/permissions.ts
- สร้างบัญชีผู้ใช้: components/settings/UsersPage.jsx
- Sidebar: components/layout/Navigation.jsx
- OTP 6 ช่อง: components/security/TransactionOtp.jsx
- ผลตอบแทนเงินฝากจำลอง: database/demo-deposit-returns.ts

## อ่านการทำงานของหนึ่งหน้า

1. เปิด app/.../page.jsx เพื่อดู URL และหน้าจอที่เรียก
2. ตาม import ไปที่ components/ระบบ เพื่อดูปุ่มและฟอร์ม
3. ดูชื่อ action ที่ส่ง เช่น asset-policy, request-repayment, notify
4. สินเชื่อ/เงินฝาก/ผู้ใช้ ใช้ app/api/finance/[module]/route.ts
5. สมาชิก/หุ้น/ผลตอบแทน ใช้ app/api/[resource]/route.js
6. ตามไป lib/ระบบ เพื่อดูการตรวจสิทธิ์ ตรวจข้อมูล และคำนวณ
7. database/store.ts ดูแล transaction และ database/data.ts เก็บข้อมูลจริง

## ฐานข้อมูลกลางไฟล์เดียว

| หมวดใน database/data.ts | ข้อมูล |
|---|---|
| members | สมาชิกและใบสมัคร |
| shares | กฎ บัญชีหุ้น ส่งหุ้น และคำขอเปลี่ยนยอด |
| deposits | บัญชีและธุรกรรมเงินฝาก/ถอน |
| loans | นโยบาย คำขอ ผู้ค้ำ สัญญา ตารางผ่อน และการชำระ |
| returns | ผลจัดสรร ปันผล และเฉลี่ยคืน |
| auth | บัญชีผู้ใช้ session และ Audit Log |

ค่าลงท้าย Cents หรือ cents เป็นสตางค์ เช่น 100000 = 1,000 บาท ส่วน amount ของหุ้นและวงเงินกู้เป็นบาท
ภายใน object ของ data.ts เป็น JSON จึงไม่ใส่ comment ระหว่างข้อมูล ให้ดูคำอธิบายที่คู่มือนี้และ database/README.md
รหัสผ่านและ session เก็บเป็น hash

## คอมเมนต์และสารบัญ

ต้นไฟล์บอกระบบและชื่อไฟล์ เหนือฟังก์ชันที่มีชื่อบอกหน้าที่ และคงคอมเมนต์อธิบายเงื่อนไขเงิน/สิทธิ์เดิมไว้
ทุกโฟลเดอร์ lib/ระบบ มี README.md รายชื่อไฟล์และฟังก์ชันที่ export ให้เปิดค้นต่อได้

## ตรวจการทำงาน

รันจาก allproject ด้วย npm run dev, npm test และ npm run build

สำเนาโครงการเก่า โฟลเดอร์ archive และ systems เป็นข้อมูลอ้างอิง ให้เริ่มแก้จาก app, components, lib และ database ตามตารางด้านบน

## งานสมาชิกที่เพิ่ม
- สมัครสมาชิกแบบเดิม: app/register/page.jsx → components/members/RegisterPage.jsx
- รับใบสมัครสาธารณะ: app/api/register/route.ts → lib/members/registration.ts
- งานเจ้าหน้าที่สมาชิก: app/admin/member-services/page.jsx → components/members/MemberServices.jsx → lib/members/member-services.ts
- คำขอแก้ข้อมูล/ลาออก/ระงับ: database/data.ts → members.serviceRequests (สร้างเมื่อมีคำขอแรก)
- เปิดบัญชีผู้สมัครเมื่ออนุมัติ: database/shares.ts; รหัสผ่านเป็น hash ใน auth.users
- ทดสอบสิทธิ์และขั้นตอนสมาชิก: tests/member-services-registration.test.ts


## ระบบที่เพิ่ม: อนุมัติข้อมูลสมาชิก แผนฝากรายเดือน และหลักประกัน

- `lib/members/members.ts`: รับข้อมูลแก้ไขจากสมาชิก ตรวจข้อมูล แล้วเก็บคำขอใน `members.profileChanges` โดยยังไม่แก้ `members.records`
- `lib/members/member-services.ts`: Admin อนุมัติ/ไม่อนุมัติคำขอ ตรวจข้อมูลต้นฉบับซ้ำก่อนนำค่าใหม่ไปใช้
- `components/members/ProfileChangeReviews.jsx`: ตารางข้อมูลเดิมและข้อมูลที่ขอเปลี่ยน อยู่หน้า Admin > ดูแลและติดตามสมาชิก
- `lib/deposits/monthly-plan.ts`: แผนฝากตัวอย่าง 12/24/36 เดือน เก็บที่ `deposits.accounts[].monthlyPlan` เงินรายเดือนเก็บเป็นสตางค์ คิดยอดที่ยังต้องฝากของเดือนปัจจุบันจากรายการฝากที่ยืนยันแล้ว
- `lib/reports/dashboard.ts`: `monthlyObligation` = งวดค้างถัดไปของทุกสัญญา + ยอดฝากตามแผนที่ยังขาดในเดือนปัจจุบัน การสร้างแผนยังไม่เปลี่ยนยอดเงินจริง
- `lib/loans/loan-capacity.ts`: เพดานเดียวจาก `loans.policy.totalPercent` (เริ่มต้น 60%) หักเงินต้นคงค้างและคำขออื่นที่จองวงเงิน ไม่แบ่งครั้งแรกกับครั้งที่สองแล้ว
- `lib/loans/collateral.ts`: ตรวจรายละเอียดที่ดิน/บ้าน ผูกข้อมูลกับ OTP และบันทึกหลักประกันในคำขอ/สัญญา เจ้าหน้าที่สมาชิกหรือ Admin ต้องบันทึกวงเงินประเมินและผลตรวจเอกสารก่อนอนุมัติ
- ซ่อนเงื่อนไขภาระผ่อน 40% เฉพาะรายการผลตรวจบน LoanWizard การตรวจฝั่งเซิร์ฟเวอร์ยังทำงาน
- การ์ดเงินฝากประจำถูกนำออกและปิดการเปิดบัญชีประเภทนี้เพิ่ม โดยเก็บรายการและบัญชีเดิมไว้สำหรับประวัติ

- `lib/deposits/monthly-terms.ts`: 12 เดือน 2.25%, 24 เดือน 2.75%, 36 เดือน 3.00% ต่อปี ใช้ชุดเดียวกันทั้ง API การ์ดและประมาณการผลตอบแทน
- แผนฝากตัวอย่างปรับได้ซ้ำในบัญชีเดิมผ่าน `monthly-plan` โดยไม่เพิ่มบัญชี ไม่เปลี่ยนยอดเงินหรือประวัติฝาก และคงงวดเริ่มต้นเดิม
- `components/deposits/MonthlyDepositContract.jsx`: เปิดดูสัญญาฝากตัวอย่างตามแผนที่บันทึก ชื่อสมาชิก เลขบัญชี ระยะเวลา ดอกเบี้ยและเงินต้นเป้าหมาย

- หน้าการ์ด `DepositAccounts.jsx` ใช้เลือกบัญชีเท่านั้น ฟอร์มแผนฝากและสัญญาย้ายเข้า `MonthlyDepositPlan.jsx` ในหน้าภาพรวมบัญชีรายเดือนแล้ว
- `lib/deposits/monthly-estimate.ts`: ประมาณการฝากวันที่ 1 ทุกเดือนจนถึงครบสัญญา คิดแต่ละงวดตามวันจริงแยกปี 365/366 วัน ไม่ทบต้น ปัดดอกเบี้ยครั้งเดียวเมื่อรวมครบ เงินที่แสดงเป็นประมาณการ ไม่เพิ่มยอดเงินจริง

- ผลตอบแทนเงินฝาก (`readBenefits`): ไม่รวมเงินฝากประจำในตารางและยอดรวมปัจจุบัน รวมบัญชีรายเดือนด้วยอัตราตามสัญญา พร้อมแสดงประมาณการครบสัญญาแยกจากยอดเงินจริง
- `MemberBenefits.jsx` อัปเดตเมื่อกลับเข้าแท็บ เมื่อ API บันทึกข้อมูลในแอป/แท็บอื่น และตรวจยอดล่าสุดทุก 5 วินาทีขณะหน้าจอเปิดอยู่ รองรับแอดมินยืนยันเงินฝากจากเบราว์เซอร์อื่น


## แอดมินเงินฝากและแผนรายเดือน
- หน้า `/admin/deposits/settings`: Admin กำหนดอัตราออมทรัพย์ทั่วไป/พิเศษ เพิ่ม–แก้ไข–ปิดรับแผนรายเดือน (1–120 เดือน) กำหนดยอดขั้นต่ำ และเปิด–ปิดรับบัญชีใหม่
- `lib/deposits/deposit-settings.ts`: ตรวจสิทธิ์ Admin ตรวจตัวเลข/เดือนซ้ำ/เวอร์ชันก่อนบันทึก `deposits.settings` ใน `database/data.ts` อัตราทั่วไปใช้ `returns.settings.depositRates` ชุดเดียวกับหน้าผลตอบแทน
- ฝั่งสมาชิกอ่านตัวเลือกจาก API `monthlyTerms` ไม่เขียน 12/24/36 ตายตัวแล้ว ทุกครั้งที่เปิดหรือบันทึกแผน ตรวจค่าปัจจุบันซ้ำที่ backend
- สัญญาที่บันทึกเก็บ `termMonths`, `annualRate`, `monthlyCents`, `startPeriod`, `endPeriod` เป็น snapshot การตั้งค่าใหม่ไม่ย้อนแก้สัญญาหรือผลดอกเบี้ยที่เคยจัดสรร
- หน้า `/admin/deposits/monthly`: ติดตามยอดรับจริง ยอดแจ้งรอตรวจ และยอดฝากที่ยังขาดของงวดปัจจุบัน พร้อมดูสัญญา
- `auth.auditLogs`: API เก็บผู้ทำรายการ บทบาท หมวด คำสั่ง เวลา หน้าตั้งค่าอ่าน 50 รายการล่าสุดจาก `lib/auth/users.ts`


## ข้อมูลประกอบการตรวจคำขอสินเชื่อ
- `lib/loans/application-review.ts`: รวมข้อมูลสมาชิก หุ้นที่รับจริง เงินฝากรายบัญชี หนี้เดิม รายได้ วงเงิน และตารางผ่อนจากเงื่อนไขในคำขอ อ่านข้อมูลล่าสุดโดยไม่แก้ยอดเงิน
- API `readLoans` ส่ง `review` เฉพาะเจ้าหน้าที่ที่มีสิทธิ์อ่านสินเชื่อ ไม่ส่งเลขประชาชนหรือเลขบัญชีธนาคารเต็มในส่วนตรวจนี้
- เมื่อส่งคำขอผ่าน OTP เก็บ `reviewAtSubmission` และ `securityAtSubmission` เพื่อเทียบกับข้อมูลล่าสุด คำขอเดิมที่ไม่เคยเก็บ snapshot รายได้จะแจ้งว่าไม่มีข้อมูลตอนยื่น
- `components/loans/ApplicationReview.jsx`: การ์ดฐานะการเงิน บัญชีเงินฝาก ตารางเทียบตอนยื่น/ล่าสุด ผลตรวจเบื้องต้น ผู้ค้ำ และตารางผ่อน อยู่ก่อนปุ่มตรวจ/ส่งต่อ/อนุมัติ
- เมื่ออนุมัติ backend ตรวจรายได้และภาระผ่อนล่าสุดตามเกณฑ์เดิม 40% อีกครั้ง พร้อมตรวจสถานะสมาชิก อายุสมาชิก ผู้ค้ำ/หลักประกันตามระบบเดิม

- เงินฝากประจำเลิกใช้ทุกหน้าปัจจุบันแล้ว: `lib/deposits/deposit-scope.ts` กรองบัญชีและรายการเก่าออกจากหน้าจอ ยอดภาพรวม วงเงินกู้ และช่องชำระเงิน API ไม่รับรายการใหม่กับบัญชีประเภทนี้ บัญชีตัวอย่างยอดศูนย์ที่ไม่มีประวัติถูกนำออก ส่วนข้อมูลเก่าที่มีเงินจริง/ประวัติไม่ลบทิ้ง
