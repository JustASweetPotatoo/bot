import { Events } from "discord.js";

/**
 * @typedef {import("../Client.js").default} MossClient
 */

export default class Logger {
  /**
   *
   * @param {MossClient} client
   */
  constructor(client) {
    this.client = client;

    client.on(Events.ClientReady, async () => {
      this.guild = await this.client.guilds.fetch("1283480997157015642");
      if (!this.guild) return;
      this.logChannel = await this.guild.channels.fetch("1571737334393606164");
    });
  }

  /**
   *
   * @param {string | Error} content
   */
  writeLog(content) {
    try {
      if (!this.logChannel) {
        console.error("Log channel not detected, print to console !");
        console.warn(content);
        return;
      }
      if (content instanceof Error) {
        this.logChannel.send(`\`\`\`diff\n- ${content.stack}\`\`\``);
      } else {
        this.logChannel.send(`\`\`\`${content}\`\`\``);
      }
    } catch (error) {
      console.log(error + "\n" + content);
    }
  }
}
