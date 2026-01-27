import { createCanvas } from "canvas";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import {
  BLACK,
  getGoBoardById,
  putStone,
  resetBoard,
  WHITE,
  type GoStone,
} from "../../util/go";

export const data = new SlashCommandBuilder()
  .setName("바둑판")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("보기")
      .addNumberOption((option) =>
        option
          .setName("번호")
          .setDescription("바둑판의 번호")
          .setRequired(true),
      )
      .setDescription("바둑판을 이미지로 봅니다."),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("두기")
      .addNumberOption((option) =>
        option
          .setName("번호")
          .setDescription("바둑판의 번호")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("색")
          .setDescription("바둑돌의 색 (흑, 백)")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("위치")
          .setDescription("바둑돌을 놓을 위치 (예: A1, b2, 3C, 4d)")
          .setRequired(true),
      )
      .setDescription("바둑판을 이미지로 봅니다."),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("초기화")
      .addNumberOption((option) =>
        option
          .setName("번호")
          .setDescription("바둑판의 번호")
          .setRequired(true),
      )
      .setDescription("바둑판을 이미지로 봅니다."),
  )
  .setDescription("바둑판을 그립니다.");

export async function execute(interaction: any) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "보기") {
    await executeView(interaction);
  } else if (subcommand === "두기") {
    await executePut(interaction);
  } else if (subcommand === "초기화") {
    await executeReset(interaction);
  }
}

async function executeView(interaction: any) {
  const id = interaction.options.getNumber("번호") ?? 0;

  const board = await getGoBoardById(id);
  createImage(board.stones);
  await interaction.reply({
    content: `바둑판 #${id}`,
    files: ["./data/go_board.jpeg"],
  });
}

async function executePut(interaction: any) {
  const id = interaction.options.getNumber("번호") ?? 0;
  const rawColor = interaction.options.getString("색");
  const position = interaction.options.getString("위치") ?? "A1";

  if (rawColor !== "흑" && rawColor !== "백") {
    await interaction.reply({
      content: "잘못된 색입니다. '흑' 또는 '백'을 입력해주세요.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const color = rawColor === "흑" ? BLACK : WHITE;

  const match = position
    .toUpperCase()
    .match(/^([A-S])([1-9]|1[0-9])$|^([1-9]|1[0-9])([A-S])$/);
  if (!match) {
    await interaction.reply({
      content: "잘못된 위치 형식입니다. 예: A1, b2, 3C, 4d",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const colStr = match[1] || match[4];
  const rowStr = match[2] || match[3];

  const x = COLUMN_LABELS.indexOf(colStr!);
  const y = 19 - parseInt(rowStr!);

  if (x < 0 || x >= 19 || y < 0 || y >= 19) {
    await interaction.reply({
      content: "위치가 바둑판 범위를 벗어났습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await putStone(x, y, color, id);
  const board = await getGoBoardById(id);
  createImage(board.stones);
  await interaction.reply({
    content: `바둑판 #${id}`,
    files: ["./data/go_board.jpeg"],
  });
}

async function executeReset(interaction: any) {
  const id = interaction.options.getNumber("번호") ?? 0;

  await resetBoard(id);
  await interaction.reply(`바둑판 #${id}이 초기화되었습니다.`);
}

const SIZE = 2048;
const PADDING = SIZE / 10;
const UNIT_SIZE = (SIZE - PADDING * 2) / 18;
const COLUMN_LABELS: string[] = "ABCDEFGHJKLMNOPQRST".split("");
const STAR_POINTS = [
  [3, 3],
  [3, 9],
  [3, 15],
  [9, 3],
  [9, 9],
  [9, 15],
  [15, 3],
  [15, 9],
  [15, 15],
];

function createImage(stones: GoStone[]) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  // Draw background
  ctx.fillStyle = "#ffce00";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Draw grid
  ctx.strokeStyle = "#2c2c2c";
  ctx.lineWidth = 2;
  for (let i = 0; i < 19; i++) {
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(PADDING + i * UNIT_SIZE, PADDING);
    ctx.lineTo(PADDING + i * UNIT_SIZE, SIZE - PADDING);
    ctx.stroke();
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING + i * UNIT_SIZE);
    ctx.lineTo(SIZE - PADDING, PADDING + i * UNIT_SIZE);
    ctx.stroke();
  }

  // draw numbers
  ctx.fillStyle = "#2c2c2c";
  ctx.font = `${SIZE / 50}px Helvetica`;
  const GAP = UNIT_SIZE * 0.6;
  for (let i = 0; i < 19; i++) {
    ctx.textAlign = "center";

    ctx.textBaseline = "bottom";
    ctx.fillText(COLUMN_LABELS[i]!, PADDING + i * UNIT_SIZE, PADDING - GAP);

    ctx.textBaseline = "top";
    ctx.fillText(
      COLUMN_LABELS[i]!,
      PADDING + i * UNIT_SIZE,
      SIZE - PADDING + GAP,
    );

    ctx.textAlign = "right";
    ctx.fillText(`${19 - i}`, PADDING - GAP, PADDING + i * UNIT_SIZE);

    ctx.textAlign = "left";
    ctx.fillText(`${19 - i}`, SIZE - PADDING + GAP, PADDING + i * UNIT_SIZE);
  }

  // Draw star points
  ctx.fillStyle = "#2c2c2c";
  for (const [x, y] of STAR_POINTS) {
    ctx.beginPath();
    ctx.arc(
      PADDING + (x as number) * UNIT_SIZE,
      PADDING + (y as number) * UNIT_SIZE,
      UNIT_SIZE / 10,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const radius = UNIT_SIZE * 0.45;
  stones.sort((a, b) => a.index - b.index);
  for (let i = 0; i < stones.length; i++) {
    const stone = stones[i]!;
    const x = stone.x;
    const y = stone.y;

    const centerX = PADDING + x * UNIT_SIZE;
    const centerY = PADDING + y * UNIT_SIZE;

    ctx.fillStyle = stone.color === BLACK ? "#000000" : "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = UNIT_SIZE / 50;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw index number
    ctx.fillStyle = stone.color === BLACK ? "#ffffff" : "#000000";
    ctx.font = `${UNIT_SIZE / 2}px Helvetica`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${stone.index}`, centerX, centerY);
  }

  // Save to file
  const buffer = canvas.toBuffer("image/jpeg");
  fs.writeFileSync("./data/go_board.jpeg", buffer);
}
