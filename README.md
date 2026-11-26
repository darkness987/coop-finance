# Allproject — ระบบสหกรณ์ในเว็บเดียว

[คู่มือค้นหาโค้ดแต่ละระบบ](CODE_GUIDE.md)

## เริ่มใช้งาน
```sh
git clone https://github.com/darkness987/coop-finance.git
cd coop-finance
npm install
npm run dev
```
เปิด http://127.0.0.1:3200/login ไม่ต้องรัน PostgreSQL หรือโมดูลหลายพอร์ต

ตอนติดตั้ง ระบบสร้าง `database/data.ts` จากข้อมูลสมมุติใน `database/data.example.ts` เฉพาะเมื่อยังไม่มีไฟล์ จึงไม่เขียนทับข้อมูลเดิม ไฟล์ข้อมูลจริง, session, OTP และ `.env*` ไม่ถูกส่งขึ้น GitHub

เว็บออนไลน์: https://coop-finance.vercel.app · [คู่มืออัปเดต Vercel](docs/VERCEL.md)

| บัญชีสาธิต | ชื่อผู้ใช้ | รหัสผ่าน |
|---|---|---|
| สมาชิก | member | 123456 |
| เจ้าหน้าที่ | admin | 123456 |

รหัสนี้เป็นบัญชีสาธิตบนเครื่องนักศึกษา เปลี่ยนได้ที่ /settings ฐานข้อมูลเก็บเป็น scrypt hash

## แยกหน้าและสิทธิ์
| ระบบ | สมาชิก | เจ้าหน้าที่ |
|---|---|---|
| หน้าหลัก | /home — ยอดบัญชีของตนเอง | /admin/home — ยอดรวมสหกรณ์และคิวงาน |
| สมาชิก | /members — ข้อมูลส่วนตัว | /admin/members — ค้นหา ดูข้อมูล เพิ่ม/แก้ไข/เปลี่ยนสถานะ |
| ใบสมัคร | — | /admin/applications |
| บัญชีผู้ใช้ | /settings — เปลี่ยนรหัสตนเอง | /admin/users — จัดการบัญชีผู้ใช้ |
| หุ้น | /shares — ส่งหุ้น ประวัติ ปรับยอด ผลตอบแทน | /admin/shares — ตรวจรับ ตั้งกฎ จัดการบัญชีหุ้น |
| ผลตอบแทน | แท็บปันผล/เฉลี่ยคืนใน /shares | /admin/returns — ร่างและอนุมัติผล |
| เงินฝาก | /deposits — บัญชีตนเอง ฝาก/ถอน ประวัติ ใบแจ้งยอด | /admin/deposits — ทะเบียนทุกบัญชี |
| ตรวจเงินฝาก | ดูสถานะใน /deposits | /admin/deposits/approve — ยืนยัน/ปฏิเสธรายการ |
| ประวัติเงินฝาก | บัญชีตนเองใน /deposits | /admin/deposits/transactions — ทุกบัญชี |
| ดอกเบี้ย | ดูรายการที่จัดสรรแล้ว | /admin/deposits/interest — จัดสรรประจำปี |
| สินเชื่อ | /loans — เลือก คำนวณ ยืนยันคำขอ ดูสัญญา | /admin/loans — พิจารณา จ่ายเงิน และรับชำระ |
| เอกสาร | /documents — ใบเสร็จหุ้นและผลตอบแทน | งานตรวจใบสมัคร /admin/applications |

ล็อกอิน admin จะเข้าหน้า /admin/home และเห็นเฉพาะเมนูเจ้าหน้าที่ สมาชิกจะเข้าหน้า /home และไม่เห็นเมนูแอดมิน การพิมพ์ URL ไม่เพิ่มสิทธิ์: ตรวจบทบาททั้งเส้นทางและ API
ลิงก์หมวดทั่วไป /home /shares /deposits /loans /members ของแอดมินจะส่งต่อไปหน้าเจ้าหน้าที่ตามหมวดนั้น

## การจัดไฟล์ตามหมวด (เหมือนแนวทางตัวอย่าง coop-finance)
app/ เป็นเส้นทางและตรวจสิทธิ์ หน้าตาอยู่ components/ ฟังก์ชันธุรกิจอยู่ lib/ ข้อมูลอยู่ database/

```text
app/
  home/ members/ shares/ deposits/ loans/ documents/ settings/
  admin/
    home/ members/ applications/ users/ shares/ returns/ loans/
    deposits/ approve/ transactions/ interest/
  api/
    session/ dashboard/ [resource]/ finance/[module]/ deposits/statement/
components/
  home/       Home, HomeChart, AdminDashboard
  members/    MemberProfile, AdminMembers, Applications
  shares/     MemberShares, AdminShares, Rules, Payments, Changes
  deposits/   MemberDeposits, AdminDeposits, DepositTable, DepositInterest
  loans/      LoanPage, LoanWizard, ApplicationDetail, ContractDetail, ProductSettings
  returns/    AdminReturns, ReturnTable
  documents/  MemberDocuments
  Navigation.jsx   sidebar กลางหนึ่งอัน เลือกเมนูตามบทบาท
lib/
  auth/ members/ shares/ deposits/ loans/ returns/ reports/
  shared/ data/ api/
 database/
  data.ts     ข้อมูลจริงหนึ่งไฟล์
  store.ts    อ่านและบันทึกไฟล์กลาง
  shares.ts   แปลงหมวดให้ระบบหุ้นเดิมใช้ร่วมกันได้
```

components/LoanPage.jsx และ DepositPage.jsx ที่ระดับบนเป็น compatibility wrapper เท่านั้น ไม่ใช่ที่เก็บหน้าทั้งระบบแล้ว
app/member/... เป็น URL เดิมที่เรียก component กลางชุดเดียวกัน ไม่มีหน้าและ CSS สำเนาอีกชุด

