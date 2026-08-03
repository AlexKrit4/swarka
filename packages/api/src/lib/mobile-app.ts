export function getMobileAppVersionInfo() {
  return {
    versionCode: Number(process.env.MOBILE_APP_VERSION_CODE ?? 10),
    versionName: process.env.MOBILE_APP_VERSION_NAME ?? "1.1.7",
    downloadUrl:
      process.env.MOBILE_APP_DOWNLOAD_URL ??
      "https://api.swarka-i-voditel.ru/api/mobile/app-download",
  };
}
