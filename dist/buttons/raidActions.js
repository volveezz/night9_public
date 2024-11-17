import SequelizeModule from "sequelize";
import { Button } from "../structures/button.js";
import moveUserFromHotJoinedIntoJoined from "../utils/discord/raid/handleHotJoinedTransfer.js";
import raidActionMessageHandler from "../utils/discord/raid/raidActionMessageHandler.js";
import { checkRaidTimeConflicts, getRaidDetails, sendUserRaidGuideNoti, updateRaidMessage } from "../utils/general/raidFunctions.js";
import updatePrivateRaidMessage from "../utils/general/raidFunctions/privateMessage/updatePrivateMessage.js";
import { handleRaidCreatorLeaving } from "../utils/general/raidFunctions/raidCreatorHandler.js";
import { raidEmitter } from "../utils/general/raidFunctions/raidEmitter.js";
import { updateNotifications } from "../utils/general/raidFunctions/raidNotifications.js";
import { completedRaidsData } from "../utils/persistence/dataStore.js";
import { RaidEvent } from "../utils/persistence/sequelizeModels/raidEvent.js";
const { Op, Sequelize } = SequelizeModule;
const raidGuideSentUser = new Map();
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
                    "time",
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
            raidEmitter.emit("leave", raidEvent, interaction.user.id);
            updatePrivateRaidMessage(raidEvent);
            updateRaidMessage({ raidEvent, interaction });
            client.getCachedTextChannel(raidEvent.channelId).permissionOverwrites.delete(interaction.user.id);
            raidDataBeforeLeave.then((updatedRaidEvent) => {
                raidActionMessageHandler({
                    memberOrIdOrInteraction: interaction,
                    raidEvent,
                    lastState: updatedRaidEvent
                        ? updatedRaidEvent.joined.includes(interaction.user.id)
                            ? "joined"
                            : updatedRaidEvent.alt.includes(interaction.user.id)
                                ? "alt"
                                : updatedRaidEvent.hotJoined.includes(interaction.user.id)
                                    ? "hotJoined"
                                    : "leave"
                        : "leave",
                    targetState: interaction.customId,
                });
                if (raidEvent.joined.length === 5 && raidEvent.hotJoined.length > 0) {
                    setTimeout(() => moveUserFromHotJoinedIntoJoined(raidEvent), 500);
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
        const member = client.getCachedMembers().get(interaction.user.id);
        if (!member) {
            throw { errorType: "MEMBER_NOT_FOUND" };
        }
        if (raidData.requiredRole && member.roles.cache.has(process.env.VERIFIED) && !member.roles.cache.has(raidData.requiredRole)) {
            await deferredUpdate;
            throw { errorType: "ACTIVITY_MISSING_DLC", errorData: [raidData.requiredRole] };
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
            if (userAlreadyJoined || (raidEvent.joined.length >= 6 && userAlreadyInHotJoined)) {
                await deferredUpdate;
                throw { errorType: "RAID_ALREADY_JOINED" };
            }
            const raidsCompletedByUser = completedRaidsData.get(interaction.user.id);
            const raidClears = raidsCompletedByUser
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
            const sentUserSet = raidGuideSentUser.get(raidEvent.raid) ?? new Set();
            if (!sentUserSet.has(interaction.user.id)) {
                if (raidClears <= 5) {
                    sendUserRaidGuideNoti(interaction.user, raidEvent.raid, raidEvent.channelId);
                }
                sentUserSet.add(interaction.user.id);
                raidGuideSentUser.set(raidEvent.raid, sentUserSet);
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
        updatePrivateRaidMessage(raidEvent);
        updateRaidMessage({ raidEvent, interaction });
        raidActionMessageHandler({
            memberOrIdOrInteraction: member,
            raidEvent,
            lastState: userAlreadyInHotJoined ? "hotJoined" : userAlreadyJoined ? "joined" : userAlreadyAlt ? "alt" : "",
            targetState: interaction.customId,
        });
        await (await client.getTextChannel(raidEvent.channelId)).permissionOverwrites.create(interaction.user.id, {
            ViewChannel: true,
        });
        if (interaction.customId === "raidButton_action_join" && userTarget === "joined") {
            raidEmitter.emit("join", raidEvent, interaction.user.id);
            updateNotifications(interaction.user.id, true);
            checkRaidTimeConflicts(interaction.user.id, raidEvent);
        }
        if (interaction.customId === "raidButton_action_alt") {
            updateNotifications(interaction.user.id);
            if (userAlreadyJoined && raidEvent.joined.length === 5 && raidEvent.hotJoined.length > 0) {
                setTimeout(async () => await moveUserFromHotJoinedIntoJoined(raidEvent), 500);
            }
        }
        return;
    },
});
export default ButtonCommand;
//# sourceMappingURL=raidActions.js.map