const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const raids = require("../../raids");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createpf")
    .setDescription("Create a Party Finder."),
  async execute(interaction) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("createpartyfinder")
      .setPlaceholder("Select a raid...")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        raids.map((raid) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(raid.label)
            .setDescription(raid.description)
            .setValue(raid.value)
        )
      );

    const dpsMenu = new StringSelectMenuBuilder()
      .setCustomId("selectdps")
      .setPlaceholder("How many DPS do you need?")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions([
        { label: "0", value: "0" },
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
        { label: "5", value: "5" },
        { label: "6", value: "6" },
      ]);

    const supportMenu = new StringSelectMenuBuilder()
      .setCustomId("selectsupport")
      .setPlaceholder("How many Supports do you need?")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions([
        { label: "0", value: "0" },
        { label: "1", value: "1" },
        { label: "2", value: "2" },
      ]);

    const actionRowSelectMenu = new ActionRowBuilder().addComponents(
      selectMenu
    );
    const actionRowDpsMenu = new ActionRowBuilder().addComponents(dpsMenu);
    const actionRowSupportMenu = new ActionRowBuilder().addComponents(
      supportMenu
    );

    let selectedRaid, selectedDps, selectedSupport, selectedRaidValue;
    const reply = await interaction.reply({
      components: [actionRowSelectMenu, actionRowDpsMenu, actionRowSupportMenu],
      ephemeral: true,
    });

    const filterCollector = (i) =>
      i.user.id === interaction.user.id &&
      (i.customId === "createpartyfinder" ||
        i.customId === "selectdps" ||
        i.customId === "selectsupport");

    const collector = interaction.channel.createMessageComponentCollector({
      filter: filterCollector,
      time: 60_000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "createpartyfinder") {
        selectedRaid = interaction.values[0];
      } else if (interaction.customId === "selectdps") {
        selectedDps = interaction.values[0];
      } else if (interaction.customId === "selectsupport") {
        selectedSupport = interaction.values[0];
      }

      await interaction.update({
        content: `Selected Raid: ${selectedRaid || "-----"}, DPS: ${
          selectedDps || ""
        }, Support: ${selectedSupport || ""}`,
        components: [
          actionRowSelectMenu,
          actionRowDpsMenu,
          actionRowSupportMenu,
        ],
      });

      if (selectedRaid && selectedDps && selectedSupport) {
        collector.stop();
      }
    });

    collector.on("end", async () => {
      const selectedRaidDetails = raids.find(
        (raid) => raid.value === selectedRaid
      );
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.user.displayName}'s Party Finder`,
        })
        .setTitle(`${selectedRaid}`)
        .setDescription(
          `__${raids.find((raid) => raid.value === selectedRaid).description}__`
        )
        .addFields(
          {
            name: "DPS Needed",
            value: selectedDps ? selectedDps.toString() : "-",
            inline: true,
          },
          {
            name: "Supports Needed",
            value: selectedSupport ? selectedSupport.toString() : "-",
            inline: true,
          }
        )
        .setColor(selectedRaidDetails.color)
        .setFooter({
          text: "Party Finder",
        })
        .setTimestamp();

      const dpsUsers = [];
      const supportUsers = [];

      const dpsButton = new ButtonBuilder()
        .setCustomId("dps")
        .setLabel("Join as DPS")
        .setStyle(ButtonStyle.Primary);

      const supportButton = new ButtonBuilder()
        .setCustomId("support")
        .setLabel("Join as Support")
        .setStyle(ButtonStyle.Primary);

      const actionRowJoin = new ActionRowBuilder().addComponents(
        dpsButton,
        supportButton
      );

      const deleteButton = new ButtonBuilder()
        .setCustomId("delete")
        .setLabel("Delete")
        .setStyle(ButtonStyle.Danger);

      const extendButton = new ButtonBuilder()
        .setCustomId("extend")
        .setLabel("Extend")
        .setStyle(ButtonStyle.Secondary);

      const actionRowControl = new ActionRowBuilder().addComponents(
        deleteButton,
        extendButton
      );

      const selectedRaidObject = raids.find(
        (raid) => raid.value === selectedRaid
      );
      const selectedRaidRole = selectedRaidObject.role;

      const message = await interaction.channel.send({
        content: `${selectedRaidRole}`,
        embeds: [embed],
        components: [actionRowControl, actionRowJoin],
      });

      const updateButtonStyles = () => {
        dpsButton.setStyle(
          selectedDps > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary
        );
        supportButton.setStyle(
          selectedSupport > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary
        );
      };

      updateButtonStyles();

      const buttonFilter = (i) => {
        if (
          (i.customId === "dps" && selectedDps > 0) ||
          (i.customId === "support" && selectedSupport > 0)
        ) {
          return true;
        }
        return (
          i.user.id === interaction.user.id &&
          (i.customId === "delete" || i.customId === "extend")
        );
      };

      // Should I just cron this lmao
      let timeout = setTimeout(() => {
        message.delete();
      }, 15 * 60_000);

      const buttonCollector = message.createMessageComponentCollector({
        filter: buttonFilter,
        time: 15 * 60_000,
      });

      buttonCollector.on("collect", async (interaction) => {
        await interaction.deferUpdate();

        if (interaction.isButton()) {
          const username = interaction.user.displayName;

          const newEmbed = new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.displayName}'s Party Finder`,
            })
            .setTitle(`${selectedRaid}`)
            .addFields(
              {
                name: "DPS Needed",
                value: selectedDps ? selectedDps.toString() : "None",
                inline: true,
              },
              {
                name: "Supports Needed",
                value: selectedSupport ? selectedSupport.toString() : "None",
                inline: true,
              }
            )
            .setColor(selectedRaidDetails.color)
            .setFooter({
              text: "Party Finder",
            })
            .setTimestamp();

          if (interaction.customId === "dps" && selectedDps > 0) {
            const userIndex = supportUsers.indexOf(username);
            if (userIndex > -1) {
              supportUsers.splice(userIndex, 1);
            }
            if (!dpsUsers.includes(username)) {
              dpsUsers.push(username);
            }
            updateButtonStyles();

            newEmbed.setDescription(
              `__Applied:__\n* ${dpsUsers.join(" (DPS)\n* ")} (DPS)`
            );
          } else if (
            interaction.customId === "support" &&
            selectedSupport > 0
          ) {
            const userIndex = dpsUsers.indexOf(username);
            if (userIndex > -1) {
              dpsUsers.splice(userIndex, 1);
            }
            if (!supportUsers.includes(username)) {
              supportUsers.push(username);
            }
            updateButtonStyles();

            await message.edit({
              components: [actionRowControl, actionRowJoin],
            });

            newEmbed.setDescription(
              `__Applied:__\n* ${supportUsers.join(" (Support)\n* ")} (Support)`
            );
          }

          if (interaction.customId === "delete") {
            clearTimeout(timeout);
            if (message && !message.deleted) {
              await message.delete().catch((error) => {
                console.error("Failed to delete the message:", error);
              });
              await interaction.followUp({
                content: "Party Finder deleted.",
                ephemeral: true,
              });
            } else {
              await interaction.followUp({
                content: "The message has already been deleted.",
                ephemeral: true,
              });
            }
          } else if (interaction.customId === "extend") {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
              if (message && !message.deleted) {
                message.delete();
              }
            }, 10 * 60_000);
            await interaction.followUp({
              content: "Party Finder extended by 10 minutes.",
              ephemeral: true,
            });
          }

          try {
            await message.edit({ embeds: [newEmbed] });
          } catch (error) {
            if (error.code === 10008) {
              console.error("Party Finder was deleted.");
            } else {
              throw error;
            }
          }
        }
      });

      await interaction.deleteReply();
    });
  },
};
