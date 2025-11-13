import { Message } from "discord.js";
import Handler from "./Handler.js";

export default class AutoReplyHandler extends Handler {
  autoReplyData = [
    {
      match: "mmb",
      wildcard: false,
      replyMention: true,
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
  onMessage = async (message) => {
    if (message.content.startsWith("c>")) return;

    for (const item of this.autoReplyData) {
      if ((item.wildcard && message.content.includes(item.content)) || message.content.startsWith(item.match)) {
        item.content.forEach(async (content) => {
          if (item.replyMention) {
            const mentionUser = message.mentions.users.first();
            content.replyMessage
              ? await message.reply({ content: `<@${mentionUser.id}> ${content.content}` })
              : await message.channel.send({ content: content.content });
          } else {
            content.replyMessage ? await message.reply({ content: content.content }) : await message.channel.send({ content: content.content });
          }
        });

        break;
      }
    }
  };
}
