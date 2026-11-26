"use client";
// กำหนดเพดานแยกตามประเภท ใช้ร่วมกับหน้าคำนวณ ส่งคำขอ และอนุมัติ
export default function AssetLoanPolicy({ f }) {
  return (
    <section className="panel loan-asset-policy">
      <h2>เปอร์เซ็นต์วงเงินกู้แยกตามประเภทสินเชื่อ</h2>
      <p>
        คิดจากมูลค่าหุ้นและเงินฝาก
        หักเงินต้นคงค้างและวงเงินที่จองไว้รวมทุกสัญญาที่กู้ด้วยสินทรัพย์
      </p>
      <div className="loan-form-grid">
        {f.data.products.map((product) => (
          <form
            key={product.id + "-" + product.assetPercent}
            onSubmit={(e) => {
              e.preventDefault();
              f.act({
                action: "asset-policy",
                product: product.id,
                totalPercent: Number(
                  new FormData(e.currentTarget).get("percent"),
                ),
              });
            }}
          >
            <h3>{product.name}</h3>
            <label>
              วงเงินสูงสุด (% ของมูลค่าสินทรัพย์)
              <input
                aria-label={"เปอร์เซ็นต์วงเงิน " + product.name}
                name="percent"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                required
                defaultValue={product.assetPercent}
              />
            </label>
            <button className="primary" disabled={f.busy}>
              บันทึก{product.name}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
