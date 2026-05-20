import { format, fromUnixTime } from 'date-fns'

export function todayDateKey() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function dateKeyFromTimestamp(unixSeconds) {
  return format(fromUnixTime(unixSeconds), 'yyyy-MM-dd')
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