## ข้อมูลตัวอย่าง
- ย้ายข้อมูลสมาชิก หุ้น และผลตอบแทนจากไฟล์ TS เดิมแล้ว
- เติมข้อมูลสมมติในช่องสมาชิกที่ว่าง เช่น วันเกิด หน่วยงาน อาชีพ ที่อยู่ และธนาคาร โดยคงค่าที่เคยกรอกไว้
- หน้าข้อมูลสมาชิกระบุว่าเป็นข้อมูลตัวอย่างสำหรับโครงงาน
- เงินฝากมีตัวอย่าง 2 บัญชี ยอด 350,000 และ 50,000 บาท พร้อมประวัติยอดเปิดบัญชีที่ตรงกับยอดคงเหลือ และรายการรอตรวจสอบ 2 รายการ
- ตัวอย่างเงินฝากไม่ได้ดึงข้อมูลจริงจาก PostgreSQL เดิม ทุก record ตัวอย่างมี demo:true
- scripts/fill-demo.ts เติมเฉพาะช่องว่าง สร้างตัวอย่างเงินฝากเมื่อทั้ง accounts และ transactions ว่าง และไม่เปลี่ยนรหัสผ่าน
- สมาชิกเก่าที่ไม่มีบัญชีหุ้นจะได้บัญชีหุ้นเริ่มต้น 0 บาท เพื่อไม่ให้เกิดทุนเพิ่มโดยไม่มีรายการรับเงินจริง

## ฐานข้อมูล .ts
แก้ database/data.ts ใน VS Code แล้วบันทึกและรีเฟรชเว็บ รายละเอียดตาราง หน่วยเงิน และรูปแบบอยู่ database/README.md
ระบบอ่าน JSON ภายใน export const database ไม่ eval โค้ด ห้ามเพิ่ม comment หรือ trailing comma ภายใน object
readDatabase() อ่านล่าสุด updateDatabase() ใช้ lock และ atomic rename ถ้าฟังก์ชันเกิดข้อผิดพลาดจะไม่บันทึก

หุ้น/เงินฝากที่แจ้งยังไม่รวมยอดจนกว่าเจ้าหน้าที่ยืนยัน ยืนยันซ้ำไม่เพิ่มยอดซ้ำ ถอนเกินยอดไม่ได้ และบัญชีที่ระงับไม่สามารถแจ้งหรือยืนยันรายการใหม่ได้
ดอกเบี้ยคิดจากยอดปิดสิ้นวัน หนึ่งบัญชีต่อปี และคำนวณใหม่ซ้ำปีที่จัดสรรแล้วไม่ได้

สินเชื่อใช้ขั้นเลือกประเภท → กรอกข้อมูล → คำนวณและตรวจคุณสมบัติ → ยืนยันส่งคำขอ ไม่มีการอัปโหลดไฟล์
เจ้าหน้าที่ตรวจคำขอ ส่งกลับแก้ไข ส่งต่ออนุมัติ สร้างสัญญา จ่ายเงิน และรับชำระได้ ใช้สูตรลดต้นลดดอกเดิม
อายุสมาชิก 6 เดือนและภาระผ่อนรวม 40% ของรายได้เป็นเงื่อนไขตัวอย่างของโครงงาน ไม่ใช่นโยบายสหกรณ์จริง

## ตรวจสอบ
```sh
npm test
npm run build
```
Tests ใช้ไฟล์ชั่วคราว ไม่แก้ยอดในฐานข้อมูลจริง ตรวจ rollback สิทธิ์ สมาชิก หุ้น ฝาก/ถอน ดอกเบี้ย สินเชื่อ และ dashboard
ผลการตรวจตามบทบาทอยู่ docs/ROLE-AUDIT.md

## โค้ดสำรอง
archive/systems/ เก็บสำเนาโครงการเดิมสำหรับเทียบขั้นตอนและโครงหน้าจอ ไม่ได้ถูกรันจากเว็บรวม
archive/before-role-audit/ เก็บไฟล์ก่อนแก้การแบ่งบทบาทรอบนี้
Project/ เป็นไฟล์ที่มีอยู่ก่อน ไม่ใช่จุดเริ่มเว็บใหม่
โปรเจกต์ต้นฉบับภายนอก allproject ไม่ถูกแก้ไข

ไฟล์ข้อมูลเหมาะกับโครงงานบนเครื่องเดียวที่เขียน filesystem ได้ เก็บข้อมูลนอก public/ เสมอ

## รูปแบบเงินฝากและการส่งคำขอ
หน้าสมาชิกแสดงออมทรัพย์ทั่วไป ออมทรัพย์พิเศษ และฝากประจำเสมอ เปิดได้ประเภทละหนึ่งบัญชี เลือกบัญชีเพื่อดูยอด ประวัติ และทำรายการแยกกัน
DepositAccounts.jsx แสดงตัวเลือกรูปแบบ DepositRequest.jsx เป็นฟอร์มจำนวนเงิน ช่องทาง (โอน/เคาน์เตอร์) หมายเหตุ และขั้นตรวจทาน
ไม่มีช่องเลขอ้างอิงในฟอร์ม ตาราง หรือใบแจ้งยอด ระบบสร้าง requestId ภายในเพื่อป้องกันส่งซ้ำ ไม่ใช้ข้อมูลที่สมาชิกต้องจำหรือกรอกเอง
ใบแจ้งยอดกรองตามบัญชีที่เลือก และไม่อนุญาตให้ดึงบัญชีของสมาชิกคนอื่น
