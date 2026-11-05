/**
 * WhatsApp sharing via a wa.me deep link (no WhatsApp API needed, SRS §5.3).
 */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
