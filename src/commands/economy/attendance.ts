import { SlashCommandBuilder } from "discord.js";
import {
  getAttendance,
  setAttendance,
  getAttendanceLeaderboardByStreak,
  getAttendanceLeaderboardByMaxStreak,
} from "../../util/attendance";
import { formatMoney, getBalance, setBalance } from "../../util/money";
import { josa } from "es-hangul";

export const data = new SlashCommandBuilder()
  .setName("출석")
  .addSubcommand((subcommand) =>
    subcommand.setName("체크").setDescription("출석체크를 합니다."),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("정보").setDescription("출석 정보를 확인합니다."),
  )
  .addSubcommandGroup((group) =>
    group
      .setName("순위")
      .setDescription("출석 순위를 확인합니다.")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("출석일수")
          .addNumberOption((option) =>
            option
              .setName("페이지")
              .setDescription("순위 페이지 번호")
              .setRequired(false),
          )
          .setDescription("출석일수 순위를 확인합니다."),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("최고출석일수")
          .addNumberOption((option) =>
            option
              .setName("페이지")
              .setDescription("순위 페이지 번호")
              .setRequired(false),
          )
          .setDescription("최고출석일수 순위를 확인합니다."),
      ),
  )
  .setDescription("출석체크를 합니다.");

export async function execute(interaction: any) {
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  if (subcommandGroup === "순위") {
    if (subcommand === "출석일수") {
      await executeLeaderboardStreak(interaction);
    } else if (subcommand === "최고출석일수") {
      await executeLeaderboardMaxStreak(interaction);
    }
    return;
  }

  if (subcommand === "체크") {
    await executeCheck(interaction);
  } else if (subcommand === "정보") {
    await executeInfo(interaction);
  }
}

async function executeCheck(interaction: any) {
  const today = new Date();
  const userId = interaction.user.id;
  let attendanceInfo = await getAttendance(userId);

  if (!attendanceInfo) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    attendanceInfo = {
      lastDay: yesterday.toISOString().split("T")[0]!,
      streak: 0,
      maxStreak: 0,
    };
  }

  const lastDay = new Date(attendanceInfo.lastDay);
  const diffTime = today.getTime() - lastDay.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    await interaction.reply(
      "오늘 이미 출석체크를 하셨습니다. 출석체크는 09:00 KST를 기준으로 하루에 한 번만 가능합니다.",
    );
    return;
  } else if (diffDays === 1) {
    attendanceInfo.streak += 1;
  } else {
    attendanceInfo.streak = 1;
  }

  attendanceInfo.lastDay = today.toISOString().split("T")[0]!;
  if (attendanceInfo.streak > attendanceInfo.maxStreak) {
    attendanceInfo.maxStreak = attendanceInfo.streak;
  }

  await setAttendance(
    userId,
    attendanceInfo.lastDay,
    attendanceInfo.streak,
    attendanceInfo.maxStreak,
  );

  // -- money reward logic
  const rewardAmount = attendanceInfo.streak * 100;
  const balance = await getBalance(userId);
  const newBalance = balance + rewardAmount;
  await setBalance(userId, newBalance);

  await interaction.reply(
    `출석체크 완료! 현재 출석일수: ${attendanceInfo.streak}일, 최고 출석일수: ${attendanceInfo.maxStreak}일\n` +
      `보상으로 ${josa(`${rewardAmount}`, "을/를")} 받았습니다. 현재 잔액: ${formatMoney(newBalance)}`,
  );
}

async function executeInfo(interaction: any) {
  const userId = interaction.user.id;
  const attendanceInfo = await getAttendance(userId);

  if (!attendanceInfo) {
    await interaction.reply("출석 정보가 없습니다.");
    return;
  }

  await interaction.reply(
    `출석 정보:\n마지막 출석일: ${attendanceInfo.lastDay}\n현재 출석일수: ${attendanceInfo.streak}일\n최고 출석일수: ${attendanceInfo.maxStreak}일`,
  );
}

async function executeLeaderboardStreak(interaction: any) {
  const page = interaction.options.getNumber("페이지") || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const leaderboard = await getAttendanceLeaderboardByStreak(limit, offset);

  if (leaderboard.length === 0) {
    await interaction.reply("출석일수 순위가 없습니다.");
    return;
  }

  let replyMessage = `# 출석일수 순위\n> ${page} 페이지\n\n`;
  leaderboard.forEach((entry, index) => {
    const username =
      interaction.client.users.cache.get(entry.id)?.displayName ||
      interaction.client.users.cache.get(entry.id)?.username ||
      "알 수 없음";
    const status =
      entry.lastDay === new Date().toISOString().split("T")[0]!
        ? "🔥"
        : entry.lastDay ===
            new Date(new Date().setDate(new Date().getDate() - 1))
              .toISOString()
              .split("T")[0]!
          ? "👀"
          : "";
    replyMessage += `- ${offset + index + 1}. ${username} - ${entry.streak}일 ${status}\n`;
  });

  await interaction.reply(replyMessage);
}

async function executeLeaderboardMaxStreak(interaction: any) {
  const page = interaction.options.getNumber("페이지") || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const leaderboard = await getAttendanceLeaderboardByMaxStreak(limit, offset);

  if (leaderboard.length === 0) {
    await interaction.reply("최고출석일수 순위가 없습니다.");
    return;
  }

  let replyMessage = `# 최고출석일수 순위\n> ${page} 페이지\n\n`;
  leaderboard.forEach((entry, index) => {
    const username =
      interaction.client.users.cache.get(entry.id)?.displayName ||
      interaction.client.users.cache.get(entry.id)?.username ||
      "알 수 없음";
    const status =
      entry.lastDay === new Date().toISOString().split("T")[0]!
        ? "🔥"
        : entry.lastDay ===
            new Date(new Date().setDate(new Date().getDate() - 1))
              .toISOString()
              .split("T")[0]!
          ? "👀"
          : "";
    replyMessage += `- ${offset + index + 1}. ${username} - ${entry.maxStreak}일 ${status}\n`;
  });

  await interaction.reply(replyMessage);
}
