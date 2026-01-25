import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { formatMoney, getBalance } from "../../util/money";

const IMAGE_URL =
  "https://github.com/furtokury/all-in-furries/blob/main/res/dice_roulette_discord.png?raw=true";

export const data = new SlashCommandBuilder()
  .setName("주사위룰렛")
  .setDescription("주사위 룰렛을 돌립니다.");

export async function execute(interaction: any) {
  const readyButton = new ButtonBuilder()
    .setCustomId("dice-roulette-ready")
    .setLabel("준비 완료!")
    .setStyle(ButtonStyle.Primary);
  const row = new ActionRowBuilder().addComponents(readyButton);

  const response = await interaction.reply({
    content:
      "주사위 룰렛을 돌리기 위해서 사진을 브라우저에 띄워놓고 준비해주세요!",
    files: [IMAGE_URL],
    components: [row],
    withResponse: true,
  });

  const collectorFilter = (i: any) =>
    i.customId === "dice-roulette-ready" && i.user.id === interaction.user.id;
  const collector = response.resource.message.createMessageComponentCollector({
    filter: collectorFilter,
    time: 60_000,
  });

  collector.on("collect", async (i: any) => {
    const modal = new ModalBuilder()
      .setCustomId("dice-roulette-modal")
      .setTitle("주사위 룰렛 베팅");

    const balance = await getBalance(interaction.user.id);

    const bettingsInput = new TextInputBuilder()
      .setCustomId("dice-roulette-bettings")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("D6 10\na1 5\n8g 20")
      .setRequired(true);

    const instructionLabel = new LabelBuilder()
      .setLabel(`띄워놓은 사진을 참고하여 베팅 내용을 입력해주세요.`)
      .setDescription(
        `한번에 여러 곳에 베팅할 수 있고, 각 베팅은 줄바꿈으로 구분합니다.\n` +
          `현재 소지금은 ${formatMoney(balance)}입니다.`,
      )
      .setTextInputComponent(bettingsInput);

    modal.addLabelComponents(instructionLabel);

    await i.showModal(modal);
  });
}
