import { Message } from "discord.js";
import Handler from "./Handler.js";
import fs from "fs";
import { pipeline } from "stream/promises";

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
  return url.replace("https://www.facebook.com", "http://python:9812");
}

function extractVideoLink(html) {
  const match = html.match(/<meta property="og:video:secure_url" content="([^"]+)"/);
  return match ? match[1] : null;
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

const cache = {};

export default class AutoReplyHandler extends Handler {
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

      if (!videoLink) return;

      if (cache[videoReelId]) {
        await message.reply({ content: cache[videoReelId] });
        return;
      }

      const path = await downloadVideo(videoLink, `${videoReelId}.mp4`);

      if (!path) return;

      const sendMessage = await message.reply({ files: [path] });

      cache[videoReelId] = sendMessage.attachments.at(0).proxyURL;

      if (fs.readFileSync(path));
      fs.unlinkSync(path);
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
