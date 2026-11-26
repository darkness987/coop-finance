// ระบบ: หน้าหลักและภาพรวม | ไฟล์: HomeChart.jsx
"use client";
// ปรับกราฟหน้าหลักเดิมให้รับยอดจริงจาก API แทน mock-data
import { useState } from "react";
import styles from "./Home.module.css";
// ฟังก์ชัน HomeChart: ทำงานส่วน HomeChart ของระบบนี้
export default function HomeChart({ monthly }) {
  const [series, setSeries] = useState("shares");
  const values = monthly.map((m) => m[series]);
  const yMax = Math.max(1000, Math.ceil(Math.max(...values) / 3000) * 3000);
  const toY = (v) => 154 - (v / yMax) * 129;
  const points = values.map((value, i) => ({
    x: 55 + i * 89,
    y: toY(value),
    value,
  }));
  return (
    <section className={`${styles.card} ${styles.chart}`}>
      <div className={styles.cardTitle}>
        <div>
          <h2>ภาพรวมการส่งหุ้น</h2>
          <p>ยอดคงเหลือย้อนหลัง 6 เดือน</p>
        </div>
        <select
          aria-label="เลือกข้อมูลที่แสดงในกราฟ"
          value={series}
          onChange={(e) => setSeries(e.target.value)}
        >
          <option value="shares">ยอดหุ้น</option>
          <option value="deposits">ยอดเงินฝาก</option>
        </select>
      </div>
      <svg
        viewBox="0 0 520 205"
        role="img"
        aria-label={`กราฟ${series === "shares" ? "ยอดหุ้น" : "ยอดเงินฝาก"}ย้อนหลัง 6 เดือน`}
      >
        <defs>
          <linearGradient id="homeArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d6ce7" stopOpacity=".25" />
            <stop offset="100%" stopColor="#1d6ce7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => {
          const value = (yMax / 3) * i;
          return (
            <g key={i}>
              <text x="5" y={toY(value) + 4}>
                {(value / 1000).toFixed(0)}k
              </text>
              <line
                x1="48"
                y1={toY(value)}
                x2="500"
                y2={toY(value)}
                stroke="#edf1f7"
              />
            </g>
          );
        })}
        <path
          d={`M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} L 500 172 L 55 172 Z`}
          fill="url(#homeArea)"
        />
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#176de5"
          strokeWidth="2.5"
        />
        {points.map((p, i) => (
          <g key={monthly[i].period}>
            <circle
              cx={p.x}
              cy={p.y}
              r="3.8"
              fill="white"
              stroke="#176de5"
              strokeWidth="2"
            >
              <title>
                {monthly[i].period}: {p.value.toLocaleString("th-TH")} บาท
              </title>
            </circle>
            <text x={p.x} y="194" textAnchor="middle">
              {monthly[i].label}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}
