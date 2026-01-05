import {
  Collection,
  Colors,
  EmbedBuilder,
  GuildMessageManager,
  Message,
  TextChannel,
  VoiceChannel,
} from "discord.js";
import Handler from "./Handler.js";
import { calcLevel, getTotalXpForLevel } from "../utils/random.js";
import { sendTemporatyMessage } from "../utils/autoMessage.js";

export default class PrefixCommandHandler extends Handler {
  commands = {
    help: {
      name: "help",
      usage: "",
      function: this.getListCommands,
    },
    ping: {
      name: "ping",
      usage: "",
      function: this.ping,
    },
    rank: {
      name: "rank",
      usage: "",
      function: this.getRank,
    },
    messages: {
      name: "messages",
      usage: "",
      function: this.getNumberMessageSent,
    },
    top: {
      name: "top",
      usage: "",
      function: this.getTopLevel,
    },
    "xp-update": {
      name: "xp-update",
      usage: "<id> <type> <amount>",
      function: this.xpUpdate,
    },
    "db-print": {
      name: "db-print",
      usage: "",
      function: this.printDatabase,
    },
    "db-insert": {
      name: "db-insert",
      usage: "",
      function: this.insertDatabase,
    },
    purge: {
      name: "purge",
      usage: "",
      function: this.purge,
    },
  };

  tutien = {
    ngungKhi: "Ngưng Khí",
    trucco: "Trúc Cơ",
    ketdan: "Kết Đan",
    nguyenanh: "Nguyên Anh",
    thiennhan: {
      name: "Thiên Nhân",
      child: {
        soky: "Sơ Kỳ",
        trungky: "Trung Kỳ",
        hauky: "Hậu Kỳ",
      },
    },
    banthan: "Bán Thần",
    thienton: {
      name: "Thiên Tôn",
      child: {
        soky: "Sơ Kỳ",
        trungky: "Trung Kỳ",
        hauky: "Hậu Kỳ",
      },
    },
    thienco: {
      name: "Thiên Cổ",
      child: {
        soky: "Sơ Kỳ",
        trungky: "Trung Kỳ",
        hauky: "Hậu Kỳ",
      },
    },
    chuate: "Chúa Tể",
    vinhhangcanh: "Lọ Đế Chí Tôn",
  };

  prefix = "c>";

  constructor(options) {
    super(options);
  }

  /**
   *
   * @param {Message<true>} message
   * @param {Array<string>} args
   */
  async purge(message, args) {
    const channel = message.channel;

    if (!(channel instanceof TextChannel || channel instanceof VoiceChannel)) return;

    let amount = 3;
    if (args[1]) {
      amount = parseInt(args[1]);
    }

    let initCollection = await channel.messages.fetch({ before: message.id, limit: 100 });
    let firstMessage = initCollection.first();

    if (!firstMessage) {
      await sendTemporatyMessage(message, { content: "No message to delete !" }, 5000);
      return;
    }

    let messageChannelManager = channel.messages;
    let messageCount = 1;

    const bulkDeletableMessageChunks = [];
    const oldMessageChunks = [];

    let oldChunk1 = new Collection();
    let oldChunk2 = new Collection();

    firstMessage.bulkDeletable
      ? oldChunk1.set(firstMessage.id, firstMessage)
      : oldChunk2.set(firstMessage.id, firstMessage);

    do {
      const fetchedMessageCollection = await messageChannelManager.fetch({
        limit: amount >= 100 ? 100 : amount - 1,
        before: firstMessage.id,
      });

      fetchedMessageCollection.forEach((message) => {
        if (message.bulkDeletable) {
          if (oldChunk1.size == 100) {
            bulkDeletableMessageChunks.push(oldChunk1);
            oldChunk1.clear();
          }

          oldChunk1.set(message.id, message);
        } else {
          if (oldChunk2.size == 100) {
            oldMessageChunks.push(oldChunk2);
            oldChunk2.clear();
          }

          oldChunk2.set(message.id, message);
        }
      });

      if (fetchedMessageCollection.size < 100) {
        bulkDeletableMessageChunks.push(oldChunk1);
        oldMessageChunks.push(oldChunk2);
        messageCount += fetchedMessageCollection.size;
        break;
      }

      messageCount += fetchedMessageCollection.size;
      firstMessage = fetchedMessageCollection.last();

      amount -= 100;
    } while (amount > 0);

    for (const chunk of bulkDeletableMessageChunks) {
      await channel.bulkDelete(chunk);
    }

    for (const chunk of oldMessageChunks) {
      chunk.forEach((mesage) => channel.messages.delete(mesage));
    }

    sendTemporatyMessage(message, { content: `Deleted ${messageCount} message !` }, 5000);

    setTimeout(() => {
      if (message && message.deletable) message.delete();
    }, 5000);
  }

