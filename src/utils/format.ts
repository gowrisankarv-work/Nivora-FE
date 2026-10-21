import dayjs from "dayjs";

/** Indian digit grouping (e.g. ₹ 1,25,000.00), per LOC-5. */
export function formatInr(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "₹ 0.00";
  const n = Number(value);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n).toFixed(2);
  const [intPart, decPart] = abs.split(".");
  let result = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    result = `${grouped},${last3}`;
  }
  return `₹ ${sign}${result}.${decPart}`;
}

const MONTHS_TA = ["ஜன", "பிப்", "மார்", "ஏப்", "மே", "ஜூன்", "ஜூலை", "ஆக", "செப்", "அக்", "நவ", "டிச"];

/** DD MMM YYYY with localised month names, per LOC-5. */
export function formatDate(value: string | Date | null | undefined, lang: string): string {
  if (!value) return "";
  const d = dayjs(value);
  if (!d.isValid()) return "";
  if (lang === "ta") {
    return `${d.format("DD")} ${MONTHS_TA[d.month()]} ${d.format("YYYY")}`;
  }
  return d.format("DD MMM YYYY");
}
