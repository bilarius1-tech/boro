function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function whatsappLink(number: string, text?: string) {
  const phone = digitsOnly(number);
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${phone}${q}`;
}

export function telLink(phone: string) {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export function telegramLink(handle: string) {
  const clean = handle.replace(/^@/, "");
  return `https://t.me/${clean}`;
}
