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
        if (!response.activityDetails)
            return console.error(`[PGCR Checker] [Error code: 1009]`, pgcrId, response);
        const embed = new EmbedBuilder().setColor(colors.success).setTimestamp(new Date(response.period));
        response.activityDetails.mode === 4
            ? embed.setAuthor({ name: `Raid Report`, url: `https://raid.report/pgcr/${pgcrId}` })
            : response.activityDetails.mode === 82
                ? embed.setAuthor({ name: `Dungeon Report`, url: `https://dungeon.report/pgcr/${pgcrId}` })
                : embed.setAuthor({ name: "Bungie PGCR", url: `https://www.bungie.net/ru/PGCR/${pgcrId}` });
        const footerText = `Активность была начата ${response.activityWasStartedFromBeginning ? "с начала" : "с сохранения"}`;
        const referenceId = response.activityDetails.referenceId;
        const manifestData = CachedDestinyActivityDefinition[referenceId];
        embed.setTitle(manifestData.displayProperties.name +
            " - " +
            response.entries[0].values.activityDurationSeconds.basic.displayValue.replace("h", "ч").replace("m", "м").replace("s", "с"));
        manifestData.displayProperties.hasIcon
            ? manifestData.displayProperties.highResIcon
                ? embed.setFooter({ text: footerText, iconURL: `https://bungie.net${manifestData.displayProperties.highResIcon}` })
                : embed.setFooter({ text: footerText, iconURL: `https://bungie.net${manifestData.displayProperties.icon}` })
            : embed.setFooter({ text: footerText });
        manifestData.pgcrImage ? embed.setThumbnail(`https://bungie.net${manifestData.pgcrImage}`) : "";
        const completedUsers = new Map();
        response.entries.forEach((entry) => {
            const userData = completedUsers.get(entry.player.destinyUserInfo.membershipId);
            const miscArray = userData?.misc || [];
            entry.extended?.weapons?.some((a) => a.referenceId === 4103414242) && !miscArray.some((a) => a.endsWith("**Божественность**"))
                ? miscArray.push("<a:catbowtie:1034701666580189256>**Божественность**")
                : false;
            entry.extended?.weapons?.some((a) => a.referenceId === 3580904581) && !miscArray.some((a) => a.endsWith("**Буксировщик**"))
                ? miscArray.push("<:moyaichad:1018345835962044559>**Буксировщик**")
                : false;
            entry.extended?.weapons?.some((a) => a.referenceId === 4027219968) && !miscArray.some((a) => a.endsWith("**Гьяллархорн**"))
                ? miscArray.push("<:workin:1077438227830542406>**Гьяллархорн**")
                : false;
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
            const msg = await client.getCachedGuild().channels.cache.get(ids.activityChnId).send({ embeds: [embed] });
            const preciseEncountersTime = new Map();
            membersMembershipIds.forEach((bungieId) => {
                if (completedPhases.has(bungieId)) {
                    const completedPhasesForUser = completedPhases.get(bungieId);
                    let previousEncounterEndTime = 0;
                    completedPhasesForUser.forEach((completedPhase) => {
                        const { phase: phaseHash, phaseIndex, start, end } = completedPhase;
                        if (!preciseEncountersTime.has(phaseHash)) {
                            preciseEncountersTime.set(phaseHash, { start, end, phaseIndex, phase: phaseHash });
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
                            preciseEncountersTime.set(phaseHash, preciseStoredEncounterTime);
                            previousEncounterEndTime = preciseStoredEncounterTime.end;
                        }
                    });
                    completedPhases.delete(bungieId);
                }
            });
            if (preciseEncountersTime) {
                const testEmbed = EmbedBuilder.from(embed);
                const encountersData = [];
                let index = 0;
                preciseEncountersTime.forEach((encounterData) => {
                    if (index === 0) {
                        index++;
                        return encountersData.push({
                            end: encounterData.end,
                            phase: encounterData.phase,
                            phaseIndex: encounterData.phaseIndex !== 1 && response.activityWasStartedFromBeginning
                                ? `1-${encounterData.phaseIndex}`
                                : encounterData.phaseIndex,
                            start: new Date(response.period).getTime(),
                        });
                    }
                    else if (index === preciseEncountersTime.size - 1) {
                        index++;
                        return encountersData.push({
                            end: new Date(response.period).getTime() + response.entries[0].values.activityDurationSeconds.basic.value * 1000,
                            phase: encounterData.phase,
                            phaseIndex: encounterData.phaseIndex,
                            start: encounterData.start,
                        });
                    }
                    index++;
                    encountersData.push(encounterData);
                });
                testEmbed.addFields([
                    {
                        name: "Затраченное время на этапы",
                        value: `${encountersData
                            .map((encounter) => {
                            return `⁣　⁣${encounter.phaseIndex}. <t:${Math.floor(encounter.start / 1000)}:t> — <t:${Math.floor(encounter.end / 1000)}:t>, **${convertSeconds(Math.floor((encounter.end - encounter.start) / 1000))}**`;
                        })
                            .join("\n")}`,
                    },
                ]);
                try {
                    (client.getCachedGuild().channels.cache.get(ids.adminChnId) ||
                        (await client.getCachedGuild().channels.fetch(ids.adminChnId))).send({ embeds: [testEmbed] });
                }
                catch (error) {
                    console.error(`[Error code: 1422]`, { error });
                }
                preciseEncountersTime.clear();
            }
            dbData.forEach(async (dbMemberData) => {
                if (response.activityDetails.mode === 82 && clanMembersInRaid > 1)
                    return UserActivityData.increment("dungeons", { by: 1, where: { discordId: dbMemberData.discordId } });
                if (response.activityDetails.mode !== 4)
                    return;
                if (dbMemberData.clan && clanMembersInRaid > 2)
                    UserActivityData.increment("raids", { by: 1, where: { discordId: dbMemberData.discordId } });
                const dbRaidData = await RaidEvent.findAll({ where: { creator: dbMemberData.discordId } }).then((data) => {
                    for (let i = 0; i < data.length; i++) {
                        const row = data[i];
                        if (row.time < Math.trunc(new Date().getTime() / 1000))
                            return row;
                    }
                });
                if (dbRaidData && dbRaidData.time < Math.trunc(new Date().getTime() / 1000)) {
                    const embed = new EmbedBuilder()
                        .setColor(colors.serious)
                        .setFooter({ text: `RId: ${dbRaidData.id}` })
                        .setTitle("Созданный вами рейд был завершен")
                        .setDescription(`Вы создавали рейд ${dbRaidData.id}-${dbRaidData.raid} на <t:${dbRaidData.time}> и сейчас он был завершен.\nПодтвердите завершение рейда для удаления набора.\n\n[История активностей](https://discord.com/channels/${msg.guildId + "/" + msg.channelId + "/" + msg.id})`);
                    return (client.users.cache.get(dbRaidData.creator) ||
                        client.getCachedGuild().members.cache.get(dbRaidData.creator) ||
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
        { name: "Впервые", value: String(rowCreated), inline: true },
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
