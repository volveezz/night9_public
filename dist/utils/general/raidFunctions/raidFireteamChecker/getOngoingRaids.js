import { Op } from "sequelize";
import { RaidEvent } from "../../../persistence/sequelize.js";
async function getOngoingRaids(requestedRaidId) {
    const currentDay = new Date();
    currentDay.setHours(22, 59, 59, 0);
    const endTime = Math.floor(currentDay.getTime() / 1000);
    const attributes = ["id", "time", "joined", "hotJoined", "alt", "channelId", "inChannelMessageId", "messageId"];
    const raidData = requestedRaidId
        ? [
            (await RaidEvent.findByPk(requestedRaidId, {
                attributes,
            })),
        ]
        : await RaidEvent.findAll({
            where: { time: { [Op.lte]: endTime } },
            attributes,
        });
    return raidData;
}
export default getOngoingRaids;
//# sourceMappingURL=getOngoingRaids.js.map