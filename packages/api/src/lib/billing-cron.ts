import { runDailyChargeIfDue } from "./billing.js";

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

function mskHourMinute(date = new Date()) {
  const msk = new Date(date.getTime() + MSK_OFFSET_MS);
  return { hour: msk.getUTCHours(), minute: msk.getUTCMinutes() };
}

export function startBillingCron() {
  const tick = async () => {
    try {
      const { hour, minute } = mskHourMinute();
      if (hour === 0 && minute >= 5 && minute < 6) {
        await runDailyChargeIfDue();
      }
    } catch (err) {
      console.error("[billing-cron]", err);
    }
  };

  void tick();
  setInterval(tick, CHECK_INTERVAL_MS);
}
