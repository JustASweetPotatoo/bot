import { Message, MessagePayload, TextChannel, VoiceChannel } from "discord.js";

/**
 *
 * @param {Message | TextChannel} target
 * @param {MessagePayload} options
 * @param {number} timer Delete after miliseconds
 */
export const sendTemporatyMessage = async (target, options, timer) => {
  let replyMessage;

  if (target instanceof Message) {
    replyMessage = await target.reply(options);
  } else if (target instanceof TextChannel || target instanceof VoiceChannel) {
    replyMessage = await target.send(options);
  } else throw new Error("Invalid target type.");

  if (replyMessage) {
    setTimeout(async () => {
      if (replyMessage.deletable) {
        await replyMessage.delete();
      }
    }, timer);
  }
};
