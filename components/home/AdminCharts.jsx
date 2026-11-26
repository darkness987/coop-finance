// ระบบ: หน้าหลักและภาพรวม | ไฟล์: AdminCharts.jsx
"use client";
import { useId } from "react";
import styles from "./AdminDashboard.module.css";
const colors = ["#6933e8", "#2684f5", "#b996f8", "#f1a43b"];
const short = (value) =>
  Intl.NumberFormat("th-TH", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
// ฟังก์ชัน TrendChart: ทำงานส่วน TrendChart ของระบบนี้
export function TrendChart({ months }) {
  const uid = useId().replace(/:/g, "");
  const top = Math.max(1, ...months.flatMap((m) => [m.deposits, m.loans]));
  const ceiling = Math.ceil(top / 4) * 4;
  const x = (i) => 48 + i * (484 / Math.max(1, months.length - 1));
  const y = (n) => 190 - (n / ceiling) * 155;
  const points = (key) =>
    months.map((m, i) => x(i) + "," + y(m[key])).join(" ");
  return (
    <svg
      className={styles.trend}
      viewBox="0 0 550 235"
      role="img"
      aria-label="กราฟยอดเงินฝากและเงินกู้คงเหลือรายเดือน"
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3685ff" stopOpacity=".28" />
          <stop offset="100%" stopColor="#3685ff" stopOpacity=".01" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line
            x1="48"
            x2="532"
            y1={y((ceiling * i) / 4)}
            y2={y((ceiling * i) / 4)}
            stroke="#e6edf8"
          />
          <text x="2" y={y((ceiling * i) / 4) + 4}>
            {short((ceiling * i) / 4)}
          </text>
        </g>
      ))}
      <polygon
        points={
          "48,190 " + points("deposits") + " " + x(months.length - 1) + ",190"
        }
        fill={"url(#" + uid + ")"}
      />
      {["deposits", "loans"].map((key, k) => (
        <g key={key}>
          <polyline
            points={points(key)}
            fill="none"
            stroke={k ? "#2684f5" : "#6933e8"}
            strokeWidth="3"
          />
          {months.map((m, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(m[key])}
              r="3.5"
              fill="white"
              stroke={k ? "#2684f5" : "#6933e8"}
              strokeWidth="2"
            >
              <title>
                {m.month}: {m[key].toLocaleString("th-TH")} บาท
              </title>
            </circle>
          ))}
        </g>
      ))}
      {months.map((m, i) => (
        <text key={m.month} x={x(i)} y="218" textAnchor="middle">
          {new Intl.DateTimeFormat("th-TH", { month: "short" }).format(
            new Date(2026, m.month - 1, 1),
          )}
        </text>
      ))}
    </svg>
  );
}
// ฟังก์ชัน Donut: ทำงานส่วน Donut ของระบบนี้
export function Donut({ items, center, caption, label, variant }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  let offset = 0;
  return (
    <div
      className={
        styles.donutLayout +
        (variant === "loan-types" ? " " + styles.loanTypeLayout : "")
      }
    >
      <div className={styles.donut}>
        <svg viewBox="0 0 160 160" role="img" aria-label={label}>
          <circle
            cx="80"
            cy="80"
            r="62"
            fill="none"
            stroke="#eef2fa"
            strokeWidth="25"
          />
          {items.map((item, i) => {
            const share = total ? (item.value / total) * 100 : 0;
            const start = offset;
            offset += share;
            return (
              <circle
                key={item.name}
                cx="80"
                cy="80"
                r="62"
                fill="none"
                pathLength="100"
                stroke={item.color || colors[i % colors.length]}
                strokeWidth="25"
                strokeDasharray={
                  (variant === "loan-types" && share > 0 && share < 100
                    ? Math.max(0, share - 0.5)
                    : share) +
                  " " +
                  (100 -
                    (variant === "loan-types" && share > 0 && share < 100
                      ? Math.max(0, share - 0.5)
                      : share))
                }
                strokeDashoffset={-start}
                transform="rotate(-90 80 80)"
              >
                <title>
                  <span>{item.name}</span>: {item.value.toLocaleString("th-TH")}
                </title>
              </circle>
            );
          })}
        </svg>
        <div>
          <strong>{center}</strong>
          <small>{caption}</small>
        </div>
      </div>
      <ul className={styles.legend}>
        {items.map((item, i) => (
          <li key={item.name}>
            <i
              style={{ background: item.color || colors[i % colors.length] }}
            />
            <div>
              <span>{item.name}</span>
              <b>
                {total ? ((item.value / total) * 100).toFixed(1) : "0"}%{" "}
                {variant !== "loan-types" && (
                  <small>{item.display || short(item.value)}</small>
                )}
              </b>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
