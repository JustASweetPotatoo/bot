import { Client, Events, GatewayIntentBits, TextChannel } from "discord.js";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions],
});

const db = await open({
  filename: "./datab.db",
  driver: sqlite3.Database,
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

client.on(Events.MessageCreate, async (message) => {
  if (!message.inGuild()) return;

  if (!message.guild.id === "811939594882777128") return;

  if (message.author.bot) return;

  const xpPlus = getRandomInt(25, 35);

  let res = await db.get("SELECT * FROM users WHERE id = ?", [message.author.id], (err, row) => {
    if (err) console.log(err);
  });

  if (!res) {
    res = { id: message.author.id, xp: xpPlus, level: 0 };

    await db.run("INSERT INTO users (id, xp, level) VALUES (?, ?, ?)", [res.id, res.xp, res.level]);
    return;
  }

  res.xp += xpPlus;
  const currentLevel = res.level;
  res.level = calcLevel(res.xp);

  if (!currentLevel == 0 && currentLevel < res.level) {
    const channel = await message.guild.channels.fetch("938734812494176266");
    console.log(`Level up detected: ${message.author.id}, level: ${res.level}`)

    if (channel && channel instanceof TextChannel) {
      channel.send(`<@${message.author.id}> reached level: ${res.level}`);
    }
  }

  await db.run("UPDATE users SET xp = ?, level = ? WHERE id = ?", [res.xp, res.level, res.id]);
});

client.login("");
