import { Message, TextChannel } from "discord.js";
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

    let res = await this.client.databaseManager.db.get("SELECT * FROM users WHERE id = ?", [message.author.id], (err, row) => {
      if (err) console.log(err);
    });

    if (!res) {
      res = { id: message.author.id, xp: xpPlus, level: 0, message_count: 0 };

      await this.client.databaseManager.db.run("INSERT INTO users (id, xp, level, message_count) VALUES (?, ?, ?, ?)", [
        res.id,
        res.xp,
        res.level,
        res.message_count,
      ]);
      return;
    }

    res.xp += xpPlus;
    const currentLevel = res.level;
    res.level = calcLevel(res.xp);
    res.message_count += 1;

    if (!currentLevel == 0 && currentLevel < res.level) {
      const channel = await message.guild.channels.fetch("938734812494176266");
      console.log(`Level up detected: ${message.author.id}, level: ${res.level}`);

      if (channel && channel instanceof TextChannel) {
        channel.send(`<@${message.author.id}> reached level: ${res.level}`);
      }
    }

    await this.client.databaseManager.db.run("UPDATE users SET xp = ?, level = ?, message_count = ? WHERE id = ?", [
      res.xp,
      res.level,
      res.message_count,
      res.id,
    ]);
  };
}

export default LevelHandler;
