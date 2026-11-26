// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: Rules.jsx
// ระบบหุ้น | แสดงมูลค่าหุ้นและเงื่อนไขการส่งหุ้น

import { money } from "../shared/demo";

// แสดงกฎหุ้นชุดปัจจุบันที่ API ส่งมา
// ฟังก์ชัน Rules: ทำงานส่วน Rules ของระบบนี้
export function Rules({ rules, member = false }) {
  return (
    <dl className="details">
      <div>
        <dt>มูลค่าหุ้นละ</dt>
        <dd>{money(rules.price)} บาท</dd>
      </div>
      <div>
        <dt>ส่งหุ้นขั้นต่ำต่อเดือน</dt>
        <dd>{money(rules.min)} บาท</dd>
      </div>
      <div>
        <dt>วิธีชำระ</dt>
        <dd>
          {member
            ? "เงินโอน (เงินสดติดต่อเจ้าหน้าที่สหกรณ์)"
            : "เงินสด / เงินโอน"}
        </dd>
      </div>
    </dl>
  );
}
