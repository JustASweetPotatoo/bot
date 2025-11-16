import { Colors, EmbedBuilder, Message, Role, TextChannel } from "discord.js";
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

    const xpPlus = getRandomInt(25, 35);

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

    if (!currentLevel == 0 && currentLevel < res.level) {
      const channel = await message.guild.channels.fetch("938734812494176266");

      if (!(channel && channel instanceof TextChannel)) return;

      const checkpointList = [
        { roleId: "1178724878615056474", level: 80 },
        { roleId: "1178699000795373690", level: 50 },
        { roleId: "1178698944117747864", level: 30 },
        { roleId: "1178698847766204528", level: 10 },
      ];

      const guildRoles = message.guild.roles;
      let isHaveAchieved = false;
      let achievedRole = undefined;

      checkpointList.forEach((checkpoint) => {
        if (res.level >= checkpoint.level) {
          const role = guildRoles.cache.get(checkpoint.roleId);
          if (!role) return;
          isHaveAchieved = true;
          achievedRole = role;
        }
      });

      if (achievedRole) {
        await message.member.roles.add(achievedRole);
      }

      const embed = new EmbedBuilder({
        title: `Bạn đã đạt level ${res.level}`,
        description: `${
          achievedRole ? `\n*Bạn đã đạt được thành tựu:**${achievedRole.name}***` : ""
        }`,
        color: Colors.Blurple,
      });
      await channel.send({ content: `<@${res.id}> Level up !`, embeds: [embed] });
    }

    await this.client.userService.insert(res);
  };
}

export default LevelHandler;
