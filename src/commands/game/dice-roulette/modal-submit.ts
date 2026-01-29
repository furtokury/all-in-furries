import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { formatMoney, getBalance, setBalance } from "../../../util/money";
import { createComponentCollector } from "./create-component-collector";
import { IMAGE_URL } from "../dice-roulette";

const ROULETTE_MAP: Record<string, { multiplication: number; dice: number[] }> =
  {
    a1: { multiplication: 2, dice: [5, 12, 10, 9, 4, 2] },
    b1: { multiplication: 4, dice: [6, 7, 11, 3, 8] },
    e1: { multiplication: 9, dice: [5] },
    f1: { multiplication: 4, dice: [5, 6] },
    g1: { multiplication: 7, dice: [6] },
    b2: { multiplication: 2, dice: [5, 6, 7, 12, 11] },
    d2: { multiplication: 3, dice: [5, 7, 12] },
    e2: { multiplication: 7, dice: [5, 12] },
    f2: { multiplication: 3, dice: [5, 6, 12, 11] },
    g2: { multiplication: 5, dice: [6, 11] },
    a3: { multiplication: 2, dice: [6, 7, 11, 3, 8] },
    b3: { multiplication: 4, dice: [7, 12, 11] },
    c3: { multiplication: 6, dice: [7] },
    d3: { multiplication: 5, dice: [7, 12] },
    e3: { multiplication: 36, dice: [12] },
    f3: { multiplication: 12, dice: [12, 11] },
    g3: { multiplication: 18, dice: [11] },
    b4: { multiplication: 2, dice: [7, 12, 11, 10, 3, 9] },
    c4: { multiplication: 4, dice: [7, 10] },
    d4: { multiplication: 3, dice: [7, 12, 10, 3] },
    e4: { multiplication: 12, dice: [12, 3] },
    f4: { multiplication: 4, dice: [12, 11, 3, 9] },
    g4: { multiplication: 6, dice: [3, 9] },
    a5: { multiplication: 2, dice: [5, 7, 11, 3, 9] },
    b5: { multiplication: 4, dice: [10, 3, 9] },
    c5: { multiplication: 12, dice: [10] },
    d5: { multiplication: 7, dice: [10, 3] },
    e5: { multiplication: 18, dice: [3] },
    f5: { multiplication: 6, dice: [3, 9] },
    g5: { multiplication: 9, dice: [9] },
    b6: { multiplication: 2, dice: [10, 3, 9, 4, 8, 2] },
    c6: { multiplication: 6, dice: [10, 4] },
    d6: { multiplication: 3, dice: [10, 3, 4, 8] },
    e6: { multiplication: 5, dice: [3, 8] },
    f6: { multiplication: 3, dice: [3, 9, 8, 2] },
    g6: { multiplication: 7, dice: [9, 2] },
    a7: { multiplication: 2, dice: [6, 12, 10, 4, 8, 2] },
    b7: { multiplication: 4, dice: [4, 8, 2] },
    c7: { multiplication: 12, dice: [4] },
    d7: { multiplication: 4, dice: [4, 8] },
    e7: { multiplication: 7, dice: [8] },
    f7: { multiplication: 6, dice: [8, 2] },
    g7: { multiplication: 36, dice: [2] },
    c8: { multiplication: 3, dice: [7, 10, 4] },
    d8: { multiplication: 1.5, dice: [5, 7, 12, 10, 3, 4, 8] },
    e8: { multiplication: 3, dice: [5, 12, 3, 8] },
    f8: { multiplication: 1.5, dice: [5, 6, 12, 11, 3, 9, 8, 2] },
    g8: { multiplication: 3, dice: [6, 11, 9, 2] },
  };

function parseBetting(
  betting: string,
): { position: string; amount: number } | null {
  const parts = betting.split(" ");
  if (parts.length !== 2) return null;

  const amount = parseFloat(parts[1]!);
  let position = parts[0]!.toLowerCase();
  if (position.match(/^[0-9][a-g]$/)) {
    position = position[1]! + position[0]!;
  }

  if (position.length != 2) return null;

  if (isNaN(amount) || amount <= 0) return null;

  return { position, amount };
}

