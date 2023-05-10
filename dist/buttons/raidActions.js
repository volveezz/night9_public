import { EmbedBuilder } from "discord.js";
import { Op, Sequelize } from "sequelize";
import { RaidButtons } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { channelIds, ownerId } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { client } from "../index.js";
import { addButtonComponentsToMessage } from "../utils/general/addButtonsToMessage.js";
import { completedRaidsData } from "../utils/general/destinyActivityChecker.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { checkRaidTimeConflicts, getRaidData, sendUserRaidGuideNoti, updatePrivateRaidMessage, updateRaidMessage, } from "../utils/general/raidFunctions.js";
import { handleRaidCreatorLeaving } from "../utils/general/raidFunctions/raidCreatorHandler.js";
import { RaidEvent } from "../utils/persistence/sequelize.js";
const raidGuideSentUsers = new Map();
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
    (await client.getAsyncTextChannel(raidEvent.channelId)).send({ embeds: [embed] });
}
async function joinedFromHotJoined(raidData) {
    const newRaidJoined = raidData.hotJoined.shift();
    const member = client.getCachedMembers().get(newRaidJoined);
    if (!member)
        return console.error("[Error code: 1647]", raidData);
    const [_, [updatedRaidData]] = await RaidEvent.update({
        joined: Sequelize.fn("array_append", Sequelize.col("joined"), `${newRaidJoined}`),
        hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), `${newRaidJoined}`),
        alt: Sequelize.fn("array_remove", Sequelize.col("alt"), `${newRaidJoined}`),
    }, {
        where: { id: raidData.id },
        returning: ["id", "messageId", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "raid", "difficulty"],
    });
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setAuthor({
        name: `${nameCleaner(member.displayName)}: [Запас] → [Участник]`,
        iconURL: member.displayAvatarURL(),
    })
        .setFooter({
        text: "Пользователь перезаписан системой",
    });
    client.getCachedTextChannel(updatedRaidData.channelId).send({ embeds: [embed] });
    const { embeds, components } = (await updateRaidMessage({ raidEvent: updatedRaidData, returnComponents: true }));
    (await client.getCachedTextChannel(channelIds.raid).messages.fetch(updatedRaidData.messageId)).edit({
        embeds,
        components: await addButtonComponentsToMessage(components),
    });
    embeds[0]
        .setColor(colors.serious)
        .setAuthor({ name: `Вы были автоматически записаны на рейд ${raidData.id}-${raidData.raid}`, iconURL: icons.notify });
    member.send({ embeds: [embeds[0]] });
    if (!updatedRaidData)
        return console.error("[Error code: 1637]", updatedRaidData);
    await updatePrivateRaidMessage({ raidEvent: updatedRaidData });
}
export default {
    name: "raidButton",
    run: async ({ client, interaction }) => {
        const deferredUpdate = interaction.deferUpdate();
        if (interaction.customId === RaidButtons.leave) {
            const raidDataBeforeLeave = RaidEvent.findOne({
                where: { messageId: interaction.message.id },
                attributes: ["joined", "hotJoined", "alt"],
            });
            const updateQuery = {
                joined: Sequelize.fn("array_remove", Sequelize.col("joined"), `${interaction.user.id}`),
                hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), `${interaction.user.id}`),
                alt: Sequelize.fn("array_remove", Sequelize.col("alt"), `${interaction.user.id}`),
            };
            const searchQuery = {
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
            };
            const [rowsUpdated, [raidEvent]] = await RaidEvent.update(updateQuery, {
                where: searchQuery,
                returning: [
                    "id",
                    "messageId",
                    "creator",
                    "channelId",
                    "inChannelMessageId",
                    "joined",
                    "hotJoined",
                    "alt",
                    "raid",
                    "difficulty",
                ],
            });
            if (!rowsUpdated)
                return;
            if (!raidEvent) {
                await deferredUpdate;
                console.error("[Error code: 1742]", { updateQuery }, { searchQuery });
                throw { errorType: UserErrors.RAID_NOT_FOUND };
            }
            updatePrivateRaidMessage({ raidEvent });
            updateRaidMessage({ raidEvent, interaction });
            (await client.getAsyncTextChannel(raidEvent.channelId)).permissionOverwrites.delete(interaction.user.id);
            raidDataBeforeLeave.then((updatedRaidEvent) => {
                actionMessageHandler({
                    interaction,
                    raidEvent,
                    target: updatedRaidEvent
                        ? updatedRaidEvent.joined.includes(interaction.user.id)
                            ? "joined"
                            : updatedRaidEvent.alt.includes(interaction.user.id)
                                ? "alt"
                                : updatedRaidEvent.hotJoined.includes(interaction.user.id)
                                    ? "hotJoined"
                                    : "leave"
                        : "leave",
                });
                if (raidEvent.joined.length === 5 && raidEvent.hotJoined.length > 0) {
                    setTimeout(() => joinedFromHotJoined(raidEvent), 500);
                }
            });
            if (raidEvent.creator === interaction.user.id) {
                await handleRaidCreatorLeaving(raidEvent, raidEvent.creator);
            }
            return;
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
        if (!raidEvent) {
            await deferredUpdate;
            throw { errorType: UserErrors.RAID_NOT_FOUND };
        }
        const raidData = getRaidData(raidEvent.raid, raidEvent.difficulty);
        const member = await client.getAsyncMember(interaction.user.id);
        if (raidData.requiredRole && member.roles.cache.has(statusRoles.verified) && !member.roles.cache.has(raidData.requiredRole)) {
            await deferredUpdate;
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
            const raidsCompletedByUser = completedRaidsData.get(interaction.user.id);
            const raidClears = raidsCompletedByUser
                ? raidsCompletedByUser[raidEvent.raid] + (raidsCompletedByUser[raidEvent.raid + "Master"] || 0)
                : 0;
            if (raidEvent.requiredClears) {
                if (!raidsCompletedByUser) {
                    await deferredUpdate;
                    throw { errorType: UserErrors.RAID_MISSING_DATA_FOR_CLEARS };
                }
                if (raidEvent.requiredClears > raidClears) {
                    await deferredUpdate;
                    throw { errorType: UserErrors.RAID_NOT_ENOUGH_CLEARS, errorData: [raidClears, raidEvent.requiredClears] };
                }
            }
            if (userAlreadyJoined) {
                await deferredUpdate;
                throw { errorType: UserErrors.RAID_ALREADY_JOINED };
            }
            if (raidEvent.joined.length >= 6 && userAlreadyInHotJoined) {
                await deferredUpdate;
                throw { errorType: UserErrors.RAID_ALREADY_JOINED };
            }
            const sentUserSet = raidGuideSentUsers.get(raidEvent.raid) ?? new Set();
            if (!sentUserSet.has(interaction.user.id)) {
                if (raidClears <= 5) {
                    sendUserRaidGuideNoti(interaction.user, raidEvent.raid);
                }
                sentUserSet.add(interaction.user.id);
                raidGuideSentUsers.set(raidEvent.raid, sentUserSet);
            }
        }
        else if (userAlreadyAlt) {
            await deferredUpdate;
            throw { errorType: UserErrors.RAID_ALREADY_JOINED };
        }
        update[userTarget] = Sequelize.fn("array_append", Sequelize.col(userTarget), interaction.user.id);
        [, [raidEvent]] = await RaidEvent.update(update, {
            where: { messageId: interaction.message.id },
            returning: ["id", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "messageId", "time", "raid", "difficulty"],
        });
        updatePrivateRaidMessage({ raidEvent });
        updateRaidMessage({ raidEvent, interaction });
        actionMessageHandler({
            interaction,
            raidEvent,
            target: userAlreadyInHotJoined ? "hotJoined" : userAlreadyJoined ? "joined" : userAlreadyAlt ? "alt" : "",
        });
        await (await client.getAsyncTextChannel(raidEvent.channelId)).permissionOverwrites.create(interaction.user.id, {
            ViewChannel: true,
        });
        if (interaction.customId === RaidButtons.join) {
            checkRaidTimeConflicts(interaction, raidEvent);
        }
        if (userAlreadyJoined &&
            interaction.customId === RaidButtons.alt &&
            raidEvent.joined.length === 5 &&
            raidEvent.hotJoined.length > 0) {
            setTimeout(async () => await joinedFromHotJoined(raidEvent), 500);
        }
        return;
    },
};
