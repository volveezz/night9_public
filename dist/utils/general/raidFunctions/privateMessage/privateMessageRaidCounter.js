import { client } from "../../../../index.js";
import { completedRaidsData } from "../../../persistence/dataStore.js";
import nameCleaner from "../../nameClearer.js";
const getUserRaidStatusString = async (discordId) => {
    const userRaidData = completedRaidsData.get(discordId);
    const member = await client.getAsyncMember(discordId);
    if (!userRaidData) {
        if (member?.roles.cache.has(process.env.VERIFIED)) {
            return `⁣　<@${discordId}> не закеширован`;
        }
        else if (!member) {
            return `⁣　<@${discordId}> не найден на сервере`;
        }
        else {
            return `⁣　<@${discordId}> не зарегистрирован`;
        }
    }
    const formatRaidData = (count, masterCount, shortName) => {
        return count > 0 ? `${count}${masterCount > 0 ? `(${masterCount})` : ""} ${shortName}` : "";
    };
    const raidClears = [
        formatRaidData(userRaidData.ron, userRaidData.ronMaster, "ИК"),
        formatRaidData(userRaidData.kf, userRaidData.kfMaster, "ГК"),
        formatRaidData(userRaidData.votd, userRaidData.votdMaster, "КП"),
        formatRaidData(userRaidData.vog, userRaidData.vogMaster, "ХЧ"),
        formatRaidData(userRaidData.dsc, 0, "СГК"),
        formatRaidData(userRaidData.gos, 0, "СС"),
        formatRaidData(userRaidData.lw, 0, "ПЖ"),
    ].filter((raid) => raid.length > 0);
    const displayName = nameCleaner(member?.displayName || member?.user.username || "неизвестный пользователь", true);
    return `⁣　**${displayName}** ${raidClears.length > 0
        ? `завершил: ${raidClears.join(", ")}`
        : userRaidData?.totalRaidClears === 0
            ? "не проходил ранее рейды"
            : "не проходил доступные на данный момент рейды"}`;
};
export default getUserRaidStatusString;
//# sourceMappingURL=privateMessageRaidCounter.js.map