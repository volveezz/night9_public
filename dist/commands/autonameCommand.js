import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { AutonameButtons } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Command } from "../structures/command.js";
import { AuthData } from "../utils/persistence/sequelize.js";
export default new Command({
    name: "autoname",
    description: "Управление автоматической сменой установкой своего ника",
    descriptionLocalizations: {
        "en-US": "Enable or disable automatic nickname changes",
        "en-GB": "Enable or disable automatic nickname changes",
    },
    run: async ({ interaction }) => {
        const dbInfo = await AuthData.findByPk(interaction.user.id);
        if (!dbInfo)
            throw { errorType: UserErrors.DB_USER_NOT_FOUND };
        const embed = new EmbedBuilder().setColor(colors.serious).setAuthor({
            name: "Идет обработка...",
            iconURL: icons.loading,
        });
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const nameStatus = dbInfo.displayName.startsWith("⁣") ? true : false;
        embed
            .setAuthor(null)
            .setColor(colors.success)
            .setTitle(!nameStatus ? "Отключите автоматическую смену ника" : "Включите автоматическую смену ника")
            .addFields([
            { name: "Часовой пояс", value: dbInfo.timezone ? `+${dbInfo.timezone}` : "Не указан", inline: true },
            { name: "Сохраненный ник", value: dbInfo.displayName ? dbInfo.displayName.replace("⁣", "") : "Не найден", inline: true },
            { name: "Текущий ник", value: interaction.member?.displayName || "Не указан", inline: true },
        ]);
        const components = [
            {
                type: ComponentType.ActionRow,
                components: [
                    new ButtonBuilder()
                        .setCustomId(AutonameButtons.enable)
                        .setLabel("Включить")
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(!nameStatus),
                    new ButtonBuilder()
                        .setCustomId(AutonameButtons.disable)
                        .setLabel("Отключить")
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(nameStatus),
                ],
            },
        ];
        await deferredReply;
        const collector = (await interaction.editReply({ embeds: [embed], components })).createMessageComponentCollector({
            max: 1,
            time: 60 * 2 * 1000,
        });
        collector.on("collect", async (i) => {
            i.deferUpdate();
            if (dbInfo.displayName.replace("⁣", "").length <= 0)
                throw { name: "Ваш ник слишком короткий" };
            if (dbInfo.displayName.startsWith("⁣") && nameStatus) {
                dbInfo.update({ displayName: dbInfo.displayName.replace("⁣", "") }).then(async () => {
                    embed.setColor(colors.success).setTitle("Вы включили автоматическую смену ника");
                    interaction.editReply({ embeds: [embed], components: [] });
                });
            }
            else if (!dbInfo.displayName.startsWith("⁣") && !nameStatus) {
                dbInfo.update({ displayName: "⁣" + dbInfo.displayName }).then(async () => {
                    embed.setColor(colors.success).setTitle("Вы отключили автоматическую смену ника");
                    interaction.editReply({ embeds: [embed], components: [] });
                });
            }
            else {
                embed.setColor("DarkGreen").setTitle(`Автоматическая смена ника уже ${nameStatus ? "включена" : "отключена"}`);
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
        collector.on("end", (_, reason) => {
            if (reason === "time")
                interaction.editReply({ components: [], embeds: [], content: "Время вышло" });
        });
    },
});