import path from "path";
import fs from "fs";
import {
  Collection,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputApplicationCommandData,
} from "discord.js";

type SlashCommand = ChatInputApplicationCommandData & {
  execute: (interaction: any) => Promise<void>;
  data: SlashCommandBuilder;
};

export const commands: Collection<string, SlashCommand> = new Collection();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.set(command.data.name, command);
      console.log(`[INFO] Loaded command: /${command.data.name}`);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
  }
}

const rest = new REST().setToken(process.env.BOT_TOKEN!);

(async () => {
  try {
    console.log("[INFO] Started refreshing application (/) commands.");

    const commandData = commands.map((command) => command.data.toJSON());

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), {
      body: commandData,
    });

    console.log("[INFO] Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
