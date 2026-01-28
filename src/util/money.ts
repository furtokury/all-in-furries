import path from "path";
import fs from "fs/promises";
import {
  getIndexBalances,
  getIndexes,
  getIndexValue,
  updateFUREY,
  updateIndex,
} from "./indexes";

export const CURRENCY_SYMBOL = "₣";
export const CURRENCY_NAME = "프랑";

const BALANCES_FILE = "./data/balances.json";

export function formatMoney(amount: number): string {
  return (
    Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    " " +
    CURRENCY_SYMBOL
  );
}

async function ensureDataFileExists() {
  const dataDir = path.dirname(BALANCES_FILE);
  await fs.mkdir(dataDir, { recursive: true });
  return fs.access(BALANCES_FILE).catch(() => {
    return fs.writeFile(BALANCES_FILE, JSON.stringify({}));
  });
}

export async function getBalance(id: string): Promise<number> {
  try {
    await ensureDataFileExists();
    const data = await fs.readFile(BALANCES_FILE, "utf-8");
    const balances = JSON.parse(data);
    return balances[`${id}`] || 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return 0;
    }
    throw error; // Rethrow other errors
  }
}

export async function setBalance(id: string, amount: number): Promise<void> {
  await ensureDataFileExists();
  const data = await fs.readFile(BALANCES_FILE, "utf-8");
  const balances = JSON.parse(data);
  balances[`${id}`] = amount;
  await fs.writeFile(BALANCES_FILE, JSON.stringify(balances, null, 2));

  updateFUREY();
}

export async function transferBalance(
  fromId: string,
  toId: string,
  amount: number,
): Promise<void> {
  const fromBalance = await getBalance(fromId);
  const toBalance = await getBalance(toId);

  if (fromBalance < amount) {
    throw new Error("Insufficient balance");
  }

  await setBalance(fromId, fromBalance - amount);
  await setBalance(toId, toBalance + amount);
}

export async function getLeaderboard(
  limit: number,
  offset: number = 0,
): Promise<Array<{ id: string; balance: number }>> {
  await ensureDataFileExists();
  const data = await fs.readFile(BALANCES_FILE, "utf-8");
  const balances = JSON.parse(data);

  const sortedBalances = Object.entries(balances)
    .map(([id, balance]) => ({ id, balance: balance as number }))
    .sort((a, b) => b.balance - a.balance);

  return sortedBalances.slice(offset, offset + limit);
}

export async function getTotalMoneyInCirculation(): Promise<number> {
  // balances
  await ensureDataFileExists();
  const data = await fs.readFile(BALANCES_FILE, "utf-8");
  const balances = JSON.parse(data);

  const balanceSum = Object.values(balances).reduce(
    (sum, balance) => (sum as number) + (balance as number),
    0,
  ) as number;

  // indexes
  const indexes = await getIndexes();
  const indexBalances = await getIndexBalances();

  let indexSum = 0;
  for (const indexBalance of indexBalances) {
    for (const balance of indexBalance.balances) {
      const index = indexes.find((idx) => idx.name === balance.name);
      if (index) {
        const indexValue = await getIndexValue(index.name);
        indexSum += indexValue ? balance.count * indexValue : 0;
      }
    }
  }

  return balanceSum + indexSum;
}
