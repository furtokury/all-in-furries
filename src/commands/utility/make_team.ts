import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("팀짜기")
  .setDescription("랜덤으로 팀을 짜줍니다.")
  .addStringOption((option) =>
    option
      .setName("인원")
      .setDescription(
        "팀을 짤 인원들의 멘션을 ,(쉼표)로 구분하여 입력해주세요.",
      )
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("팀수")
      .setDescription("몇 개의 팀으로 나눌까요?")
      .setRequired(false)
      .setMinValue(2)
      .setMaxValue(10),
  );

export async function execute(interaction: any) {
  const teamCount = interaction.options.getInteger("팀수") || 2;
  const membersInput = interaction.options.getString("인원");

  if (!membersInput) {
    await interaction.reply("인원 목록을 입력해주세요.");
    return;
  }

  const members = membersInput
    .split(",")
    .map((member: string) => member.trim())
    .filter((member: string) => member.length > 0);

  if (members.length < teamCount) {
    await interaction.reply(
      `팀 수가 인원 수보다 많을 수 없습니다. 인원 수: ${members.length}, 팀 수: ${teamCount}`,
    );
    return;
  }

  shuffleArray(members);

  const teams: string[][] = Array.from({ length: teamCount }, () => []);

  members.forEach((member: string, index: number) => {
    teams[index % teamCount]?.push(member);
  });

  let response = `총 ${members.length}명의 인원을 ${teamCount}개의 팀으로 나누었습니다:\n`;
  teams.forEach((team, index) => {
    response += `- **팀 ${index + 1}**: `;
    team.forEach((member, i) => {
      response += `${member}`;
      if (i < team.length - 1) response += `, `;
    });
    response += `\n`;
  });

  await interaction.reply(response);
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
