import {
  Collection,
  Colors,
  EmbedBuilder,
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
    level: {
      name: "level",
      usage: "",
      function: this.getLevel,
    },
    messages: {
      name: "messages",
      usage: "",
      function: this.getNumberMessageSent,
    },
    xp: {
      name: "xp",
      usage: "",
      function: this.getXpOfUser,
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

    let initCollection = await channel.messages.fetch({ limit: 2, before: message.id });

    if (initCollection.size < 2) {
      await channel.bulkDelete(messages);

      const replyMessage = await message.reply({
        content: `Deleted ${initCollection.size} message !`,
      });

      setTimeout(() => {
        if (replyMessage && replyMessage.deletable) replyMessage.delete();
      }, 5000);

      return;
    }

    let firstMessage = initCollection.at(0);

    let messages = new Collection();
    messages.set(firstMessage.id, firstMessage);

    while (amount > 0) {
      const bulkDeletableMessages = new Collection();
      const oldMessages = new Collection();

      if (amount - 100 < 0) {
        const purgeList = await message.channel.messages.fetch({
          limit: amount - 1,
          before: firstMessage.id,
        });
        purgeList.forEach((msg) => {
          messages.set(msg.id, msg);
          if (msg.bulkDeletable) {
            bulkDeletableMessages.set(msg.id, msg);
          } else {
            oldMessages.set(msg.id, msg);
          }
        });
        await channel.bulkDelete(purgeList);
      } else {
        const purgeList = await message.channel.messages.fetch({
          limit: 100,
          before: firstMessage.id,
        });
        purgeList.forEach((msg) => {
          messages.set(msg.id, msg);
          if (msg.bulkDeletable) {
            bulkDeletableMessages.set(msg.id, msg);
          } else {
            oldMessages.set(msg.id, msg);
          }
        });
        await channel.bulkDelete(bulkDeletableMessages);
        oldMessages.forEach((msg) => (msg.deletable ? msg.delete() : ""));
        firstMessage = messages.last();
      }

      amount -= 100;
    }

    const replyMessage = await message.reply({
      content: `Deleted ${messages.size} message !`,
    });

    setTimeout(() => {
      if (message && message.deletable) message.delete();
      if (replyMessage && replyMessage.deletable) replyMessage.delete();
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
          const replyMessage = await message.reply({
            embeds: [new EmbedBuilder({ title: "Bot Error !", color: Colors.Yellow })],
          });
          setTimeout(() => {
            if (replyMessage.deletable) {
              replyMessage.delete;
            }
          }, 5000);

          console.log(error);
        }
      } else {
        const replyMessage = await message.reply({
          embeds: [
            new EmbedBuilder({ title: "Command Not Found !", color: Colors.Yellow }),
          ],
        });
        setTimeout(() => {
          if (replyMessage.deletable) {
            replyMessage.delete;
          }
        }, 5000);
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
    await message.reply("Pong!");
  }

  /**
   *
   * @param {Message<true>} message
   */
  async getLevel(message) {
    const mentionedUser = message.mentions.users.first();

    if (!mentionedUser) {
      await sendTemporatyMessage(message, { content: "No user mentioned !" }, 5000);
      return;
    }

    let res = await this.client.userService.get(mentionedUser.id);

    if (!res) {
      await sendTemporatyMessage(message, `User not found !`, 5000);
      return;
    }

    await sendTemporatyMessage(
      message,
      `Current level of ${user.id}: ${res.level}`,
      5000
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
  async getXpOfUser(message, args) {
    const mentionedUser = message.mentions.users.first();

    if (!mentionedUser) {
      await sendTemporatyMessage(message, { content: "No user mentioned !" }, 5000);
      return;
    }

    let res = await this.client.userService.get(mentionedUser.id);

    if (!res) {
      await sendTemporatyMessage(message, `User not found !`, 5000);
      return;
    }

    await sendTemporatyMessage(message, `Current exp of ${res.id}: ${res.level}`, 5000);
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

    const convertedUserMessages = [];

    for (const userData of allUsers) {
      const member = await message.guild.members.fetch(userData.id);

      convertedUserMessages.push(
        `User: ${member.user.tag}/${userData.id}, xp: ${userData.xp}, lv: ${userData.level}, msg: ${userData.message_count}`
      );
    }

    await message.reply({
      content: `Top 10 user: \n${convertedUserMessages.join("\n")}`,
    });
  }

  /**
   * @param {Message<true>} message
   */
  async printDatabase(message) {
    try {
      const allUsers = await this.client.databaseManager.db.all(
        "SELECT * FROM users",
        [],
        (err, rows) => {
          if (err) {
            console.log(err);
          }
        }
      );

      const guild = await this.client.guilds.fetch("811939594882777128");
      const channel = await guild.channels.fetch("938734812494176266");

      const convertedUserMessages = [];

      for (const userData of allUsers) {
        convertedUserMessages.push(
          `${userData.id}/${userData.xp}/${userData.level}/${userData.message_count}`
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

    for (const line of lines) {
      const [id, xp, level, message_count] = line.split("/");
      await this.client.databaseManager.db.run(
        `INSERT INTO users (id, xp, level, message_count) 
          VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE 
            SET xp = excluded.xp, 
                level = excluded.level, 
                message_count = excluded.message_count
        ;`,
        [id, parseInt(xp), parseInt(level), parseInt(message_count)]
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
