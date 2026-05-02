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
    this.kickTime = 1 * 60 * 60 * 1000;

    setInterval(this.systemInterval, 5 * 60 * 1000);
  }

  async systemInterval() {
    try {
      if (!this.guild) this.guild = await this.client.guilds.fetch("811939594882777128");

      const rows = await this.client.joinSessionService.getAll();

      for (const row of rows) {
        const timestamp = parseInt(row.join_timestamp ?? "0");
        if (timestamp == 0) {
          throw new Error(`Invalid timestamp format, value: ${row}`);
        }

        const member = this.guild.members.cache.get(row.id);

        if (!member) return;

        if (timestamp - member.joinedTimestamp > this.kickTime) {
          const role = member.roles.cache.get("1301219249842556938");

          if (!role && member instanceof GuildMember) {
            await member.send({
              content:
                "You have been kicked from Thiên Hà Của Sứa with reason: Don't have role ***Neuron*** after join server 1 day (anti clone)",
            });

            setTimeout(
              () => member.kick().catch((err) => this.client.logger.writeLog(err)),
              5000
            );
          }
        }
      }
    } catch (error) {
      if (this.client.logger)
        this.client.logger.writeLog(error);
      else
        console.log(error);
    }
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

      if (this.client.logger)
        this.client.logger.writeLog(error);
    }
  }
}
