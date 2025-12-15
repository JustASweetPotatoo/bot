import { Colors, EmbedBuilder, Message, TextChannel } from "discord.js";
import Handler from "./Handler.js";
import { calcLevel, getRandomInt } from "../utils/random.js";

/**
 * @param {string} messageContent
 */
function calcExp(messageContent) {
  const contentMaxLength = 100;
  const contentSplitedMaxLenght = 20;

  const contentSplitedLength = messageContent.split(" ").length; // 1
  const contentLenght = messageContent.length; // 1

  const ratio_1 =
    contentLenght > contentMaxLength ? 1.0 : contentLenght / contentMaxLength;
  const ratio_2 =
    contentSplitedLength > contentSplitedMaxLenght
      ? 1.0
      : contentSplitedLength / contentSplitedMaxLenght;

  const ratio = (ratio_1 + 2 * ratio_2) / 2;
  const final = ratio / 2 < 0.5 ? 0.5 : ratio / 2;

  return Math.ceil(getRandomInt(25, 35) * final);
}

class LevelHandler extends Handler {
  checkpointList = [
    { roleId: "1178724878615056474", from: 80, to: 1000 },
    { roleId: "1178699000795373690", from: 50, to: 79 },
    { roleId: "1178698944117747864", from: 30, to: 49 },
    { roleId: "1178698847766204528", from: 10, to: 29 },
  ];

  /**
   *
   * @param {Message<true>} message
   * @returns
   */
  onMessage = async (message) => {
    if (message.content.startsWith("c>")) return;
    if (message.guildId != "811939594882777128") return;

    const xpPlus = calcExp(message.content);

    const user = message.member;
    let userData = await this.client.userService.get(message.author.id);

    if (!userData) {
      userData = {
        id: message.id,
        level: 0,
        message_count: 0,
        xp: 0,
        achivement_id: undefined,
      };
    }

    const oldLevel = userData.level;
    let checkpointChanged = false;
    let newRole = undefined;

    if (!userData) {
      await this.client.userService.create(message.author.id);
      return;
    }

    userData.xp += xpPlus;
    userData.level = calcLevel(userData.xp);
    userData.message_count += 1;

    if (!this.logChannel) {
      this.logChannel = await message.guild.channels.fetch("938734812494176266");
    } else if (!this.logChannel || !(this.logChannel instanceof TextChannel)) {
      return;
    }

    // Check the level of user after add xp, if user level up, continue
    if (oldLevel < userData.level) {
      const checkpoint = this.checkpointList.find(
        (cp) => userData.level >= cp.from && userData.level <= cp.to
      );

      // Check if checkpoint changed
      if (
        checkpoint &&
        (!userData.achivement_id || checkpoint.roleId != userData.achivement_id)
      ) {
        checkpointChanged = true;
        userData.achivement_id = checkpoint.roleId;
      }

      if (checkpointChanged) {
        user.roles.cache
          .filter((role) => this.checkpointList.find((cp) => cp.roleId == role.id))
          .forEach((role) => user.roles.remove(role));

        const newCheckpointRole = message.guild.roles.cache.get(checkpoint.roleId);

        if (!newCheckpointRole) {
          throw new Error(
            "Can't find the role with id " + checkpoint.roleId + " of checkpoint."
          );
        }

        userData.achivement_id = newCheckpointRole.id;
        newRole = newCheckpointRole;
        await user.roles.add(newCheckpointRole);
      }

      const embed = new EmbedBuilder({
        title: `Bạn đã đạt level ${userData.level}`,
        description: `${
          checkpointChanged ? `\n*Bạn đã đạt được thành tựu:**${newRole.name}***` : ""
        }`,
        color: Colors.Blurple,
      });

      await this.logChannel.send({
        content: `<@${userData.id}> Level up !`,
        embeds: [embed],
      });
    }

    await this.client.userService.insert(userData);
  };
}

export default LevelHandler;
