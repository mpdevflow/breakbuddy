export const formatMinutes = (seconds: number) =>
  (seconds / 60).toFixed(1).replace(/\.0$/, '')
