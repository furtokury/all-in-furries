import fs from "fs/promises";
import { MessageFlags, type Message, type TextChannel } from "discord.js";

let pinMessageContentCache:
  | {
      channel: string;
      message: string;
      every: number;
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
    every: number;
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
  every: number | undefined,
) {
  const pinMessageContents = await loadPinMessageContents();
  const pinMessageContent: any = pinMessageContents.find(
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
    pinMessageContents.push({
      channel: channelId,
      message: messageContent,
      every: pinMessageContent ? pinMessageContent.every : every || 1,
    });
  }

  await savePinnedMessages(pinMessageContents);
}

export async function loadPinMessageContents(): Promise<
  {
    channel: string;
    message: string;
    every: number;
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

const pinnedMessageInfo: Record<string, { message: Message; counter: number }> =
  {};

async function getPinMessageContentFrequency(
  channelId: string,
): Promise<number> {
  const pinnedMessage = (await loadPinMessageContents()).find(
    (pinned) => pinned.channel === channelId,
  );

  return pinnedMessage ? pinnedMessage.every : 1;
}

export async function handleNewMessage(message: Message) {
  const channelId = message.channel.id;
  const pinMessageContent = await getPinMessageContent(channelId);
  if (!pinMessageContent) {
    return;
  }

  const info = pinnedMessageInfo[channelId];
  if (info) {
    info.counter += 1;
    if (info.counter < (await getPinMessageContentFrequency(channelId))) {
      return;
    }
    info.counter = 0;
  } else {
    pinnedMessageInfo[channelId] = { message: null as any, counter: 0 };
  }

  const currentPinnedMessage = pinnedMessageInfo[channelId]!.message;
  if (currentPinnedMessage) {
    try {
      await currentPinnedMessage.delete();
    } catch (error) {}
  }

  const channel = message.channel as TextChannel;
  const pinnedMessage = await channel.send({
    content: pinMessageContent,
    flags: MessageFlags.SuppressNotifications,
  });
  pinnedMessageInfo[channelId]!.message = pinnedMessage;
}
