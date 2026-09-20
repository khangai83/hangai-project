// ============================================================
// exporters.js — Excel (CSV) болон PDF экспорт — НЭМЭЛТ САН ХЭРЭГЛЭХГҮЙ
//
//   • Excel → UTF-8 BOM-той CSV файл татна (Excel кирилл/монгол үсгийг зөв уншина)
//   • PDF   → хэвлэх цонх нээж browser-ийн «Save as PDF»-ийг ашиглана
//             (jspdf гэх мэт сан суулгах шаардлагагүй, фонт асуудалгүй)
// ============================================================

/** CSV-д зориулж утгыг хүрээлэх (таслал, хашилт, мөр таслалт агуулбал) */
function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV (Excel) файл татах.
 * @param {string} filename жишээ: 'taalagsan-zaruud-2026-09-19.csv'
 * @param {{label:string, value:(row:object)=>any}[]} columns
 * @param {object[]} rows
 */
export function downloadCsv(filename, columns, rows) {
  const head = columns.map((c) => csvCell(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(',')).join('\r\n');
  // \uFEFF = BOM → Excel файлыг UTF-8 гэж танина
  const csv = `\uFEFF${head}\r\n${body}`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return true;
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}

/**
 * PDF экспорт: хүснэгтийг шинэ цонхонд хэвлэж, browser-ийн
 * «Save as PDF / PDF болгон хадгалах»-аар татна.
 * @param {{title:string, subtitle?:string, columns:{label:string, value:Function}[], rows:object[]}} opts
 * @returns {boolean} цонх нээгдсэн эсэх (pop-up blocker байвал false)
 */
export function printTablePdf({ title, subtitle, columns, rows }) {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const body = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => `<td>${escapeHtml(typeof c.value === 'function' ? c.value(r) : '')}</td>`)
          .join('')}</tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="mn"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #111; margin: 0; padding: 14px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { font-size: 12px; color: #666; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 600; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .foot { margin-top: 10px; font-size: 10px; color: #888; }
</style></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${escapeHtml(subtitle || '')}</p>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  <p class="foot">ZAR.mn · ${escapeHtml(new Date().toLocaleString('mn-MN'))} · Нийт ${rows.length} мөр</p>
  <scr` + `ipt>window.onload=function(){setTimeout(function(){window.print();},350);};</scr` + `ipt>
</body></html>`;

  const w = window.open('', '_blank', 'width=1024,height=800');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
