// Keep Arabic text and date conventions, but always display Western digits.
export function toWesternDigits(value: string): string {
  return value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
  });
}

export function formatDisplayNumber(value: number): string {
  return toWesternDigits(value.toLocaleString('ar', { numberingSystem: 'latn' }));
}

export function formatDisplayDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return toWesternDigits(date.toLocaleDateString('ar', { numberingSystem: 'latn' }));
}

export function formatDisplayDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return toWesternDigits(date.toLocaleString('ar', { numberingSystem: 'latn' }));
}
