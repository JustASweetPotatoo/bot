import {
  AttachmentBuilder,
  Collection,
  Colors,
  EmbedBuilder,
  ForumChannel,
  Message,
  TextChannel,
  ThreadChannel,
  VoiceChannel,
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
  const fbUrls = urls.filter((url) =>
    url.startsWith("https://www.facebook.com"),
  );
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
  webhooks = new Collection();

  autoReplyData = [
    {
      match: "mmb",
      wildcard: true,
      mentionUser: true,
      content: [
        {
          replyMessage: false,
          content: "mẹ mày béo !\n# <:capoo_sleep:1277690970531561595>",
        },
      ],
    },
  ];

  /**
   *
   * @param {TextChannel} channel
   * @returns {Promise<WebhookClient>}
   */
  async createWebhook(channel) {
    const cacheId = `${channel.id}/${channel.guild.id}`;

    let webhook = this.webhooks.get(cacheId);

    if (!webhook) {
      webhook = (await channel.fetchWebhooks()).find(
        (wb) => wb.owner.id == this.client.user.id,
      );
    }

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: this.client.user.displayName,
      });
    }

    const webhookClient = new WebhookClient({ url: webhook.url });

    this.webhooks.set(cacheId, webhook);

    return webhookClient;
  }

  /**
   *
   * @param {Message<true>} message
   * @returns {undefined | { reelId: string | undefined, videoLink: string | undefined, imageLink: string | undefined, title: string | undefined, description: string | undefined}}
   */
  async getFacebookMedia(message) {
    const extractedLinks = message.content.match(/https?:\/\/[^\s]+/g);
    if (!extractedLinks) return undefined;
    const facebookLinks = extractedLinks.filter((url) =>
      url.startsWith("https://www.facebook.com"),
    );
    let firstLink = facebookLinks.at(0);
    if (firstLink) return undefined;
    firstLink = firstLink.replace("https://www.facebook.com", PYTHON_API);

    const response = await fetch(firstLink);

    if (!response.ok) return undefined;

    const htmlResponseBody = await response.text();
    const $ = cheerio.load(html);
    const cheerioGet = (name) =>
      $(`meta[property="${name}"]`).attr("content") ?? null;
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
   * @param {TextChannel | VoiceChannel | ThreadChannel} channel
   * @returns {WebhookClient}
   */
  async getWebhook(channel) {
    let webhookClient;
    if (channel instanceof ThreadChannel) {
      webhookClient = await this.createWebhook(channel.parent);
    } else {
      webhookClient = await this.createWebhook(channel);
    }

    return webhookClient;
  }

  /**
   * @param {Message<true>} message
   * @param {boolean} [toAPI=true]
   * @returns {string | undefined}
   */
  lnk(message, toAPI = true) {
    const urls = message.content.match(/https?:\/\/[^\s]+/g);
    if (!urls) return undefined;
    const fbUrls = urls.filter((url) =>
      url.startsWith("https://www.facebook.com"),
    );
    let firstUrl = fbUrls.at(0);

    if (!firstUrl) return firstUrl;

    if (toAPI) return firstUrl.replace("https://www.facebook.com", PYTHON_API);
    return firstUrl.replace(
      "https://www.facebook.com",
      "https://www.facebed.com",
    );
  }

  /**
   *
   * @param {Message<true>} message
   */
  async processFacebookUrl(message) {
    try {
      if (!message.inGuild() || message.author.bot) return;
      const facebookUrl = this.lnk(message);
      if (!facebookUrl) return;

      const founderEmbed = {
        description: `> *Sứa#2120 - Powered by **Potarozz***\n> *Facebed API by **pi.kt***`,
        color: Colors.Blurple,
        footer: { text: `UID: ${message.author.id}` },
        timestamp: new Date(),
      };

      const response = await fetch(facebookUrl);

      if (!response.ok) {
        const warnEmbed = new EmbedBuilder()
          .setTitle("This post is private or unavailable !")
          .setDescription(
            `[See posts, photos and more on Facebook](<${(this.lnk(message), false)}>)`,
          )
          .setColor(Colors.Yellow);
        let messagePayload = { embeds: [warnEmbed, founderEmbed] };
        await message.reply({ embeds: [founderEmbed] });
        return;
      }

      const html = await response.text();
      const postData = parsePost(html);
      const messageRef = message.reference;
      const refMessage = messageRef
        ? await message.channel.fetch(messageRef.messageId)
        : undefined;
      let msg;
      const webhookClient = await this.getWebhook(message.channel);

      if (postData.videoLink) {
        const videoCacheLink = cache[postData.reelId];
        if (videoCacheLink) {
          await webhookClient.send({
            content: wrapLinks(message.content) + `\n${cache[postData.reelId]}`,
            embeds: [founderEmbed],
            username: message.author.displayName,
            avatarURL: message.author.avatarURL(),
          });
          return;
        }
        const path = await downloadVideo(
          postData.videoLink,
          `${postData.reelId}.mp4`,
        );

        if (!path) {
          const embed = new EmbedBuilder()
            .setTitle("This post is private or unavailable !")
            .setDescription(
              `[See post or photos and more on Facebook](<${facebookUrl}>)`,
            )
            .setColor(Colors.Yellow);
          await message.reply({ embeds: [embed, founderEmbed] });
          return;
        }

        const videoStats = fs.statSync(path);

        if (videoStats.size >= 10 * 1024 * 1024) {
          const messagePayload = {
            content:
              `${wrapLinks(message.content)}\n> -# ${facebedLinkConvert(facebookUrl)}` +
              (refMessage
                ? `\n> -# ↪ [Reply to ↗ ${refMessage.member.displayName}](<${refMessage.url}>)`
                : ""),
            embeds: [founderEmbed],
            username: message.author.displayName,
            avatarURL: message.author.avatarURL(),
          };

          msg = await webhookClient.send(messagePayload);
          cache[postData.reelId] = postData.videoLink;
        } else {
          const messagePayload = {
            content:
              `${wrapLinks(message.content)}` +
              (refMessage
                ? `\n> -# ↪ [Reply to ↗ ${refMessage.member.displayName}](<${refMessage.url}>)`
                : ""),
            files: [path],
            embeds: [founderEmbed],
            username: message.author.displayName,
            avatarURL: message.author.avatarURL(),
          };

          msg = await webhookClient.send(messagePayload);
          cache[postData.reelId] = msg.attachments.at(0).proxy_url;
        }

        if (message.deletable) await message.delete();
      } else if (postData.imageLink) {
        const postEmbedDescription = `\n> **[${postData.title}](${wrapLinks(
          facebookUrl,
        )})**\n> ${postData.description}`;

        await webhookClient.send({
          content:
            wrapLinks(message.content) +
            postEmbedDescription +
            (refMessage
              ? `s\n> -# ↪ [Reply to ↗ ${refMessage.member.displayName}](<${refMessage.url}>)`
              : ""),
          files: [postData.imageLink],
          embeds: [founderEmbed],
          username: message.author.displayName,
          avatarURL: message.author.avatarURL(),
        });
      } else {
        const embed = new EmbedBuilder()
          .setTitle("This post is private or unavailable !")
          .setDescription(
            `[See posts, photos and more on Facebook](<${facebookUrl}>)`,
          )
          .setColor(Colors.Yellow);
        await message.reply({ embeds: [embed, founderEmbed] });
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
          : message.content.startsWith(value.match),
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

        sendText =
          index == 0 ? `${mentionText}${content.content}` : content.content;
        content.replyMessage && message.reference && message.reference.messageId
          ? await message.reply(sendText)
          : await message.channel.send(sendText);
      });
    } catch (error) {
      this.client.logger.writeLog(error);
    }
  };
}
