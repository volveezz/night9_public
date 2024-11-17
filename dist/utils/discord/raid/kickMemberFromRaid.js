import SequelizeModule, { Sequelize } from "sequelize";
import { client } from "../../../index.js";
import { updateRaidMessage } from "../../general/raidFunctions.js";
import updatePrivateRaidMessage from "../../general/raidFunctions/privateMessage/updatePrivateMessage.js";
import { handleRaidCreatorLeaving } from "../../general/raidFunctions/raidCreatorHandler.js";
import { raidEmitter } from "../../general/raidFunctions/raidEmitter.js";
import { updateNotifications } from "../../general/raidFunctions/raidNotifications.js";
import { RaidEvent } from "../../persistence/sequelizeModels/raidEvent.js";
import moveUserFromHotJoinedIntoJoined from "./handleHotJoinedTransfer.js";
import raidActionMessageHandler from "./raidActionMessageHandler.js";
const { Op } = SequelizeModule;
async function kickMemberFromRaid({ kickedMember, cachedRaidEvent, raidId }) {
    const raidDataBeforeLeave = cachedRaidEvent ||
        (await RaidEvent.findByPk(raidId, {
            attributes: ["joined", "hotJoined", "alt"],
        }));
    const member = typeof kickedMember === "string" ? client.getCachedMembers().get(kickedMember) : kickedMember;
    if (!member || !raidDataBeforeLeave)
        return;
    const updateQuery = {
        joined: Sequelize.fn("array_remove", Sequelize.col("joined"), `${member.id}`),
        hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), `${member.id}`),
        alt: Sequelize.fn("array_remove", Sequelize.col("alt"), `${member.id}`),
    };
    const searchQuery = {
        [Op.and]: [
            {
                [Op.or]: [
                    { joined: { [Op.contains]: [member.id] } },
                    { hotJoined: { [Op.contains]: [member.id] } },
                    { alt: { [Op.contains]: [member.id] } },
                ],
                id: raidDataBeforeLeave.id,
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
            "time",
            "joined",
            "hotJoined",
            "alt",
            "raid",
            "difficulty",
        ],
    });
    if (!rowsUpdated || !raidEvent)
        return;
    raidEmitter.emit("leave", raidEvent, member.id);
    try {
        updatePrivateRaidMessage(raidEvent);
    }
    catch (error) {
        console.error("[Error code: 2016] Failed to update private raid message", error);
    }
    updateRaidMessage({ raidEvent });
    client.getCachedTextChannel(raidEvent.channelId).permissionOverwrites.delete(member.id);
    raidActionMessageHandler({
        memberOrIdOrInteraction: member.id,
        raidEvent,
        lastState: raidDataBeforeLeave
            ? raidDataBeforeLeave.joined.includes(member.id)
                ? "joined"
                : raidDataBeforeLeave.alt.includes(member.id)
                    ? "alt"
                    : raidDataBeforeLeave.hotJoined.includes(member.id)
                        ? "hotJoined"
                        : "leave"
            : "leave",
        targetState: "raidButton_action_leave",
    });
    if (raidEvent.joined.length === 5 && raidEvent.hotJoined.length > 0) {
        setTimeout(() => moveUserFromHotJoinedIntoJoined(raidEvent), 500);
    }
    if (raidEvent.creator === member.id) {
        handleRaidCreatorLeaving(raidEvent, raidEvent.creator);
    }
    updateNotifications(member.id);
}
export default kickMemberFromRaid;
//# sourceMappingURL=kickMemberFromRaid.js.map