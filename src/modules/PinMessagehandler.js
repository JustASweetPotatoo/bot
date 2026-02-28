import { Collection, Colors, EmbedBuilder, Message } from "discord.js";
import Handler from "./Handler.js";
import { sendTemporatyMessage } from "../utils/autoMessage.js";

export default class PinMessageHandler extends Handler {
  pinMessageMetadataCollection = new Collection();

  /**
   *
   * @param {Message<true>} message
   */
  async onMessage(message) {
    const pinMessageMetadata = this.pinMessageMetadataCollection.get(message.channelId);
    const channel = message.channel;

    if (!pinMessageMetadata) return;

    if (pinMessageMetadata.count > 3) {
      const oldMessage = await channel.messages.fetch(pinMessageMetadata.oldMessageId);

      if (oldMessage && oldMessage.deletable) {
        await oldMessage.delete();
      }

      const newPinMessage = await channel.send({ content: pinMessageMetadata.content });
      pinMessageMetadata.oldMessageId = newPinMessage.id;

      pinMessageMetadata.count = 0;
    } else {
      pinMessageMetadata.count++;
    }

    this.pinMessageMetadataCollection.set(message.channelId, pinMessageMetadata);
  }

  /**
   * @param {Message<true>} message
   */
  async createPinMessage(message) {
    const pinMessageMetadata = this.pinMessageMetadataCollection.get(message.channelId);
    const args = message.content.split(" ");

    if (pinMessageMetadata) {
      pinMessageMetadata.content = args.slice(1);
      this.pinMessageMetadataCollection.set(message.channelId, pinMessageMetadata);
      await sendTemporatyMessage(
        message,
        {
          embeds: [
            new EmbedBuilder({ title: "Pin message updated !", color: Colors.Green }),
          ],
        },
        5000
      );
      return;
    }

    const newPinMessageMetadata = {
      content: args.slice(1).join(" "),
      count: 0,
      oldMessageId: null,
    };

    const pinMessage = await message.channel.send({
      content: newPinMessageMetadata.content,
    });

    newPinMessageMetadata.oldMessageId = pinMessage.id;

    this.pinMessageMetadataCollection.set(message.channelId, newPinMessageMetadata);
  }
}
