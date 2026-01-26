import { MessageFlags, SlashCommandBuilder } from "discord.js";
import {
  CURRENCY_NAME,
  formatMoney,
  getBalance,
  setBalance,
} from "../../util/money";
import { josa } from "es-hangul";

let nextSessionId = 1;
const sessions: Record<
  number,
  {
    participants: { userId: string; score: number }[];
    multiplication: number;
    starterUserId: string;
  }
> = {};

export const data = new SlashCommandBuilder()
  .setName("정산")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("개시")
      .addNumberOption((input) =>
        input
          .setName("배수")
          .setDescription(
            `게임에서의 1점을 몇 ${josa(CURRENCY_NAME, "으로/로")} 계산할지 정합니다. (기본값: 1)`,
          )
          .setRequired(false),
      )
      .setDescription("정산을 개시합니다."),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("참여")
      .addNumberOption((input) =>
        input
          .setName("세션번호")
          .setDescription("참여할 정산 세션 번호를 입력하세요.")
          .setRequired(true),
      )
      .addNumberOption((input) =>
        input
          .setName("점수")
          .setDescription("게임에서 획득한 점수를 입력하세요.")
          .setRequired(true),
      )
      .setDescription("정산에 참여합니다."),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("종결")
      .addNumberOption((input) =>
        input
          .setName("세션번호")
          .setDescription("종결할 정산 세션 번호를 입력하세요.")
          .setRequired(true),
      )
      .setDescription("정산을 종결합니다."),
  )
  .setDescription("게임 점수를 토대로 정산을 진행합니다.");

export async function execute(interaction: any) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "개시") {
    await executeStart(interaction);
  } else if (subcommand === "참여") {
    await executeJoin(interaction);
  } else if (subcommand === "종결") {
    await executeEnd(interaction);
  }
}

async function executeStart(interaction: any) {
  const multiplication = interaction.options.getNumber("배수") || 1;
  const newSession = {
    participants: [],
    multiplication,
    starterUserId: interaction.user.id,
  };
  sessions[nextSessionId++] = newSession;

  await interaction.reply(
    `정산이 개시되었습니다. 세션 ID: ${nextSessionId - 1}`,
  );
}

async function executeJoin(interaction: any) {
  const userId = interaction.user.id;
  const sessionId = interaction.options.getNumber("세션번호");
  const score = interaction.options.getNumber("점수");

  const session = sessions[sessionId];
  if (!session) {
    await interaction.reply({
      content: "해당 세션은 만들어지지 않았거나 이미 종결되었습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  session.participants.push({ userId, score });

  const sessionInfo: string[] = [
    `## 현재 세션 참여자 목록 (${session.participants.length}명)`,
  ];
  session.participants.forEach((participant) => {
    const user = interaction.client.users.cache.get(participant.userId);
    const displayName = user.displayName || user.username || "알 수 없음";
    sessionInfo.push(`- ${displayName}: ${participant.score}점`);
  });

  await interaction.reply(
    `세션 ${sessionId}에 참여하였습니다. 점수: ${score}\n\n${sessionInfo.join("\n")}`,
  );
}

async function executeEnd(interaction: any) {
  const sessionId = interaction.options.getNumber("세션번호");
  const session = sessions[sessionId];
  if (!session) {
    await interaction.reply({
      content: "해당 세션은 만들어지지 않았거나 이미 종결되었습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.user.id !== session.starterUserId) {
    await interaction.reply({
      content: "세션을 개시한 사용자만 종결할 수 있습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const averageScore =
    session.participants.reduce((sum, p) => sum + p.score, 0) /
    session.participants.length;
  const deltas: Record<string, number> = {};

  for (let i = 0; i < session.participants.length; i++) {
    const participant = session.participants[i]!;
    const delta =
      Math.round((participant.score - averageScore) * session.multiplication) ||
      0;
    deltas[participant.userId] = delta;

    const balance = await getBalance(participant.userId);
    if (balance < -delta) {
      await interaction.reply({
        content: `<@${participant.userId}>님의 잔액이 부족하여 정산을 완료할 수 없습니다.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  const afterBalances: Record<string, number> = {};

  for (const userId in deltas) {
    const delta = deltas[userId]!;
    const balance = await getBalance(userId);
    await setBalance(userId, balance + delta);
    afterBalances[userId] = balance + delta;
  }

  delete sessions[sessionId];

  const resultLines: string[] = [`## 정산 결과 (세션 ID: ${sessionId})`];
  for (const userId in deltas) {
    const delta = deltas[userId]!;
    const sign = delta >= 0 ? "+" : "";
    const user = interaction.client.users.cache.get(userId);
    const displayName = user.displayName || user.username || "알 수 없음";
    resultLines.push(
      `- ${displayName}: ${sign}${formatMoney(delta)} → ${formatMoney(afterBalances[userId]!)}`,
    );
  }

  await interaction.reply(resultLines.join("\n"));
}
