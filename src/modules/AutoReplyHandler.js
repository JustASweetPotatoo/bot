import {
  AttachmentBuilder,
  Collection,
  Colors,
  ForumChannel,
  Message,
  TextChannel,
  ThreadChannel,
  WebhookClient,
} from "discord.js";
import Handler from "./Handler.js";
import fs from "fs";
import { pipeline } from "stream/promises";
import { configDotenv } from "dotenv";
import * as cheerio from "cheerio";

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

function facebedLinkConvert(content) {
  return content.replace("https://www.facebook.com", "https://www.facebed.com");
}

function trimEmbed(text, max = 4096) {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function parsePost(html) {
  const $ = cheerio.load(html);

  const get = (name) => $(`meta[property="${name}"]`).attr("content") ?? null;

  return {
    reelId: get("og:url")?.match(/reel\/(\d+)/)?.[1] ?? null,
    videoLink: get("og:video:secure_url"),
    imageLink: get("og:image"),
    title: get("og:title"),
    description: get("og:description"),
  };
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
   * @returns {undefined | { reelId: string | undefined, videoLink: string | undefined, imageLink: string | undefined, title: string | undefined, description: string | undefined}} 
   */
  async getFacebookMedia(message) {
    const extractedLinks = message.content.match(/https?:\/\/[^\s]+/g);
    if (!extractedLinks) return undefined;
    const facebookLinks = extractedLinks.filter((url) => url.startsWith("https://www.facebook.com"));
    let firstLink = facebookLinks.at(0)
    if (firstLink) return undefined;
    firstLink = firstLink.replace("https://www.facebook.com", PYTHON_API);

    const response = await fetch(firstLink);

    if (!response.ok) return undefined;

    const htmlResponseBody = await response.text();
    const $ = cheerio.load(html);
    const cheerioGet = (name) => $(`meta[property="${name}"]`).attr("content") ?? null;
    const postMetaData = {
      reelId: cheerioGet("og:url")?.match(/reel\/(\d+)/)?.[1] ?? null,
      videoLink: cheerioGet("og:video:secure_url"),
      imageLink: cheerioGet("og:image"),
      title: cheerioGet("og:title"),
      description: cheerioGet("og:description"),
    };
  }

  /**
   *
   * @param {Message<true>} message
   */
  async processFacebookUrl(message) {
    try {
      if (!message.inGuild() || message.author.bot) return;

      const convertedLink = await linkConvert(message);
      const facebookLink = findFBUrl(message.content);
      if (!convertedLink) return;

      const response = await fetch(convertedLink);

      let webhookClient;
      const parentChannel = message.channel.parent;

      if (parentChannel instanceof ForumChannel) {
        webhookClient = await this.createWebhook(parentChannel);
      } else if (message.channel instanceof ThreadChannel) {
        webhookClient = await this.createWebhook(parentChannel);
      } else {
        webhookClient = await this.createWebhook(message.channel);
      }

      if (!response.ok) return;
      const html = await response.text();
      const postData = parsePost(html);
      const reference = message.reference;

      let msg;
      let referenceMessage;

      if (reference) {
        referenceMessage = await message.channel.messages.fetch(reference.messageId);
      }

      if (postData.videoLink) {
        if (cache[postData.reelId]) {
          await webhookClient.send({
            content: wrapLinks(message.content) + `\n${cache[postData.reelId]}`,
            username: message.author.displayName,
            avatarURL: message.author.avatarURL(),
          });
          return;
        }

        const path = await downloadVideo(postData.videoLink, `${postData.reelId}.mp4`);
        const videoStats = fs.statSync(path);

        if (!path) return;

        if (videoStats.size >= 10 * 1024 * 1024) {
          const messagePayload = {
            content:
              `${wrapLinks(message.content)}\n> -# ${facebedLinkConvert(facebookLink)}` +
              (referenceMessage
                ? `\n> -# ↪ [Reply to ↗ ${referenceMessage.member.displayName}](<${referenceMessage.url}>)`
                : ""),
            username: message.author.displayName,
            avatarURL: message.author.avatarURL(),
          };

          if (parentChannel instanceof ForumChannel) {
            msg = await webhookClient.send({
              ...messagePayload,
              threadId: message.channel.id,
            });
          } else {
            msg = await webhookClient.send(messagePayload);
          }
        } else {
          const messagePayload = {
            content:
              wrapLinks(message.content) +
              (referenceMessage ? `\n> -# ↪ [Reply to ↗ ${referenceMessage.member.displayName}](<${referenceMessage.url}>)` : ""),
            username: message.member.nickname,
            avatarURL: message.member.displayAvatarURL(),
            files: videoStats.size < 50 * 1024 * 1024 ? [path] : [],
            embeds: [
              {
                description: `> *Sứa#2120 - Powered by **Potarozz***\n> *Facebed API by **pi.kt***`,
                color: Colors.Blurple,
                footer: { text: `UID: ${message.author.id}` },
                timestamp: new Date(),
              },
            ],
          };

          if (parentChannel instanceof ForumChannel) {
            msg = await webhookClient.send({
              ...messagePayload,
              threadId: message.channel.id,
            });
          } else {
            msg = await webhookClient.send(messagePayload);
          }

          cache[postData.reelId] = msg.attachments.at(0).proxy_url;
          if (message.deletable) await message.delete();
        }

        if (fs.readFileSync(path));
        fs.unlinkSync(path);
      } else if (postData.imageLink) {
        const postEmbedDescription = `\n> **[${postData.title}](${wrapLinks(
          facebookLink
        )})**\n> ${postData.description}`;

        await webhookClient.send({
          content:
            wrapLinks(message.content) +
            postEmbedDescription +
            (referenceMessage ? `\n> -# ↪ [Reply to ↗ ${referenceMessage.member.displayName}](<${referenceMessage.url}>)` : ""),
          files: [postData.imageLink],
          embeds: [
            {
              description: `> *Sứa#2120 - Powered by **Potarozz***\n> *Facebed API by **pi.kt***`,
              color: Colors.Blurple,
              footer: { text: `UID: ${message.author.id}` },
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
