// ระบบ: เครื่องมือและข้อมูลที่ใช้ร่วมกัน | ไฟล์: demo.jsx
"use client";
import { canAccess, isStaff } from "../../lib/auth/permissions";

// ข้อมูลกลางของหน้าเว็บ | โหลดข้อมูลตามฝั่งที่เปิดและโหลดใหม่หลังบันทึก

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export { memberId, money, periodLabel } from "../../lib/shared/shared";
const Context = createContext(null);

// ฟังก์ชัน DemoProvider: เลือกหน้าเข้าสู่ระบบหรือผู้ให้ข้อมูลกลาง
export function DemoProvider({ children }) {
  const path = usePathname();
  return ["/", "/login", "/register", "/recover"].includes(path) ? (
    children
  ) : (
    <DataProvider>{children}</DataProvider>
  );
}
// ฟังก์ชัน DataProvider: โหลดข้อมูลตามสิทธิ์และโหลดใหม่หลังบันทึก
function DataProvider({ children }) {
  const path = usePathname();
  const admin = path.startsWith("/admin/");
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const url = (resource, staffView = admin) =>
    "/api/" + resource + "?view=" + (staffView ? "admin" : "member");

  // ฟังก์ชัน refresh: อ่านข้อมูลล่าสุดมาแสดง
  async function refresh(signal) {
    const sessionResponse = await fetch("/api/session", {
      signal,
      cache: "no-store",
    });
    if (sessionResponse.status === 401) {
      window.location.href = "/login";
      throw new Error("กรุณาเข้าสู่ระบบ");
    }
    if (!sessionResponse.ok) throw new Error("โหลดบัญชีผู้ใช้ไม่สำเร็จ");
    const session = await sessionResponse.json();
    const staff = isStaff(session);
    const resources = staff
      ? ["members", "directory", "shares", "returns", "applications"].filter(
          (resource) =>
            canAccess(session, resource) &&
            (resource !== "directory" || !canAccess(session, "members")),
        )
      : ["members", "shares", "returns"];
    const result = await Promise.all(
      resources.map(async (resource) => {
        const response = await fetch(url(resource, staff), {
          signal,
          cache: "no-store",
        });
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("กรุณาเข้าสู่ระบบ");
        }
        if (!response.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        return [
          resource === "directory" ? "members" : resource,
          await response.json(),
        ];
      }),
    );
    if (!signal?.aborted)
      setSnapshot({
        admin,
        data: {
          members: [],
          shares: {
            activation: null,
            accounts: [],
            payments: [],
            changes: [],
            rules: { price: 100, min: 500 },
          },
          returns: [],
          applications: [],
          ...Object.fromEntries(result),
        },
        session,
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    refresh(controller.signal).catch((err) => {
      if (!controller.signal.aborted) setError(err.message);
    });
    return () => controller.abort();
  }, [admin]);

  // หลังแจ้งส่งหุ้นครั้งแรก โหลดสถานะเป็นระยะเพื่อปลดล็อกทันทีเมื่อเจ้าหน้าที่รับเงิน
  const waitingForInitialShare =
    snapshot?.data?.shares?.activation?.state === "pending";
  const watchShares = path === "/shares" || path === "/member/shares";
  useEffect(() => {
    if (!waitingForInitialShare && !watchShares) return;
    const controller = new AbortController();
    let loading = false;
    const reload = async () => {
      if (loading || document.visibilityState !== "visible") return;
      loading = true;
      try {
        await refresh(controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        loading = false;
      }
    };
    const timer = setInterval(reload, waitingForInitialShare ? 5000 : 15000);
    window.addEventListener("focus", reload);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, [waitingForInitialShare, watchShares, admin]);

  // ฟังก์ชัน mutate: ส่งคำสั่งบันทึกไป API แล้วโหลดข้อมูลล่าสุด
  async function mutate(resource, payload) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        url(resource, isStaff(snapshot?.session || {})),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        // เมื่อข้อมูลชนกับอีกหน้าจอ โหลดค่าล่าสุดก่อนแจ้งให้ผู้ใช้ตรวจอีกครั้ง
        if (response.status === 409) await refresh();
        throw new Error(result.error);
      }
      await refresh();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const data = snapshot?.admin === admin ? snapshot.data : null;
  return (
    <Context.Provider
      value={{
        data,
        mutate,
        busy,
        user: snapshot?.session,
        refresh: () => refresh(),
      }}
    >
      {error && (
        <div className="global-error" role="alert">
          {error}
        </div>
      )}
      {data ? (
        children
      ) : (
        <p className="empty" role="status">
          {error ? "รีโหลดหน้าเพื่อลองอีกครั้ง" : "กำลังโหลดข้อมูล…"}
        </p>
      )}
    </Context.Provider>
  );
}

export const useDemo = () => useContext(Context);
