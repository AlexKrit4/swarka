export function getMobileAppVersionInfo() {
  return {
    versionCode: Number(process.env.MOBILE_APP_VERSION_CODE ?? 14),
    versionName: process.env.MOBILE_APP_VERSION_NAME ?? "1.3.2",
    downloadUrl:
      process.env.MOBILE_APP_DOWNLOAD_URL ??
      "https://api.swarka-i-voditel.ru/api/mobile/app-download",
  };
}
