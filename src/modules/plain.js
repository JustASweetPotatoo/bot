import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import Handler from "./Handler.js";
import { generateUUID } from "../utils/UUID.js";

export default class NSFWHandler extends Handler {
  requestList = [];
  NSFWRole = undefined;
  adminChannel = undefined;

  /**
   *
   * @param {Message<true>} message
   */
  async onMessage(message) {
    if (
      message.channelId == "1472808372561772574" &&
      (message.author.id == "866628870123552798" ||
        message.author.id == "1033622279768264744")
    ) {
      if (message.content.toLowerCase().startsWith("create")) {
        const embed = new EmbedBuilder()
          .setTitle("NSFW Request")
          .setDescription("Click the button below to create a NSFW verify request!")
          .setColor("Red");

        const createRequestBtn = new ButtonBuilder()
          .setCustomId("create_request")
          .setLabel("Create Request")
          .setStyle("Primary");

        const actionRow = new ActionRowBuilder().addComponents(createRequestBtn);

        await message.channel.send({
          embeds: [embed],
          components: [actionRow],
        });
      } else if (message.content.toLowerCase().startsWith("take")) {
        const requestId = message.content.split(" ")[1];

        const request = this.requestList.find((request) => request.id == requestId);

        if (!request) {
          await message.reply({ content: "Request not found!" });
          return;
        }

        await message.reply({
          content: `Request info:\n- User ID: <@${request.userId}>\n- Status: ${request.status}`,
        });
      }
    }
  }

  /**
   *
   * @param {ButtonInteraction} interaction
   */
  async onButtonInteractionCreate(interaction) {
    if (interaction.customId == "create_request") {
      let request = this.requestList.find(
        (request) => request.userId == interaction.user.id
      );

      if (request) {
        await interaction.reply({
          content:
            request.status == "pending"
              ? "You already have a pending request!"
              : `Your request has been ${request.status}!`,
          ephemeral: true,
        });
        return;
      } else {
        request = {
          id: generateUUID(),
          userId: interaction.user.id,
          status: "pending",
        };
        this.requestList.push(request);
      }

      if (!this.adminChannel) {
        this.adminChannel = await interaction.guild.channels.fetch("1472827635011817553");
        if (!this.adminChannel) {
          await interaction.reply({
            content: "Error! Channel not found.",
            ephemeral: true,
          });
          return;
        }
      }

      const actionRow = new ActionRowBuilder().addComponents([
        new ButtonBuilder()
          .setCustomId(`accept_request_${interaction.user.id}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`deny_request_${interaction.user.id}`)
          .setLabel("Deny")
          .setStyle(ButtonStyle.Danger),
      ]);

      await this.adminChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("Admin claimer!")
            .setDescription(`Request from <@${interaction.user.id}>`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp()
            .setColor("Yellow")
            .setFooter({ text: `Request id: ${request.id}` }),
        ],
        components: [actionRow],
      });

      await interaction.reply({
        content: "Your request has been created!",
        ephemeral: true,
      });
    }

    if (interaction.customId.startsWith("delete_request_")) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "You don't have permission to interact this button!",
          ephemeral: true,
        });
        return;
      }

      const userId = interaction.customId.split("delete_request_")[1];

      const request = this.requestList.find((request) => request.userId == userId);

      if (!request) {
        let member = interaction.guild.members.fetch(userId);

        if (!member) {
          await interaction.reply({ content: "User not found!", ephemeral: true });
          return;
        }

        request = {
          id: generateUUID(),
          userId: userId,
          status: "pending",
        };
        this.requestList.push(request);
      }

      if (!request) {
        await interaction.reply({ content: "Request not found!", ephemeral: true });
        return;
      }

      if (request.status == "accepted") {
        await interaction.reply({
          content: "Request message deleted!",
          ephemeral: true,
        });
        await interaction.message.delete();
        return;
      }

      if (request.status == "denied") {
        this.requestList = this.requestList.filter((request) => request.userId != userId);
        await interaction.reply({ content: "Request deleted!", ephemeral: true });
        await interaction.message.delete();
        return;
      }
    }

    if (interaction.customId.startsWith("accept_request_")) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "You don't have permission to interact this button!",
          ephemeral: true,
        });
        return;
      }

      const userId = interaction.customId.split("accept_request_")[1];
      let request = this.requestList.find((request) => request.userId == userId);

      if (!request) {
        let member = interaction.guild.members.fetch(userId);

        if (!member) {
          await interaction.reply({ content: "User not found!", ephemeral: true });
          return;
        }

        request = {
          id: generateUUID(),
          userId: userId,
          status: "pending",
        };
        this.requestList.push(request);
      }

      if (!request) {
        await interaction.reply({ content: "Request not found!", ephemeral: true });
        return;
      }

      request.status = "accepted";

      if (!this.NSFWRole) {
        this.NSFWRole = await interaction.guild.roles.fetch("1472545522576261171");
      }

      const member = await interaction.guild.members.fetch(userId);

      if (!member) {
        await interaction.reply({ content: "User not found!", ephemeral: true });
        return;
      }

      await member.roles.add(this.NSFWRole);

      const deleteBtn = new ButtonBuilder()
        .setCustomId(`delete_request_${userId}`)
        .setLabel("Delete Request")
        .setStyle(ButtonStyle.Danger);

      const actionRow = new ActionRowBuilder().addComponents(deleteBtn);

      await interaction.message.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("Request Accepted")
            .setDescription(`The request from <@${request.userId}> has been accepted!`)
            .setColor("Green"),
        ],
        components: [actionRow],
      });

      interaction.isRepliable()
        ? interaction.reply({ content: "Request accepted!", ephemeral: true })
        : undefined;
    }

    if (interaction.customId.startsWith("deny_request_")) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "You don't have permission to interact this button!",
          ephemeral: true,
        });
        return;
      }

      const userId = interaction.customId.split("deny_request_")[1];
      const request = this.requestList.find((request) => request.userId == userId);

      if (!request) {
        await interaction.reply({ content: "Request not found!", ephemeral: true });
        return;
      }

      request.status = "denied";

      const deleteBtn = new ButtonBuilder()
        .setCustomId(`delete_request_${userId}`)
        .setLabel("Delete Request")
        .setStyle(ButtonStyle.Danger);

      const actionRow = new ActionRowBuilder().addComponents(deleteBtn);

      await interaction.message.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("Request Denied")
            .setDescription(`The request from <@${request.userId}> has been rejected!`)
            .setColor("Red"),
        ],
        components: [actionRow],
      });
    }
  }
}
