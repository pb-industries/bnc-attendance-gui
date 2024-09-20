export async function calculateAttendance() {
  const res = await fetch(
    "https://mango-attendance.fly.dev/raid/calculate-attendance",
  );
  try {
    return await res.json();
  } catch {
    return null;
  }
}
