import { Colors, EmbedBuilder, embedLength, Message } from "discord.js";
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

  lastPlayedTimeInfo = {
    userId: undefined,
    lastWord: undefined,
    usedWordlist: [],
  };

  /**
   *
   * @param {Message<true>} message
   */
  async onMessage(message) {
    try {
      if (message.channelId != this.channelId || message.guildId != this.guildId) return;

      let state = true;
      let replyMessageContent = "";

      if (message.content.toLowerCase().startsWith("lấy mẹo")) {
        if (!this.lastPlayedTimeInfo.lastWord || !this.lastPlayedTimeInfo.userId) {
          state = false;
          replyMessageContent = "Game đã reset, bạn có thể bắt đầu lại bằng một từ mới";
        } else {
          const path = this.lastPlayedTimeInfo.lastWord.split(" ");
          const suggestWordlist = Object.keys(dictionary[path[path.length - 1]]).filter(
            (value) =>
              !this.lastPlayedTimeInfo.usedWordlist.find((value1) => value == value1)
          );

          if (suggestWordlist.length == 0) {
            const embed = new EmbedBuilder()
              .setTitle(`Đã hết gợi ý, làm mới !`)
              .setColor(`#fff700`);
            const replyMessage = await message.reply({ embeds: [embed] });

            setTimeout(() => {
              replyMessage.deletable ? replyMessage.delete() : undefined;
            }, 5000);

            this.lastPlayedTimeInfo = {
              ...this.lastPlayedTimeInfo,
              lastWord: undefined,
              userId: undefined,
            };

            return;
          }

          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(Colors.Green)
                .setTitle(
                  `Gợi ý: ${suggestWordlist[getRandomInt(0, suggestWordlist.length - 1)]}`
                ),
            ],
          });

          return;
        }
      }

      if (!this.lastPlayedTimeInfo.lastWord) {
        this.lastPlayedTimeInfo.userId = undefined;
      }

      if (message.author.bot) return;
      if (message.content.split(" ").length <= 1) return;
      if (message.content.startsWith(".")) return;

      if (state && message.author.id == this.lastPlayedTimeInfo.userId) {
        replyMessageContent = "Bạn đã chơi trước đó, vui lòng chờ lượt !";
        state = false;
      }

      const path = message.content.split(" ");

      if (state && this.lastPlayedTimeInfo.lastWord) {
        const lastWord_lastChar =
          this.lastPlayedTimeInfo.lastWord.split(" ")[
            this.lastPlayedTimeInfo.lastWord.split(" ").length - 1
          ];

        if (path.at(0) != lastWord_lastChar) {
          replyMessageContent = `Bạn phải bắt đầu bằng từ: ${lastWord_lastChar}`;
          state = false;
        }
      }

      if (
        state &&
        this.lastPlayedTimeInfo.usedWordlist.find((value) => message.content == value)
      ) {
        replyMessageContent = `"${message.content}" đã được sử dụng, vui lòng chọn từ khác !`;
        state = false;
      }

      try {
        if (state && !dictionary[path[0]][message.content]) {
          replyMessageContent = `Từ ${message.content} không có trong từ điển của bot`;
          state = false;
        }
      } catch (error) {
        replyMessageContent = `Từ **${message.content}** không có trong từ điển của bot`;
        state = false;
        this.client.logger.writeLog(error);
      }

      if (state) {
        message.react("✅");
        this.lastPlayedTimeInfo.userId = message.author.id;
        this.lastPlayedTimeInfo.lastWord = message.content;
        this.lastPlayedTimeInfo.usedWordlist.push(message.content);

        const remainList = Object.keys(dictionary[path[path.length - 1]]).filter(
          (value) =>
            !this.lastPlayedTimeInfo.usedWordlist.find((value1) => value == value1)
        );

        if (remainList.length == 0) {
          message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Không còn từ khả dụng, làm mới !`)
                .setColor(Colors.Blurple),
            ],
          });

          this.lastPlayedTimeInfo.lastWord = undefined;
          this.lastPlayedTimeInfo.userId = undefined;
          this.lastPlayedTimeInfo.usedWordlist = [];
        }
      } else {
        message.react("❌");
        message
          .reply({
            embeds: [
              new EmbedBuilder().setTitle(replyMessageContent).setColor(`#fff700`),
            ],
          })
          .then((replyMessage) =>
            setTimeout(() => {
              replyMessage.deletable ? replyMessage.delete() : undefined;
            }, 5000)
          );
        return;
      }
    } catch (error) {
      this.client.logger.writeLog(error);
    }
  }
}
