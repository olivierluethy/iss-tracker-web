/**
 * Subsolar point calculation — the (lat,lng) on Earth where the Sun is directly overhead.
 * Used to render the day/night terminator.
 *
 * Approximation accurate to ~0.1° — good enough for visualization.
 */
export function subsolarPoint(date: Date = new Date()): { lat: number; lng: number } {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * (Math.PI / 180);
  const epsilon = (23.439 - 0.0000004 * n) * (Math.PI / 180);

  const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda)) * (180 / Math.PI);
  const rightAscension =
    Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda)) * (180 / Math.PI);

  const gst = (18.697374558 + 24.06570982441908 * n) % 24;
  const gha = (gst * 15 - rightAscension + 360) % 360;
  let lng = -gha;
  if (lng < -180) lng += 360;
  if (lng > 180) lng -= 360;

  return { lat: declination, lng };
}
