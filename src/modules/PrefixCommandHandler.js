import { Colors, EmbedBuilder, Message, TextChannel } from "discord.js";
import MossClient from "../Client.js";
import Handler from "./Handler.js";
import { calcLevel, getTotalXpForLevel } from "../utils/random.js";

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
    xpUpdate: {
      name: "xp-update",
      usage: "<id> <type> <amount>",
      function: this,
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
  };

  prefix = "c>";

  constructor(options) {
    super(options);
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
          const replyMessage = await message.reply({ embeds: [new EmbedBuilder({ title: "Bot Error !", color: Colors.Yellow })] });
          setTimeout(() => {
            if (replyMessage.deletable) {
              replyMessage.delete;
            }
          }, 5000);

          console.log(error);
        }
      } else {
        const replyMessage = await message.reply({ embeds: [new EmbedBuilder({ title: "Command Not Found !", color: Colors.Yellow })] });
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
    await message.reply({ content: "Available commands:\n- " + Object.keys(this.commands).join("\n- ") });
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
   * @param {Array<string>} args
   */
  async getLevel(message, args) {
    let re = await this.client.databaseManager.db.get("SELECT * FROM users WHERE id = ?", [args[1]], (err, row) => {
      if (err) {
        console.log(err);
      }
    });

    if (args[1] === "me") {
      re = await this.client.databaseManager.db.get("SELECT * FROM users WHERE id = ?", [message.author.id], (err, row) => {
        if (err) {
          console.log(err);
        }
      });
    }

    if (re && re.id) {
      const user = await message.guild.members.fetch(re.id);

      if (!user) {
        await message.reply(`User not found with id ${re.id}`);
        return;
      }

      await message.reply({ content: `Current level of ${user.id}: ${re.level}` });
    } else {
      await message.reply(`No data with id: ${args[1]}`);
    }
  }

  /**
   *
   * @param {Message<true>} message
   * @param {Array<string>} args
   */
  async getNumberMessageSent(message, args) {
    let re = await this.client.databaseManager.db.get("SELECT * FROM users WHERE id = ?", [args[1]], (err, row) => {
      if (err) {
        console.log(err);
      }
    });

    if (re && re.id) {
      const user = await message.guild.members.fetch(re.id);

      if (!user) {
        await message.reply(`User not found with id ${re.id}`);
        return;
      }

      await message.reply({ content: `Current message count of ${user.id}: ${re.message_count}` });
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
    let re = await this.client.databaseManager.db.get("SELECT * FROM users WHERE id = ?", [args[1]], (err, row) => {
      if (err) {
        console.log(err);
      }
    });

    if (re && re.id) {
      const user = await message.guild.members.fetch(re.id);

      if (!user) {
        await message.reply(`User not found with id ${re.id}`);
        return;
      }

      await message.reply({ content: `Current exp of ${user.id}: ${re.xp}` });
    } else {
      await message.reply(`No data with id: ${args[1]}`);
    }
  }

  /**
   *
   * @param {Message<true>} message
   * @param {Array<string>} args
   */
  async getTopLevel(message, args) {
    const allUsers = await this.client.databaseManager.db.all("SELECT * FROM users ORDER BY xp DESC LIMIT 10", [], (err, rows) => {
      if (err) {
        console.log(err);
      }
    });

    const convertedUserMessages = [];

    for (const userData of allUsers) {
      const member = await message.guild.members.fetch(userData.id);

      convertedUserMessages.push(
        `User: ${member.user.tag}/${userData.id}, xp: ${userData.xp}, lv: ${userData.level}, msg: ${userData.message_count}`
      );
    }

    await message.reply({ content: `Top 10 user: \n${convertedUserMessages.join("\n")}` });
  }

  /**
   * @param {Message<true>} message
   */
  async printDatabase(message) {
    try {
      const allUsers = await this.client.databaseManager.db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) {
          console.log(err);
        }
      });

      const guild = await this.client.guilds.fetch("811939594882777128");
      const channel = await guild.channels.fetch("938734812494176266");

      const convertedUserMessages = [];

      for (const userData of allUsers) {
        convertedUserMessages.push(`${userData.id}/${userData.xp}/${userData.level}/${userData.message_count}`);
      }

      const plainText = `databaseTimestamp:${Date.now()}\n${convertedUserMessages.join("\n")}`;

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

    if (targetMessage.attachments.size == 0 && targetMessage.attachments.first().contentType !== "text/plain") {
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
        "INSERT INTO users (id, xp, level, message_count) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET xp = excluded.xp, level = excluded.level, message_count = excluded.message_count;",
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
    if (args[1].match("level") || args[1].match("xp")) {
      const userData = await this.client.userService.get(args[2]);
      if (!userData.id) {
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
      let replyMessage = await message.reply({ content: `Invalid operation! args[2] must be level or xp not ${args[2]}` });
      setTimeout(async () => {
        if (replyMessage.deletable) await replyMessage.delete();
      }, 5000);
    }
  }
}
