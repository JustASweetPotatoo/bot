import MossClient from "../Client.js";

export default class Logger {
  /**
   *
   * @param {MossClient} client
   */
  constructor(client) {
    this.client = client;

    client.on("ready", () => {
      this.guild = this.client.guilds.cache.get("811939594882777128");
      this.logChannel = this.guild.channels.cache.get("1438055867202277428");
    });
  }

  /**
   *
   * @param {string | Error} content
   */
  writeLog(content) {
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

    console.log(content);
  }
}
