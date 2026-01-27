import fs from "fs/promises";
import type { Message, TextChannel } from "discord.js";

let pinMessageContentCache:
  | {
      channel: string;
      message: string;
    }[]
  | null = null;

const PINNED_MESSAGES_FILE = "./data/pinned-messages.json";

async function ensurePinMessageContent() {
  // Ensure the data directory exists
  await fs.mkdir("./data", { recursive: true });

  try {
    await fs.access(PINNED_MESSAGES_FILE);
  } catch {
    await fs.writeFile(PINNED_MESSAGES_FILE, "[]", "utf-8");
  }
}

async function savePinnedMessages(
  pinMessageContents: {
    channel: string;
    message: string;
  }[],
) {
  pinMessageContentCache = pinMessageContents;

  await ensurePinMessageContent();
  await fs.writeFile(
    PINNED_MESSAGES_FILE,
    JSON.stringify(pinMessageContents, null, 2),
    "utf-8",
  );
}

export async function setPinMessageContent(
  channelId: string,
  messageContent: string,
) {
  const pinMessageContents = await loadPinMessageContents();
  const pinMessageContent = pinMessageContents.find(
    (pmc) => pmc.channel === channelId,
  );

  if (messageContent === "") {
    if (pinMessageContent) {
      const index = pinMessageContents.indexOf(pinMessageContent);
      pinMessageContents.splice(index, 1);
      await savePinnedMessages(pinMessageContents);
    }

    return;
  }

  if (pinMessageContent) {
    pinMessageContent.message = messageContent;
  } else {
    pinMessageContents.push({ channel: channelId, message: messageContent });
  }

  await savePinnedMessages(pinMessageContents);
}

export async function loadPinMessageContents(): Promise<
  {
    channel: string;
    message: string;
  }[]
> {
  if (pinMessageContentCache) {
    return pinMessageContentCache;
  }

  try {
    await ensurePinMessageContent();
    const data = await fs.readFile(PINNED_MESSAGES_FILE, "utf-8");
    const pinnedMessages = JSON.parse(data);
    pinMessageContentCache = pinnedMessages;
    return pinnedMessages;
  } catch (error) {}

  return [];
}

export async function getPinMessageContent(
  channelId: string,
): Promise<string | null> {
  const pinnedMessage = (await loadPinMessageContents()).find(
    (pinned) => pinned.channel === channelId,
  );

  return pinnedMessage ? pinnedMessage.message : null;
}

const pinnedMessageByChannel: Record<string, Message> = {};

export async function handleNewMessage(message: Message) {
  const channelId = message.channel.id;
  const pinMessageContent = await getPinMessageContent(channelId);
  if (!pinMessageContent) {
    return;
  }

  const currentPinnedMessage = pinnedMessageByChannel[channelId];
  if (currentPinnedMessage) {
    try {
      await currentPinnedMessage.delete();
    } catch (error) {}
  }

  const channel = message.channel as TextChannel;
  const pinnedMessage = await channel.send(pinMessageContent);
  pinnedMessageByChannel[channelId] = pinnedMessage;
}
