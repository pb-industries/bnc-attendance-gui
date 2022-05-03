export async function calculateAttendance() {
  const res = await fetch(
    "https://bnc-attendance.fly.dev/raid/calculate-attendance"
  );
  try {
    return await res.json();
  } catch {
    return null;
  }
}
