import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("주사위")
  .setDescription("주사위를 굴려서 결과를 확인합니다.")
  .addStringOption((option) =>
    option
      .setName("주사위")
      .setDescription("굴릴 주사위 형식 (예: 2d6)")
      .setRequired(false),
  );

export async function execute(interaction: any) {
  const input = interaction.options.getString("주사위") || "1d6";
  const dicePattern = /(\d*)d(\d+)/i;
  const match = input.match(dicePattern);

  if (!match) {
    await interaction.reply({
      content: "올바른 형식이 아닙니다. 예: 2d6",
      ephemeral: true,
    });
    return;
  }

  const numDice = parseInt(match[1]) || 1;
  const numSides = parseInt(match[2]);

  if (numDice <= 0 || numSides <= 0) {
    await interaction.reply({
      content: "주사위 수와 면 수는 양수여야 합니다.",
      ephemeral: true,
    });
    return;
  }

  let rolls = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(Math.floor(Math.random() * numSides) + 1);
  }

  const total = rolls.reduce((a, b) => a + b, 0);
  await interaction.reply(
    `주사위 결과: \`[${rolls.join(", ")}]\`, 총합: \`${total}\``,
  );
}
