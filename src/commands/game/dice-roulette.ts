import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";
import { createComponentCollector } from "./dice-roulette/create-component-collector";

export const IMAGE_URL =
  "https://github.com/furtokury/all-in-furries/blob/main/res/dice_roulette_discord.jpg?raw=true";

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
  const message = response.resource.message;

  createComponentCollector(interaction, message);
}
