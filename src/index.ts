import { Client, Events, GatewayIntentBits } from "discord.js";
import { commands } from "./deploy-commands.js";
import diceRouletteModalSubmit from "./commands/game/dice-roulette/modal-submit";
import { updateFURALL, updateFURAT, updateFUROM } from "./util/indexes.js";
import { handleNewMessage } from "./features/pin.js";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[INFO] Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === "dice-roulette-modal") {
      await diceRouletteModalSubmit(interaction);
    }
  }

  updateFURAT();
  updateFUROM();
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (newState.channel && newState.channelId !== oldState.channelId) {
    const displayName =
      newState.member?.displayName || newState.member?.user.username;
    try {
      await newState.channel?.send(
        `${displayName}님이 음성 채널에 입장하였습니다`,
      );
    } catch (error) {}
  }

  if (oldState.channel && oldState.channelId !== newState.channelId) {
    const displayName =
      oldState.member?.displayName || oldState.member?.user.username;
    try {
      await oldState.channel?.send(
        `${displayName}님이 음성 채널에서 퇴장하였습니다`,
      );
    } catch (error) {}
  }

  // get count of all members in the guild's voice channels
  updateFURALL(newState.guild);
  updateFUROM();
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  updateFURAT();

  await handleNewMessage(message);
});

client.login(process.env.BOT_TOKEN!);
