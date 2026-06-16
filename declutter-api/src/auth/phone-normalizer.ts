export function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return trimmed;

  const hasInternationalPrefix = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length === 13) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }

  if (!hasInternationalPrefix && digits.length === 10 && /^[789]\d{9}$/.test(digits)) {
    return `+234${digits}`;
  }

  if (hasInternationalPrefix && digits.length >= 7 && digits.length <= 15) {
    return `+${digits}`;
  }

  return trimmed;
}
