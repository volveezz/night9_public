import { EmbedBuilder } from "discord.js";
import { guildId, ids, ownerId } from "../configs/ids.js";
import { RaidEvent } from "../handlers/sequelize.js";
import { completedRaidsData } from "../features/memberStatisticsHandler.js";
import { client } from "../index.js";
import UserErrors from "../enums/UserErrors.js";
import { updateRaidMessage, updatePrivateRaidMessage } from "../functions/raidFunctions.js";
import { RaidButtons } from "../enums/Buttons.js";
import { Op, Sequelize } from "sequelize";
import colors from "../configs/colors.js";
import nameCleaner from "../functions/nameClearer.js";
async function actionMessageHandler({ interaction, raidEvent, target }) {
    const embed = new EmbedBuilder();
    const member = interaction.member;
    const displayName = nameCleaner(member.displayName);
    const resolvedTarget = target === "hotJoined"
        ? " ранее состоя в запасе"
        : target === "joined"
            ? " ранее состоя как участник"
            : target === "alt"
                ? " ранее состоя как возможный участник"
                : "";
    if (raidEvent.hotJoined.includes(interaction.user.id)) {
        embed.setColor(colors.serious).setAuthor({
            name: `${displayName} записался, но был перемещен в запас${resolvedTarget}`,
            iconURL: member.displayAvatarURL(),
        });
    }
    else {
        switch (interaction.customId) {
            case RaidButtons.join:
                embed.setColor(colors.success).setAuthor({
                    name: `${displayName} записался${resolvedTarget}`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            case RaidButtons.alt:
                embed.setColor(colors.warning).setAuthor({
                    name: `${displayName} записался как возможный участник${resolvedTarget}`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            case RaidButtons.leave:
                embed.setColor(colors.error).setAuthor({
                    name: `${displayName} выписался${resolvedTarget}`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            default:
                embed.setColor("NotQuiteBlack").setAuthor({ name: `${displayName} проник на рейд\n<@${ownerId}>`, iconURL: member.displayAvatarURL() });
        }
    }
    client.getCachedGuild().channels.cache.get(raidEvent.channelId).send({ embeds: [embed] });
}
async function joinedFromHotJoined(raidData) {
    const newRaidJoined = raidData.hotJoined.shift();
    const member = client.getCachedMembers().get(newRaidJoined);
    if (!member)
        throw { errorType: UserErrors.MEMBER_NOT_FOUND };
    raidData.save();
    const embed = new EmbedBuilder().setColor("Orange").setAuthor({
        name: `${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} был автоматически записан ранее состоя в запасе`,
        iconURL: member.displayAvatarURL(),
    });
    client.getCachedGuild().channels.cache.get(raidData.channelId).send({ embeds: [embed] });
    const privateMessageEmbed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle(`Вы были автоматически записаны на рейд ${raidData.id}-${raidData.raid}`)
        .addFields({
        name: `Число записанных участников`,
        value: `Участников: ${raidData.joined.length}${raidData.hotJoined.length > 0 ? `\nВ запасе: ${raidData.hotJoined.length}` : ""}${raidData.alt.length > 0 ? `\nВозможно будут: ${raidData.alt.length}` : ""}`,
    }, { name: `Начало рейда: <t:${raidData.time}:R>`, value: `<t:${raidData.time}>`, inline: true }, {
        name: `Ссылки:`,
        value: `[Перейти к набору](https://discord.com/channels/${guildId}/${ids.raidChnId}/${raidData.messageId})\n[Перейти в канал рейда](https://discord.com/channels/${guildId}/${raidData.channelId})`,
    });
    member.send({ embeds: [privateMessageEmbed] });
}
export default {
    name: "raidButton",
    run: async ({ client, interaction }) => {
        interaction.deferUpdate();
        if (interaction.customId === RaidButtons.leave) {
            return await RaidEvent.update({
                joined: Sequelize.fn("array_remove", Sequelize.col("joined"), `${interaction.user.id}`),
                hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), `${interaction.user.id}`),
                alt: Sequelize.fn("array_remove", Sequelize.col("alt"), `${interaction.user.id}`),
            }, {
                where: {
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { joined: { [Op.contains]: [interaction.user.id] } },
                                { hotJoined: { [Op.contains]: [interaction.user.id] } },
                                { alt: { [Op.contains]: [interaction.user.id] } },
                            ],
                            messageId: interaction.message.id,
                        },
                    ],
                },
                returning: ["id", "messageId", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "raid", "difficulty"],
            }).then(([rowsUpdated, [raidEvent]]) => {
                if (!rowsUpdated)
                    return;
                if (!raidEvent)
                    throw { errorType: UserErrors.RAID_NOT_FOUND };
                if (raidEvent.joined.length === 5 && raidEvent.hotJoined.length > 0)
                    joinedFromHotJoined(raidEvent);
                updatePrivateRaidMessage({ raidEvent });
                updateRaidMessage(raidEvent, interaction);
                actionMessageHandler({ interaction, raidEvent, target: "leave" });
                client.getCachedGuild().channels.cache.get(raidEvent.channelId).permissionOverwrites.delete(interaction.user.id);
            });
        }
        let raidEvent = await RaidEvent.findOne({
            where: {
                messageId: interaction.message.id,
            },
            attributes: ["id", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "messageId", "raid", "difficulty", "requiredClears"],
        });
        if (!raidEvent)
            throw { errorType: UserErrors.RAID_NOT_FOUND };
        const userTarget = interaction.customId === RaidButtons.join ? (raidEvent.joined.length >= 6 ? "hotJoined" : "joined") : "alt";
        let update = {
            joined: Sequelize.fn("array_remove", Sequelize.col("joined"), interaction.user.id),
            hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), interaction.user.id),
            alt: Sequelize.fn("array_remove", Sequelize.col("alt"), interaction.user.id),
        };
        const userAlreadyInHotJoined = raidEvent.hotJoined.some((user) => user === interaction.user.id);
        const userAlreadyJoined = raidEvent.joined.some((user) => user === interaction.user.id);
        const userAlreadyAlt = raidEvent.alt.some((user) => user === interaction.user.id);
        if (interaction.customId === RaidButtons.join) {
            if (raidEvent.requiredClears) {
                const raidsCompletedByUser = completedRaidsData.get(interaction.user.id);
                if (!raidsCompletedByUser)
                    throw { errorType: UserErrors.RAID_MISSING_DATA_FOR_CLEARS };
                const raidClears = raidsCompletedByUser[raidEvent.raid] + (raidsCompletedByUser[raidEvent.raid + "Master"] ?? 0);
                if (raidEvent.requiredClears > raidClears)
                    throw { errorType: UserErrors.RAID_NOT_ENOUGH_CLEARS, errorData: [raidClears, raidEvent.requiredClears] };
            }
            if (raidEvent.joined.length >= 6) {
                if (userAlreadyInHotJoined)
                    throw { errorType: UserErrors.RAID_ALREADY_JOINED };
            }
            else {
                if (userAlreadyJoined)
                    throw { errorType: UserErrors.RAID_ALREADY_JOINED };
            }
        }
        else {
            if (userAlreadyAlt)
                throw { errorType: UserErrors.RAID_ALREADY_JOINED };
        }
        update[userTarget] = Sequelize.fn("array_append", Sequelize.col(userTarget), interaction.user.id);
        [, [raidEvent]] = await RaidEvent.update(update, {
            where: { messageId: interaction.message.id },
            returning: ["id", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "messageId", "raid", "difficulty"],
        });
        updatePrivateRaidMessage({ raidEvent });
        updateRaidMessage(raidEvent, interaction);
        actionMessageHandler({
            interaction,
            raidEvent,
            target: userAlreadyInHotJoined ? "hotJoined" : userAlreadyJoined ? "joined" : userAlreadyAlt ? "alt" : "",
        });
        client.getCachedGuild().channels.cache.get(raidEvent.channelId).permissionOverwrites.create(interaction.user.id, {
            ViewChannel: true,
        });
        return;
    },
};