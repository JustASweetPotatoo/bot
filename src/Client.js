import { Client, Colors, EmbedBuilder, Events, GatewayIntentBits } from "discord.js";
import { fileURLToPath } from "url";
import PrefixCommandHandler from "./modules/PrefixCommandHandler.js";
import DatabaseManager from "./database/DatabaseManager.js";
import LevelHandler from "./modules/LevelHandler.js";
import AutoReplyHandler from "./modules/AutoReplyHandler.js";
import UserService from "./database/UserService.js";
import Logger from "./modules/Logger.js";

class MossClient extends Client {
  __systemPath = fileURLToPath(import.meta.url)
    .replace("\\Client.js", "")
    .replace("/Client.js", "");

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.on(Events.ClientReady, () => {
      console.log(`Logged in as ${this.user.tag}`);
      this.logger.writeLog(`Logged in as ${this.user.tag}`);
    });

    this.databaseManager = new DatabaseManager(this);
    this.logger = new Logger(this);

    this.userService = new UserService(this);

    this.prefixCommandHandler = new PrefixCommandHandler({ client: this });
    this.levelHandler = new LevelHandler({ client: this });
    this.autoReplyHandler = new AutoReplyHandler({ client: this });

    this.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;

      try {
        this.prefixCommandHandler.onMessage(message);
        this.levelHandler.onMessage(message);
        this.autoReplyHandler.onMessage(message);
      } catch (error) {
        const replyMessage = await message.reply({
          embeds: [
            new EmbedBuilder({
              title: "Error on executing event messageCreate !",
              color: Colors.Red,
            }),
          ],
        });

        this.logger.writeLog(error);

        setTimeout(() => {
          if (replyMessage.deletable) replyMessage.delete();
        }, 5000);
      }
    });
  }

  async join() {
    const { DISCORD_BOT_TOKEN } = process.env;

    if (await this.databaseManager.createConnection()) {
      let content = "Force shutdown !";
      this.logger.writeLog(new Error(content));
      console.warn(content);
      return;
    }

    this.login(DISCORD_BOT_TOKEN);
  }
}

export default MossClient;
