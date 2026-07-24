type SwarkaAdminBridge = {
  onLogout?: () => void;
  onSwitchAccount?: () => void;
  onSaved?: () => void;
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

export function switchAccount(): void {
  getBridge()?.onSwitchAccount?.();
}
