import { Client, Events, GatewayIntentBits } from "discord.js";
import { commands } from "./deploy-commands.js";
import diceRouletteModalSubmit from "./commands/game/dice-roulette/modal-submit";
import { getIndexValue, updateIndex } from "./util/indexes.js";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
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

  // update FURAT
  if (lastMessageTimestamp !== 0) {
    const now = Date.now();
    const diffMinutes = (now - lastMessageTimestamp) / 1000 / 60;

    updateIndex("FURAT", 1000 / Math.log(diffMinutes + 2));
  }

  // update FUROM
  const furomIndex = (await getIndexValue("FUROM")) || 1000;
  updateIndex("FUROM", furomIndex * Math.exp(Math.random() * 0.02 - 0.01));

  lastMessageTimestamp = Date.now();
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
  const guild = newState.guild;
  if (!guild) return;
  const voiceChannels = guild.channels.cache.filter(
    (channel) => channel.isVoiceBased() && channel.members.size > 0,
  );
  let totalCount = 0;
  voiceChannels.forEach((channel) => {
    if (!channel.isVoiceBased()) return;
    totalCount += channel.members.size;
  });

  updateIndex("FURALL", 1000 * Math.sqrt(totalCount + 1));

  // update FUROM
  const furomIndex = (await getIndexValue("FUROM")) || 1000;
  updateIndex("FUROM", furomIndex * Math.exp(Math.random() * 0.02 - 0.01));
});

let lastMessageTimestamp = 0;

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // update FURAT
  if (lastMessageTimestamp !== 0) {
    const now = Date.now();
    const diffMinutes = (now - lastMessageTimestamp) / 1000 / 60;

    updateIndex("FURAT", 1000 / Math.log(diffMinutes + 2));
  }

  // update FUROM
  const furomIndex = (await getIndexValue("FUROM")) || 1000;
  updateIndex("FUROM", furomIndex * Math.exp(Math.random() * 0.02 - 0.01));

  lastMessageTimestamp = Date.now();
});

client.login(process.env.BOT_TOKEN!);
