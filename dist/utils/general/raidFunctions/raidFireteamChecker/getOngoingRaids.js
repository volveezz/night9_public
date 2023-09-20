import { Op } from "sequelize";
import { RaidEvent } from "../../../persistence/sequelize.js";
const attributes = ["id", "time", "joined", "hotJoined", "alt", "channelId", "inChannelMessageId", "messageId"];
async function getOngoingRaids(requestedRaidId) {
    const currentMoment = new Date();
    const currentHour = currentMoment.getHours();
    if (currentHour >= 23) {
        currentMoment.setDate(currentMoment.getDate() + 1);
    }
    currentMoment.setHours(23, 0, 0, 0);
    const endTime = Math.floor(currentMoment.getTime() / 1000);
    console.debug(`Getting ongoing raids until ${currentMoment}`);
    if (requestedRaidId) {
        const raid = await RaidEvent.findOne({
            where: {
                id: requestedRaidId,
                time: { [Op.lte]: endTime },
            },
            attributes,
        });
        return raid ? [raid] : [];
    }
    else {
        return await RaidEvent.findAll({
            where: { time: { [Op.lte]: endTime } },
            attributes,
        });
    }
}
export default getOngoingRaids;
//# sourceMappingURL=getOngoingRaids.js.map