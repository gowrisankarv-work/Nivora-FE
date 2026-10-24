import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault("Asia/Kolkata");

export const APP_TIMEZONE = "Asia/Kolkata";

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

/** DD MMM YYYY with localised month names, per LOC-5. Rendered strictly in IST (Asia/Kolkata). */
export function formatDate(value: string | Date | null | undefined, lang: string): string {
  if (!value) return "";
  const d = dayjs(value).tz(APP_TIMEZONE);
  if (!d.isValid()) return "";
  if (lang === "ta") {
    return `${d.format("DD")} ${MONTHS_TA[d.month()]} ${d.format("YYYY")}`;
  }
  return d.format("DD MMM YYYY");
}

/** DD MMM YYYY, hh:mm A with localised month names. Rendered strictly in IST (Asia/Kolkata). */
export function formatDateTime(value: string | Date | null | undefined, lang: string): string {
  if (!value) return "";
  const d = dayjs(value).tz(APP_TIMEZONE);
  if (!d.isValid()) return "";
  if (lang === "ta") {
    return `${d.format("DD")} ${MONTHS_TA[d.month()]} ${d.format("YYYY")}, ${d.format("hh:mm A")}`;
  }
  return d.format("DD MMM YYYY, hh:mm A");
}

/** Format time string or timestamp strictly in IST (Asia/Kolkata). */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.slice(0, 5);
  }
  const d = dayjs(value).tz(APP_TIMEZONE);
  return d.isValid() ? d.format("hh:mm A") : "";
}
