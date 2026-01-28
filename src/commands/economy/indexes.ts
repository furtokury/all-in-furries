import { MessageFlags, SlashCommandBuilder } from "discord.js";
import {
  INDEXES,
  getIndexBalance,
  getIndexValue,
  getIndexes,
  saveIndexes,
  setIndexBalance,
  updateIndexes,
} from "../../util/indexes";
import { formatMoney, getBalance, setBalance } from "../../util/money";

export const data = new SlashCommandBuilder()
  .setName("투자")
  .setDescription("투자 관련 명령어입니다.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("구매")
      .setDescription("투자 상품을 구매합니다.")
      .addStringOption((option) =>
        option
          .setName("상품명")
          .setDescription("구매할 투자 상품의 이름을 입력하세요.")
          .setRequired(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("수량")
          .setDescription("구매할 수량을 입력하세요.")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("판매")
      .setDescription("투자 상품을 판매합니다.")
      .addStringOption((option) =>
        option
          .setName("상품명")
          .setDescription("판매할 투자 상품의 이름을 입력하세요.")
          .setRequired(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("수량")
          .setDescription(
            "판매할 수량을 입력하세요. 입력하지 않으면 전량 판매됩니다.",
          )
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("현황").setDescription("현재 투자 현황을 확인합니다."),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("저장")
      .setDescription("현재 투자 현황을 파일로 저장합니다."),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("목록")
      .setDescription("구매 가능한 투자 상품 목록을 확인합니다."),
  );

export async function execute(interaction: any) {
  // defer
  await interaction.deferReply();

  // Update indexes before executing any subcommand
  await updateIndexes(interaction.guild);

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "구매":
      await executeBuy(interaction);
      break;
    case "판매":
      await executeSell(interaction);
      break;
    case "현황":
      await executeStatus(interaction);
      break;
    case "목록":
      await executeList(interaction);
      break;
    case "저장":
      await executeSave(interaction);
      break;
    default:
      await interaction.editReply("알 수 없는 명령어입니다.");
  }
}

async function executeBuy(interaction: any) {
  const userId = interaction.user.id;
  const productName = interaction.options.getString("상품명");
  const quantity = interaction.options.getInteger("수량");
  const balance = await getBalance(userId);

  const index = await getIndexValue(productName);

  if (index === null) {
    await interaction.editReply(
      `**${productName}**: 해당 투자 상품을 찾을 수 없습니다.`,
    );
    return;
  }

  const price = Math.round(index * quantity);
  if (price > balance) {
    await interaction.editReply(
      `잔액이 부족합니다. 현재 잔액: ${formatMoney(balance)}, 필요한 금액: ${formatMoney(price)}`,
    );
    return;
  }

  let indexBalanceData = await getIndexBalance(userId);
  if (!indexBalanceData) {
    await setIndexBalance(userId, productName, 0, null);
    indexBalanceData = await getIndexBalance(userId);
  }

  if (!indexBalanceData) {
    await interaction.editReply("투자 잔고 정보를 불러오는 데 실패했습니다.");
    return;
  }

  let indexBalance = indexBalanceData.find((b) => b.name === productName);
  if (!indexBalance) {
    await setIndexBalance(userId, productName, 0, null);
    indexBalanceData = await getIndexBalance(userId);
    indexBalance = indexBalanceData!.find((b) => b.name === productName)!;
  }

  const newCount = indexBalance.count + quantity;
  const boughtAt =
    indexBalance.boughtAt === null
      ? index
      : Math.round(
          (indexBalance.boughtAt * indexBalance.count + index * quantity) /
            newCount,
        );

  await setIndexBalance(userId, productName, newCount, boughtAt);
  await setBalance(userId, balance - price);

  await interaction.editReply(
    `**${productName}** ${quantity}주를 ${formatMoney(price)}에 구매했습니다.\n` +
      `현재 보유 주: ${newCount}주. ` +
      `평균 매수가: ${boughtAt.toFixed(2)}, ` +
      `남은 잔액: ${formatMoney(balance - price)}`,
  );
}

async function executeSell(interaction: any) {
  const userId = interaction.user.id;
  const productName = interaction.options.getString("상품명");
  let quantity = interaction.options.getInteger("수량");

  const index = await getIndexValue(productName);

  if (index === null) {
    await interaction.editReply({
      content: `**${productName}**: 해당 투자 상품을 찾을 수 없습니다.`,
    });
    return;
  }

  let indexBalanceData = await getIndexBalance(userId);
  if (!indexBalanceData) {
    await interaction.editReply({
      content: "현재 보유한 투자 상품이 없습니다.",
    });
    return;
  }

  const indexBalance = indexBalanceData.find((b) => b.name === productName);
  if (!indexBalance || indexBalance.count === 0) {
    await interaction.editReply({
      content: `**${productName}**: 보유한 주식이 없습니다.`,
    });
    return;
  }

  if (quantity === null) {
    quantity = indexBalance.count;
  }

  if (quantity > indexBalance.count) {
    await interaction.editReply({
      content: `보유한 주식 수보다 많은 수량을 판매할 수 없습니다. 현재 보유 주식: ${indexBalance.count}주.`,
    });
    return;
  }

  const price = Math.round(index * quantity);
  const newCount = indexBalance.count - quantity;

  const boughtAt = newCount === 0 ? null : indexBalance.boughtAt;

  await setIndexBalance(userId, productName, newCount, boughtAt);

  const balance = await getBalance(userId);
  await setBalance(userId, balance + price);

  await interaction.editReply(
    `**${productName}** ${quantity}주를 ${formatMoney(price)}에 판매했습니다.\n` +
      `현재 보유 주: ${newCount}주. ` +
      `남은 잔액: ${formatMoney(balance + price)}`,
  );
}

async function executeStatus(interaction: any) {
  const userId = interaction.user.id;
  const balances = await getIndexBalance(userId);

  if (!balances || balances.length === 0) {
    await interaction.editReply("현재 보유한 투자 상품이 없습니다.");
    return;
  }

  const descriptions = [];
  for (const balance of balances) {
    const value = await getIndexValue(balance.name);
    if (value !== null) {
      const totalValue = value * balance.count;

      let boughtAtInfo = "";
      if (balance.boughtAt) {
        const profitLoss =
          ((value - balance.boughtAt) / balance.boughtAt) * 100;
        const profitLossSign = profitLoss > 0 ? "+" : "";
        boughtAtInfo = `, 매수가: ${(balance.boughtAt * balance.count).toFixed(
          2,
        )} (${profitLossSign}${profitLoss.toFixed(2)}%)`;
      }

      descriptions.push(
        `**${balance.name}**: ${balance.count}주 (현재 가치: ${formatMoney(totalValue)}${boughtAtInfo})`,
      );
    } else {
      descriptions.push(
        `**${balance.name}**: ${balance.count}주 (현재 상장되지 않음)`,
      );
    }
  }

  await interaction.editReply(
    `현재 보유한 투자 상품 현황입니다:\n${descriptions.join("\n")}`,
  );
}

async function executeList(interaction: any) {
  const descriptions: string[] = [];

  const indexes = await getIndexes();
  for (const index of indexes) {
    const name = index.name;
    const value = await getIndexValue(name);
    const description =
      INDEXES.find((idx) => idx.name === name)?.description || "";

    if (!value) {
      continue;
    }

    descriptions.push(`**${name}**: ${formatMoney(value)}\n- ${description}`);
  }

  await interaction.editReply(
    `구매 가능한 투자 상품 목록입니다:\n${descriptions.join("\n")}`,
  );
}

async function executeSave(interaction: any) {
  await saveIndexes(await getIndexes(), true);
  await interaction.editReply("현재 투자 현황을 파일로 저장했습니다.");
}
