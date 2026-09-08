/** Today's date as an ISO `YYYY-MM-DD` string (local time). */
export const todayIso = () => new Date().toISOString().slice(0, 10);
