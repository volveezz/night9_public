import { ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, } from "discord.js";
import { Op } from "sequelize";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import { Button } from "../../structures/button.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { removeRaid } from "../../utils/general/raidFunctions.js";
import sendRaidPrivateMessage from "../../utils/general/raidFunctions/privateMessage/sendPrivateMessage.js";
import { stopFireteamCheckingSystem } from "../../utils/general/raidFunctions/raidFireteamChecker/raidFireteamChecker.js";
import { RaidEvent } from "../../utils/persistence/sequelize.js";
import moveRaidVoiceMembers from "./moveRaidVoiceMembersButton.js";
import notifyInChannelButton from "./notifyInChannelButton.js";
import unlockRaidMessage from "./unlockRaidMessage.js";
export async function handleDeleteRaid({ deferredUpdate, interaction, raidEvent, requireMessageReply, }) {
    return new Promise(async (resolve) => {
        const embed = new EmbedBuilder()
            .setColor(colors.warning)
            .setAuthor({ name: `Подтвердите удаление рейда ${raidEvent.id}-${raidEvent.raid}`, iconURL: icons.warning })
            .setDescription(`Если Вы хотите изменить рейд, то не удаляйте рейд, а измените его с помощью команды: \`/рейд изменить\` (</рейд изменить:1036145721696600134>)\n### Можно изменить следующие параметры рейда\n - Время: \`/рейд изменить новое-время:20 21/06\`\n - Описание: \`/рейд изменить новое-описание:Новое описание для сильных\`\n - Минимальное количество закрытий рейда для записи: \`/рейд изменить новое-требование-закрытий:5\`\n### В одной команде можно изменить сразу несколько параметров\n - \`/рейд изменить новый-рейд:Источник кошмаров новая-сложность:Мастер\``);
        const components = [
            new ButtonBuilder().setCustomId("raidAddFunc_delete_confirm").setLabel("Подтвердить").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("raidAddFunc_delete_cancel").setLabel("Отменить").setStyle(ButtonStyle.Secondary),
        ];
        await deferredUpdate;
        const message = await interaction.editReply({
            embeds: [embed],
            components: addButtonsToMessage(components),
        });
        const collector = interaction.channel.createMessageComponentCollector({
            message,
            time: 60 * 1000 * 2,
            max: 1,
            filter: (i) => i.user.id === interaction.user.id,
            componentType: ComponentType.Button,
        });
        collector.on("collect", async (col) => {
            if (col.customId === "raidAddFunc_delete_confirm") {
                await removeRaid(raidEvent, col, requireMessageReply, interaction.channel?.isDMBased() ? interaction : undefined).catch((e) => {
                    console.error("[Error code: 1676]", e);
                });
                resolve(1);
            }
            else if (col.customId === "raidAddFunc_delete_cancel") {
                const canceledEmbed = new EmbedBuilder().setColor(colors.invisible).setTitle("Удаление рейда отменено");
                await col.update({ components: [], embeds: [canceledEmbed] });
                resolve(2);
            }
        });
        collector.on("end", async (_, reason) => {
            if (reason === "time") {
                if (requireMessageReply) {
                    embed.setAuthor({ name: "Время для удаления вышло. Повторите снова", iconURL: undefined }).setColor(colors.invisible);
                    await interaction.editReply({ components: [], embeds: [embed] });
                }
                resolve(3);
            }
        });
    });
}
function requireParams(params) {
    let returned_deferredReply;
    let returned_deferredUpdate;
    let returned_guild;
    let returned_member;
    const { interaction, guild, deferredUpdate, member, deferredReply } = params;
    if (deferredReply) {
        returned_deferredReply = interaction.deferReply({ ephemeral: true });
    }
    if (deferredUpdate) {
        returned_deferredUpdate = interaction.deferUpdate();
    }
    if (guild) {
        returned_guild = client.getCachedGuild();
        if (!returned_guild) {
            throw { name: "Ошибка. Сервер недоступен" };
        }
    }
    if (member) {
        returned_member = client.getCachedMembers().get(interaction.user.id);
        if (!returned_member) {
            throw {
                name: "Вы не участник сервера",
                description: "Пожалуйста, объясните администрации как вы получили эту ошибку",
            };
        }
    }
    return {
        guild: returned_guild,
        member: returned_member,
        deferredUpdate: returned_deferredUpdate,
        deferredReply: returned_deferredReply,
    };
}
const ButtonCommand = new Button({
    name: "raidInChnButton",
    run: async ({ interaction }) => {
        const availableButtonCustomIds = [
            "raidInChnButton_notify",
            "raidInChnButton_transfer",
            "raidInChnButton_unlock",
            "raidInChnButton_delete",
            "raidInChnButton_resend",
            "raidInChnButton_fireteamChecker_cancel",
        ];
        if (!availableButtonCustomIds.includes(interaction.customId))
            return;
        const attributes = interaction.customId === "raidInChnButton_resend"
            ? ["id", "creator", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "raid", "difficulty"]
            : ["id", "creator", "channelId", "joined", "messageId", "raid"];
        const raidEvent = await (interaction.channel?.isDMBased()
            ? RaidEvent.findOne({
                where: {
                    [Op.and]: [
                        { id: parseInt(interaction.message.embeds[0].data.footer?.text.split("RId: ").pop()) },
                        { creator: interaction.user.id },
                    ],
                },
                attributes,
            })
            : RaidEvent.findOne({
                where: { [Op.or]: { inChannelMessageId: interaction.message.id, channelId: interaction.channelId } },
                attributes,
            }));
        if (!raidEvent) {
            if (interaction.channel?.isDMBased())
                interaction.update({ components: [] });
            throw { errorType: "RAID_NOT_FOUND" };
        }
        if (raidEvent.creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
            throw { errorType: "RAID_MISSING_PERMISSIONS" };
        }
        switch (interaction.customId) {
            case "raidInChnButton_notify": {
                const { guild, member, deferredReply } = requireParams({ interaction, member: true, guild: true, deferredReply: true });
                notifyInChannelButton({ interaction, guild, member, raidEvent, deferredUpdate: deferredReply });
                break;
            }
            case "raidInChnButton_transfer": {
                const { guild } = requireParams({ interaction, guild: true });
                moveRaidVoiceMembers({ guild, interaction, raidEvent });
                break;
            }
            case "raidInChnButton_unlock": {
                unlockRaidMessage({ interaction, raidEvent });
                requireParams({ interaction, deferredUpdate: true });
                break;
            }
            case "raidInChnButton_delete": {
                const { deferredReply } = requireParams({ deferredReply: true, interaction });
                handleDeleteRaid({ deferredUpdate: deferredReply, interaction, raidEvent });
                break;
            }
            case "raidInChnButton_resend": {
                requireParams({ interaction, deferredUpdate: true });
                await sendRaidPrivateMessage({
                    raidEvent,
                    channel: interaction.channel?.type === ChannelType.GuildText ? interaction.channel : undefined,
                    oldMessage: interaction.message,
                });
                await interaction.message.delete();
                break;
            }
            case "raidInChnButton_fireteamChecker_cancel": {
                requireParams({ deferredUpdate: true, interaction });
                stopFireteamCheckingSystem(raidEvent.id);
                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setTitle("Система слежки за боевой группой отключена")
                    .setColor(colors.invisible);
                await interaction.message.edit({ embeds: [embed], components: [] });
                break;
            }
            default:
                break;
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=raidInChnButton.js.map