/**
 * Timezone utility module for India Standard Time (Asia/Kolkata, IST, UTC+05:30)
 */

/**
 * Returns YYYY-MM-DD string for the current date (or provided Date) in Asia/Kolkata timezone.
 */
export const getIndiaDateString = (date: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
};

/**
 * Formats a Date into a human-readable IST string for server logging: YYYY-MM-DD HH:mm
 */
export const formatIndiaDateTimeString = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}`;
};

/**
 * Parses an attendance date string (YYYY-MM-DD) and a time string (e.g. "11:00 PM", "12:10 PM", "09:00 AM", "23:00")
 * entered in India Standard Time (IST) into a UTC Date object representing that exact moment.
 *
 * IST is UTC+05:30 (330 minutes ahead of UTC).
 */
export const parseIndiaDateTime = (dateString: string, timeString: string): Date => {
  if (!timeString) {
    throw new Error('Time string is required');
  }

  // If already an ISO string with 'T' (e.g. 2026-09-24T23:00:00.000Z)
  if (timeString.includes('T')) {
    return new Date(timeString);
  }

  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Handle AM/PM if present
  const isPM = /pm/i.test(timeString);
  const isAM = /am/i.test(timeString);
  const cleanTimeStr = timeString.replace(/(am|pm)/i, '').trim();
  const parts = cleanTimeStr.split(':').map((p) => parseInt(p, 10));
  let hours = parts[0] || 0;
  let minutes = parts[1] || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  // IST offset = +05:30 (+330 minutes = +19,800,000 milliseconds)
  // To get UTC time from IST local time: UTC = IST_timestamp - 330 mins
  const istLocalMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  const utcMs = istLocalMs - (5 * 60 + 30) * 60 * 1000;

  return new Date(utcMs);
};

/**
 * Normalizes start and end times for attendance sessions in IST.
 * If end time is earlier than or equal to start time in clock time
 * (e.g., 11:00 PM to 12:10 PM next day, or 11:00 PM to 12:10 AM next day),
 * end time automatically rolls over to the next day in IST.
 */
export const calculateSessionWindowIST = (
  attendanceDate: string,
  startTimeStr: string,
  endTimeStr: string
): { startDateTime: Date; endDateTime: Date } => {
  const startDateTime = parseIndiaDateTime(attendanceDate, startTimeStr);
  let endDateTime = parseIndiaDateTime(attendanceDate, endTimeStr);

  // If end time is earlier or equal to start time, end time is on the NEXT DAY.
  if (endDateTime.getTime() <= startDateTime.getTime()) {
    endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
  }

  return { startDateTime, endDateTime };
};
