const TUNIS = "Africa/Tunis";

export function staffClock(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: TUNIS,
    }).format(date)
  );
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: TUNIS,
  }).format(date);

  return { greeting, dateLabel };
}
