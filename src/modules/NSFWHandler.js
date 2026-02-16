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

export default class NSFWVerifyHandler extends Handler {
  requestList = [];
  requestStorageChannel = undefined;
  requestChannel = undefined;
  NSFWRole = undefined;

  /**
   *
   * @param {Message<true>} message
   */
  async onMessage(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return;
    }

    if (message.content.startsWith("send-NSFW-request-generator")) {
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
    }
  }

  /**
   *
   * @param {ButtonInteraction} interaction
   */
  async onButtonInteractionCreate(interaction) {
    if (!this.requestStorageChannel) {
      this.requestStorageChannel = await interaction.guild.channels.fetch(
        "1472827635011817553"
      );
    }

    if (!this.requestChannel) {
      this.requestChannel = await interaction.guild.channels.fetch("1472808372561772574");
    }

    if (interaction.customId == "create_request") {
      let request = this.requestList.find(
        (request) => request.userId == interaction.user.id
      );

      if (!request) {
        request = {
          id: generateUUID(),
          userId: interaction.user.id,
          status: "pending",
        };
      } else if (request.status == "pending") {
        await interaction.reply({
          content: "You already have a pending request!",
          ephemeral: true,
        });
        return;
      }

      this.requestList.push(request);

      const acceptRequestBtn = new ButtonBuilder()
        .setCustomId(`accept-request-${request.id}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success);

      const denyRequestBtn = new ButtonBuilder()
        .setCustomId(`deny-request-${request.id}`)
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger);

      const deleteRequestBtn = new ButtonBuilder()
        .setCustomId(`delete-request-${request.id}`)
        .setLabel("Delete Request")
        .setStyle(ButtonStyle.Danger);

      const actionRow = new ActionRowBuilder().addComponents([
        acceptRequestBtn,
        denyRequestBtn,
        deleteRequestBtn,
      ]);

      await this.requestStorageChannel.send({
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

      return;
    }

    if (interaction.customId.startsWith("accept-request-")) {
      const requestId = interaction.customId.split("accept-request-")[1];
      let request = this.requestList.find((request) => request.id == requestId);

      if (!request) {
        await interaction.reply({ content: "Request not found!", ephemeral: true });
        return;
      }

      if (request.status == "accepted") {
        await interaction.reply({
          content: `This request has already been ${request.status}!`,
          ephemeral: true,
        });
        return;
      }

      request.status = "accepted";

      const deleteRequestBtn = new ButtonBuilder()
        .setCustomId(`delete-request-${request.id}`)
        .setLabel("Delete Request")
        .setStyle(ButtonStyle.Danger);

      const actionRow = new ActionRowBuilder().addComponents(deleteRequestBtn);

      const embed = new EmbedBuilder()
        .setTitle("Request Accepted")
        .setDescription(`The request from <@${request.userId}> has been accepted!`)
        .setColor("Green");

      if (!this.NSFWRole) {
        this.NSFWRole = await interaction.guild.roles.fetch("1472545522576261171");
      }

      const member = await interaction.guild.members.fetch(request.userId);

      if (!member) {
        await interaction.reply({ content: "User not found!", ephemeral: true });
        return;
      }

      await member.roles.add(this.NSFWRole);

      await interaction.message.edit({
        embeds: [embed],
        components: [actionRow],
      });

      interaction.isRepliable()
        ? await interaction.reply({ content: "Request accepted!", ephemeral: true })
        : undefined;

      return;
    }

    if (interaction.customId.startsWith("deny-request-")) {
      const requestId = interaction.customId.split("deny-request-")[1];
      let request = this.requestList.find((request) => request.id == requestId);

      if (!request) {
        await interaction.reply({ content: "Request not found!", ephemeral: true });
        return;
      }

      if (request.status == "denied") {
        await interaction.reply({
          content: `This request has already been ${request.status}!`,
          ephemeral: true,
        });
        return;
      }

      request.status = "denied";

      const deleteRequestBtn = new ButtonBuilder()
        .setCustomId(`delete-request-${request.id}`)
        .setLabel("Delete Request")
        .setStyle(ButtonStyle.Danger);

      const actionRow = new ActionRowBuilder().addComponents(deleteRequestBtn);

      await interaction.message.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("Request Denied")
            .setDescription(`The request from <@${request.userId}> has been rejected!`)
            .setColor("Red"),
        ],
        components: [actionRow],
      });

      await interaction.reply({ content: "Operation completed!", ephemeral: true });
    }

    if (interaction.customId.startsWith("delete-request-")) {
      const requestId = interaction.customId.split("delete-request-")[1];

      this.requestList = this.requestList.filter((request) => request.id != requestId);

      await interaction.message.delete();

      await interaction.reply({ content: "Operation completed!", ephemeral: true });
    }
  }
}
