// ============================================================
// mortgage.js — Ипотекийн (аннуитет) тооцоолол
//
// ТОМЬЁО:
//   • Аннуитет — сар бүр ИЖИЛ хэмжээгээр төлөх схем (Монголын банкуудын
//     орон сууцны зээлд хамгийн түгээмэл).
//   • Томьёо: M = P·r / (1 − (1+r)^−n)
//       P = зээлийн дүн (үнэ − урьдчилгаа)
//       r = сарын хүү = жилийн хүү / 100 / 12
//       n = нийт сар = жил × 12
//
// ⚠️ Энэ нь ЗӨВХӨН МЭДЭЭЛЛИЙН зорилготой тооцоолол. Банкны шимтгэл, даатгал,
//    нотариат, улсын бүртгэлийн хураамж ОРООГҮЙ. Эцсийн нөхцөлийг банкнаас
//    (зээлийн бодит өртөг — ЗБӨ) шалгана.
// ============================================================

/** Сар бүрийн аннуитет төлбөр */
export function monthlyPayment(principal, annualRatePercent, years) {
  const P = Number(principal) || 0;
  const n = Math.max(1, Math.round((Number(years) || 0) * 12));
  const r = (Number(annualRatePercent) || 0) / 100 / 12;

  if (P <= 0) return 0;
  if (r <= 0) return P / n; // 0% хүү (онолын тохиолдол)
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * Бүрэн тооцоолол.
 * @param {{price:number, downPercent?:number, downAmount?:number,
 *          annualRate?:number, years?:number}} input
 * @returns {{down:number, principal:number, monthly:number, months:number,
 *            totalPay:number, totalInterest:number, interestShare:number}}
 */
export function calcMortgage(input = {}) {
  const price = Math.max(0, Number(input.price) || 0);
  const years = Math.min(40, Math.max(1, Number(input.years) || 20));
  const annualRate = Math.max(0, Number(input.annualRate) || 0);

  // Урьдчилгаа: дүнгээр эсвэл хувиар өгч болно
  let down = Number(input.downAmount);
  if (!Number.isFinite(down) || down <= 0) {
    const pct = Math.min(100, Math.max(0, Number(input.downPercent) || 0));
    down = (price * pct) / 100;
  }
  down = Math.min(price, Math.round(down));

  const principal = Math.max(0, price - down);
  const months = Math.round(years * 12);
  const monthly = principal > 0 ? monthlyPayment(principal, annualRate, years) : 0;
  const totalPay = monthly * months;
  const totalInterest = Math.max(0, totalPay - principal);

  return {
    price,
    down,
    downPercent: price > 0 ? (down / price) * 100 : 0,
    principal,
    monthly,
    months,
    totalPay,
    totalInterest,
    interestShare: totalPay > 0 ? (totalInterest / totalPay) * 100 : 0,
  };
}

/**
 * Хүүгийн мэдрэмтгий байдал: өгөгдсөн хүүгээс ±2% (эсвэл тодорхой жагсаалт) үед
 * сарын төлбөр хэрхэн өөрчлөгдөх вэ.
 * @returns {Array<{rate:number, monthly:number, diff:number}>}
 */
export function rateScenarios(input = {}, rates = []) {
  const current = Number(input.annualRate) || 0;
  const list = rates.length ? rates : [current - 2, current, current + 2].filter((r) => r >= 0);
  const base = calcMortgage({ ...input, annualRate: current }).monthly;
  return list.map((rate) => {
    const m = calcMortgage({ ...input, annualRate: rate }).monthly;
    return { rate, monthly: m, diff: m - base };
  });
}
