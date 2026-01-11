import { Colors, EmbedBuilder, Message } from "discord.js";
import Handler from "./Handler.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getRandomInt } from "../utils/random.js";

// Lấy đường dẫn tuyệt đối tới dict.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dictPath = path.join(__dirname, "./dict.json");
const dictionary = JSON.parse(fs.readFileSync(dictPath, "utf8"));

export default class NoichuHandler extends Handler {
  guildId = "811939594882777128";
  channelId = "939233362160283708";

  channel = undefined;

  lastUserId = undefined;
  lastWord = "";

  usedWordlist = {
    _default: {
      this_is_default: {},
    },
  };

  /**
   *
   * @param {Message<true>} message
   * @returns
   */
  async onMessage(message) {
    if (message.channelId != this.channelId) return;
    if (!this.channel) {
      this.channel = await message.guild.channels.fetch(this.channelId);
    }

    if (message.content.startsWith(".")) return;

    if (message.author.id == this.lastUserId) {
      const embed = new EmbedBuilder()
        .setTitle(`Bạn đã chơi trước đó, vui lòng chờ lượt !`)
        .setColor(`#fff700`);
      await message.react("❌");

      const replyMessage = await message.reply({ embeds: [embed] });

      setTimeout(() => {
        replyMessage.deletable ? replyMessage.delete() : undefined;
      }, 5000);
      return;
    }

    let splited = this.lastWord.split(" ");
    let first = splited.at(0);
    let last = splited.at(splited.length - 1);

    let splitedContent = message.content.split(" ");
    let f1 = splitedContent.at(0);
    let l1 = splitedContent.at(splitedContent.length - 1);

    if (message.content == "lấy gợi ý") {
      splitedContent = this.lastWord.split(" ");
      f1 = splitedContent.at(0);
      l1 = splitedContent.at(splitedContent.length - 1);

      const wordlist = Object.keys(dictionary[l1]).filter((word) => {
        if (this.usedWordlist[word]) {
          return false;
        }
        return true;
      });

      if (wordlist.length == 0) {
        const embed = new EmbedBuilder()
          .setTitle(`Đã hết gợi ý, làm mới !`)
          .setColor(`#fff700`);
        const replyMessage = await message.reply({ embeds: [embed] });

        this.lastUserId = message.author.id;
        this.lastWord = message.content;

        if (!this.usedWordlist[l1]) {
          this.usedWordlist[l1] = {};
        }
        this.usedWordlist[l1][message.content] = {};

        setTimeout(() => {
          replyMessage.deletable ? replyMessage.delete() : undefined;
        }, 5000);
      }

      const random = wordlist.at(getRandomInt(0, wordlist.length - 1));

      const embed = new EmbedBuilder()
        .setTitle(`Gợi ý: ${random}`)
        .setColor(Colors.Green);
      await message.reply({ embeds: [embed] });
      return;
    }

    if (this.usedWordlist[f1]) {
      if (this.usedWordlist[f1][message.content]) {
        const embed = new EmbedBuilder()
          .setTitle(`"${message.content}" đã được sử dụng, vui lòng chọn từ khác !`)
          .setColor(`#fff700`);
        await message.react("❌");

        const replyMessage = await message.reply({ embeds: [embed] });

        setTimeout(() => {
          replyMessage.deletable ? replyMessage.delete() : undefined;
        }, 5000);
        return;
      }
    }

    if (this.lastWord && !message.content.startsWith(last)) {
      const embed = new EmbedBuilder()
        .setTitle(`Bạn phải bắt đầu bằng từ: ${last}`)
        .setColor(`#fff700`);
      await message.react("❌");

      const replyMessage = await message.reply({ embeds: [embed] });

      setTimeout(() => {
        replyMessage.deletable ? replyMessage.delete() : undefined;
      }, 5000);
      return;
    }

    let cacheObject = dictionary[f1];
    let trueCase = cacheObject[message.content];

    if (!cacheObject || !trueCase) {
      const embed = new EmbedBuilder()
        .setTitle(`Từ ${message.content} không có trong từ điển của bot`)
        .setColor(`#fff700`);
      await message.react("❌");

      const replyMessage = await message.reply({ embeds: [embed] });

      setTimeout(() => {
        replyMessage.deletable ? replyMessage.delete() : undefined;
      }, 5000);
      return;
    }

    await message.react("✅");
    this.lastUserId = message.author.id;
    this.lastWord = message.content;

    if (!this.usedWordlist[l1]) {
      this.usedWordlist[l1] = {};
    }
    this.usedWordlist[l1][message.content] = {};

    cacheObject = dictionary[l1];

    if (!cacheObject) {
      const embed = new EmbedBuilder()
        .setTitle(`Không còn từ khả dụng, làm mới !`)
        .setColor(Colors.Blurple);

      await message.reply({ embeds: [embed] });

      this.lastUserId = undefined;
      this.lastWord = undefined;

      this.usedWordlist = {};
      return;
    }
  }
}
