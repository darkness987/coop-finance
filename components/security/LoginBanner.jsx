import styles from "../../app/login/login.module.css";
// แบนเนอร์เดียวกันสำหรับเข้าสู่ระบบและหน้ากู้คืนบัญชี
export default function LoginBanner() {
  return (
    <section
      className={styles.banner}
      aria-label="สหกรณ์ออมทรัพย์ ร่วมใจพัฒนา จำกัด"
    >
      <div className={styles.brand}>
        <img
          className={styles.brandMark}
          src="/images/brand/coop-logo.png"
          alt="โลโก้สหกรณ์สินเชื่อ Coop Finance"
          width="100"
          height="100"
        />
      </div>
      <div className={styles.bannerCopy}>
        <h2>
          สหกรณ์ออมทรัพย์
          <br />
          ร่วมใจพัฒนา จำกัด
        </h2>
        <p>ระบบข้อมูลบัญชีและสินเชื่อสหกรณ์</p>
      </div>
    </section>
  );
}
