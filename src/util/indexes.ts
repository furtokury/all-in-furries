import fs from "fs/promises";

type IndexData = {
  name: string;
  value: number;
  min: number;
  max: number;
  from: number;
  startedAt: string | null;
  endedAt: string | null;
};
type Index = { name: string; lastUpdatedAt: string; data: IndexData[] };

export const INDEXES: { name: string; description: string }[] = [
  {
    name: "FURALL",
    description:
      "통화하고 있는 인원 수에 투자합니다. (`1000 * √(통화인원수[명] + 1)`)",
  },
  {
    name: "FURAT",
    description:
      "서버에서 메시지가 오가는 속도에 투자합니다. (`1000 / log(간격[분] + 2)`)",
  },
  {
    name: "FUROM",
    description:
      "랜덤 이벤트에 투자합니다. (`𝛥 = 현재값 * exp(random[-0.01, 0.01])`, 1000에서 시작, 모든 이벤트에 적용)",
  },
];

const INDEX_FILE = "./data/indexes.json";

function initIndexData(name: string, initialValue: number): IndexData {
  return {
    name,
    value: initialValue,
    min: initialValue,
    max: initialValue,
    from: initialValue,
    startedAt: null,
    endedAt: null,
  };
}

function cutIndexData(indexData: IndexData, at: Date): IndexData {
  indexData.endedAt = at.toISOString();

  return {
    ...indexData,
    from: indexData.value,
    startedAt: at.toISOString(),
    endedAt: null,
  };
}

function updateIndexData(indexData: IndexData, newValue: number): IndexData {
  indexData.value = newValue;
  if (newValue < indexData.min) {
    indexData.min = newValue;
  }
  if (newValue > indexData.max) {
    indexData.max = newValue;
  }
  return indexData;
}

export async function updateIndex(name: string, newValue: number) {
  const indexes = await getIndexes();
  const index = indexes.find((idx) => idx.name === name);

  if (!index) {
    const newIndexData = initIndexData(name, newValue);
    indexes.push({
      name,
      lastUpdatedAt: new Date().toISOString(),
      data: [newIndexData],
    });
    return await saveIndexes(indexes);
  }

  let latestIndexData = index.data[index.data.length - 1];
  if (!latestIndexData) {
    const newIndexData = initIndexData(name, newValue);
    index.data.push(newIndexData);
    return await saveIndexes(indexes);
  }

  // -- max change a percent per hour
  const now = new Date();
  const hoursDiff =
    (now.getTime() - new Date(index.lastUpdatedAt).getTime()) /
    (1000 * 60 * 60);
  const maxChangePercent = hoursDiff * 0.01; // 1% per hour
  const maxChangeAmount = latestIndexData.value * maxChangePercent;

  if (Math.abs(newValue - latestIndexData.value) > maxChangeAmount) {
    if (newValue > latestIndexData.value) {
      newValue = latestIndexData.value + maxChangeAmount;
    } else {
      newValue = latestIndexData.value - maxChangeAmount;
    }
  }

  // -- cut data hourly
  const startedAt = latestIndexData.startedAt
    ? new Date(latestIndexData.startedAt)
    : null;

  while (
    startedAt &&
    (now.getFullYear() !== startedAt.getFullYear() ||
      now.getMonth() !== startedAt.getMonth() ||
      now.getDate() !== startedAt.getDate() ||
      now.getHours() !== startedAt.getHours())
  ) {
    const anHourAfter = new Date(startedAt);
    anHourAfter.setHours(anHourAfter.getHours() + 1);

    const cutData = cutIndexData(latestIndexData, anHourAfter);
    index.data.push(cutData);
    latestIndexData = cutData;
    startedAt.setHours(startedAt.getHours() + 1);
  }

  // -- update latest data
  index.lastUpdatedAt = now.toISOString();
  updateIndexData(latestIndexData, newValue);
  await saveIndexes(indexes);
}

export async function getIndexValue(name: string): Promise<number | null> {
  return await getIndexes().then((indexes) => {
    const index = indexes.find((idx) => idx.name === name);
    if (!index) return null;
    const latestIndexData = index.data[index.data.length - 1];
    if (!latestIndexData) return null;
    return latestIndexData.value;
  });
}

async function ensureIndexes() {
  // check if the directory exists
  try {
    await fs.access("./data");
  } catch {
    await fs.mkdir("./data");
  }

  // check if the file exists
  try {
    await fs.access(INDEX_FILE);
  } catch {
    await fs.writeFile(INDEX_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

let indexesCache: Index[] = [];
export async function getIndexes(): Promise<Index[]> {
  if (indexesCache.length > 0) {
    return indexesCache;
  }

  await ensureIndexes();
  const data = await fs.readFile(INDEX_FILE, "utf-8").then((parseIndexes) => {
    return JSON.parse(parseIndexes) as Index[];
  });

  return data;
}

let saveIndexCooldown = 50;
let saveIndexCooldownCounter = 0;
export async function saveIndexes(indexes: Index[]) {
  indexesCache = indexes;

  if (saveIndexCooldownCounter < saveIndexCooldown) {
    saveIndexCooldownCounter++;
    return;
  }

  saveIndexCooldownCounter = 0;
  await ensureIndexes();
  return fs.writeFile(INDEX_FILE, JSON.stringify(indexes, null, 2), "utf-8");
}

const INDEX_BALANCE_FILE = "./data/index_balances.json";
type IndexBalance = {
  userId: string;
  balances: { name: string; count: number; boughtAt: number | null }[];
};

async function ensureIndexBalances() {
  // check if the directory exists
  try {
    await fs.access("./data");
  } catch {
    await fs.mkdir("./data");
  }

  // check if the file exists
  try {
    await fs.access(INDEX_BALANCE_FILE);
  } catch {
    await fs.writeFile(
      INDEX_BALANCE_FILE,
      JSON.stringify([], null, 2),
      "utf-8",
    );
  }
}

export async function getIndexBalances(): Promise<IndexBalance[]> {
  await ensureIndexBalances();
  return fs.readFile(INDEX_BALANCE_FILE, "utf-8").then((data) => {
    return JSON.parse(data) as IndexBalance[];
  });
}

export async function getIndexBalance(
  userId: string,
): Promise<{ name: string; count: number; boughtAt: number | null }[] | null> {
  const balances = await getIndexBalances();
  const userBalance = balances.find((b) => b.userId === userId);
  if (!userBalance) return null;
  return userBalance.balances;
}

export async function setIndexBalance(
  userId: string,
  indexName: string,
  amount: number,
  boughtAt: number | null,
) {
  const balances = await getIndexBalances();
  let userBalance = balances.find((b) => b.userId === userId)!;
  if (!userBalance) {
    userBalance = { userId, balances: [] };
    balances.push(userBalance);
  }

  let indexBalance = userBalance.balances.find((b) => b.name === indexName);
  if (!indexBalance) {
    indexBalance = { name: indexName, count: 0, boughtAt: null };
    userBalance.balances.push(indexBalance);
  }

  indexBalance.count = amount;
  indexBalance.boughtAt = boughtAt;

  await fs.writeFile(
    INDEX_BALANCE_FILE,
    JSON.stringify(balances, null, 2),
    "utf-8",
  );

  return await saveIndexBalance(balances);
}

async function saveIndexBalance(balances: IndexBalance[]) {
  await fs.writeFile(
    INDEX_BALANCE_FILE,
    JSON.stringify(balances, null, 2),
    "utf-8",
  );
}