  /**
   *
   * @param {Message<true>} message
   */
  async onMessage(message) {
    if (message.content.startsWith(this.prefix)) {
      const args = message.content.split(" ");
      const commandArgs = args[0].split(">");

      const command = this.commands[commandArgs[1]];

      if (command) {
        try {
          await command.function.call(this, message, args);
        } catch (error) {
          sendTemporatyMessage(
            message,
            {
              embeds: [new EmbedBuilder({ title: "Bot Error !", color: Colors.Yellow })],
            },
            5000
          );

          this.client.logger.writeLog(error);
          console.log(error);
        }
      } else {
        sendTemporatyMessage(
          message,
          {
            embeds: [
              new EmbedBuilder({ title: "Command Not Found !", color: Colors.Yellow }),
            ],
          },
          5000
        );
      }
    }
  }

  /**
   *
   * @param {Message<true>} message
   */
  async getListCommands(message) {
    await message.reply({
      content: "Available commands:\n- " + Object.keys(this.commands).join("\n- "),
    });
  }

  /**
   *
   * @param {Message<true>} message
   */
  async ping(message) {
    await message.reply(
      "Pong! Response time: " + (Date.now() - message.createdTimestamp) + "ms"
    );
  }

  /**
   *
   * @param {Message<true>} message
   * @param {Array<string>} args
   */
  async getNumberMessageSent(message, args) {
    let re = await this.client.databaseManager.db.get(
      "SELECT * FROM users WHERE id = ?",
      [args[1]],
      (err, row) => {
        if (err) {
          console.log(err);
        }
      }
    );

    if (re && re.id) {
      const user = await message.guild.members.fetch(re.id);

      if (!user) {
        await message.reply(`User not found with id ${re.id}`);
        return;
      }

      await message.reply({
        content: `Current message count of ${user.id}: ${re.message_count}`,
      });
    } else {
      await message.reply(`No data with id: ${args[1]}`);
    }
  }

