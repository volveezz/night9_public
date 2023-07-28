import { EmbedBuilder, RESTJSONErrorCodes } from "discord.js";
import { Op, Sequelize } from "sequelize";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { Button } from "../structures/button.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { checkRaidTimeConflicts, getRaidDetails, sendUserRaidGuideNoti, updatePrivateRaidMessage, updateRaidMessage, } from "../utils/general/raidFunctions.js";
import { handleRaidCreatorLeaving } from "../utils/general/raidFunctions/raidCreatorHandler.js";
import { updateNotifications } from "../utils/general/raidFunctions/raidNotifications.js";
import { completedRaidsData } from "../utils/persistence/dataStore.js";
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
            case "raidButton_action_join":
                embed.setColor(colors.success).setAuthor({
                    name: `${displayName}: ${resolvedTarget}[Участник]`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            case "raidButton_action_alt":
                embed.setColor(colors.warning).setAuthor({
                    name: `${displayName}: ${resolvedTarget}[Возможный участник]`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            case "raidButton_action_leave":
                embed.setColor(colors.error).setAuthor({
                    name: `${displayName}: ${resolvedTarget}❌`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            default:
                embed.setColor("NotQuiteBlack").setAuthor({
                    name: `${displayName}: проник на рейд\n<@${process.env.OWNER_ID}>`,
                    iconURL: member.displayAvatarURL(),
                });
        }
    }
    (await client.getAsyncTextChannel(raidEvent.channelId)).send({ embeds: [embed] });
}
async function joinedFromHotJoined(raidData) {
    const newRaidJoined = raidData.hotJoined.shift();
    const member = await client.getAsyncMember(newRaidJoined);
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
    const raidChannel = await client.getAsyncTextChannel(updatedRaidData.channelId);
    raidChannel.send({ embeds: [embed] });
    const { embeds, components } = (await updateRaidMessage({ raidEvent: updatedRaidData, returnComponents: true }));
    await (await client.getAsyncMessage(process.env.RAID_CHANNEL_ID, updatedRaidData.messageId)).edit({
        embeds,
        components: addButtonsToMessage(components),
    });
    embeds[0]
        .setColor(colors.serious)
        .setAuthor({ name: `Вы были автоматически записаны на рейд ${raidData.id}-${raidData.raid}`, iconURL: icons.notify });
    try {
        member.send({ embeds: [embeds[0]] });
    }
    catch (error) {
        if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
            raidChannel.send({ content: `<@${member.id}>`, embeds: [embeds[0]] });
        }
        else {
            console.error("[Error code: 1961] Received unexpected error", error);
        }
    }
    if (!updatedRaidData)
        return console.error("[Error code: 1637]", updatedRaidData);
    await updatePrivateRaidMessage({ raidEvent: updatedRaidData });
    updateNotifications(member.id, true);
}
const ButtonCommand = new Button({
    name: "raidButton",
    run: async ({ client, interaction }) => {
        const deferredUpdate = interaction.deferUpdate();
        if (interaction.customId === "raidButton_action_leave") {
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
                throw { errorType: "RAID_NOT_FOUND" };
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
            updateNotifications(interaction.user.id);
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
                "time",
                "messageId",
                "raid",
                "difficulty",
                "requiredClears",
            ],
        });
        if (!raidEvent) {
            await deferredUpdate;
            throw { errorType: "RAID_NOT_FOUND" };
        }
        const raidData = getRaidDetails(raidEvent.raid, raidEvent.difficulty);
        const member = await client.getAsyncMember(interaction.user.id);
        if (raidData.requiredRole && member.roles.cache.has(process.env.VERIFIED) && !member.roles.cache.has(raidData.requiredRole)) {
            await deferredUpdate;
            throw { errorType: "RAID_MISSING_DLC", errorData: [`<@&${raidData.requiredRole}>`] };
        }
        const userAlreadyInHotJoined = raidEvent.hotJoined.includes(interaction.user.id);
        const userAlreadyJoined = raidEvent.joined.includes(interaction.user.id);
        const userAlreadyAlt = raidEvent.alt.includes(interaction.user.id);
        const userTarget = interaction.customId === "raidButton_action_join"
            ? raidEvent.joined.length >= 6 && !userAlreadyInHotJoined
                ? "hotJoined"
                : "joined"
            : "alt";
        let update = {
            joined: Sequelize.fn("array_remove", Sequelize.col("joined"), interaction.user.id),
            hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), interaction.user.id),
            alt: Sequelize.fn("array_remove", Sequelize.col("alt"), interaction.user.id),
        };
        if (interaction.customId === "raidButton_action_join") {
            const isContestRaid = raidEvent.raid === "ce" && raidEvent.time >= 1693591200 && raidEvent.time <= 1693764000;
            const raidsCompletedByUser = completedRaidsData.get(interaction.user.id);
            const raidClears = isContestRaid
                ? raidsCompletedByUser
                    ? raidsCompletedByUser["totalRaidClears"]
                    : 0
                : raidsCompletedByUser
                    ? raidsCompletedByUser[raidEvent.raid] + (raidsCompletedByUser[raidEvent.raid + "Master"] || 0)
                    : 0;
            if (raidEvent.requiredClears) {
                if (!raidsCompletedByUser) {
                    await deferredUpdate;
                    throw { errorType: "RAID_MISSING_DATA_FOR_CLEARS" };
                }
                if (raidEvent.requiredClears > raidClears) {
                    await deferredUpdate;
                    throw { errorType: "RAID_NOT_ENOUGH_CLEARS", errorData: [raidClears, raidEvent.requiredClears] };
                }
            }
            if (userAlreadyJoined) {
                await deferredUpdate;
                throw { errorType: "RAID_ALREADY_JOINED" };
            }
            if (raidEvent.joined.length >= 6 && userAlreadyInHotJoined) {
                await deferredUpdate;
                throw { errorType: "RAID_ALREADY_JOINED" };
            }
            const sentUserSet = raidGuideSentUsers.get(raidEvent.raid) ?? new Set();
            if (!sentUserSet.has(interaction.user.id)) {
                if (raidClears <= 5) {
                    sendUserRaidGuideNoti(interaction.user, raidEvent.raid, raidEvent.channelId);
                }
                sentUserSet.add(interaction.user.id);
                raidGuideSentUsers.set(raidEvent.raid, sentUserSet);
            }
        }
        else if (userAlreadyAlt) {
            await deferredUpdate;
            throw { errorType: "RAID_ALREADY_JOINED" };
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
        if (interaction.customId === "raidButton_action_join") {
            updateNotifications(interaction.user.id, true);
            checkRaidTimeConflicts(interaction, raidEvent);
        }
        if (interaction.customId === "raidButton_action_alt") {
            updateNotifications(interaction.user.id);
            if (userAlreadyJoined && raidEvent.joined.length === 5 && raidEvent.hotJoined.length > 0) {
                setTimeout(async () => await joinedFromHotJoined(raidEvent), 500);
            }
        }
        return;
    },
});
export default ButtonCommand;
//# sourceMappingURL=raidActions.js.map