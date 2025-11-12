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
    if (content instanceof String) {
      this.logChannel.send(`\`\`\`${content}\`\`\``);
    } else {
      this.logChannel.send(`\`\`\`diff\n- ${content}\`\`\``);
    }
  }
}
