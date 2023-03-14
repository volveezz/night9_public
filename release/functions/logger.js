import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { ids } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { CachedDestinyActivityDefinition } from "./manifestHandler.js";
import { Op } from "sequelize";
import { fetchRequest } from "./fetchRequest.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { AuthData, UserActivityData, RaidEvent } from "../handlers/sequelize.js";
import { RaidButtons } from "../enums/Buttons.js";
import { completedPhases } from "./activityCompletionChecker.js";
import convertSeconds from "./utilities.js";
const pgcrIds = new Set();
export async function logClientDmMessages(member, text, id, interaction) {
    const dmLogChannel = interaction ? null : client.getCachedGuild().channels.cache.get(ids.dmMsgsChnId);
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle("Отправлено сообщение")
        .setAuthor({
        name: `Отправлено: ${member.displayName || member.user.username}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
        iconURL: member.displayAvatarURL(),
    })
        .setTimestamp()
        .setDescription(text || "nothing")
        .setFooter({ text: `UId: ${member.id} | MId: ${id}` });
    const payload = {
        embeds: [embed],
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    new ButtonBuilder().setCustomId("dmChnFunc_reply").setLabel("Ответить").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("dmChnFunc_delete").setLabel("Удалить сообщение").setStyle(ButtonStyle.Danger),
                ],
            },
        ],
    };
    interaction ? interaction.editReply(payload) : dmLogChannel.send(payload);
}
export async function activityReporter(pgcrId) {
    if (!pgcrIds.has(pgcrId)) {
        pgcrIds.add(pgcrId);
        const response = await fetchRequest(`Platform/Destiny2/Stats/PostGameCarnageReport/${pgcrId}/`).catch((e) => console.log(`[Error code: 1072] activityReporter error`, pgcrId, e, e.statusCode));
        if (!response.activityDetails) {
            console.error(`[PGCR Checker] [Error code: 1009]`, pgcrId, response);
            return;
        }
        const { mode, referenceId } = response.activityDetails;
        const manifestData = CachedDestinyActivityDefinition[referenceId];
        const footerText = `Активность была начата ${response.activityWasStartedFromBeginning ? "с начала" : "с сохранения"}`;
        const thumbnailUrl = manifestData.pgcrImage === "/img/theme/destiny/bgs/pgcrs/placeholder.jpg" &&
            [2381413764, 1191701339, 2918919505].includes(manifestData.hash)
            ? "https://images.contentstack.io/v3/assets/blte410e3b15535c144/bltd95f9a53ce953669/63ffd4b9a7d98e0267ed24eb/Fp_5gnkX0AULoRF.jpg"
            : `https://bungie.net${manifestData.pgcrImage}`;
        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTimestamp(new Date(response.period))
            .setAuthor({
            name: mode === 4 ? "Raid Report" : mode === 82 ? "Dungeon Report" : "Bungie PGCR",
            url: mode === 4
                ? `https://raid.report/pgcr/${pgcrId}`
                : mode === 82
                    ? `https://dungeon.report/pgcr/${pgcrId}`
                    : `https://www.bungie.net/ru/PGCR/${pgcrId}`,
        })
            .setTitle(`${manifestData.displayProperties.name} - ${response.entries[0].values.activityDurationSeconds.basic.displayValue
            .replace("h", "ч")
            .replace("m", "м")
            .replace("s", "с")}`)
            .setFooter({
            text: footerText,
            iconURL: manifestData.displayProperties.hasIcon
                ? manifestData.displayProperties.highResIcon
                    ? `https://bungie.net${manifestData.displayProperties.highResIcon}`
                    : `https://bungie.net${manifestData.displayProperties.icon}`
                : undefined,
        })
            .setThumbnail(thumbnailUrl);
        const completedUsers = new Map();
        response.entries.forEach((entry) => {
            const userData = completedUsers.get(entry.player.destinyUserInfo.membershipId);
            const miscArray = userData?.misc || [];
            if (entry.extended?.weapons?.some((a) => a.referenceId === 4103414242) && !miscArray.some((a) => a.endsWith("**Божественность**")))
                miscArray.push("<a:catbowtie:1034701666580189256>**Божественность**");
            if (entry.extended?.weapons?.some((a) => a.referenceId === 3580904581) && !miscArray.some((a) => a.endsWith("**Буксировщик**")))
                miscArray.push("<:moyaichad:1018345835962044559>**Буксировщик**");
            if (entry.extended?.weapons?.some((a) => a.referenceId === 1363886209) && !miscArray.some((a) => a.endsWith("**Гьяллархорн**")))
                miscArray.push("<a:workin:1077438227830542406>**Гьяллархорн**");
            if (entry.extended?.weapons?.some((a) => a.referenceId === 3512014804) && !miscArray.some((a) => a.endsWith("**Люмина**")))
                miscArray.push("<a:iamthebest:1084475253901774938>**Люмина**");
            completedUsers.set(entry.player.destinyUserInfo.membershipId, {
                bungieName: entry.player.destinyUserInfo.bungieGlobalDisplayName,
                classHash: entry.values.completed.basic.value === 1
                    ? (entry.player.classHash === 671679327
                        ? "<:hunter:995496474978824202>"
                        : entry.player.classHash === 2271682572
                            ? "<:warlock:995496471526920232>"
                            : "<:titan:995496472722284596>") + (userData?.classHash || "")
                    : (userData?.classHash || "") +
                        String(entry.player.classHash === 671679327
                            ? "<:deadHunter:1023051800653344859>"
                            : entry.player.classHash === 2271682572
                                ? "<:deadWarlock:1023051796932989059>"
                                : "<:deadTitan:1023051798740729876>"),
                completed: !userData?.completed ? (entry.values.completed.basic.value === 1 ? true : false) : true,
                kills: entry.values.kills.basic.value + (userData?.kills || 0),
                deaths: entry.values.deaths.basic.value + (userData?.deaths || 0),
                assists: entry.values.assists.basic.value + (userData?.assists || 0),
                timeInActivity: entry.values.timePlayedSeconds.basic.value + (userData?.timeInActivity || 0),
                misc: miscArray,
            });
        });
        const membersMembershipIds = Array.from(completedUsers.keys());
        completedUsers.forEach((value, key) => {
            if (!value.completed) {
                return;
            }
            else {
                completedUsers.delete(key);
            }
            embed.addFields({
                name: value.bungieName,
                value: `${value.classHash}УП: **${value.kills + value.assists}** С: **${value.deaths}**${value.timeInActivity + 120 < response.entries[0].values.activityDurationSeconds.basic.value
                    ? `\nВ ${response.activityDetails.mode === 4 ? "рейде" : response.activityDetails.mode === 82 ? "подземелье" : "активности"}: **${convertSeconds(value.timeInActivity)}**`
                    : ""}${value.misc.length > 0 ? "\n" + value.misc.join("\n") : ""}`,
                inline: true,
            });
        });
        embed.data.fields = embed.data.fields?.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
        completedUsers.forEach((value, _key) => {
            embed.addFields({
                name: "❌" + value.bungieName,
                value: `${value.classHash}УП: **${value.kills + value.assists}** С: **${value.deaths}**${value.timeInActivity + 120 < response.entries[0].values.activityDurationSeconds.basic.value
                    ? `\nВ ${response.activityDetails.mode === 4 ? "рейде" : response.activityDetails.mode === 82 ? "подземелье" : "активности"}: **${convertSeconds(value.timeInActivity)}**`
                    : ""}${value.misc.length > 0 ? "\n" + value.misc.join("\n") : ""}`,
                inline: true,
            });
        });
        if (membersMembershipIds.length <= 0)
            return;
        const dbData = await AuthData.findAll({ where: { bungieId: { [Op.any]: membersMembershipIds } } });
        const clanMembersInRaid = dbData.filter((a) => a.clan).length;
        if (dbData.length >= 1 && clanMembersInRaid >= 1) {
            if (response.activityDetails.mode === 4 && dbData.length <= 1 && clanMembersInRaid <= 1)
                return;
            if (response.activityDetails.mode === 82 && (clanMembersInRaid < 1 || (membersMembershipIds.length > 1 && dbData.length <= 1)))
                return;
            const preciseEncountersTime = new Map();
            membersMembershipIds.forEach((bungieId, i1) => {
                if (completedPhases.has(bungieId)) {
                    const completedPhasesForUser = completedPhases.get(bungieId);
                    let previousEncounterEndTime = 0;
                    completedPhasesForUser.forEach((completedPhase, i2) => {
                        const { phase: phaseHash, start, end } = completedPhase;
                        if (!preciseEncountersTime.has(phaseHash)) {
                            preciseEncountersTime.set(phaseHash, completedPhase);
                            previousEncounterEndTime = end;
                        }
                        else {
                            const preciseStoredEncounterTime = preciseEncountersTime.get(phaseHash);
                            if (start > 1 && start < preciseStoredEncounterTime.start && previousEncounterEndTime <= start) {
                                preciseStoredEncounterTime.start = start;
                            }
                            if (end > 1 && end < preciseStoredEncounterTime.end && previousEncounterEndTime < end) {
                                preciseStoredEncounterTime.end = end;
                            }
                            else if (end <= 1) {
                                const resolvedTime = completedPhasesForUser[i2 + 1]?.start || completedPhases.get(membersMembershipIds[i1 + 1])?.[i2 + 1]?.start;
                                if (resolvedTime && resolvedTime > 1)
                                    preciseStoredEncounterTime.end = resolvedTime;
                            }
                            preciseEncountersTime.set(phaseHash, preciseStoredEncounterTime);
                            previousEncounterEndTime = preciseStoredEncounterTime.end;
                        }
                    });
                    completedPhases.delete(bungieId);
                }
            });
            if (preciseEncountersTime && preciseEncountersTime.size > 0) {
                const encountersData = [];
                const phasesArray = Array.from(preciseEncountersTime.values()).sort((a, b) => a.phaseIndex - b.phaseIndex);
                phasesArray.forEach((encounterData, i) => {
                    if (i === 0) {
                        return encountersData.push({
                            end: encounterData.end,
                            phase: encounterData.phase,
                            phaseIndex: encounterData.phaseIndex != 1 && response.activityWasStartedFromBeginning
                                ? `1-${encounterData.phaseIndex}`
                                : encounterData.phaseIndex,
                            start: new Date(response.period).getTime(),
                        });
                    }
                    else if (i === phasesArray.length - 1) {
                        const activityEndTime = new Date(response.period).getTime() + response.entries[0].values.activityDurationSeconds.basic.value * 1000;
                        return encountersData.push({
                            end: encounterData.end > activityEndTime || encounterData.end <= 1 ? activityEndTime : encounterData.end,
                            phase: encounterData.phase,
                            phaseIndex: encounterData.phaseIndex,
                            start: encounterData.start,
                        });
                    }
                    encountersData.push(encounterData);
                });
                if (encountersData.length >= 1) {
                    try {
                        embed.addFields([
                            {
                                name: "Затраченное время на этапы",
                                value: `${encountersData
                                    .map((encounter) => {
                                    return `⁣　⁣${encounter.phaseIndex}. <t:${Math.floor(encounter.start / 1000)}:t> — <t:${Math.floor(encounter.end / 1000)}:t>, **${convertSeconds(Math.floor((encounter.end - encounter.start) / 1000))}**`;
                                })
                                    .join("\n")}`,
                            },
                        ]);
                    }
                    catch (error) {
                        console.error(`[Error code: 1610] Error during adding fields to the raid result`, error);
                    }
                }
                else {
                    console.error(`[Error code: 1613]`, encountersData, preciseEncountersTime, preciseEncountersTime.size);
                }
                preciseEncountersTime.clear();
            }
            const msg = client.getCachedGuild().channels.cache.get(ids.activityChnId).send({ embeds: [embed] });
            const currentTime = Math.trunc(new Date().getTime() / 1000);
            dbData.forEach(async (dbMemberData) => {
                if (response.activityDetails.mode === 82 && clanMembersInRaid > 1)
                    return UserActivityData.increment("dungeons", { by: 1, where: { discordId: dbMemberData.discordId } });
                if (response.activityDetails.mode !== 4)
                    return;
                if (dbMemberData.clan === true && clanMembersInRaid > 2)
                    UserActivityData.increment("raids", { by: 1, where: { discordId: dbMemberData.discordId } });
                const dbRaidData = await RaidEvent.findAll({ where: { creator: dbMemberData.discordId } }).then((data) => {
                    for (let i = 0; i < data.length; i++) {
                        const row = data[i];
                        if (row.time < currentTime)
                            return row;
                    }
                });
                if (dbRaidData && dbRaidData.time < currentTime) {
                    const resolvedMsg = await msg;
                    const embed = new EmbedBuilder()
                        .setColor(colors.serious)
                        .setFooter({ text: `RId: ${dbRaidData.id}` })
                        .setTitle("Созданный вами рейд был завершен")
                        .setDescription(`Вы создавали рейд ${dbRaidData.id}-${dbRaidData.raid} на <t:${dbRaidData.time}> и сейчас он был завершен.\nПодтвердите завершение рейда для удаления набора.\n\n[История активностей](https://discord.com/channels/${resolvedMsg.guildId + "/" + resolvedMsg.channelId + "/" + resolvedMsg.id})`);
                    return (client.users.cache.get(dbRaidData.creator) ||
                        client.getCachedMembers().get(dbRaidData.creator) ||
                        (await client.users.fetch(dbRaidData.creator)))
                        .send({
                        embeds: [embed],
                        components: [
                            {
                                type: ComponentType.ActionRow,
                                components: [
                                    new ButtonBuilder().setCustomId(RaidButtons.delete).setLabel("Удалить набор").setStyle(ButtonStyle.Danger),
                                ],
                            },
                        ],
                    })
                        .catch((e) => console.error(`[Error code: 1071] acitvityReporter final error`, e));
                }
            });
        }
    }
}
export function logRegistrationLinkRequest(state, user, rowCreated) {
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setAuthor({
        name: `${user.username} начал регистрацию`,
        iconURL: user.displayAvatarURL(),
    })
        .addFields([
        { name: "Пользователь", value: `<@${user.id}>`, inline: true },
        { name: "State", value: state, inline: true },
        { name: "Впервые", value: `${rowCreated}`, inline: true },
    ]);
    client.getCachedGuild().channels.cache.get(ids.botChnId).send({ embeds: [embed] });
}
export async function updateClanRolesWithLogging(result, join) {
    const member = client.getCachedGuild().members.cache.get(result.discordId);
    const embed = new EmbedBuilder().addFields([
        { name: "Пользователь", value: `<@${result.discordId}>`, inline: true },
        { name: "BungieId", value: result.bungieId, inline: true },
        { name: "Ник в игре", value: result.displayName, inline: true },
    ]);
    if (member) {
        if (join) {
            member.roles
                .add(statusRoles.clanmember, "Clan join")
                .then((m) => m.roles.remove([statusRoles.kicked, statusRoles.newbie, statusRoles.member]));
            embed
                .setAuthor({
                name: `${member.displayName} вступил в клан`,
                iconURL: member.displayAvatarURL(),
            })
                .setColor(colors.success);
        }
        else {
            member.roles.set(member.roles.cache.has(statusRoles.verified) ? [statusRoles.kicked, statusRoles.verified] : [statusRoles.kicked], "Member left clan");
            embed
                .setAuthor({
                name: `${member.displayName} покинул клан`,
                iconURL: member.displayAvatarURL(),
            })
                .setColor(colors.kicked);
        }
    }
    else {
        if (join) {
            embed
                .setAuthor({
                name: `Неизвестный на сервере пользователь вступил в клан`,
            })
                .setColor(colors.success);
        }
        else {
            embed
                .setAuthor({
                name: `Неизвестный на сервере пользователь покинул клан`,
            })
                .setColor(colors.kicked);
        }
    }
    client.getCachedGuild().channels.cache.get(ids.clanChnId).send({ embeds: [embed] });
}
