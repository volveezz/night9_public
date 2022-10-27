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
                const charIdArray = [];
                chars["characters"].forEach((ch) => charIdArray.push(ch.characterId));
                character_data.set(data.discord_id, charIdArray);
                activityChecker(data, member, mode);
            })
                .catch((e) => {
                e.statusCode === 401 || e.statusCode === 503 || e.statusCode === 500
                    ? console.error(`[activityChecker web ${e.statusCode} error] [Error code: 1003]`, data.displayname)
                    : console.error("[activityChecker] [Error code: 1002]", e.error, data.displayname, e.statusCode);
            });
        }
        else {
            for (const character of character_data.get(member.id)) {
                await checker();
                async function activities() {
                    const response = await fetchRequest(`Platform/Destiny2/${data.platform}/Account/${data.bungie_id}/Character/${character}/Stats/Activities/?count=2&mode=${mode}&page=0`, data);
                    return response;
                }
                async function checker() {
                    const response = await activities();
                    if (!response)
                        return console.error("[activityChecker] [Error code: 1000]", data.displayname, character, response);
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
        dbNotFoundUsers.length > 0 ? console.error(dbNotFoundUsers, "[Error code: 1005]") : [];
        const db_plain = dbNotFiltred.filter((data) => client.guilds.cache.get(guildId).members.cache.has(data.discord_id));
        if (!db_plain || db_plain.length === 0)
            return console.error(`[activityChecker error] DB is ${db_plain?.length === 0 ? "empty" : `${db_plain?.length} length`} or missing data`, "[Error code: 1006]");
        for (let i = 0; i < db_plain.length; i++) {
            const db_row = db_plain[i];
            const member = client.guilds.cache.get(guildId).members.cache.get(db_row.discord_id);
            if (!member) {
                await client.guilds.cache.get(guildId)?.members.fetch();
                return console.error("[activityChecker]", "[Error code: 1007]", db_row.displayname);
            }
            activityChecker(db_row, member, 4);
            activityChecker(db_row, member, 82);
            await timer(200);
        }
    }, 1000 * 70);
};
