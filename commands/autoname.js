import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { colors } from "../base/colors.js";
import { auth_data } from "../handlers/sequelize.js";
export default {
    name: "autoname",
    description: "Управление автоматической сменой установкой своего ника",
    callback: async (_client, interaction, member, _guild, _channel) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const dbInfo = await auth_data.findOne({ where: { discord_id: interaction.user.id } });
        if (!dbInfo)
            throw { name: "Команда доступна только после регистрации" };
        var nameStatus = dbInfo.displayname.startsWith("⁣") ? true : false;
        const embed = new EmbedBuilder()
            .setColor(colors.default)
            .setTitle(!nameStatus ? "Отключите автоматическую смену ника" : "Включите автоматическую смену ника")
            .addFields([
            { name: "Часовой пояс", value: dbInfo.tz ? `+${dbInfo.tz}` : "Не указан", inline: true },
            { name: "Сохраненный ник", value: dbInfo.displayname ? dbInfo.displayname.replace("⁣", "") : "Не найден", inline: true },
            { name: "Текущий ник", value: member.displayName || "Не указан", inline: true },
        ]);
        const components = [
            {
                type: ComponentType.ActionRow,
                components: !nameStatus
                    ? [new ButtonBuilder().setCustomId("autoname_disable").setLabel("Отключить").setStyle(ButtonStyle.Danger)]
                    : [new ButtonBuilder().setCustomId("autoname_enable").setLabel("Включить").setStyle(ButtonStyle.Success)],
            },
        ];
        const repliedInteraction = deferredReply.then((m) => {
            return interaction.editReply({ embeds: [embed], components: components });
        });
        const collector = (await repliedInteraction).createMessageComponentCollector({ max: 1 });
        collector.on("collect", (i) => {
            i.deferUpdate();
            auth_data.findOne({ where: { discord_id: interaction.user.id } }).then(async (data) => {
                if (!data)
                    throw { name: "[Error code: 1041] Ошибка" };
                if (dbInfo.displayname.replace("⁣", "").length <= 0)
                    throw { name: "Ваш ник слишком короткий" };
                if (data.displayname.startsWith("⁣") && nameStatus) {
                    data.update({ displayname: dbInfo.displayname.replace("⁣", "") }).then(async (result) => {
                        const embed = EmbedBuilder.from((await repliedInteraction).embeds[0])
                            .setColor("Green")
                            .setTitle("Вы включили автоматическую смену ника");
                        return interaction.editReply({ embeds: [embed], components: [] });
                    });
                }
                else if (!data.displayname.startsWith("⁣") && !nameStatus) {
                    data.update({ displayname: "⁣" + dbInfo.displayname }).then(async (result) => {
                        const embed = EmbedBuilder.from((await repliedInteraction).embeds[0])
                            .setColor("Green")
                            .setTitle("Вы отключили автоматическую смену ника");
                        return interaction.editReply({ embeds: [embed], components: [] });
                    });
                }
                else {
                    const embed = EmbedBuilder.from((await repliedInteraction).embeds[0])
                        .setColor("DarkGreen")
                        .setTitle(`Автоматическая смена ника уже ${nameStatus ? "включена" : "отключена"}`);
                    return interaction.editReply({ embeds: [embed], components: [] });
                }
            });
        });
    },
};
