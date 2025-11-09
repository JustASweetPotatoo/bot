import { Client, Events, GatewayIntentBits, Message, TextChannel } from "discord.js";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions],
});

const db = await open({
  filename: "./datab.db",
  driver: sqlite3.Database,
  mode: sqlite3.OPEN_READWRITE,
});

// await db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)");
// await db.run("INSERT INTO users (name) VALUES (?)", "Bob");

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getTotalXpForLevel(level) {
  return (5 / 3) * level ** 3 + 25 * level ** 2 + 100 * level;
}

/**
 *
 * @param {Number} xp
 * @returns {Number}
 */
function calcLevel(xp) {
  let level = 0;
  while (xp >= getTotalXpForLevel(level + 1)) {
    level++;
  }
  return level;
}

import * as dotenv from "dotenv";

dotenv.config("/");

const { TOKEN } = process.env;

/**
 *
 * @param {Message<true>} message
 * @returns
 */
async function prefixCommand(message) {
  try {
    if (message.author.id != "866628870123552798") {
      await message.reply("You are not eligible to use bot commands.");
      return;
    }

    const args = message.content.split(" ");

    let re = await db.get("SELECT * FROM users WHERE id = ?", [args[1]], (err, row) => {
      if (err) {
        console.log(err);
      }
    });

    switch (args[0]) {
      case "c>list-commands":
        await message.reply("Available commands:\n- c>ping\n- c>level <user_id>\n- c>messages <user_id>\n- c>xp <user_id>\n- c>get-last-25");
        break;
      case "c>ping":
        await message.reply("Pong!");
        break;
      case "c>level":
        if (args[1] === "me") {
          re = await db.get("SELECT * FROM users WHERE id = ?", [message.author.id], (err, row) => {
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
        break;
      case "c>messages":
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
        break;
      case "c>xp":
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

        return;
      case "c>top-level":
        const allUsers = await db.all("SELECT * FROM users ORDER BY xp DESC LIMIT 10", [], (err, rows) => {
          if (err) {
            console.log(err);
          }
        });

        const convertedUserMessages = [];

        for (const userData of allUsers) {
          const member = await message.guild.members.fetch(userData.id);

          convertedUserMessages.push(`User: ${member.user.tag}/${userData.id}, xp: ${userData.xp}, lv: ${userData.level}, msg: ${userData.message_count}`);
        }
        await message.reply({ content: `${convertedUserMessages.join("\n")}` });
        return;
      case "c>print-db":
        printDatabase();
        return;
      case "c>insert-db":
        const targetMessage = await message.channel.messages.fetch(args[1]);
        if (!targetMessage) {
          await message.reply("Message not found.");
          return;
        }

        if (targetMessage.attachments.size == 0 && targetMessage.attachments.first().contentType !== "text/plain") {
          await message.reply("No attachment found or invalid attachment type.");
          return;
        }

        insertDatabaseFromMessage(targetMessage, message);
        return;
      default:
        await message.reply("Unknown command.");
        break;
    }
  } catch (error) {
    console.error("Error executing command:", error);
  }

  return true;
}

/**
 *
 * @param {Message<true>} message
 */
async function messageLeveling(message) {
  const xpPlus = getRandomInt(25, 35);

  let res = await db.get("SELECT * FROM users WHERE id = ?", [message.author.id], (err, row) => {
    if (err) console.log(err);
  });

  if (!res) {
    res = { id: message.author.id, xp: xpPlus, level: 0, message_count: 0 };

    await db.run("INSERT INTO users (id, xp, level, message_count) VALUES (?, ?, ?, ?)", [res.id, res.xp, res.level, res.message_count]);
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

  await db.run("UPDATE users SET xp = ?, level = ?, message_count = ? WHERE id = ?", [res.xp, res.level, res.message_count, res.id]);
}

const autoReplyData = [
  {
    match: "mmb",
    wildcard: false,
    content: [
      {
        replyMessage: true,
        content: "mẹ mày béo !",
      },
      {
        replyMessage: false,
        content: "[capoo_sleep](https://cdn.discordapp.com/emojis/1277690970531561595.webp?size=48&name=capoo_sleep)",
      },
    ],
  },
];

/**
 *
 * @param {Message<true>} message
 */
async function autoReply(message) {
  for (const item of autoReplyData) {
    if ((item.wildcard && message.content.includes(item.content)) || message.content.startsWith(item.match)) {
      item.content.forEach(async (content) => (content.replyMessage ? await message.reply({ content: content.content }) : await message.channel.send({ content: content.content })));
      break;
    }
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (!message.inGuild()) return;

  if (!message.guild.id === "811939594882777128") return;

  if (message.author.bot) return;

  if (message.content.startsWith("c>")) {
    await prefixCommand(message);
    return;
  }

  messageLeveling(message);

  autoReply(message);
});

async function printDatabase() {
  try {
    const allUsers = await db.all("SELECT * FROM users", [], (err, rows) => {
      if (err) {
        console.log(err);
      }
    });

    const guild = await client.guilds.fetch("811939594882777128");
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
 *
 * @param {Message<true>} message
 * @param {Message<true>} commandMessage
 */
async function insertDatabaseFromMessage(message, commandMessage) {
  let textPlain = "";

  const attachment = message.attachments.first();

  if (attachment) {
    textPlain = await fetch(attachment.url).then((res) => res.text());
  } else {
    console.log("No attachment found or invalid attachment type.");
    return;
  }

  const lines = textPlain.split("\n");

  // Remove the first line (timestamp)
  lines.shift();
  console.log(textPlain);
  console.log(`Inserting ${lines.length} users into database.`);

  for (const line of lines) {
    const [id, xp, level, message_count] = line.split("/");
    await db.run("INSERT INTO users (id, xp, level, message_count) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING", [id, parseInt(xp), parseInt(level), parseInt(message_count)]);
  }

  commandMessage.reply(`Updated ${lines.length} users into database.`);
}

client.on(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
