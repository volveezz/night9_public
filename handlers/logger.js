import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { colors } from "../base/colors.js";
import { ids, guildId } from "../base/ids.js";
import { db, discord_activities, lost_data, raids, auth_data } from "./sequelize.js";
import { statusRoles } from "../base/roles.js";
import { chnFetcher } from "../base/channels.js";
import { welcomeMessage } from "./welcomeMessage.js";
import { BotClient, BotClient as client } from "../index.js";
import { CachedDestinyActivityDefinition } from "./manifestHandler.js";
import { Op } from "sequelize";
import { fetchRequest } from "./webHandler.js";
const pgcrIds = new Set();
const guildMemberChannel = chnFetcher(ids.guildMemberChnId), guildChannel = chnFetcher(ids.guildChnId), messageChannel = chnFetcher(ids.messagesChnId), voiceChannel = chnFetcher(ids.voiceChnId), destinyClanChannel = chnFetcher(ids.clanChnId), discordBotChannel = chnFetcher(ids.botChnId), activityChannel = chnFetcher(ids.activityChnId);
export function dmChnSentMsgsLogger(member, text, id) {
    const dmChn = chnFetcher(ids.dmMsgsChnId);
    const embed = new EmbedBuilder()
        .setColor(colors.default)
        .setTitle("Отправлено сообщение")
        .setAuthor({
        name: `Отправлено: ${member.displayName || member.user.username}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
        iconURL: member.displayAvatarURL(),
    })
        .setTimestamp()
        .setDescription(text)
        .setFooter({ text: `UId: ${member.id} | MId: ${id}` });
    dmChn.send({
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
    });
}
export async function activityReporter(pgcrId) {
    if (!pgcrIds.has(pgcrId)) {
        pgcrIds.add(pgcrId);
        fetchRequest(`Platform/Destiny2/Stats/PostGameCarnageReport/${pgcrId}/`)
            .then(async (response) => {
            if (!response.activityDetails)
                return console.error(`[PGCR Checker] [Error code: 1009]`, pgcrId, response);
            const embed = new EmbedBuilder().setColor("Green").setTimestamp(new Date(response.period));
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
                entry.extended.weapons?.some((a) => a.referenceId === 4103414242) && !miscArray.some((a) => a.endsWith("**Божественность**"))
                    ? miscArray.push("<a:catbowtie:1034701666580189256>**Божественность**")
                    : false;
                entry.extended.weapons?.some((a) => a.referenceId === 3580904581) && !miscArray.some((a) => a.endsWith("**Буксировщик**"))
                    ? miscArray.push("<:moyaichad:1018345835962044559>**Буксировщик**")
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
                const arr = [];
                arr.push(value.timeInActivity >= 3600 ? Math.trunc(value.timeInActivity / 60 / 60) + "ч" : "");
                arr.push(value.timeInActivity >= 60
                    ? (value.timeInActivity > 660
                        ? Math.trunc(value.timeInActivity / 60) - Math.trunc(value.timeInActivity / 60 / 60) * 60
                        : Math.trunc(value.timeInActivity / 60)) + "м"
                    : "");
                value.timeInActivity < 3600
                    ? arr.push(value.timeInActivity - Math.trunc(value.timeInActivity / 60) * 60 !== 0
                        ? value.timeInActivity - Math.trunc(value.timeInActivity / 60) * 60 + "с"
                        : "")
                    : [];
                if (!value.completed) {
                    return;
                }
                else {
                    completedUsers.delete(key);
                }
                embed.addFields({
                    name: value.bungieName,
                    value: `${value.classHash}УП: **${value.kills + value.assists}** С: **${value.deaths}**${value.timeInActivity + 120 < response.entries[0].values.activityDurationSeconds.basic.value
                        ? `\nВ ${response.activityDetails.mode === 4 ? "рейде" : response.activityDetails.mode === 82 ? "подземелье" : "активности"}: **${arr.join(" ").trim()}**`
                        : ""}${value.misc.length > 0 ? "\n" + value.misc.join("\n") : ""}`,
                    inline: true,
                });
            });
            embed.data.fields = embed.data.fields?.sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
            completedUsers.forEach((value, _key) => {
                const arr = [];
                arr.push(value.timeInActivity >= 3600 ? Math.trunc(value.timeInActivity / 60 / 60) + "ч" : "");
                arr.push(value.timeInActivity >= 60
                    ? (value.timeInActivity > 660
                        ? Math.trunc(value.timeInActivity / 60) - Math.trunc(value.timeInActivity / 60 / 60) * 60
                        : Math.trunc(value.timeInActivity / 60)) + "м"
                    : "");
                value.timeInActivity < 3600
                    ? arr.push(value.timeInActivity - Math.trunc(value.timeInActivity / 60) * 60 !== 0
                        ? value.timeInActivity - Math.trunc(value.timeInActivity / 60) * 60 + "с"
                        : "")
                    : [];
                embed.addFields({
                    name: "❌" + value.bungieName,
                    value: `${value.classHash}УП: **${value.kills + value.assists}** С: **${value.deaths}**${value.timeInActivity + 120 < response.entries[0].values.activityDurationSeconds.basic.value
                        ? `\nВ ${response.activityDetails.mode === 4 ? "рейде" : response.activityDetails.mode === 82 ? "подземелье" : "активности"}: **${arr.join(" ").trim()}**`
                        : ""}${value.misc.length > 0 ? "\n" + value.misc.join("\n") : ""}`,
                    inline: true,
                });
            });
            if (membersMembershipIds.length <= 0)
                return;
            const dbData = await auth_data.findAll({ where: { bungie_id: { [Op.any]: `{${membersMembershipIds}}` } } });
            if (dbData.length >= 1 && dbData.filter((a) => a.clan).length >= 1) {
                if (response.activityDetails.mode === 4 && dbData.length <= 1 && dbData.filter((a) => a.clan).length <= 1)
                    return;
                if (response.activityDetails.mode === 82 &&
                    (dbData.filter((a) => a.clan).length < 1 || (membersMembershipIds.length > 1 && dbData.length <= 1)))
                    return;
                const msg = await activityChannel.send({ embeds: [embed] });
                dbData.forEach(async (dbMemberData) => {
                    if (response.activityDetails.mode === 82 && dbData.filter((a) => a.clan).length > 1)
                        return discord_activities.increment("dungeons", { by: 1, where: { authDatumDiscordId: dbMemberData.discord_id } });
                    if (response.activityDetails.mode !== 4)
                        return;
                    if (dbMemberData.clan && dbData.filter((a) => a.clan).length > 2)
                        discord_activities.increment("raids", { by: 1, where: { authDatumDiscordId: dbMemberData.discord_id } });
                    const dbRaidData = await raids.findAll({ where: { creator: dbMemberData.discord_id } }).then((data) => {
                        for (let i = 0; i < data.length; i++) {
                            const row = data[i];
                            if (row.time < Math.trunc(new Date().getTime() / 1000))
                                return row;
                        }
                    });
                    if (dbRaidData && dbRaidData.time < Math.trunc(new Date().getTime() / 1000)) {
                        const embed = new EmbedBuilder()
                            .setColor("Blurple")
                            .setFooter({ text: `RId: ${dbRaidData.id}` })
                            .setTitle("Созданный вами рейд был завершен")
                            .setDescription(`Вы создавали рейд ${dbRaidData.id}-${dbRaidData.raid} на <t:${dbRaidData.time}> и сейчас он был завершен.\nПодтвердите завершение рейда для удаления набора.\n\n[История активностей](https://discord.com/channels/${msg.guildId + "/" + msg.channelId + "/" + msg.id})`);
                        return BotClient.users.cache
                            .get(dbRaidData.creator)
                            ?.send({
                            embeds: [embed],
                            components: [
                                {
                                    type: ComponentType.ActionRow,
                                    components: [
                                        new ButtonBuilder().setCustomId("raidInChnButton_delete").setLabel("Удалить набор").setStyle(ButtonStyle.Danger),
                                    ],
                                },
                            ],
                        })
                            .catch((e) => console.error(`[Error code: 1071] acitvityReporter final error`, e));
                    }
                });
            }
        })
            .catch((e) => console.log(`[Error code: 1072] activityReporter error`, pgcrId, e, e.statusCode));
    }
}
export function init_register(state, user, rowCreated) {
    const embed = new EmbedBuilder()
        .setColor(colors.default)
        .setAuthor({
        name: `${user.username} начал регистрацию`,
        iconURL: user.displayAvatarURL(),
    })
        .setFooter({ text: `Id: ${user.id}` })
        .addFields([
        { name: "Пользователь", value: `<@${user.id}>`, inline: true },
        { name: "State", value: state, inline: true },
        { name: "Впервые", value: String(rowCreated), inline: true },
    ]);
    discordBotChannel.send({ embeds: [embed] });
}
export async function clan_joinLeave(result, join) {
    const member = client.guilds.cache.get(guildId).members.cache.get(result.discord_id);
    const embed = new EmbedBuilder().addFields([
        { name: "Пользователь", value: `<@${result.discord_id}>`, inline: true },
        { name: "BungieId", value: result.bungie_id, inline: true },
        { name: "Ник в игре", value: result.displayname, inline: true },
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
                .setColor("Green");
        }
        else {
            member.roles.set([statusRoles.kicked, member.roles.cache.has(statusRoles.verified) ? statusRoles.verified : ""], "Clan leave");
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
                .setColor("Green");
        }
        else {
            embed
                .setAuthor({
                name: `Неизвестный на сервере пользователь покинул клан`,
            })
                .setColor(colors.kicked);
        }
    }
    destinyClanChannel.send({ embeds: [embed] });
}
export default (client) => {
    const voiceUsers = new Map();
    client.on("guildMemberAdd", async (member) => {
        welcomeMessage(client, member);
        const embed = new EmbedBuilder()
            .setColor(colors.default)
            .setAuthor({
            name: "Присоединился новый участник",
        })
            .setTimestamp()
            .setFooter({ text: String(`Id: ` + member.id) })
            .setDescription(`<@${member.id}> ${member.user.username}#${member.user.discriminator}`)
            .addFields({
            name: "Дата создания аккаунта",
            value: String("<t:" + Math.round(member.user.createdTimestamp / 1000) + ">"),
        })
            .setThumbnail(String(member.displayAvatarURL()));
        if (member.communicationDisabledUntil !== null) {
            embed.addFields([
                {
                    name: "Тайм-аут до",
                    value: String(`<t:${Math.round(member.communicationDisabledUntilTimestamp / 1000)}>`),
                },
            ]);
        }
        guildMemberChannel.send({ embeds: [embed] }).then(async (m) => {
            const data = await lost_data.findOne({
                where: { discord_id: member.id },
            });
            if (!data)
                return;
            const transaction = await db.transaction();
            const embed = m.embeds[0];
            try {
                await auth_data.create({
                    discord_id: data.discord_id,
                    bungie_id: data.bungie_id,
                    displayname: data.displayname,
                    platform: data.platform || 3,
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    membership_id: data.membership_id,
                    tz: data.tz || 3,
                }, {
                    transaction: transaction,
                });
                await lost_data.destroy({
                    where: { discord_id: data.discord_id },
                    transaction: transaction,
                });
                embed.fields.push({
                    name: "Данные аккаунта восстановлены",
                    value: `${data.displayname} (${data.platform}/${data.bungie_id})`,
                });
                await transaction.commit();
                m.edit({ embeds: [embed] });
            }
            catch (error) {
                await transaction.rollback();
                embed.fields.push({
                    name: "Ошибка",
                    value: "Во время восстановления данных произошла ошибка",
                });
                console.error(error, data, transaction);
                m.edit({ embeds: [embed] });
            }
        });
    });
    client.on("guildMemberRemove", (member) => {
        if (member.guild.bans.cache.has(member.id))
            return;
        const embed = new EmbedBuilder()
            .setAuthor({ name: "Участник покинул сервер", iconURL: member.displayAvatarURL() })
            .setColor("Red")
            .setTimestamp()
            .addFields([
            { name: `Пользователь`, value: `${member.displayName}/${member}`, inline: true },
            {
                name: "Дата присоединения к серверу",
                value: String(`<t:` + Math.round(member.joinedTimestamp / 1000) + ">"),
                inline: true,
            },
        ])
            .setFooter({ text: `Id: ${member.id}` });
        if (member.roles.cache.hasAny(statusRoles.clanmember, statusRoles.member, statusRoles.kicked, statusRoles.newbie)) {
            embed.addFields({
                name: "Статус пользователя",
                value: `${member.roles.cache.has(statusRoles.clanmember)
                    ? `Участник клана`
                    : member.roles.cache.has(statusRoles.member)
                        ? `Участник сервера`
                        : member.roles.cache.has(statusRoles.kicked)
                            ? `Исключенный участник`
                            : member.roles.cache.has(statusRoles.newbie)
                                ? `Неизвестный`
                                : "Роли не найдены"}`,
            });
        }
        guildMemberChannel.send({ embeds: [embed] }).then(async (m) => {
            const data = await auth_data.findOne({
                where: { discord_id: member.id },
            });
            if (!data)
                return;
            const transaction = await db.transaction();
            const embed = m.embeds[0];
            try {
                await auth_data.destroy({
                    where: { discord_id: data.discord_id },
                    transaction: transaction,
                });
                await lost_data.create({
                    discord_id: data.discord_id,
                    bungie_id: data.bungie_id,
                    displayname: data.displayname,
                    platform: data.platform,
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    membership_id: data.membership_id,
                    tz: data.tz,
                }, {
                    transaction: transaction,
                });
                await transaction.commit();
                embed.fields.push({
                    name: "BungieId",
                    value: `${data.platform}/${data.bungie_id}`,
                    inline: true,
                }, {
                    name: "Ник в игре",
                    value: data.displayname,
                    inline: true,
                }, {
                    name: "MembershipId",
                    value: String(data.membership_id),
                    inline: true,
                });
                m.edit({ embeds: [embed] });
            }
            catch (error) {
                await transaction.rollback();
                embed.fields.push({
                    name: "Ошибка",
                    value: "Произошла ошибка во время удаления данных в БД",
                });
                console.error(error, data, transaction);
                m.edit({ embeds: [embed] });
            }
        });
    });
    client.on("guildMemberUpdate", async (oldMember, newMember) => {
        if (oldMember.joinedTimestamp === null || (oldMember.nickname === null && oldMember.roles.cache.size === 0))
            return;
        const embed = new EmbedBuilder()
            .setAuthor({ name: "guildMemberUpdate" })
            .setColor(colors.default)
            .setFooter({ text: `Id: ${oldMember.id}` })
            .setTimestamp();
        if (oldMember.roles !== newMember.roles) {
            const removedRoles = [], gotRoles = [];
            oldMember?.roles.cache.forEach((role) => {
                !newMember.roles.cache.has(role.id) ? removedRoles.push(`<@&${role.id}>`) : [];
            });
            newMember?.roles.cache.forEach((role) => {
                !oldMember.roles.cache.has(role.id) ? gotRoles.push(`<@&${role.id}>`) : [];
            });
            if (removedRoles.length > 0) {
                embed
                    .setAuthor({
                    name: `У ${newMember.displayName} ${removedRoles.length === 1 ? "была удалена роль" : "были удалены роли"}`,
                    iconURL: newMember.displayAvatarURL(),
                })
                    .addFields([
                    {
                        name: "Пользователь",
                        value: `<@${newMember.id}>`,
                        inline: true,
                    },
                    {
                        name: removedRoles.length === 1 ? "Роль" : "Роли",
                        value: removedRoles.toString().length > 1023 ? "Слишком много ролей" : removedRoles.toString(),
                        inline: true,
                    },
                ]);
            }
            else if (gotRoles.length > 0) {
                embed
                    .setAuthor({
                    name: `${newMember.displayName} ${gotRoles.length === 1 ? "была выдана роль" : "были выданы роли"}`,
                    iconURL: newMember.displayAvatarURL(),
                })
                    .addFields([
                    {
                        name: "Пользователь",
                        value: `<@${newMember.id}>`,
                        inline: true,
                    },
                    {
                        name: gotRoles.length === 1 ? "Роль" : "Роли",
                        value: gotRoles.toString() || "error",
                        inline: true,
                    },
                ]);
            }
        }
        if (oldMember.displayName !== newMember.displayName) {
            embed
                .setAuthor({
                name: `${newMember.displayName} обновил никнейм`,
                iconURL: newMember.displayAvatarURL(),
            })
                .addFields([
                { name: "Пользователь", value: `<@${newMember.id}>`, inline: true },
                { name: "До изменения", value: `\`` + oldMember.displayName + `\``, inline: true },
                { name: "После", value: `\`` + newMember.displayName + `\``, inline: true },
            ]);
        }
        if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
            if (oldMember.communicationDisabledUntilTimestamp === null) {
                embed
                    .setAuthor({
                    name: `${newMember.displayName} был выдан тайм-аут`,
                    iconURL: newMember.displayAvatarURL(),
                })
                    .setColor(colors.default)
                    .addFields([
                    { name: "Пользователь", value: `<@${newMember.id}>`, inline: true },
                    {
                        name: "Тайм-аут до",
                        value: `<t:${Math.round(newMember.communicationDisabledUntilTimestamp / 1000)}>`,
                    },
                ]);
            }
            else {
                embed
                    .setAuthor({
                    name: `${newMember.displayName} был снят тайм-аут`,
                    iconURL: newMember.displayAvatarURL(),
                })
                    .setColor(colors.default);
            }
        }
        if (embed.data.author?.name !== "guildMemberUpdate") {
            guildMemberChannel.send({ embeds: [embed] });
        }
    });
    client.on("guildBanAdd", async (member) => {
        const joinedDate = Math.round(member.guild.members.cache.get(member.user.id)?.joinedTimestamp / 1000);
        const embed = new EmbedBuilder()
            .setAuthor({
            name: `${member.user.username} был забанен`,
            iconURL: member.user.displayAvatarURL(),
        })
            .setColor("Red")
            .setFooter({ text: `Id: ${member.user.id}` })
            .setTimestamp()
            .addFields([
            {
                name: "Дата присоединения к серверу",
                value: String(isNaN(joinedDate) ? "не найдена" : `<t:${joinedDate}>`),
            },
        ]);
        await member.fetch();
        if (member.reason !== null) {
            embed.addFields([
                {
                    name: "Причина бана",
                    value: member.reason ? member.reason : "не указана",
                },
            ]);
        }
        guildMemberChannel.send({ embeds: [embed] });
    });
    client.on("guildBanRemove", (member) => {
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({
            name: `${member.user.username} разбанен`,
            iconURL: member.user.displayAvatarURL(),
        })
            .setTimestamp()
            .setFooter({ text: `Id: ${member.user.id}` });
        if (member.reason) {
            embed.addFields([
                {
                    name: "Причина бана",
                    value: member.reason.length > 1000 ? "*слишком длинная причина бана*" : member.reason,
                },
            ]);
        }
        guildMemberChannel.send({ embeds: [embed] });
    });
    client.on("guildUpdate", async (oldGuild, newGuild) => {
        const embed = new EmbedBuilder()
            .setColor(colors.default)
            .setAuthor({
            name: "Сервер обновлен",
        })
            .setTimestamp();
        if (oldGuild.name !== newGuild.name) {
            embed.addFields([
                {
                    name: "Название сервера обновлено",
                    value: `\`${oldGuild.name}\` -> \`${newGuild.name}\``,
                },
            ]);
        }
        if (oldGuild.icon !== newGuild.icon) {
            embed.addFields([
                {
                    name: "Иконка обновлена",
                    value: String(`[До изменения](${oldGuild.iconURL() || "https://natribu.org/"}) -> [После](${newGuild.iconURL() || "https://natribu.org/"})`),
                },
            ]);
        }
        if (oldGuild.premiumTier !== newGuild.premiumTier) {
            embed.addFields([
                {
                    name: "Статус буста сервера обновлен",
                    value: `\`${oldGuild.premiumTier}\` -> \`${newGuild.premiumTier}\``,
                },
            ]);
        }
        if (oldGuild.ownerId !== newGuild.ownerId) {
            embed.addFields([
                {
                    name: "Владелец сервера обновлен",
                    value: String(await newGuild.fetchOwner().then((own) => `\`` + own.displayName + `\``)),
                },
            ]);
        }
        if (embed.data.fields?.length > 0)
            guildChannel.send({ embeds: [embed] });
    });
    client.on("channelCreate", (createdChannel) => {
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({ name: `Канал ${createdChannel.name} создан` })
            .setTimestamp()
            .setFooter({ text: `ChnId: ${createdChannel.id}` })
            .addFields([
            { name: `Канал`, value: `<#${createdChannel.id}>`, inline: true },
            {
                name: "Позиция",
                value: `${createdChannel.position}/raw ${createdChannel.rawPosition}`,
                inline: true,
            },
        ]);
        if (embed.data.fields?.length > 0)
            guildChannel.send({ embeds: [embed] });
    });
    client.on("channelDelete", (deletedChannel) => {
        const embed = new EmbedBuilder().setColor("Red").setAuthor({ name: `Канал удален` }).setTimestamp();
        if (!deletedChannel.isDMBased()) {
            embed.setFooter({ text: `ChnId: ${deletedChannel.id}` }).addFields([
                {
                    name: "Название",
                    value: deletedChannel.name,
                    inline: true,
                },
                {
                    name: "Дата создания",
                    value: `<t:${Math.round(deletedChannel.createdTimestamp / 1000)}>`,
                    inline: true,
                },
            ]);
        }
        else
            console.log(`Deleted channel found as DM`, deletedChannel);
        if (embed.data.fields?.length > 0)
            guildChannel.send({ embeds: [embed] });
    });
    client.on("inviteCreate", (invite) => {
        if (invite.inviterId === client.user?.id)
            return;
        const member = client.guilds.cache.get(invite.guild.id).members.cache.get(invite.inviterId);
        const embed = new EmbedBuilder()
            .setAuthor({
            name: `${member?.displayName || invite.inviter?.username} создал приглашение`,
            iconURL: member?.displayAvatarURL() || invite.inviter?.displayAvatarURL(),
        })
            .setTimestamp()
            .setFooter({ text: `Id: ${invite.inviterId}` })
            .addFields([
            { name: `Ссылка`, value: `https://discord.gg/${invite.code}` },
            {
                name: "Использований",
                value: String(invite.maxUses ? invite.uses + `/` + invite.maxUses : "без ограничений"),
                inline: true,
            },
            {
                name: "Действительно до",
                value: String(`${invite.expiresTimestamp ? `<t:` + Math.round(invite.expiresTimestamp / 1000) + `>` : "бессрочно"}`),
                inline: true,
            },
            {
                name: "Приглашение в",
                value: `<#${invite.channelId}>`,
                inline: true,
            },
        ])
            .setColor(colors.default);
        guildChannel.send({ embeds: [embed] });
    });
    client.on("inviteDelete", (invite) => {
        const embed = new EmbedBuilder()
            .setAuthor({ name: `Приглашение ${invite.code} удалено` })
            .setColor("Red")
            .setTimestamp()
            .addFields([
            {
                name: "Приглашение в",
                value: `<#${invite.channelId}>`,
                inline: true,
            },
        ]);
        guildChannel.send({ embeds: [embed] });
    });
    client.on("messageDelete", (message) => {
        if (message.system ||
            message.author?.id === client.user?.id ||
            (message.content?.length === 0 && message.attachments.size === 0 && message.stickers.size === 0) ||
            message.author === null)
            return;
        const embed = new EmbedBuilder()
            .setColor("DarkRed")
            .setAuthor({ name: "Сообщение удалено" })
            .setFooter({ text: `MsgId: ${message.id}` })
            .setTimestamp();
        if (message.author !== null) {
            embed.addFields([
                {
                    name: "Автор",
                    value: `<@${message.author.id}> (${message.author.id})`,
                    inline: true,
                },
                {
                    name: "Удалено в",
                    value: `<#${message.channelId}>`,
                    inline: true,
                },
            ]);
        }
        else {
            embed.setAuthor({ name: "Неизвестное сообщение удалено" }).addFields([{ name: "Удалено в", value: `<#${message.channelId}>` }]);
        }
        if (message.content?.length > 0) {
            embed.addFields([
                {
                    name: "Текст",
                    value: `\`${message.content?.length > 1000 ? "слишком длинное сообщение" : message.content}\``,
                },
            ]);
        }
        if (message.embeds.length > 0) {
            embed.addFields([{ name: "Embed-вложения", value: `\`${message.embeds.length}\`` }]);
        }
        if (message.attachments.size !== 0) {
            const arrayAttachment = [];
            message.attachments.forEach((msgAttachment) => {
                arrayAttachment.push(msgAttachment.url);
            });
            embed.addFields([
                {
                    name: message.attachments.size === 1 ? "Вложение" : "Вложения",
                    value: arrayAttachment.join(`\n`).toString() || "blank",
                },
            ]);
        }
        if (message.stickers.size !== 0) {
            const stickerArr = [];
            message.stickers.forEach((sticker) => {
                stickerArr.push(sticker.name);
            });
            embed.addFields([
                {
                    name: stickerArr.length === 1 ? "Стикер" : "Стикеры",
                    value: stickerArr.join(`\n`).toString() || "blank",
                },
            ]);
        }
        messageChannel.send({ embeds: [embed] });
    });
    client.on("messageDeleteBulk", (message) => {
        const embed = new EmbedBuilder().setColor("DarkRed").setAuthor({ name: "Группа сообщений удалена" }).setTimestamp();
        for (let i = 0; i < message.size && i < 24; i++) {
            const m = message.at(i);
            embed.addFields([
                {
                    name: `Сообщение ${m?.member?.displayName} (${m?.id})`,
                    value: `${m?.content?.length > 0
                        ? `\`${m?.content?.length > 1000 ? "*в сообщении слишком много текста*" : m?.content}\``
                        : "в сообщении нет текста"}`,
                },
            ]);
        }
        message.size > 24 ? embed.setFooter({ text: `И ещё ${message.size - 24} сообщений` }) : [];
        messageChannel.send({ embeds: [embed] });
    });
    client.on("messageUpdate", (oldMessage, newMessage) => {
        if (oldMessage.content?.length <= 0 || oldMessage.content === newMessage.content)
            return;
        const embed = new EmbedBuilder()
            .setColor(colors.default)
            .setTimestamp()
            .setAuthor({ name: "Сообщение изменено" })
            .setDescription(`<@${newMessage.author.id}> изменил сообщение в <#${newMessage.channelId}>. [Перейти к сообщению](https://discord.com/channels/${newMessage.guildId}/${newMessage.channelId}/${newMessage.id})`);
        oldMessage.content && oldMessage.content.length <= 1000 && newMessage.content && newMessage.content.length <= 1000
            ? embed.addFields([
                {
                    name: "До изменения",
                    value: oldMessage.content === null || oldMessage.content?.length <= 0 ? "сообщение не было в кеше" : "`" + oldMessage.content + "`",
                },
                { name: "После", value: "`" + newMessage.content + "`" },
            ])
            : embed.addFields({ name: "⁣", value: "Текст сообщения слишком длинный" });
        messageChannel.send({ embeds: [embed] });
    });
    client.on("roleCreate", (role) => {
        const embed = new EmbedBuilder()
            .setColor(colors.default)
            .setAuthor({ name: "Роль была создана" })
            .setFooter({ text: `RoleId: ${role.id}` })
            .setTimestamp()
            .addFields([
            { name: "Роль", value: `<@&${role.id}>`, inline: true },
            { name: "Название", value: role.name, inline: true },
            { name: "Цвет", value: role.hexColor, inline: true },
        ]);
        guildChannel.send({ embeds: [embed] });
    });
    client.on("roleDelete", (role) => {
        const embed = new EmbedBuilder()
            .setColor(colors.kicked)
            .setTimestamp()
            .setAuthor({ name: "Роль удалена" })
            .setDescription(`Удаленная роль \`${role.name}\` (${role.id})`)
            .addFields([
            {
                name: "Дата создания",
                value: String("<t:" + Math.round(role.createdAt.getTime() / 1000) + ">"),
            },
        ]);
        guildChannel.send({ embeds: [embed] });
    });
    client.on("voiceStateUpdate", (oldState, newState) => {
        const embed = new EmbedBuilder().setColor("Green").setTimestamp();
        if (!oldState.channelId) {
            voiceUsers.set(newState.member?.id, {
                joinTimestamp: new Date().getTime(),
            });
            embed
                .setAuthor({
                name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} присоединился к голосовому каналу`,
                iconURL: oldState.member?.displayAvatarURL() || newState.member?.displayAvatarURL(),
            })
                .setFooter({
                text: `UId: ${newState.member?.id} | ChnId: ${newState.channelId}`,
            })
                .addFields([{ name: "Канал", value: `<#${newState.channelId}>` }]);
        }
        if (!newState.channelId) {
            const getTimestamp = voiceUsers.get(oldState.member?.id)?.joinTimestamp;
            embed
                .setAuthor({
                name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} вышел из голосового канала`,
                iconURL: oldState.member?.displayAvatarURL() || newState.member?.displayAvatarURL(),
            })
                .setFooter({
                text: `Chn: ${oldState.channel?.name}`,
            })
                .setColor("DarkRed")
                .addFields([
                { name: "Пользователь", value: `<@${oldState.member?.id}`, inline: true },
                {
                    name: "Канал",
                    value: `<#${oldState.channelId}>`,
                    inline: true,
                },
            ]);
            if (getTimestamp) {
                const difference = Math.round((new Date().getTime() - getTimestamp) / 1000);
                const hours = Math.trunc(difference / 3600);
                const mins = Math.trunc(difference > 3600 ? (difference - (difference % 3600)) / 60 : difference / 60);
                const secs = difference - Math.trunc(difference / 60) * 60;
                embed.addFields([
                    {
                        name: "Времени в голосовых",
                        value: `${hours ? `${hours}ч` : ""}${(hours && mins) || (hours && secs) ? ":" : ""}${mins ? `${mins}м` : ""}${secs && mins ? ":" : ""}${secs ? `${secs}с` : ""}`,
                        inline: true,
                    },
                ]);
                newState.guild.afkChannel?.id !== newState.channelId
                    ? discord_activities.increment("voice", { by: difference, where: { authDatumDiscordId: oldState.member.id } })
                    : "";
            }
            voiceUsers.delete(oldState.member.id);
        }
        if (oldState.channelId !== null && newState.channelId !== null && oldState.channelId !== newState.channelId) {
            embed
                .setAuthor({
                name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} сменил голосовой канал`,
                iconURL: oldState.member?.displayAvatarURL() || newState.member?.displayAvatarURL(),
            })
                .setFooter({
                text: `UId: ${newState.member?.id} | ChnId: ${newState.channelId}`,
            })
                .addFields([
                { name: "До", value: `<#${oldState.channelId}>`, inline: true },
                {
                    name: "После",
                    value: `<#${newState.channelId}>`,
                    inline: true,
                },
            ]);
        }
        if (embed.data.fields?.length > 0)
            voiceChannel.send({ embeds: [embed] });
    });
    client.rest.on("rateLimited", (rateLimit) => console.error("Bot was rateLimited for", rateLimit.timeToReset, "ms, route:", rateLimit.route, ", parameter:", rateLimit.majorParameter));
};
