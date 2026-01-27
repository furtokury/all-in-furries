import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { setPinMessageContent } from "../../features/pin";

export const data = new SlashCommandBuilder()
  .setName("고정")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("고정")
      .setDescription("메시지를 고정합니다.")
      .addStringOption((option) =>
        option
          .setName("messageid")
          .setDescription("고정할 메시지의 ID")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("해제").setDescription("고정된 메시지를 해제합니다."),
  )
  .setDescription("메시지를 고정합니다.");

export async function execute(interaction: any) {
  if (interaction.options.getSubcommand() === "고정") {
    await executePin(interaction);
  } else if (interaction.options.getSubcommand() === "해제") {
    await executeUnpin(interaction);
  }
}

async function executeUnpin(interaction: any) {
  if (!interaction.channel || !interaction.channel.isTextBased()) {
    await interaction.reply({
      content: "이 명령어는 텍스트 채널에서만 사용할 수 있습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.channel as any;

  await setPinMessageContent(channel.id, "");
  await interaction.reply({
    content: "메시지 고정이 성공적으로 해제되었습니다.",
    flags: MessageFlags.Ephemeral,
  });
}

async function executePin(interaction: any) {
  const messageId = interaction.options.getString("messageid");

  if (!interaction.channel || !interaction.channel.isTextBased()) {
    await interaction.reply({
      content: "이 명령어는 텍스트 채널에서만 사용할 수 있습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.channel as any;

  const message = await channel.messages.fetch(messageId);

  if (!message) {
    await interaction.reply({
      content: "해당 ID의 메시지를 찾을 수 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await setPinMessageContent(interaction.channel.id, message.content);
  await interaction.reply({
    content: "메시지가 성공적으로 고정되었습니다.",
    flags: MessageFlags.Ephemeral,
  });
}
