import fs from "fs/promises";

const ATTENDANCE_FILE = "./data/attendance.json";

async function ensureDataFileExists() {
  const dataDir = ATTENDANCE_FILE.substring(
    0,
    ATTENDANCE_FILE.lastIndexOf("/"),
  );
  await fs.mkdir(dataDir, { recursive: true });
  return fs.access(ATTENDANCE_FILE).catch(() => {
    return fs.writeFile(ATTENDANCE_FILE, JSON.stringify({}));
  });
}

export async function setAttendance(
  id: number,
  lastDay: string,
  streak: number,
  maxStreak: number,
): Promise<void> {
  await ensureDataFileExists();
  const data = await fs.readFile(ATTENDANCE_FILE, "utf-8");
  const attendance = JSON.parse(data);
  attendance[`${id}`] = { lastDay, streak, maxStreak };
  await fs.writeFile(ATTENDANCE_FILE, JSON.stringify(attendance, null, 2));
}

export async function getAttendance(
  id: number,
): Promise<{ lastDay: string; streak: number; maxStreak: number } | null> {
  try {
    await ensureDataFileExists();
    const data = await fs.readFile(ATTENDANCE_FILE, "utf-8");
    const attendance = JSON.parse(data);
    return attendance[`${id}`] || null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error; // Rethrow other errors
  }
}

export async function getAttendanceLeaderboardByStreak(
  limit: number,
  offset: number = 0,
): Promise<Array<{ id: string; streak: number; lastDay: string }>> {
  await ensureDataFileExists();
  const data = await fs.readFile(ATTENDANCE_FILE, "utf-8");
  const attendance = JSON.parse(data);

  const sortedAttendance = Object.entries(attendance)
    .map(([id, info]: [string, any]) => ({
      id,
      streak: info.streak,
      lastDay: info.lastDay,
    }))
    .sort((a, b) => b.streak - a.streak);

  return sortedAttendance.slice(offset, offset + limit);
}

export async function getAttendanceLeaderboardByMaxStreak(
  limit: number,
  offset: number = 0,
): Promise<Array<{ id: string; maxStreak: number; lastDay: string }>> {
  await ensureDataFileExists();
  const data = await fs.readFile(ATTENDANCE_FILE, "utf-8");
  const attendance = JSON.parse(data);

  const sortedAttendance = Object.entries(attendance)
    .map(([id, info]: [string, any]) => ({
      id,
      maxStreak: info.maxStreak,
      lastDay: info.lastDay,
    }))
    .sort((a, b) => b.maxStreak - a.maxStreak);

  return sortedAttendance.slice(offset, offset + limit);
}
