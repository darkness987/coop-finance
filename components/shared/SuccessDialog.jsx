"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./SuccessDialog.module.css";

export default function SuccessDialog({ message, onDismiss }) {
  const dialog = useRef(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (message && !dialog.current.open) dialog.current.showModal();
    if (!message && dialog.current.open) dialog.current.close();
  }, [message]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onClose={onDismiss}
    >
      <div className={styles.check} aria-hidden="true">
        ✓
      </div>
      <h2 id={titleId}>ส่งหุ้นสำเร็จ</h2>
      <p id={messageId}>{message}</p>
      <button type="button" autoFocus onClick={() => dialog.current.close()}>
        ตกลง
      </button>
    </dialog>
  );
}
