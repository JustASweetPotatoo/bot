import { Colors, EmbedBuilder, Message, TextChannel, WebhookClient } from "discord.js";
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

      if (!this.webhookClient) {
        this.webhookClient = new WebhookClient({
          url: "https://discord.com/api/webhooks/1485841575912280105/Iv-_YLIYRqAL9PTbPtu2lQzRyqOa6OPprkDJxuHo7oy9o0nOGQuNTcPg3eY9OLeRl3Oz",
        });
      }

      if (cache[videoReelId]) {
        await this.webhookClient.send({
          content: wrapLinks(message.content) + `\n${cache[videoReelId]}`,
        });
        return;
      }

      const path = await downloadVideo(videoLink, `${videoReelId}.mp4`);

      if (!path) return;

      const messageSent = await this.webhookClient.send({
        content: wrapLinks(message.content),
        username: message.author.displayName,
        avatarURL: message.author.avatarURL(),
        files: [path],
      });

      // const sendMessage = await message.channel.send({
      //   embeds: [
      //     new EmbedBuilder()
      //       .setAuthor({
      //         name: message.author.username,
      //         iconURL: message.author.avatarURL(),
      //       })
      //       .setTitle(`From ${message.author.username}`)
      //       .setDescription(`Link <${findFBUrl(message.content)}>`)
      //       .setColor(Colors.Blurple)
      //       .setFooter({ text: `Powered by Discord-Potarozz` })
      //       .setTimestamp(),
      //   ],
      //   files: [path],
      // });

      if (message.deletable) await message.delete();

      cache[videoReelId] = messageSent.attachments.at(0).proxy_url;

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