  /**
   *
   * @param {Message<true>} message
   * @param {Array<string>} args
   */
  async getRank(message, args) {
    let mentionedUser = message.mentions.users.first() ?? message.author;

    let res = await this.client.userService.get(mentionedUser.id);

    if (!res) {
      await sendTemporatyMessage(message, `User not found !`, 5000);
      return;
    }

    const descriptionContentCrater = () => {
      /**
       *
       * @returns {{main: string, child?: string}}
       */
      const getTutienState = (level) => {
        const t = this.tutien;

        if (level >= 999) return { main: t.vinhhangcanh };
        if (level >= 780) return { main: t.chuate };

        if (level >= 695) return { main: t.thienco.name, child: t.thienco.child.hauky };
        if (level >= 620) return { main: t.thienco.name, child: t.thienco.child.trungky };
        if (level >= 545) return { main: t.thienco.name, child: t.thienco.child.soky };

        if (level >= 470) return { main: t.thienton.name, child: t.thienton.child.hauky };
        if (level >= 405)
          return { main: t.thienton.name, child: t.thienton.child.trungky };
        if (level >= 340) return { main: t.thienton.name, child: t.thienton.child.soky };

        if (level >= 275) return { main: t.banthan };

        if (level >= 220)
          return { main: t.thiennhan.name, child: t.thiennhan.child.hauky };
        if (level >= 175)
          return { main: t.thiennhan.name, child: t.thiennhan.child.trungky };
        if (level >= 130)
          return { main: t.thiennhan.name, child: t.thiennhan.child.soky };

        if (level >= 85) return { main: t.nguyenanh };
        if (level >= 50) return { main: t.ketdan };
        if (level >= 25) return { main: t.trucco };
        if (level >= 10) return { main: t.ngungKhi };

        return { main: "Phàm Nhân" };
      };

      let tutienState = getTutienState(res.level);

      const totalExpOfCurrentLevel =
        getTotalXpForLevel(res.level + 1) - getTotalXpForLevel(res.level);
      const totalExpGainedOnCurrentLevel = res.xp - getTotalXpForLevel(res.level);
      const currentLevelProcessPercentage =
        totalExpGainedOnCurrentLevel / totalExpOfCurrentLevel;
      const green_square = ":green_square:";
      const white_large_square = ":white_large_square:";
      const numberOfGreenSquare = Math.floor(currentLevelProcessPercentage * 10);
      const progressBar =
        res.level >= 999
          ? ":red_square:".repeat(10)
          : `${green_square.repeat(numberOfGreenSquare)}${white_large_square.repeat(
              10 - numberOfGreenSquare
            )}`;

      const firstCol = [
        ":bust_in_silhouette: **Cảnh giới:**",
        ":chart_with_upwards_trend: **Tiến độ:**",
        ":signal_strength: **Khí chất:**",
        ":fast_forward: **Cảnh giới tiếp theo:**",
        "",
        "**Thành tựu**",
        res.achivement_id ? `<@&${res.achivement_id}>\n` : "",
      ];

      const secondCol = [
        `*${tutienState.main}${tutienState.child ? ` ${tutienState.child} ` : ` `}(lv:${
          res.level
        })*`,
        `${progressBar} *(${
          res.level >= 999 ? "MAX" : Math.floor(currentLevelProcessPercentage * 100) + "%"
        })*`,
        `*${res.message_count} 💬 sent*`,
        `${
          res.level >= 999
            ? "MAX"
            : `*${Math.floor(
                (totalExpOfCurrentLevel - totalExpGainedOnCurrentLevel) / 30
              )} messages*`
        }`,
        "",
        "**Cấp độ**",
        res.achivement_id ? "Chưa cập nhật\n" : "",
      ];

      return { firstCol: firstCol, secondCol: secondCol };
    };

    const fieldData = descriptionContentCrater();

    const embed1 = new EmbedBuilder({
      fields: [
        { name: "---", value: fieldData.firstCol.join("\n"), inline: true },
        { name: "---", value: fieldData.secondCol.join("\n"), inline: true },
      ],
      color: Colors.Blurple,
      author: { name: mentionedUser.username, iconURL: mentionedUser.avatarURL() },
    }).setTimestamp();

    await message.reply({ embeds: [embed1] });
  }

  /**
   *
   * @param {Message<true>} message
   * @param {Array<string>} args
   */
  async getTopLevel(message, args) {
    const allUsers = await this.client.databaseManager.db.all(
      "SELECT * FROM users ORDER BY xp DESC LIMIT 10;",
      [],
      (err, rows) => {
        if (err) {
          console.log(err);
        }
      }
    );

    const messageAuthorData = await this.client.userService.getRankOrderByXp(
      message.author.id
    );

    const convertedUserMessages = [];
    const convertedUserMessages2 = [];

    const convertedUserMessages3 = [];

    allUsers.forEach((userData, index) => {
      convertedUserMessages.push(
        `> **#${index + 1}${index < 10 ? "" : " "}** <@${userData.id}>`
      );
      convertedUserMessages2.push(`> \`${userData.level}\``);
      convertedUserMessages3.push(`> \`${userData.xp}\``);
    });

    const embedBuilder = new EmbedBuilder({
      author: { name: "Bảng Xếp Hạng (only message)", iconURL: message.guild.iconURL() },
      title: `Top ${convertedUserMessages.length} Tin Nhắn`,
      description: ` ***Rank của bạn: #${messageAuthorData.rank}***`,
      timestamp: new Date(),
      fields: [
        { name: "User", value: convertedUserMessages.join("\n"), inline: true },
        { name: "level", value: convertedUserMessages2.join("\n"), inline: true },
        { name: "Xp", value: convertedUserMessages3.join("\n"), inline: true },
      ],
      footer: { iconURL: message.author.avatarURL(), text: message.author.username },
      color: Colors.Blurple,
    });

    await message.reply({ embeds: [embedBuilder] });
  }

