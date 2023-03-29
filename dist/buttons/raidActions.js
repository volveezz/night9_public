import { EmbedBuilder } from "discord.js";
import { Op, Sequelize } from "sequelize";
import { RaidButtons } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { ids, ownerId } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { completedRaidsData } from "../core/userStatisticsManagement.js";
import { client } from "../index.js";
import { addButtonComponentsToMessage } from "../utils/general/addButtonsToMessage.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { getRaidData, updatePrivateRaidMessage, updateRaidMessage } from "../utils/general/raidFunctions.js";
import { RaidEvent } from "../utils/persistence/sequelize.js";
async function actionMessageHandler({ interaction, raidEvent, target }) {
    const embed = new EmbedBuilder();
    const member = interaction.member;
    const displayName = nameCleaner(member.displayName);
    const resolvedTarget = target === "hotJoined"
        ? "[Запас] → "
        : target === "joined"
            ? "[Участник] → "
            : target === "alt"
                ? "[Возможный участник] → "
                : target === "leave"
                    ? ""
                    : "❌ → ";
    if (raidEvent.hotJoined.includes(interaction.user.id)) {
        embed.setColor(colors.serious).setAuthor({
            name: `${displayName}: ${resolvedTarget}[Запас]`,
            iconURL: member.displayAvatarURL(),
        });
    }
    else {
        switch (interaction.customId) {
            case RaidButtons.join:
                embed.setColor(colors.success).setAuthor({
                    name: `${displayName}: ${resolvedTarget}[Участник]`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            case RaidButtons.alt:
                embed.setColor(colors.warning).setAuthor({
                    name: `${displayName}: ${resolvedTarget}[Возможный участник]`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            case RaidButtons.leave:
                embed.setColor(colors.error).setAuthor({
                    name: `${displayName}: ${resolvedTarget}❌`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            default:
                embed
                    .setColor("NotQuiteBlack")
                    .setAuthor({ name: `${displayName}: проник на рейд\n<@${ownerId}>`, iconURL: member.displayAvatarURL() });
        }
    }
    client.getCachedTextChannel(raidEvent.channelId).send({ embeds: [embed] });
}
async function joinedFromHotJoined(raidData) {
    const newRaidJoined = raidData.hotJoined.shift();
    const member = client.getCachedMembers().get(newRaidJoined);
    if (!member)
        return console.error(`[Error code: 1647]`, raidData);
    const [_, [updatedRaidData]] = await RaidEvent.update({
        joined: Sequelize.fn("array_append", Sequelize.col("joined"), `${newRaidJoined}`),
        hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), `${newRaidJoined}`),
        alt: Sequelize.fn("array_remove", Sequelize.col("alt"), `${newRaidJoined}`),
    }, {
        where: { id: raidData.id },
        returning: ["id", "messageId", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "raid", "difficulty"],
    });
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setAuthor({
        name: `${nameCleaner(member.displayName)}: [Запас] → [Участник]`,
        iconURL: member.displayAvatarURL(),
    })
        .setFooter({
        text: `Пользователь перезаписан системой`,
    });
    client.getCachedTextChannel(updatedRaidData.channelId).send({ embeds: [embed] });
    const { embeds, components } = (await updateRaidMessage(updatedRaidData));
    (await client.getCachedTextChannel(ids.raidChnId).messages.fetch(updatedRaidData.messageId)).edit({
        embeds,
        components: await addButtonComponentsToMessage(components),
    });
    embeds[0]
        .setColor(colors.serious)
        .setAuthor({ name: `Вы были автоматически записаны на рейд ${raidData.id}-${raidData.raid}`, iconURL: icons.notify });
    member.send({ embeds: [embeds[0]] });
    if (!updatedRaidData)
        return console.error(`[Error code: 1637]`, updatedRaidData);
    await updatePrivateRaidMessage({ raidEvent: updatedRaidData });
}
export default {
    name: "raidButton",
    run: async ({ client, interaction }) => {
        interaction.deferUpdate();
        if (interaction.customId === RaidButtons.leave) {
            const raidDataBeforeLeave = RaidEvent.findOne({
                where: { messageId: interaction.message.id },
                attributes: ["joined", "hotJoined", "alt"],
            });
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
                updatePrivateRaidMessage({ raidEvent });
                updateRaidMessage(raidEvent, interaction);
                client.getCachedTextChannel(raidEvent.channelId).permissionOverwrites.delete(interaction.user.id);
                raidDataBeforeLeave.then((r) => {
                    actionMessageHandler({
                        interaction,
                        raidEvent,
                        target: r
                            ? r.joined.includes(interaction.user.id)
                                ? "joined"
                                : r.alt.includes(interaction.user.id)
                                    ? "alt"
                                    : r.hotJoined.includes(interaction.user.id)
                                        ? "hotJoined"
                                        : "leave"
                            : "leave",
                    });
                    if (raidEvent.joined.length === 5 && raidEvent.hotJoined.length > 0)
                        setTimeout(() => joinedFromHotJoined(raidEvent), 500);
                });
            });
        }
        let raidEvent = await RaidEvent.findOne({
            where: {
                messageId: interaction.message.id,
            },
            attributes: [
                "id",
                "channelId",
                "inChannelMessageId",
                "joined",
                "hotJoined",
                "alt",
                "messageId",
                "raid",
                "difficulty",
                "requiredClears",
            ],
        });
        if (!raidEvent)
            throw { errorType: UserErrors.RAID_NOT_FOUND };
        const raidData = getRaidData(raidEvent.raid, raidEvent.difficulty);
        const member = interaction.member ||
            client.getCachedGuild().members.cache.get(interaction.user.id) ||
            (await client.getCachedGuild().members.fetch(interaction.user.id));
        if (raidData.requiredRole && member.roles.cache.has(statusRoles.verified) && !member.roles.cache.has(raidData.requiredRole)) {
            throw { errorType: UserErrors.RAID_MISSING_DLC, errorData: [`<@&${raidData.requiredRole}>`] };
        }
        const userAlreadyInHotJoined = raidEvent.hotJoined.includes(interaction.user.id);
        const userAlreadyJoined = raidEvent.joined.includes(interaction.user.id);
        const userAlreadyAlt = raidEvent.alt.includes(interaction.user.id);
        const userTarget = interaction.customId === RaidButtons.join
            ? raidEvent.joined.length >= 6 && !userAlreadyInHotJoined
                ? "hotJoined"
                : "joined"
            : "alt";
        let update = {
            joined: Sequelize.fn("array_remove", Sequelize.col("joined"), interaction.user.id),
            hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), interaction.user.id),
            alt: Sequelize.fn("array_remove", Sequelize.col("alt"), interaction.user.id),
        };
        if (interaction.customId === RaidButtons.join) {
            if (raidEvent.requiredClears) {
                const raidsCompletedByUser = completedRaidsData.get(interaction.user.id);
                if (!raidsCompletedByUser)
                    throw { errorType: UserErrors.RAID_MISSING_DATA_FOR_CLEARS };
                const raidClears = raidsCompletedByUser[raidEvent.raid] + (raidsCompletedByUser[raidEvent.raid + "Master"] ?? 0);
                if (raidEvent.requiredClears > raidClears)
                    throw { errorType: UserErrors.RAID_NOT_ENOUGH_CLEARS, errorData: [raidClears, raidEvent.requiredClears] };
            }
            if (userAlreadyJoined)
                throw { errorType: UserErrors.RAID_ALREADY_JOINED };
            if (raidEvent.joined.length >= 6 && userAlreadyInHotJoined)
                throw { errorType: UserErrors.RAID_ALREADY_JOINED };
        }
        else if (userAlreadyAlt) {
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
        client.getCachedTextChannel(raidEvent.channelId).permissionOverwrites.create(interaction.user.id, {
            ViewChannel: true,
        });
        if (userAlreadyJoined &&
            interaction.customId === RaidButtons.alt &&
            raidEvent.joined.length === 5 &&
            raidEvent.hotJoined.length > 0) {
            setTimeout(() => joinedFromHotJoined(raidEvent), 500);
        }
        return;
    },
};