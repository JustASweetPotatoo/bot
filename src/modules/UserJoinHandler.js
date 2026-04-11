import { Events, GuildMember } from "discord.js";
import Handler from "./Handler.js";
import MossClient from "../Client.js";

export default class UserJoinHandler extends Handler {
  /**
   *
   * @param {{client: MossClient}} options
   */
  constructor(options) {
    super(options);

    this.guild = this.client.guilds.cache.get("811939594882777128");
    this.kickTime = 5 * 60 * 1000;

    setInterval(async () => {
      try {
        if (!this.guild)
          this.guild = await this.client.guilds.fetch("811939594882777128");

        let memberKickList = [];

        const rows = await this.client.joinSessionService.getAll();
        rows.forEach((userData) => {
          const timestamp = parseInt(userData.join_timestamp ?? "0");
          if (timestamp == 0) {
            throw new Error(`Invalid timestamp format, value: ${userData}`);
          }

          const member = this.guild.members.cache.get(userData.id);

          if (!member) return;

          const role = member.roles.cache.get("1301219249842556938");

          if (!role) {
            memberKickList.push(member);
          }
        });

        for (const member of memberKickList) {
          try {
            if (member instanceof GuildMember) {
              await member.send({
                content:
                  "You have been kicked from Thiên Hà Của Sứa with reason: Don't have role ***Neuron*** after join server 5 minutes",
              });
            }

            setTimeout(
              () => member.kick().catch((err) => this.client.logger.writeLog(err)),
              5000
            );
          } catch (error) {
            this.client.logger.writeLog(error);
          }
        }
      } catch (error) {
        this.client.logger.writeLog(error);
      }
    }, this.kickTime);
  }

  /**
   *
   * @param {GuildMember} member
   */
  async onMemberAdd(member) {
    try {
      await this.client.joinSessionService.create({
        id: member.id,
        join_timestamp: toString(member.joinedTimestamp),
      });
    } catch (error) {
      this.client.logger.writeLog(error);
    }
  }
}
