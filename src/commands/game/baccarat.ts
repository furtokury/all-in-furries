import { SlashCommandBuilder } from "discord.js";
import { formatMoney, getBalance, setBalance } from "../../util/money";
import { sleep } from "bun";
import { josa } from "es-hangul";

export const data = new SlashCommandBuilder()
  .setName("바카라")
  .addNumberOption((option) =>
    option
      .setName("플레이어")
      .setDescription(
        `플레이어에게 베팅할 금액을 입력하세요. (최소: ${formatMoney(100)}, 최대 ${formatMoney(10000)})`,
      )
      .setRequired(false),
  )
  .addNumberOption((option) =>
    option
      .setName("뱅커")
      .setDescription(
        `뱅커에게 베팅할 금액을 입력하세요. (최소: ${formatMoney(100)}, 최대 ${formatMoney(10000)})`,
      )
      .setRequired(false),
  )
  .addNumberOption((option) =>
    option
      .setName("타이")
      .setDescription(
        `타이에 베팅할 금액을 입력하세요. (최소: ${formatMoney(100)}, 최대 ${formatMoney(10000)})`,
      )
      .setRequired(false),
  )
  .setDescription("바카라 게임을 시작합니다.");

export async function execute(interaction: any) {
  const playerBet = interaction.options.getNumber("플레이어") || 0;
  const bankerBet = interaction.options.getNumber("뱅커") || 0;
  const tieBet = interaction.options.getNumber("타이") || 0;

  if (
    playerBet < 0 ||
    bankerBet < 0 ||
    tieBet < 0 ||
    (playerBet > 0 && (playerBet < 100 || playerBet > 10000)) ||
    (bankerBet > 0 && (bankerBet < 100 || bankerBet > 10000)) ||
    (tieBet > 0 && (tieBet < 100 || tieBet > 10000))
  ) {
    return interaction.reply(
      `베팅 금액은 최소 ${formatMoney(100)}에서 최대 ${formatMoney(
        10000,
      )} 사이여야 합니다.`,
    );
  }

  if (playerBet === 0 && bankerBet === 0 && tieBet === 0) {
    return interaction.reply("적어도 한 곳에는 베팅을 해야 합니다.");
  }

  const balance = await getBalance(interaction.user.id);
  const totalBet = playerBet + bankerBet + tieBet;

  if (balance < totalBet) {
    return interaction.reply(
      `잔액이 부족합니다. 현재 잔액: ${formatMoney(
        balance,
      )}, 필요한 잔액: ${formatMoney(totalBet)}`,
    );
  }

  await setBalance(interaction.user.id, balance - totalBet);

  const contents = [
    "* 바카라 게임에 오신 것을 환영합니다!",
    "* 바카라 스코어보드는 [이 링크](https://me.shtelo.org/baccarat-trend)에서 사용할 수 있습니다.",
  ];

  const message = await interaction.reply(contents.join("\n"));
  await sleep(1000);

  const cards = [];
  for (let color of ["S", "H", "D", "C"]) {
    for (let number = 1; number <= 13; number++) {
      const letter =
        number === 1
          ? "A"
          : number === 11
            ? "J"
            : number === 12
              ? "Q"
              : number === 13
                ? "K"
                : number.toString();
      cards.push({
        color,
        number,
        value: Math.min(number, 10),
        face: `${color}${letter}`,
      });
    }
  }

  function drawCard(deck: any[]) {
    const index = Math.floor(Math.random() * deck.length);
    return deck.splice(index, 1)[0];
  }

  function calculateScore(hand: any[]) {
    const total = hand.reduce((sum, card) => sum + card.value, 0);
    return total % 10;
  }

  let deck = [...cards];
  const playerHand = [];
  const bankerHand = [];

  // Initial deal
  playerHand.push(drawCard(deck));
  contents.push(
    `* 플레이어에게 **${josa(playerHand[playerHand.length - 1].face, "이/가")}** 배분되었습니다. (합: **${calculateScore(playerHand)}**)`,
  );
  await message.edit(contents.join("\n"));
  await sleep(1000);

  bankerHand.push(drawCard(deck));
  contents.push(
    `* 뱅커에게 **${josa(bankerHand[bankerHand.length - 1].face, "이/가")}** 배분되었습니다. (합: **${calculateScore(bankerHand)}**)`,
  );
  await message.edit(contents.join("\n"));
  await sleep(1000);

  playerHand.push(drawCard(deck));
  contents.push(
    `* 플레이어에게 **${josa(playerHand[playerHand.length - 1].face, "이/가")}** 배분되었습니다. (합: **${calculateScore(playerHand)}**)`,
  );
  await message.edit(contents.join("\n"));
  await sleep(1000);

  bankerHand.push(drawCard(deck));
  contents.push(
    `* 뱅커에게 **${josa(bankerHand[bankerHand.length - 1].face, "이/가")}** 배분되었습니다. (합: **${calculateScore(bankerHand)}**)`,
  );
  await message.edit(contents.join("\n"));
  await sleep(1000);

  let playerScore = calculateScore(playerHand);
  let bankerScore = calculateScore(bankerHand);

  if (playerScore <= 5 && bankerScore < 8) {
    contents.push("* 플레이어가 세 번째 카드를 뽑습니다.");
    await message.edit(contents.join("\n"));
    await sleep(1000);

    playerHand.push(drawCard(deck));
    playerScore = calculateScore(playerHand);
    contents.push(
      `* 플레이어에게 **${josa(playerHand[playerHand.length - 1].face, "이/가")}** 배분되었습니다. (합: **${playerScore}**)`,
    );
    await message.edit(contents.join("\n"));
    await sleep(1000);

    if (
      bankerScore <= 2 ||
      (bankerScore === 3 && playerHand[2].value !== 8) ||
      (bankerScore === 4 && [2, 3, 4, 5, 6, 7].includes(playerHand[2].value)) ||
      (bankerScore === 5 && [4, 5, 6, 7].includes(playerHand[2].value)) ||
      (bankerScore === 6 && [6, 7].includes(playerHand[2].value))
    ) {
      contents.push("* 뱅커가 세 번째 카드를 뽑습니다.");
      await message.edit(contents.join("\n"));
      await sleep(1000);

      bankerHand.push(drawCard(deck));
      bankerScore = calculateScore(bankerHand);
      contents.push(
        `* 뱅커에게 **${josa(bankerHand[bankerHand.length - 1].face, "이/가")}** 배분되었습니다. (합: **${bankerScore}**)`,
      );
      await message.edit(contents.join("\n"));
      await sleep(1000);
    }
  } else if (bankerScore <= 2 && playerScore < 8) {
    contents.push("* 뱅커가 세 번째 카드를 뽑습니다.");
    await message.edit(contents.join("\n"));
    await sleep(1000);

    bankerHand.push(drawCard(deck));
    bankerScore = calculateScore(bankerHand);
    contents.push(
      `* 뱅커에게 **${josa(bankerHand[bankerHand.length - 1].face, "이/가")}** 배분되었습니다. (합: **${bankerScore}**)`,
    );
    await message.edit(contents.join("\n"));
    await sleep(1000);
  }

  const newBalance = await getBalance(interaction.user.id);

  contents.push(
    `* 최종 결과: 플레이어 **${playerScore}** - 뱅커 **${bankerScore}**`,
  );

  let result = "";
  if (playerScore > bankerScore) {
    result = "플레이어 승리";
    if (playerBet > 0) {
      contents.push(
        `* 플레이어에 베팅한 **${formatMoney(playerBet)}이 당첨**되었습니다!`,
      );
      await setBalance(interaction.user.id, newBalance + playerBet * 2);
    }
    if (bankerBet > 0) {
      contents.push(
        `* 뱅커에 베팅한 **${formatMoney(bankerBet)}이 손실**되었습니다.`,
      );
    }
    if (tieBet > 0) {
      contents.push(
        `* 타이에 베팅한 **${formatMoney(tieBet)}이 손실**되었습니다.`,
      );
    }
  } else if (bankerScore > playerScore) {
    result = "뱅커 승리";
    if (bankerBet > 0) {
      contents.push(
        `* 뱅커에 베팅한 **${formatMoney(bankerBet)}이 당첨**되었습니다!`,
      );
      await setBalance(interaction.user.id, newBalance + bankerBet * 1.95);
    }
    if (playerBet > 0) {
      contents.push(
        `* 플레이어에 베팅한 **${formatMoney(playerBet)}이 손실**되었습니다.`,
      );
    }
    if (tieBet > 0) {
      contents.push(
        `* 타이에 베팅한 **${formatMoney(tieBet)}이 손실**되었습니다.`,
      );
    }
  } else {
    result = "무승부";
    if (tieBet > 0) {
      contents.push(
        `* 타이에 베팅한 **${formatMoney(tieBet)}이 당첨**되었습니다!`,
      );
      await setBalance(interaction.user.id, newBalance + tieBet * 9);
    }
    if (playerBet > 0) {
      contents.push(
        `* 플레이어에 베팅한 **${formatMoney(playerBet)}이 반환**되었습니다.`,
      );
      await setBalance(interaction.user.id, newBalance + playerBet);
    }
    if (bankerBet > 0) {
      contents.push(
        `* 뱅커에 베팅한 **${formatMoney(bankerBet)}이 반환**되었습니다.`,
      );
      await setBalance(interaction.user.id, newBalance + bankerBet);
    }
  }

  contents.push(`* 최종 결과는: **${result}** 입니다!`);
  contents.push(
    `* 변동 금액: **${formatMoney((await getBalance(interaction.user.id)) - balance)}**`,
  );
  contents.push(`* 기존 잔액: ${formatMoney(balance)}`);
  contents.push(
    `* 현재 잔액: **${formatMoney(await getBalance(interaction.user.id))}**`,
  );
  await message.edit(contents.join("\n"));
}
