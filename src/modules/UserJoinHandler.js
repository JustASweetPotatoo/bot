import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ContainerBuilder,
  Events,
  GuildMember,
  LabelBuilder,
  Message,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionsBitField,
  SectionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder,
} from "discord.js";
import Handler from "./Handler.js";
import { createClient } from "redis";
import { randomInt } from "node:crypto";

const GUILD_ID = "811939594882777128";
const VERIFY_ROLE_ID = "1301219249842556938";
const VERIFY_BUTTON_ID = "verify-button";
const VERIFY_MESSAGE_AUTHOR_ID = "866628870123552798";
const SESSION_TTL_SECONDS = 24 * 60 * 60;

/**
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export default class UserJoinHandler extends Handler {
  redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`,
  });

  /**
   *
   * @param {{client: import("../Client.js").default}} options
   */
  constructor(options) {
    super(options);

    this.guild = this.client.guilds.cache.get(GUILD_ID);
    this.kickTime = SESSION_TTL_SECONDS * 1000;
    this.intervalTimer = 1000 * 60 * 60 * 1;
    this.systemIntervalRunning = false;
    this.kickPermissionWarningLogged = false;

    this.redisClient.on("error", (error) => this.logger.writeLog(error));
    this.redisReady = this.redisClient.connect();
    this.redisReady.catch((error) => this.logger.writeLog(error));

    setInterval(() => {
      if (this.systemIntervalRunning) return;

      this.systemIntervalRunning = true;
      this.systemInterval()
        .catch((error) => this.logger.writeLog(error))
        .finally(() => {
          this.systemIntervalRunning = false;
        });
    }, this.intervalTimer);

    this.client.on(Events.InteractionCreate, (interaction) => {
      if (interaction.isModalSubmit()) {
        this.handleModalSubmitInteraction(interaction).catch((error) =>
          this.logger.writeLog(error),
        );
      } else if (interaction.isButton() && interaction.customId === this.verifyButtonId()) {
        this.handleButtonInteraction(interaction).catch((error) => this.logger.writeLog(error));
      }
    });
  }

  async systemInterval() {
    await this.redisReady;
    if (!this.guild) this.guild = await this.client.guilds.fetch(GUILD_ID);

    const members = await this.guild.members.fetch();
    const botMember = this.guild.members.me ?? (await this.guild.members.fetchMe());
    if (!botMember.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      if (!this.kickPermissionWarningLogged) {
        this.logger.writeLog(`Bot is missing Kick Members permission in guild ${this.guild.id}`);
        this.kickPermissionWarningLogged = true;
      }
      return;
    }
    this.kickPermissionWarningLogged = false;

    for (const [id, member] of members) {
      if (
        member.user.bot ||
        member.id === this.guild.ownerId ||
        member.roles.highest.comparePositionTo(botMember.roles.highest) >= 0 ||
        member.roles.cache.has(VERIFY_ROLE_ID) ||
        !member.joinedTimestamp ||
        Date.now() - member.joinedTimestamp < this.kickTime
      ) {
        continue;
      }

      const sessionKey = this.key(member.id, member.joinedTimestamp);
      const session = await this.redisClient.hGetAll(sessionKey);

      if (session.verified === "true") {
        continue;
      }

      try {
        this.logger.writeLog(
          `Kicking member UID ${member.id}, joined timestamp ${member.joinedTimestamp}`,
        );

        if (member.kickable) {
          await member.kick(
            "Don't have role ***Neuron*** after joining the server for 1 day (anti clone).",
          );
        }

        await member.send({
          content:
            "You have been kicked from Thiên Hà Của Sứa with reason: Don't have role ***Neuron*** after joining the server for 1 day (anti clone).",
        });
      } catch (error) {
        this.logger.writeLog(error);
      }
    }
  }

  /**
   *
   * @param {string} id
   * @param {string} timestamp
   */
  key = (id, timestamp) => `member:${id}:join-session:${timestamp}`;

  verifyButtonId = () => `${this.client.user.id}:${VERIFY_BUTTON_ID}`;

  /**
   *
   * @param {ModalSubmitInteraction} interaction
   */
  async handleModalSubmitInteraction(interaction) {
    if (!interaction.inGuild()) return;

    const sessionPrefix = `member:${interaction.user.id}:join-session:`;
    if (!interaction.customId.startsWith(sessionPrefix)) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await this.redisReady;
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const sessionKey = this.key(member.id, member.joinedTimestamp);
      if (interaction.customId !== sessionKey) {
        await interaction.editReply({ content: "Phiên xác minh không hợp lệ." });
        return;
      }

      const session = await this.redisClient.hGetAll(sessionKey);
      const code = session.code;

      if (session.verified === "true") {
        await interaction.editReply({ content: "Bạn đã được xác minh!" });
        return;
      }

      if (!code) {
        await interaction.editReply({
          content: "Phiên xác minh đã hết hạn hoặc không tồn tại. Vui lòng liên hệ quản trị viên.",
        });
        return;
      }

      const input = interaction.fields.getTextInputValue("code-input");
      if (code !== input) {
        await interaction.editReply({
          content: "Code không hợp lệ!\n-# Nếu bạn không nhận được code, vui lòng báo cho admin.",
        });
        return;
      }

      const role = interaction.guild.roles.cache.get(VERIFY_ROLE_ID);
      if (!role) {
        throw new Error(
          `Verification role ${VERIFY_ROLE_ID} was not found in guild ${interaction.guildId}`,
        );
      }

      const botMember = interaction.guild.members.me ?? (await interaction.guild.members.fetchMe());
      if (
        !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
        botMember.roles.highest.comparePositionTo(role) <= 0 ||
        role.managed
      ) {
        throw new Error(
          `Bot cannot assign verification role ${role.id} in guild ${interaction.guildId}`,
        );
      }

      await member.roles.add(role);
      await this.redisClient.hSet(sessionKey, { verified: "true", code: code });
      await this.redisClient.expire(sessionKey, SESSION_TTL_SECONDS);
      await interaction.editReply({ content: "Bạn đã được xác minh!" });
    } catch (error) {
      this.logger.writeLog(error);
      await interaction
        .editReply({ content: "Có lỗi khi xác minh. Vui lòng thử lại hoặc báo quản trị viên." })
        .catch((replyError) => this.logger.writeLog(replyError));
    }
  }

  /**
   * @param {ButtonInteraction} interaction
   */
  async handleButtonInteraction(interaction) {
    if (!interaction.inGuild() || interaction.customId !== this.verifyButtonId()) return;

    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(VERIFY_ROLE_ID)) {
        await interaction.reply({
          content: "Bạn đã được xác minh!",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await this.redisReady;
      const sessionKey = this.key(member.id, member.joinedTimestamp);
      const session = await this.redisClient.hGetAll(sessionKey);

      if (!session.code) {
        await interaction.reply({
          content:
            "## Bạn chưa xác minh. Đây có thể là lỗi, nếu bạn đã thực hiện đúng các bước vui lòng báo quản trị viên.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const codeInput = new TextInputBuilder()
        .setCustomId("code-input")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("123456...")
        .setMinLength(6)
        .setMaxLength(6);

      const codeLabel = new LabelBuilder()
        .setLabel("Nhập code")
        .setDescription("Nhập code 6 số mà bot gửi cho bạn!")
        .setTextInputComponent(codeInput);

      const modalBuilder = new ModalBuilder()
        .setTitle("Verifying...")
        .setCustomId(sessionKey)
        .addLabelComponents(codeLabel);

      await interaction.showModal(modalBuilder);
    } catch (error) {
      this.logger.writeLog(error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Không thể mở phiên. Vui lòng thử lại hoặc báo admin.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

  /**
   *
   * @param {Message<true>} message
   */
  async createMessage(message) {
    if (
      !message.inGuild() ||
      message.author.id !== VERIFY_MESSAGE_AUTHOR_ID ||
      !message.content.startsWith("create-verify")
    ) {
      return;
    }

    const sectionBuilder = new ContainerBuilder()
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# Bấm nút bên dưới để tiến hành xác minh !"),
            new TextDisplayBuilder().setContent(
              "*Nếu không xác minh, bạn sẽ bị kick khỏi server sau 24 giờ*",
            ),
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder()
              .setURL(
                "https://cdn.discordapp.com/emojis/1062940570533761054.webp?size=96&animated=true",
              )
              .setDescription("Verification status"),
          ),
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(this.verifyButtonId())
            .setLabel("Verify Member")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success),
        ),
      );

    await message.channel.send({
      components: [sectionBuilder],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  /**
   *
   * @param {GuildMember} member
   */
  async onMemberAdd(member) {
    try {
      await this.redisReady;
      const sessionKey = this.key(member.id, member.joinedTimestamp);
      const previousSession = await this.redisClient.hGetAll(sessionKey);

      this.logger.writeLog(`User joined UID: ${member.id}`);

      if (Object.keys(previousSession).length !== 0) {
        return;
      }

      const code = generateOtp();

      await this.redisClient.hSet(sessionKey, {
        verified: "false",
        code: code,
      });

      await this.redisClient.expire(sessionKey, SESSION_TTL_SECONDS);

      const sendVerificationCode = async () => {
        const currentSession = await this.redisClient.hGetAll(sessionKey);
        if (currentSession.verified === "true") {
          return;
        }

        try {
          await member.send({
            content: `
          ## Chào mừng bạn đã đến với Thiên hà của Sứa
          Sử dụng mã này để xác minh trong server

          ## CODE: \`${code}\`
          
          **Hướng dẫn:**
          > -# Sau khi nhận được tinh nhắn, hãy vào kênh #cảng-an-ninh và bấm vào nút xác minh ở tin nhắn mới nhất
          > -# Khi bảng submit hiện lên, nhập code vào đó
          > -# Sau khi hoàn tất và đúng code, bot sẽ gửi tinh nhắn thành công và cấp role cho bạn
          `,
          });
        } catch (error) {
          this.logger.writeLog(JSON.stringify(parseDMError(error)));
        }
      };

      await sendVerificationCode();

      setTimeout(async () => {
        try {
          const currentSession = await this.redisClient.hGetAll(sessionKey);
          if (currentSession.verified === "true") {
            return;
          }

          await sendVerificationCode();
        } catch (error) {
          this.logger.writeLog(error);
        }
      }, 60000);
    } catch (error) {
      this.logger.writeLog(error);
    }
  }
}

import { DiscordAPIError } from "discord.js";

export function parseDMError(error) {
  if (error instanceof DiscordAPIError) {
    switch (error.code) {
      case 50007:
        return {
          code: "CANNOT_SEND_DM",
          message: "Cannot send messages to this user",
          retryable: false,
        };

      case 10013:
        return {
          code: "UNKNOWN_USER",
          message: "Unknown user",
          retryable: false,
        };

      case 20028:
      case 20029:
        return {
          code: "RATE_LIMIT",
          message: "Discord rate limit exceeded",
          retryable: true,
        };
    }
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN",
      message: error.message,
      retryable: false,
    };
  }

  return {
    code: "UNKNOWN",
    message: String(error),
    retryable: false,
  };
}
