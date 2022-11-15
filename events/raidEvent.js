import { EmbedBuilder, GuildMember } from "discord.js";
import { guildId, ids } from "../base/ids.js";
import { raidBlacklist, raidDataInChnMsg, raidMsgUpdate } from "../commands/raid.js";
import { raids } from "../handlers/sequelize.js";
import { completedRaidsData } from "../features/full_checker.js";
import { chnFetcher } from "../base/channels.js";
import { statusRoles } from "../base/roles.js";
async function joinInChnMsg(member, how, chnId, guild, was) {
    const embed = new EmbedBuilder();
    member = member instanceof GuildMember ? member : undefined;
    if (!member) {
        throw { name: "Ошибка. Вы не участник сервера" };
    }
    switch (how) {
        case "join":
            embed.setColor("Green").setAuthor({
                name: `${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} записался на рейд${was ? (was === "alt" ? " ранее будучи возможным участником" : was === "hotJoined" ? " ранее будучи в запасе" : "") : ""}`,
                iconURL: member.displayAvatarURL(),
            });
            break;
        case "alt":
            embed.setColor("Yellow").setAuthor({
                name: `${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} записался на рейд как возможный участник${was ? (was === "join" ? " ранее будучи участником" : was === "hotJoined" ? " ранее будучи в запасе" : "") : ""}`,
                iconURL: member.displayAvatarURL(),
            });
            break;
        case "leave":
            embed.setColor("Red").setAuthor({
                name: `${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} покинул рейд${was
                    ? was === "join"
                        ? " ранее будучи участником"
                        : was === "alt"
                            ? " ранее будучи возможным участником"
                            : was === "hotJoined"
                                ? " ранее будучи в запасе"
                                : ""
                    : ""}`,
                iconURL: member.displayAvatarURL(),
            });
            break;
        case "hotJoined":
            embed.setColor("DarkGreen").setAuthor({
                name: `${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} записался на рейд, но был записан в запас`,
                iconURL: member.displayAvatarURL(),
            });
            break;
    }
    chnFetcher(chnId).send({ embeds: [embed] });
}
async function joinedFromHotJoined(raidData, userId, guild) {
    if (!guild)
        return console.error(`joinedFromHotJoined error, guild undefined`, userId, raidData);
    const member = guild.members.cache.get(userId);
    if (!member)
        return console.error(`joinedFromHotJoined error, member wasnt found`, userId, guild, raidData);
    const embed = new EmbedBuilder().setColor("Orange").setAuthor({
        name: member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "") + " был автоматически записан в основной состав ранее будучи в запасе",
        iconURL: member.displayAvatarURL(),
    });
    chnFetcher(raidData.chnId).send({ embeds: [embed] });
    const DMEmbed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle(`Вы были автоматически записаны на рейд ${raidData.id}-${raidData.raid}`)
        .addFields({
        name: `Число записанных участников`,
        value: `Участников: ${raidData.joined.length}${raidData.hotJoined.length > 0 ? `\nВ запасе: ${raidData.hotJoined.length}` : ""}${raidData.alt.length > 0 ? `\nВозможно будут: ${raidData.alt.length}` : ""}`,
    }, { name: `Начало рейда: <t:${raidData.time}:R>`, value: `<t:${raidData.time}>`, inline: true }, {
        name: `Ссылки:`,
        value: `[Перейти к набору](https://discord.com/channels/${guildId}/${ids.raidChnId}/${raidData.msgId})\n[Перейти в канал рейда](https://discord.com/channels/${guildId}/${raidData.chnId})`,
    });
    member.send({ embeds: [DMEmbed] });
}
export default {
    callback: async (client, interaction, member, _guild, _channel) => {
        interaction.deferUpdate();
        const raidData = await raids.findOne({
            where: { msgId: interaction.message.id },
        });
        if (!raidData) {
            console.error("[Error code: 1036]", interaction);
            throw { name: "Критическая ошибка. Рейд не найден" };
        }
        if (interaction.customId !== "raidEvent_btn_leave") {
            const blacklist = raidBlacklist.get(raidData.id);
            if (blacklist &&
                ((interaction.customId === "raidEvent_btn_join" && blacklist.joined.includes(member.id)) ||
                    (interaction.customId === "raidEvent_btn_alt" && blacklist.alt.includes(member.id)))) {
                throw {
                    name: "Ошибка. Вы в черном списке рейда",
                    message: "Для записи попросите создателя рейда добавить вас вручную или подождите 24 часа для выхода из ЧС\nЧС распространяется лишь на ту группу, из которой вас исключили (если вы были в основном составе и вас исключили -> записаться можно только как возможный участник)",
                };
            }
        }
        switch (interaction.customId) {
            case "raidEvent_btn_join": {
                if (raidData.joined.includes(interaction.user.id))
                    throw { name: "Вы уже записаны на этот рейд" };
                if (raidData.reqClears > 0) {
                    const userRaidClears = completedRaidsData.get(interaction.user.id);
                    if (!userRaidClears) {
                        throw {
                            name: "Данные не найдены",
                            message: `Для записи на этот рейд необходимо узнать количество закрытых вами рейдов, но статистика не была собрана\n\nПопробуйте снова через 1-3 минуты\n\n\nДля сбора статистики вы должны быть зарегистрированы у <@${client.user?.id}>, а также иметь роль <@&${statusRoles.clanmember}> или <@&${statusRoles.member}>`,
                            userId: interaction.user.id,
                        };
                    }
                    else {
                        if (userRaidClears[raidData.raid] < raidData.reqClears) {
                            throw {
                                name: "Недостаточно закрытий",
                                message: `Для записи на этот рейд необходимо ${raidData.reqClears} закрытий, а у вас ${userRaidClears[raidData.raid]}`,
                            };
                        }
                    }
                }
                joinInChnMsg(member, "join", raidData.chnId, interaction.guild, raidData.alt.includes(interaction.user.id)
                    ? "alt"
                    : raidData.hotJoined.includes(interaction.user.id) && raidData.joined.length !== 6
                        ? "hotJoined"
                        : undefined);
                if (raidData.alt.includes(interaction.user.id))
                    raidData.alt.splice(raidData.alt.indexOf(interaction.user.id), 1);
                if (raidData.hotJoined.includes(interaction.user.id))
                    raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                if (raidData.joined.length === 6) {
                    raidData.hotJoined.push(interaction.user.id);
                }
                else {
                    raidData.joined.push(interaction.user.id);
                }
                chnFetcher(raidData.chnId).permissionOverwrites.create(interaction.user.id, {
                    ViewChannel: true,
                });
                await raidMsgUpdate(raidData, interaction);
                await raids.update({ joined: `{${raidData.joined}}`, hotJoined: `{${raidData.hotJoined}}`, alt: `{${raidData.alt}}` }, { where: { id: raidData.id } });
                raidDataInChnMsg(raidData);
                break;
            }
            case "raidEvent_btn_leave": {
                if (!raidData.joined.includes(interaction.user.id) &&
                    !raidData.hotJoined.includes(interaction.user.id) &&
                    !raidData.alt.includes(interaction.user.id))
                    return;
                joinInChnMsg(member, "leave", raidData.chnId, interaction.guild, raidData.joined.includes(interaction.user.id)
                    ? "join"
                    : raidData.alt.includes(interaction.user.id)
                        ? "alt"
                        : raidData.alt.includes(interaction.user.id)
                            ? "hotJoined"
                            : undefined);
                if (raidData.joined.length === 6 && raidData.joined.includes(interaction.user.id) && raidData.hotJoined.length > 0) {
                    const updatedJoined = raidData.hotJoined.shift();
                    raidData.joined.push(updatedJoined);
                    joinedFromHotJoined(raidData, updatedJoined, interaction.guild);
                }
                if (raidData.joined.includes(interaction.user.id))
                    raidData.joined.splice(raidData.joined.indexOf(interaction.user.id), 1);
                if (raidData.alt.includes(interaction.user.id))
                    raidData.alt.splice(raidData.alt.indexOf(interaction.user.id), 1);
                if (raidData.hotJoined.includes(interaction.user.id))
                    raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                chnFetcher(raidData.chnId).permissionOverwrites.delete(interaction.user.id);
                await raidMsgUpdate(raidData, interaction);
                await raids.update({ joined: `{${raidData.joined}}`, hotJoined: `{${raidData.hotJoined}}`, alt: `{${raidData.alt}}` }, { where: { id: raidData.id } });
                raidDataInChnMsg(raidData);
                break;
            }
            case "raidEvent_btn_alt": {
                if (raidData.alt.includes(interaction.user.id))
                    return;
                joinInChnMsg(member, "alt", raidData.chnId, interaction.guild, raidData.joined.includes(interaction.user.id) ? "join" : raidData.hotJoined.includes(interaction.user.id) ? "hotJoined" : undefined);
                if (raidData.joined.length === 6 && raidData.joined.includes(interaction.user.id) && raidData.hotJoined.length > 0) {
                    const updatedJoined = raidData.hotJoined.shift();
                    raidData.joined.push(updatedJoined);
                    joinedFromHotJoined(raidData, updatedJoined, interaction.guild);
                }
                if (raidData.joined.includes(interaction.user.id))
                    raidData.joined.splice(raidData.joined.indexOf(interaction.user.id), 1);
                if (raidData.hotJoined.includes(interaction.user.id))
                    raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                raidData.alt.push(interaction.user.id);
                chnFetcher(raidData.chnId).permissionOverwrites.create(interaction.user.id, {
                    ViewChannel: true,
                });
                await raidMsgUpdate(raidData, interaction);
                await raids.update({ joined: `{${raidData.joined}}`, hotJoined: `{${raidData.hotJoined}}`, alt: `{${raidData.alt}}` }, { where: { id: raidData.id } });
                raidDataInChnMsg(raidData);
                break;
            }
        }
    },
};
