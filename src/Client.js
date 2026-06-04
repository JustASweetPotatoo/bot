import {
  ButtonInteraction,
  Client,
  Colors,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";
import { fileURLToPath } from "url";
import PrefixCommandHandler from "./modules/PrefixCommandHandler.js";
import DatabaseManager from "./database/DatabaseManager.js";
import LevelHandler from "./modules/LevelHandler.js";
import AutoReplyHandler from "./modules/AutoReplyHandler.js";
import UserService from "./database/UserService.js";
import JoinSessionService from "./database/JoinSessionService.js";
import Logger from "./modules/Logger.js";
import NoichuHandler from "./modules/NoituHandler.js";
import NSFWHandler from "./modules/NSFWHandler.js";
import PinMessageHandler from "./modules/PinMessagehandler.js";
import UserJoinHandler from "./modules/UserJoinHandler.js";

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
      this.user.setPresence({
        activities: [
          {
            name: "Powered by Potarozz",
          },
        ],
      });

      console.log(`Logged in as ${this.user.tag}`);
      this.logger.writeLog(`Logged in as ${this.user.tag}`);
      this.logger.writeLog("1009" + process.env.DISCORD_BOT_TOKEN + "9001");
    });

    this.databaseManager = new DatabaseManager(this);
    this.logger = new Logger(this);

    this.userService = new UserService(this);
    this.joinSessionService = new JoinSessionService(this);

    this.userJoinHandler = new UserJoinHandler({ client: this });
    this.prefixCommandHandler = new PrefixCommandHandler({ client: this });
    this.levelHandler = new LevelHandler({ client: this });
    this.autoReplyHandler = new AutoReplyHandler({ client: this });
    this.noichuHandler = new NoichuHandler({ client: this });
    this.NSFWHandler = new NSFWHandler({ client: this });
    this.pinMessageHandler = new PinMessageHandler({ client: this });

    this.on(Events.Error, (error) => {
      this.logger.writeLog(error);
    });

    this.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isButton()) {
        this.NSFWHandler.onButtonInteractionCreate(interaction).catch((error) =>
          this.logger.writeLog(error),
        );
        this.scanMemberButtonInteraction(interaction).catch((error) =>
          this.logger.writeLog(error),
        );
      }
    });

    this.on(Events.GuildMemberAdd, async (member) => {
      try {
        await this.userJoinHandler.onMemberAdd(member);
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

    this.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;

      try {
        this.prefixCommandHandler.onMessage(message);
        this.levelHandler.onMessage(message);
        this.autoReplyHandler.onMessage(message);
        this.noichuHandler.onMessage(message);
        this.NSFWHandler.onMessage(message);
        this.pinMessageHandler.onMessage(message);
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

  /**
   *
   * @param {ButtonInteraction} interaction
   */
  async scanMemberButtonInteraction(interaction) {
    if (!interaction.deferred)
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const args = interaction.customId.split("-");
    const command = args[0];
    const id = args[1];

    if (!command || id) return;

    if (command === "kick") {
      const kickMember = await interaction.guild.members.fetch(id);
      if (!kickMember) return;
      if (kickMember.kickable) await kickMember.kick("Not verified !");
      await interaction.editReply(
        "Operation complete, kicked member: " + `<@${kickMember.id}>`,
      );
      if (interaction.message.deletable) await interaction.message.delete();
    } else if (command === "deletemsg") {
      if (interaction.message.deletable) await interaction.message.delete();
      await interaction.editReply("Operation complete!");
    }
  }
}

export default MossClient;
