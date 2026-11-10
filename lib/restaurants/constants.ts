export type WeekHourDay = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

export const DEFAULT_WEEK_HOURS: WeekHourDay[] = [0, 1, 2, 3, 4, 5, 6].map(
  (dayOfWeek) =>
    dayOfWeek === 0
      ? { dayOfWeek, isClosed: true, openTime: null, closeTime: null }
      : { dayOfWeek, isClosed: false, openTime: "11:00", closeTime: "23:00" }
);