export default async function (interaction: any): Promise<void> {
  const bettings = interaction.fields
    .getTextInputValue("dice-roulette-bettings")
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);

  const parsedBettings = bettings
    .map((betting: string) => parseBetting(betting))
    .filter(
      (betting: { position: string; amount: number } | null) =>
        betting !== null,
    ) as { position: string; amount: number }[];

  if (parsedBettings.length === 0) {
    await interaction.reply({
      content: "유효한 베팅이 없습니다. 다시 시도해주세요.",
    });
    return;
  }

  const balance = await getBalance(interaction.user.id);
  const totalBetAmount = parsedBettings.reduce(
    (sum, betting) => sum + betting.amount,
    0,
  );

  if (totalBetAmount > balance) {
    await interaction.reply({
      content: `베팅 금액의 총합이 소지금(${balance})을 초과합니다. 다시 시도해주세요.`,
    });
    return;
  }

  if (totalBetAmount < 500) {
    await interaction.reply({
      content: `베팅 금액의 총합은 최소 ${formatMoney(500)} 이상이어야 합니다. 다시 시도해주세요.`,
    });
    return;
  }

  if (totalBetAmount > 1_000_000_000) {
    await interaction.reply({
      content: `베팅 금액의 총합은 최대 ${formatMoney(1_000_000_000)}까지 가능합니다. 다시 시도해주세요.`,
    });
    return;
  }

  const dice = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];

  const messages = [];
  let win = 0;

  messages.push(`<@${interaction.user.id}> 님의 🎲 주사위 룰렛 결과입니다!\n`);

  messages.push(`## 📋 베팅 목록`);

  for (let i = 0; i < parsedBettings.length; i++) {
    const betting = parsedBettings[i]!;
    messages.push(
      `- 베팅 위치 "${betting.position.toUpperCase()}"에 ${formatMoney(betting.amount)} 베팅 ` +
        `(번호 \`${ROULETTE_MAP[betting.position]?.dice.join(", ")}\`)`,
    );
  }

  messages.push(`총 베팅 금액: ${formatMoney(totalBetAmount)}`);

  messages.push(
    `# 🎲 주사위 결과: ${dice[0]} + ${dice[1]} = __${dice[0]! + dice[1]!}__`,
  );

  const areas = Object.entries(ROULETTE_MAP)
    .filter(([_, info]) => info.dice.includes(dice[0]! + dice[1]!))
    .map(([position, _]) => position.toUpperCase())
    .join(", ");
  messages.push(`적중 구역: ${areas}`);

  for (let i = 0; i < parsedBettings.length; i++) {
    const betting = parsedBettings[i]!;
    const rouletteInfo = ROULETTE_MAP[betting.position];
    if (!rouletteInfo) {
      await interaction.reply({
        content: `유효하지 않은 베팅 위치 "${betting.position}"가 포함되어 있습니다. 다시 시도해주세요.`,
      });
      return;
    }

    const hit = rouletteInfo.dice.includes(dice[0]! + dice[1]!);
    if (hit) {
      const winAmount = Math.floor(
        betting.amount * rouletteInfo.multiplication,
      );
      messages.push(
        `- 베팅 위치 "${betting.position.toUpperCase()}"이(가) 적중했습니다! ✅ +${formatMoney(winAmount)}`,
      );
      win += winAmount;
    } else {
      messages.push(
        `- 베팅 위치 "${betting.position.toUpperCase()}"이(가) 적중하지 못했습니다. 🥺 -${formatMoney(betting.amount)}`,
      );
    }
  }

  const afterAmount = balance - totalBetAmount + win;
  messages.push(`### ✅ 최종 결과`);
  messages.push(`- 초기 소지금: ${formatMoney(balance)}`);
  messages.push(`- 베팅 금액: ${formatMoney(totalBetAmount)}`);
  messages.push(`- 획득 금액: ${formatMoney(win)}`);
  messages.push(`- 변동 금액: **${formatMoney(win - totalBetAmount)}**`);
  messages.push(`- 최종 소지금: ${formatMoney(afterAmount)}`);

  setBalance(interaction.user.id, afterAmount);

  const readyButton = new ButtonBuilder()
    .setCustomId("dice-roulette-ready")
    .setLabel("다시 한번 도전!")
    .setStyle(ButtonStyle.Primary);
  const row = new ActionRowBuilder().addComponents(readyButton);

  const response = await interaction.reply({
    content: messages.join("\n"),
    components: [row],
    files: [IMAGE_URL],
    withResponse: true,
  });
  const message = response.resource.message;

  createComponentCollector(interaction, message);
}
