import Sequelize from "sequelize";
import { RaidEvent } from "../../../persistence/sequelizeModels/raidEvent.js";
const { Op } = Sequelize;
const raidAttributes = ["id", "time", "joined", "hotJoined", "alt", "channelId", "inChannelMessageId", "messageId"];
async function fetchOngoingRaids(requestedRaidId) {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    if (currentHour >= 23) {
        currentTime.setDate(currentTime.getDate() + 1);
    }
    currentTime.setHours(23, 0, 0, 0);
    const endTime = Math.floor(currentTime.getTime() / 1000);
    if (requestedRaidId) {
        const raid = await RaidEvent.findOne({
            where: {
                id: requestedRaidId,
                time: { [Op.lte]: endTime },
            },
            attributes: raidAttributes,
        });
        return raid ? [raid] : [];
    }
    else {
        return await RaidEvent.findAll({
            where: { time: { [Op.lte]: endTime } },
            attributes: raidAttributes,
        });
    }
}
export default fetchOngoingRaids;
//# sourceMappingURL=ongoingRaidsFetcher.js.map