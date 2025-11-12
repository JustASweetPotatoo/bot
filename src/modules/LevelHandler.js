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

      if (channel && channel instanceof TextChannel) {
        const embed = new EmbedBuilder({ description: `**Bạn đã đạt level ${res.level}**`, color: Colors.Blurple });
        channel.send({ content: `<@${res.id}> Level up !`, embeds: [embed] });
      }
    }

    await this.client.userService.insert(res);
  };
}

export default LevelHandler;
