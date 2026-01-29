import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { formatMoney, getBalance, setBalance } from "../../util/money";

export const data = new SlashCommandBuilder()
  .setName("낚시")
  .addNumberOption((option) =>
    option
      .setName("시간")
      .setDescription(
        "대기 시간이 길수록 더 좋은 보상을 획득할 확률이 커집니다 (분, 기본값: 5분)",
      )
      .setRequired(false)
      .setMinValue(5)
      .setMaxValue(600),
  )
  .addNumberOption((option) =>
    option
      .setName("미끼")
      .setDescription("미끼 가격 (기본값: 10)")
      .setRequired(false)
      .setMinValue(100)
      .setMaxValue(10000),
  )
  .setDescription("낚시를 합니다.");

const currentlyFishing: Set<string> = new Set();

const messages = [
  {
    value: 0.0,
    message: "낚시대를 놓쳐버렸습니다...",
    multiplier: -0.001,
  },
  {
    value: 0.1,
    message: "아무것도 낚이지 않았습니다.",
    multiplier: 0,
  },
  {
    value: 0.3,
    message: "물고기가 낚였습니다!",
    multiplier: 0.002,
  },
  {
    value: 0.8,
    message: "아주 큰 물고기가 낚였습니다!!",
    multiplier: 0.003,
  },
];

export async function execute(interaction: any) {
  const time = interaction.options.getNumber("시간") || 5;
  const baitPrice = interaction.options.getNumber("미끼") || 10;

  const balance = await getBalance(interaction.user.id);
  if (balance < baitPrice) {
    await interaction.reply({
      content: `소지금이 부족합니다. (필요: ${formatMoney(baitPrice)}, 현재: ${formatMoney(balance)})`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (currentlyFishing.has(interaction.user.id)) {
    await interaction.reply({
      content: "이미 낚시를 하고 있습니다!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await setBalance(interaction.user.id, balance - baitPrice);

  await interaction.reply({
    content:
      `낚시를 시작합니다! 최대 대기 시간: ${time}분\n` +
      `낚시대에 반응이 오면 멘션으로 알려드립니다. ` +
      `메시지에 있는 버튼을 30초 안에 누르면 낚시에 성공합니다.`,
  });

  const button = new ButtonBuilder()
    .setCustomId(`fish_catch_${interaction.user.id}`)
    .setLabel("낚시대 감기")
    .setStyle(ButtonStyle.Primary);

  setTimeout(
    async () => notifyFishing(interaction, button),
    Math.floor(Math.random() * time * 60000),
  );

  currentlyFishing.add(interaction.user.id);
}

async function notifyFishing(interaction: any, button: ButtonBuilder) {
  await interaction.followUp({
    content: `<@${interaction.user.id}> 낚시대가 흔들립니다! 버튼을 눌러 낚시대를 감아보세요!`,
    components: [{ type: 1, components: [button] }],
  });

  const collector = interaction.channel.createMessageComponentCollector({
    componentType: 2,
    time: 30000,
  });

  collector.on("collect", async (i: any) => {
    if (
      i.customId === `fish_catch_${interaction.user.id}` &&
      i.user.id === interaction.user.id
    ) {
      const rand = Math.random();
      let result = messages[0]!;
      const time = interaction.options.getNumber("시간") || 5;
      const baitPrice = interaction.options.getNumber("미끼") || 10;

      for (const message of messages) {
        if (rand >= message.value) {
          result = message;
        }
      }

      const price = Math.floor(
        baitPrice *
          time *
          time *
          ((result.multiplier + 0.001) * (Math.random() - 0.5)),
      );

      if (price > 0) {
        const currentBalance = await getBalance(interaction.user.id);
        await setBalance(interaction.user.id, currentBalance + price);
      }

      await i.update({
        content:
          `${result.message} ` +
          (price > 0
            ? `축하합니다! ${formatMoney(price)}를 획득했습니다!`
            : price < 0
              ? `아쉽게도 ${formatMoney(-price)}를 잃었습니다...`
              : ""),
        components: [],
      });

      collector.stop();
      currentlyFishing.delete(interaction.user.id);
    }
  });

  collector.on("end", async (collected: any) => {
    if (collected.size === 0) {
      await interaction.followUp({
        content: "낚시에 실패했습니다. 다음에 다시 시도해보세요!",
      });
    }
  });
}
