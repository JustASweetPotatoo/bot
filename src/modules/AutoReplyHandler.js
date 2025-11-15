import { Message } from "discord.js";
import Handler from "./Handler.js";

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
  onMessage = async (message) => {
    if (message.content.startsWith("c>")) return;

    const args = message.content.split(" ");

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
  };
}
