type SwarkaAdminBridge = {
  onLogout?: () => void;
  onSwitchAccount?: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
  onLoading?: (loading: boolean) => void;
  onPageScroll?: (scrollY: number) => void;
  onMenuOpen?: (open: boolean) => void;
  openDialer?: (phone: string) => void;
  openWhatsApp?: (phone: string, text?: string) => void;
  openExternalUrl?: (url: string) => void;
  clearLeadBadge?: () => void;
};

function getBridge(): SwarkaAdminBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { SwarkaAdmin?: SwarkaAdminBridge }).SwarkaAdmin;
}

export function isMobileApp(): boolean {
  return !!getBridge();
}

export function notifySaved(): void {
  getBridge()?.onSaved?.();
}

export function notifyError(message: string): void {
  getBridge()?.onError?.(message);
}

export function setMobileLoading(loading: boolean): void {
  getBridge()?.onLoading?.(loading);
}

export function openDialer(phone: string): void {
  const bridge = getBridge();
  if (bridge?.openDialer) {
    bridge.openDialer(phone);
    return;
  }
  window.location.href = `tel:${phone}`;
}

export function openWhatsApp(phone: string, text?: string): void {
  const bridge = getBridge();
  if (bridge?.openWhatsApp) {
    bridge.openWhatsApp(phone, text);
    return;
  }
  const digits = phone.replace(/\D/g, "");
  const url = text
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${digits}`;
  window.open(url, "_blank");
}

export function clearLeadBadge(): void {
  getBridge()?.clearLeadBadge?.();
}

export function switchAccount(): void {
  getBridge()?.onSwitchAccount?.();
}

export function reportMobilePageScroll(scrollY: number): void {
  getBridge()?.onPageScroll?.(Math.max(0, Math.round(scrollY)));
}

export function reportMobileMenuOpen(open: boolean): void {
  getBridge()?.onMenuOpen?.(open);
}

export function openExternalUrl(url: string): void {
  const bridge = getBridge();
  if (bridge?.openExternalUrl) {
    bridge.openExternalUrl(url);
    return;
  }
  window.location.href = url;
}
