import {
  Collection,
  Colors,
  EmbedBuilder,
  Message,
  TextChannel,
  WebhookClient,
} from "discord.js";
import Handler from "./Handler.js";
import fs from "fs";
import { pipeline } from "stream/promises";
import { configDotenv } from "dotenv";

configDotenv();
const { PYTHON_API } = process.env;

/**
 *
 * @param {string} content
 * @returns
 */
function findFBUrl(content) {
  const urls = content.match(/https?:\/\/[^\s]+/g);
  if (!urls) return undefined;
  const fbUrls = urls.filter((url) => url.startsWith("https://www.facebook.com"));
  return fbUrls.at(0);
}

/**
 *
 * @param {Message<true>} message
 */
async function linkConvert(message) {
  const url = findFBUrl(message.content);
  if (!url) return;
  return url.replace("https://www.facebook.com", PYTHON_API);
}

function extractVideoLink(html) {
  const match = html.match(/<meta property="og:video:secure_url" content="([^"]+)"/);
  return match ? match[1] : null;
}

function extractImageLink(html) {
  const match = html.match(/<meta property="og:image" content="([^"]+)"/);
  return match ? match[1] : null;
}

function extractPostDescription(html) {
  const match = html.match(/<meta property="og:description" content="([^"]+)"/);
  return match ? match[1] : null;
}

function extractPostTitle(html) {
  const match = html.match(/<meta property="og:title" content="([^"]+)"/);
  return match ? match[1] : null;
}

function trimEmbed(text, max = 4096) {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function extractReelId(html) {
  const match = html.match(
    /<meta property="og:url" content="https:\/\/www\.facebook\.com\/reel\/(\d+)"/
  );
  return match ? match[1] : null;
}

async function downloadVideo(url, path = "video.mp4") {
  const res = await fetch(url);

  if (!res.ok) throw new Error("Download fail");

  const fileStream = fs.createWriteStream(path);

  const body = res.body;

  if (body) {
    await pipeline(res.body, fileStream);
  } else {
    return undefined;
  }

  return path;
}

/**
 *
 * @param {string} text
 * @returns {string}
 */
const wrapLinks = (text) => {
  return text.replace(/\b((https?:\/\/|www\.)[^\s]+)/g, (url) => `<${url}>`);
};

const cache = {};

export default class AutoReplyHandler extends Handler {
  webhookClients = new Collection();

  autoReplyData = [
    {
      match: "mmb",
      wildcard: true,
      mentionUser: true,
      content: [
        {
          replyMessage: false,
          content: "mẹ mày béo !",
        },
        {
          replyMessage: false,
          content:
            "[capoo_sleep](https://cdn.discordapp.com/emojis/1277690970531561595.webp?size=48&name=capoo_sleep)",
        },
      ],
    },
  ];

  /**
   *
   * @param {import("discord.js").GuildBasedChannel} channel
   * @returns {Promise<WebhookClient>}
   */
  async createWebhook(channel) {
    let webhookClient = this.webhookClients.get({
      channelId: channel.id,
      guildId: channel.guildId,
    });

    if (!webhookClient) {
      let wb = (await channel.fetchWebhooks()).find(
        (wb) => wb.owner.id == this.client.user.id
      );

      if (!wb) {
        wb = await channel.createWebhook({
          name: this.client.user.displayName,
        });
      }

      webhookClient = new WebhookClient({ url: wb.url });

      this.webhookClients.set(
        {
          channelId: channel.id,
          guildId: channel.guildId,
        },
        webhookClient.url
      );

      return webhookClient;
    }
  }

  /**
   *
   * @param {Message<true>} message
   */
  async processFacebookUrl(message) {
    try {
      if (!message.inGuild() || message.author.bot) return;

      const linkConverted = await linkConvert(message);

      if (!linkConverted) return;

      const text = await (await fetch(linkConverted)).text();

      const videoLink = extractVideoLink(text);
      const videoReelId = extractReelId(text);
      const imageLink = extractImageLink(text);
      const postDescription = extractPostDescription(text);
      const postTitle = extractPostTitle(text);

      const webhookClient = await this.createWebhook(message.channel);

      const reference = message.reference;

      let msg;
      let referenceMessage;

      if (reference) {
        referenceMessage = await message.channel.messages.fetch(reference.messageId);
      }

      if (videoLink && videoReelId) {
        if (cache[videoReelId]) {
          await webhookClient.send({
            content: wrapLinks(message.content) + `\n${cache[videoReelId]}`,
            username: message.author.displayName,
            avatarURL: message.author.avatarURL(),
          });
          return;
        }

        const path = await downloadVideo(videoLink, `${videoReelId}.mp4`);

        if (!path) return;

        msg = await webhookClient.send({
          content:
            wrapLinks(message.content) +
            (referenceMessage ? `\n*Replied to ${message.url}*` : "") +
            "\n> Toki Bot - Powered by **Potarozz***",
          username: message.author.displayName,
          avatarURL: message.author.avatarURL(),
          files: [path],
        });

        if (message.deletable) await message.delete();

        cache[videoReelId] = msg.attachments.at(0).proxy_url;

        if (fs.readFileSync(path));
        fs.unlinkSync(path);
      } else if (imageLink) {
        await webhookClient.send({
          content:
            wrapLinks(message.content) +
            (referenceMessage ? `\n*Replied to ${message.url}*` : ""),
          embeds: [
            {
              title: postTitle,
              description: trimEmbed(postDescription),
              image: { url: imageLink },
              color: Colors.Blurple,
              footer: { text: `Toki Bot - Powered by Potarozz` },
              timestamp: new Date(),
            },
          ],
          username: message.author.displayName,
          avatarURL: message.author.avatarURL(),
        });
      }
    } catch (error) {
      this.client.logger.writeLog(error);
    }
  }

  /**
   *
   * @param {Message<true>} message
   */
  onMessage = async (message) => {
    try {
      if (message.author.bot) return;
      if (message.content.startsWith("c>")) return;

      this.processFacebookUrl(message);

      const autoReplyItem = this.autoReplyData.find((value) =>
        value.wildcard
          ? message.content.includes(value.match)
          : message.content.startsWith(value.match)
      );

      if (!autoReplyItem) return;

      autoReplyItem.content.forEach(async (content, index) => {
        let sendText = "undefined";
        let mentionText = undefined;
        const mentionedUser = message.mentions.users.first();
        if (
          (!mentionedUser && autoReplyItem.mentionUser) ||
          mentionedUser.id === "866628870123552798"
        )
          return;
        else mentionText = `<@${mentionedUser.id}> `;

        sendText = index == 0 ? `${mentionText}${content.content}` : content.content;
        content.replyMessage && message.reference && message.reference.messageId
          ? await message.reply(sendText)
          : await message.channel.send(sendText);
      });
    } catch (error) {
      this.client.logger.writeLog(error);
    }
  };
}