  /**
   * @param {Message<true>} message
   */
  async printDatabase(message) {
    try {
      const allUsers = await this.client.userService.getAll();

      const guild = await this.client.guilds.fetch("811939594882777128");
      const channel = await guild.channels.fetch("938734812494176266");

      const convertedUserMessages = [];

      for (const userData of allUsers) {
        convertedUserMessages.push(
          `${userData.id}/${userData.xp}/${userData.level}/${userData.message_count}/${userData.achivement_id}`
        );
      }

      const plainText = `databaseTimestamp:${Date.now()}\n${convertedUserMessages.join(
        "\n"
      )}`;

      if (channel && channel instanceof TextChannel) {
        const buffer = Buffer.from(plainText, "utf-8");
        await channel.send({
          files: [{ attachment: buffer, name: "database.txt" }],
        });
      }
    } catch (error) {
      console.error("Error printing database:", error);
    }
  }

  /**
   * @param {Message<true>} message
   * @param {Array<string>} args
   */
  async insertDatabase(message, args) {
    const targetMessage = await message.channel.messages.fetch(args[1]);
    if (!targetMessage) {
      await message.reply("Message not found.");
      return;
    }

    if (
      targetMessage.attachments.size == 0 &&
      targetMessage.attachments.first().contentType !== "text/plain"
    ) {
      await message.reply("No attachment found or invalid attachment type.");
      return;
    }

    let textPlain = "";

    const attachment = targetMessage.attachments.first();

    if (attachment) {
      textPlain = await fetch(attachment.url).then((res) => res.text());
    } else {
      console.log("No attachment found or invalid attachment type.");
      return;
    }

    const lines = textPlain.split("\n");

    // Remove the first line (timestamp)
    lines.shift();
    console.log(`Inserting ${lines.length} users into database.`);

    const members = await message.guild.members.fetch({ limit: 2000 });

    for (const line of lines) {
      const [id, xp, level, message_count, achivement_id] = line.split("/");
      const member = members.get(id);

      if (!member) continue;

      await this.client.databaseManager.db.run(
        `INSERT INTO users (id, xp, level, message_count, achivement_id) 
          VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE 
            SET xp = excluded.xp, 
                level = excluded.level, 
                message_count = excluded.message_count,
                achivement_id = excluded.achivement_id
        ;`,
        [id, parseInt(xp), parseInt(level), parseInt(message_count), achivement_id]
      );
    }

    message.reply(`Updated ${lines.length} users into database.`);
  }

  /**
   * @param {Message<true>} message
   * @param {Array<string>} args
   */
  async xpUpdate(message, args) {
    if (args[2].match("level") || args[2].match("xp")) {
      const userData = await this.client.userService.get(args[1]);
      if (!userData) {
        await message.reply({ content: "User not found !" });
        return;
      }

      if (args[2] === "level") {
        userData.level = parseInt(args[3]);
        userData.xp = getTotalXpForLevel(userData.level);
      } else {
        userData.xp = parseInt(args[3]);
        userData.level = calcLevel(userData.xp);
      }

      await this.client.userService.insert(userData);

      await message.reply({ content: "Updated user !" });
    } else {
      let replyMessage = await message.reply({
        content: `Invalid operation! args[2] must be level or xp not ${args[2]}`,
      });
      setTimeout(async () => {
        if (replyMessage.deletable) await replyMessage.delete();
      }, 5000);
    }
  }
}
