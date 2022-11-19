import { auth_data } from "../handlers/sequelize.js";
import { activityReporter } from "../handlers/logger.js";
import { guildId } from "../base/ids.js";
import { Op } from "sequelize";
import { character_data, longOffline } from "./full_checker.js";
import { fetchRequest } from "../handlers/webHandler.js";
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
export default (client) => {
    if (guildId === "1007814171267707001")
        return;
    async function activityChecker(data, member, mode) {
        if (!character_data.get(member.id)) {
            fetchRequest(`Platform/Destiny2/${data.platform}/Account/${data.bungie_id}/Stats/?groups=1`, data)
                .then((chars) => {
                if (!chars["characters"])
                    return console.error(`[Error code: 1104]`, chars, member.displayName, data.bungie_id);
                const charIdArray = [];
                chars["characters"].forEach((ch) => charIdArray.push(ch.characterId));
                character_data.set(data.discord_id, charIdArray);
                activityChecker(data, member, mode);
            })
                .catch((e) => {
                e.statusCode === 401 || e.statusCode === 503 || e.statusCode === 500
                    ? console.error(`[activityChecker web ${e.statusCode} error] [Error code: 1003]`, data.displayname)
                    : console.error("[activityChecker] [Error code: 1002]", e.error || e, data.displayname, e.statusCode || "");
                throw { name: "Критическая ошибка" };
            });
        }
        else {
            for (const character of character_data.get(member.id)) {
                await checker();
                async function activities() {
                    const response = fetchRequest(`Platform/Destiny2/${data.platform}/Account/${data.bungie_id}/Character/${character}/Stats/Activities/?count=2&mode=${mode}&page=0`, data);
                    if (!response)
                        return;
                    response.catch((e) => {
                        return e.code === "EPROTO"
                            ? console.error(`[Error code: 1101] ${member.displayName}`)
                            : e.code === "ECONNRESET"
                                ? console.error(`[Error code: 1100] ${member.displayName} ${e.code}`)
                                : e.code === "ETIMEDOUT"
                                    ? console.error(`[Error code: 1103] ${member.displayName} ${e.code}`)
                                    : console.error("[Error code: 1040]", e);
                    });
                    return response.then((fetchedResponse) => fetchedResponse);
                }
                async function checker() {
                    const response = await activities();
                    if (!response)
                        return console.error("[activityChecker] [Error code: 1000]", data.displayname);
                    if (response.activities?.length > 0) {
                        response.activities.forEach((activity) => {
                            if (activity.values.completed.basic.value &&
                                new Date(activity.period).getTime() + activity.values.activityDurationSeconds.basic.value * 1000 >
                                    new Date().getTime() - 1000 * 60 * 7)
                                activityReporter(activity.activityDetails.instanceId);
                        });
                    }
                }
            }
        }
    }
    setInterval(async () => {
        const dbNotFiltred = await auth_data.findAll({
            attributes: ["discord_id", "bungie_id", "platform", "access_token"],
            where: {
                [Op.and]: {
                    discord_id: {
                        [Op.notIn]: Array.from(longOffline.keys()),
                    },
                    clan: true,
                },
            },
        });
        const dbNotFoundUsers = dbNotFiltred
            .filter((data) => !client.guilds.cache.get(guildId).members.cache.has(data.discord_id))
            .map((d) => {
            return `[Error code: 1008] ${d.displayname}/${d.discord_id} not found on server`;
        });
        dbNotFoundUsers.length > 0 ? console.error("[Error code: 1005]", dbNotFoundUsers) : [];
        const db_plain = dbNotFiltred.filter((data) => client.guilds.cache.get(guildId).members.cache.has(data.discord_id));
        if (!db_plain)
            return console.error(`[Error code: 1006] DB is not avaliable`, db_plain);
        for (let i = 0; i < db_plain.length; i++) {
            const db_row = db_plain[i];
            const member = client.guilds.cache.get(guildId).members.cache.get(db_row.discord_id);
            if (!member) {
                await client.guilds.cache.get(guildId)?.members.fetch();
                return console.error("[activityChecker]", "[Error code: 1007]", db_row.displayname);
            }
            activityChecker(db_row, member, 4);
            activityChecker(db_row, member, 82);
            await timer(250);
        }
    }, 1000 * 70);
};
