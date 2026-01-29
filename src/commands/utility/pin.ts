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
      )
      .addNumberOption((option) =>
        option
          .setName("every")
          .setDescription("몇 메시지마다 고정할지 설정합니다.")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("해제").setDescription("고정된 메시지를 해제합니다."),
  )
  .setDescription("메시지를 고정합니다.");

export async function execute(interaction: any) {
  if (!interaction.member.permissions.has("Administrator")) {
    await interaction.reply({
      content: "이 명령어를 사용할 권한이 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

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

  await setPinMessageContent(channel.id, "", undefined);
  await interaction.reply({
    content: "메시지 고정이 성공적으로 해제되었습니다.",
    flags: MessageFlags.Ephemeral,
  });
}

async function executePin(interaction: any) {
  const messageId = interaction.options.getString("messageid");
  const every = interaction.options.getNumber("every") || 1;

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

  await setPinMessageContent(interaction.channel.id, message.content, every);
  await interaction.reply({
    content: "메시지가 성공적으로 고정되었습니다.",
    flags: MessageFlags.Ephemeral,
  });
}
