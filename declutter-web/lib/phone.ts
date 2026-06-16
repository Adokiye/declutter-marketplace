export function normalizeNigerianPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length === 13) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }

  if (!hasPlus && digits.length === 10 && /^[789]\d{9}$/.test(digits)) {
    return `+234${digits}`;
  }

  if (hasPlus && digits.startsWith("234") && digits.length === 13) {
    return `+${digits}`;
  }

  return null;
}

/** `tel:` href for a Nigerian phone number (falls back to the raw value). */
export function telHref(phone?: string | null) {
  if (!phone) return "";
  const normalized = normalizeNigerianPhone(phone) ?? phone;
  return `tel:${normalized.replace(/\s+/g, "")}`;
}

/** `wa.me` (WhatsApp) deep link for a Nigerian phone number. */
export function whatsappHref(phone?: string | null, text?: string) {
  if (!phone) return "";
  const normalized = normalizeNigerianPhone(phone) ?? phone;
  const digits = normalized.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
