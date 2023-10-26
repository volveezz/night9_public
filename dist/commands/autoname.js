import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { Command } from "../structures/command.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";
const SlashCommand = new Command({
    name: "autoname",
    description: "Управление автоматической сменой установкой своего ника",
    descriptionLocalizations: {
        "en-US": "Enable or disable automatic nickname changes",
        "en-GB": "Enable or disable automatic nickname changes",
    },
    global: true,
    run: async ({ client, interaction }) => {
        const userDataPromise = AuthData.findByPk(interaction.user.id);
        const memberPromise = client.getMember(interaction.member || interaction.user.id);
        const [userData, member] = await Promise.all([userDataPromise, memberPromise]);
        if (!userData)
            throw { errorType: "DB_USER_NOT_FOUND" };
        const isAutonameEnabled = userData.displayName.startsWith("⁣") ? true : false;
        const embed = new EmbedBuilder()
            .setColor(colors.default)
            .setTitle(!isAutonameEnabled ? "Отключите автоматическую смену ника" : "Включите автоматическую смену ника")
            .addFields([
            { name: "Часовой пояс", value: userData.timezone ? `+${userData.timezone}` : "Не указан", inline: true },
            { name: "Сохраненный ник", value: userData.displayName ? userData.displayName.replace("⁣", "") : "Не сохранен", inline: true },
            { name: "Текущий ник", value: member.displayName || "Не указан", inline: true },
        ]);
        const components = [
            new ButtonBuilder()
                .setCustomId("autoname_enable")
                .setLabel("Включить")
                .setStyle(ButtonStyle.Success)
                .setDisabled(!isAutonameEnabled),
            new ButtonBuilder()
                .setCustomId("autoname_disable")
                .setLabel("Отключить")
                .setStyle(ButtonStyle.Danger)
                .setDisabled(isAutonameEnabled),
        ];
        const collector = (await interaction.reply({ embeds: [embed], ephemeral: true, components: addButtonsToMessage(components) })).createMessageComponentCollector({
            max: 1,
            time: 60 * 2 * 1000,
            filter: (i) => i.user.id === interaction.user.id,
            componentType: ComponentType.Button,
        });
        collector.on("collect", async (i) => {
            i.deferUpdate();
            if (userData.displayName.replace("⁣", "").length <= 0)
                throw { name: "Ваш ник слишком короткий" };
            if (userData.displayName.startsWith("⁣") && isAutonameEnabled) {
                userData.displayName = userData.displayName.replace("⁣", "");
                embed.setTitle("Вы включили автоматическую смену ника");
            }
            else if (!userData.displayName.startsWith("⁣") && !isAutonameEnabled) {
                userData.displayName = "⁣" + userData.displayName;
                embed.setTitle("Вы отключили автоматическую смену ника");
            }
            else {
                embed.setColor(colors.invisible).setTitle(`Автоматическая смена ника уже ${isAutonameEnabled ? "включена" : "отключена"}`);
            }
            await userData.save();
            interaction.editReply({ embeds: [embed], components: [] });
        });
        collector.on("end", (_, reason) => {
            const embed = new EmbedBuilder().setColor(colors.invisible).setTitle("Время на выбор вышло. Повторно введите команду");
            if (reason === "time")
                interaction.editReply({ embeds: [embed] });
        });
    },
});
export default SlashCommand;
//# sourceMappingURL=autoname.js.map