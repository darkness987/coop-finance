# returns

| File                       | Exported functions / types   |
| -------------------------- | ---------------------------- |
| [benefits.ts](benefits.ts) | readBenefits, changeBenefits |
| [returns.ts](returns.ts)   | readReturns, changeReturns   |

[System code guide](../../CODE_GUIDE.md)

## กำหนดอัตราผลตอบแทน
- return-rates.ts: อ่าน/บันทึกอัตราปันผลหุ้น เฉลี่ยคืน และเงินฝากแยกประเภท
- หน้า /admin/returns ใช้ components/returns/ReturnRates.jsx ผ่าน /api/finance/return-rates
- เก็บใน database/data.ts → returns.settings (สร้างเมื่อกดบันทึกครั้งแรก)
- อัตราใน settings เป็นเปอร์เซ็นต์ตรง ๆ เช่น 4.25 หมายถึง 4.25% ส่วน allocations เดิมยังเก็บ 425
- ใช้กับประมาณการหุ้นและเงินฝาก และค่าเริ่มต้นของร่าง/จัดสรรใหม่ ไม่แก้ผลย้อนหลังที่อนุมัติแล้ว
- Admin และเจ้าหน้าที่บัญชีเท่านั้นที่เปลี่ยนอัตราได้ เงินฝากเว้นว่าง = null, ใส่ 0 = อัตรา 0%
