import { MessageFlags, SlashCommandBuilder } from "discord.js";
import {
  getBalance,
  formatMoney,
  transferBalance,
  getLeaderboard,
} from "../../util/money";

export const data = new SlashCommandBuilder()
  .setName("돈")
  .setDescription("현재 자신의 돈을 확인합니다.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("순위")
      .setDescription("현재 소지금 순위를 확인합니다.")
      .addIntegerOption((option) =>
        option
          .setName("페이지")
          .setDescription("확인할 페이지 번호입니다. (기본값: 1)")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("확인")
      .setDescription("현재 소지금을 확인합니다.")
      .addUserOption((option) =>
        option
          .setName("유저")
          .setDescription("잔액을 확인할 유저입니다.")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("송금")
      .setDescription("다른 사용자에게 돈을 송금합니다.")
      .addUserOption((option) =>
        option
          .setName("대상")
          .setDescription("돈을 송금할 대상 사용자입니다.")
          .setRequired(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("금액")
          .setDescription("송금할 금액입니다.")
          .setRequired(true),
      ),
  );

export async function execute(interaction: any) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "순위") {
    await executeLeaderboard(interaction);
  } else if (subcommand === "송금") {
    await executeTransfer(interaction);
  } else {
    await executeCheck(interaction);
  }
}

async function executeLeaderboard(interaction: any) {
  const page = interaction.options.getInteger("페이지") || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const leaderboard = await getLeaderboard(limit, offset);

  if (leaderboard.length === 0) {
    await interaction.reply({
      content: "해당 페이지에 대한 순위 정보가 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let replyMessage = `# 소지금 순위\n> ${page} 페이지\n\n`;
  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i];
    if (!entry) continue;

    const user = await interaction.client.users.fetch(entry.id);
    const nickname =
      user?.displayName || user?.nickname || user?.username || "알 수 없음";
    replyMessage += `- **${offset + i + 1}위**. ${nickname}: ${formatMoney(entry.balance)}\n`;
  }

  await interaction.reply(replyMessage);
}

async function executeTransfer(interaction: any) {
  const senderId = interaction.user.id;
  const recipient = interaction.options.getUser("대상");
  const amount = interaction.options.getInteger("금액");

  if (recipient.id === senderId) {
    await interaction.reply({
      content: "자기 자신에게는 송금할 수 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (amount <= 0) {
    await interaction.reply({
      content: `송금할 금액은 ${formatMoney(0)}보다 커야 합니다.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const senderBalance = await getBalance(senderId);
  if (senderBalance < amount) {
    await interaction.reply({
      content: "잔액이 부족합니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await transferBalance(senderId, recipient.id, amount);

  await interaction.reply(
    `<@${recipient.id}>님에게 **${formatMoney(amount)}**를 송금했습니다.`,
  );
}

async function executeCheck(interaction: any) {
  const user = interaction.options.getUser("유저") || interaction.user;
  const userId = user.id;
  const balance = await getBalance(userId);
  const displayName =
    interaction.guild.members.cache.get(userId)?.displayName || user.username;
  await interaction.reply(
    `${displayName}님의 현재 잔액은 **${formatMoney(balance)}**입니다.`,
  );
}
