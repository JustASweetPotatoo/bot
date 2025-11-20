import { Colors, EmbedBuilder, Message, TextChannel } from "discord.js";
import Handler from "./Handler.js";
import { calcLevel, getRandomInt } from "../utils/random.js";

class LevelHandler extends Handler {
  /**
   *
   * @param {Message<true>} message
   * @returns
   */
  onMessage = async (message) => {
    if (message.content.startsWith("c>")) return;
    if (message.guildId != "811939594882777128") return;

    const messageLength = message.content.length;
    const messageSplitLength = message.content.split(" ").length;

    const ratio_1 = messageLength > 100 ? 1.0 : messageLength / 100;
    const ratio_2 = messageSplitLength > 20 ? 1.0 : messageSplitLength / 20;

    const ratio = (ratio_1 + ratio_2) / 2;

    const xpPlus = Math.ceil(getRandomInt(25, 35) * (ratio < 0.5 ? 0.5 : ratio));

    let res = await this.client.userService.get(message.author.id);

    if (!res) {
      res = { id: message.author.id, xp: xpPlus, level: 0, message_count: 0 };
      await this.client.userService.insert(res);
      return;
    }

    res.xp += xpPlus;
    const currentLevel = res.level;
    res.level = calcLevel(res.xp);
    res.message_count += 1;

    // Kiểm tra lên level mới
    if (currentLevel !== 0 && currentLevel < res.level) {
      const channel = await message.guild.channels.fetch("938734812494176266");

      if (!(channel && channel instanceof TextChannel)) return;

      const checkpointList = [
        { roleId: "1178724878615056474", level: 80, from: 51 },
        { roleId: "1178699000795373690", level: 50, from: 31 },
        { roleId: "1178698944117747864", level: 30, from: 11 },
        { roleId: "1178698847766204528", level: 10, from: 0 },
      ];

      const achievedcheckpoint = checkpointList.find((checkpoint) => res.level >= checkpoint.level && currentLevel >= checkpoint.from);

      let newRoleToAdd;

      if (achievedcheckpoint) {
        const guildRoles = message.guild.roles;

        const oldRole = message.member.roles.cache.find((role) => (checkpointList.find((checkpoint) => checkpoint.roleId === role.id) ? role : undefined));

        if (oldRole) {
          await message.member.roles.remove(oldRole);
        }

        const newRole = guildRoles.cache.find((role) => role.id === achievedcheckpoint.roleId);

        if (newRole) {
          await message.member.roles.add(newRole);
          newRoleToAdd = newRole;
        }
      }

      const embed = new EmbedBuilder({
        title: `Bạn đã đạt level ${res.level}`,
        description: `${newRoleToAdd ? `\n*Bạn đã đạt được thành tựu:**${newRoleToAdd.name}***` : ""}`,
        color: Colors.Blurple,
      });
      await channel.send({ content: `<@${res.id}> Level up !`, embeds: [embed] });
    }

    await this.client.userService.insert(res);
  };
}

export default LevelHandler;
