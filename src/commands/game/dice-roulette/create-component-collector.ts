import {
  LabelBuilder,
  Message,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export function createComponentCollector(_interaction: any, message: Message) {
  const collector = message.createMessageComponentCollector({
    filter: (i: any) => i.customId === "dice-roulette-ready",
    time: 60_000,
  });

  collector.on("collect", async (i: any) => {
    const modal = new ModalBuilder()
      .setCustomId("dice-roulette-modal")
      .setTitle("주사위 룰렛 베팅");

    const bettingsInput = new TextInputBuilder()
      .setCustomId("dice-roulette-bettings")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("D6 10\na1 5\n8g 20")
      .setRequired(true);

    const instructionLabel = new LabelBuilder()
      .setLabel(`띄워놓은 사진을 참고하여 베팅 내용을 입력해주세요.`)
      .setDescription(
        `한번에 여러 곳에 베팅할 수 있고, 각 베팅은 줄바꿈으로 구분합니다.`,
      )
      .setTextInputComponent(bettingsInput);

    modal.addLabelComponents(instructionLabel);

    await i.showModal(modal);
  });

  collector.on("end", async (_collected: any) => {
    message.edit({
      components: [],
    });
  });
}
