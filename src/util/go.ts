import fs from "fs/promises";

const GO_BOARD_FILE = "./data/go_board.json";

async function ensureGoBoardData() {
  // ensure directory
  await fs.mkdir("./data", { recursive: true });

  try {
    await fs.access(GO_BOARD_FILE);
  } catch {
    // file does not exist, create it
    await fs.writeFile(GO_BOARD_FILE, "[]", "utf-8");
  }
}

export const BLACK = 0;
export const WHITE = 1;
export type GoStone = {
  x: number;
  y: number;
  color: 0 | 1;
  index: number;
};
type GoBoardData = {
  id: number;
  stones: GoStone[];
  nextStoneNumber: number;
};

async function loadGoBoardData(): Promise<GoBoardData[]> {
  await ensureGoBoardData();
  const data = await fs.readFile(GO_BOARD_FILE, "utf-8");
  return JSON.parse(data) as GoBoardData[];
}

async function saveGoBoardData(data: GoBoardData[]) {
  await ensureGoBoardData();
  await fs.writeFile(GO_BOARD_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function getGoBoardById(id: number): Promise<GoBoardData> {
  const data = await loadGoBoardData();
  return data.find((board) => board.id === id) || createEmptyBoard(id);
}

function createEmptyBoard(id: number): GoBoardData {
  return {
    id,
    stones: [],
    nextStoneNumber: 1,
  };
}

export async function putStone(
  x: number,
  y: number,
  color: 0 | 1,
  boardId: number,
): Promise<GoStone> {
  const data = await loadGoBoardData();
  let board = data.find((b) => b.id === boardId);
  if (!board) {
    board = createEmptyBoard(boardId);
    data.push(board);
  }

  const newStone: GoStone = {
    x,
    y,
    color,
    index: board.nextStoneNumber,
  };
  board.stones.push(newStone);
  board.nextStoneNumber += 1;

  await saveGoBoardData(data);
  return newStone;
}

export async function resetBoard(boardId: number): Promise<void> {
  const data = await loadGoBoardData();
  const boardIndex = data.findIndex((b) => b.id === boardId);
  if (boardIndex !== -1) {
    data.splice(boardIndex, 1);
    await saveGoBoardData(data);
  }
}
