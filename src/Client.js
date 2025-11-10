import { Client, Events, GatewayIntentBits } from "discord.js";
import { fileURLToPath } from "url";
import PrefixCommandHandler from "./modules/PrefixCommandHandler.js";
import DatabaseManager from "./database/DatabaseManager.js";
import LevelHandler from "./modules/LevelHandler.js";
import AutoReplyHandler from "./modules/AutoReplyHandler.js";
import UserService from "./database/UserService.js";

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
    });

    this.databaseManager = new DatabaseManager(this);

    this.userService = new UserService(this);

    this.prefixCommandHandler = new PrefixCommandHandler({ client: this });
    this.levelHandler = new LevelHandler({ client: this });
    this.autoReplyHandler = new AutoReplyHandler({ client: this });

    this.on(Events.MessageCreate, (message) => {
      if (message.author.bot) return;

      this.prefixCommandHandler.onMessage(message);
      this.levelHandler.onMessage(message);
      this.autoReplyHandler.onMessage(message);
    });
  }

  async join() {
    const { DISCORD_BOT_TOKEN } = process.env;

    if (await this.databaseManager.createConnection()) {
      console.warn("Force shutdown!");
      return;
    }

    this.login(DISCORD_BOT_TOKEN);
  }
}

export default MossClient;
