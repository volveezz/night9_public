import { EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { channelIds, groupId, ownerId } from "../../configs/ids.js";
import { statusRoles } from "../../configs/roles.js";
import { client } from "../../index.js";
import getClanMemberData from "../api/getClanMemberData.js";
import setMemberRoles from "../discord/setRoles.js";
import { escapeString } from "../general/utilities.js";
let clanLogChannel = null;
let generalLogChannel = null;
const recentlyJoinedMembersIds = new Set();
const welcomeMessageIds = new Map();
export async function updateClanRolesWithLogging(result, join) {
    const member = await client.getAsyncMember(result.discordId);
    const clanUserData = await getClanMemberData(result);
    if (!clanLogChannel) {
        clanLogChannel = await client.getAsyncTextChannel(channelIds.clanLogs);
    }
    if (clanUserData.member?.groupId !== groupId) {
        console.error("[Error code: 1919]", clanUserData, member);
    }
    const embed = new EmbedBuilder().addFields([
        { name: "BungieId", value: result.bungieId, inline: true },
        { name: "Ник в игре", value: `${escapeString(result.displayName)}`, inline: true },
    ]);
    if (member) {
        if (join) {
            const givenRoles = [];
            if (!member.roles.cache.has(statusRoles.clanmember)) {
                givenRoles.push(statusRoles.clanmember);
            }
            if (!member.roles.cache.has(statusRoles.verified)) {
                givenRoles.push(statusRoles.verified);
            }
            if (givenRoles.length > 0) {
                await member.roles.add(givenRoles, "User joined the clan");
            }
            if (member.roles.cache.hasAny(statusRoles.kicked, statusRoles.newbie, statusRoles.member)) {
                await member.roles.remove([statusRoles.kicked, statusRoles.newbie, statusRoles.member], "User joined the clan");
            }
            embed
                .setAuthor({
                name: `${member.displayName} вступил в клан`,
                iconURL: member.displayAvatarURL(),
            })
                .setColor(colors.success);
            try {
                if (recentlyJoinedMembersIds.has(member.id))
                    return;
                recentlyJoinedMembersIds.add(member.id);
                notifyJoinedUser(member);
            }
            catch (error) {
                console.error(`[Error code: 1806] ${member.displayName} blocked his DMs`, error);
            }
            try {
                if (!generalLogChannel) {
                    generalLogChannel = await client.getAsyncTextChannel(channelIds.mainText);
                }
                const welcomeMessage = await generalLogChannel.send(`<a:d2ghost:732676128094814228> Приветствуем нового участника клана, ${member}!`);
                await welcomeMessage.react("<:doge_hug:1073864905129721887>");
                welcomeMessageIds.set(member.id, welcomeMessage);
            }
            catch (error) {
                console.error("[Error code: 1925]", error);
            }
        }
        else {
            const setRoles = member.roles.cache.has(statusRoles.verified) ? [statusRoles.kicked, statusRoles.verified] : [statusRoles.kicked];
            await setMemberRoles({ member, roles: setRoles, reason: "Member left the clan" });
            embed
                .setAuthor({
                name: `${member.displayName} покинул клан`,
                iconURL: member.displayAvatarURL(),
            })
                .setColor(colors.kicked);
            const welcomeMessage = welcomeMessageIds.get(member.id);
            if (welcomeMessage) {
                welcomeMessage.edit("https://tenor.com/view/palla-deserto-desert-hot-gif-6014273");
                welcomeMessageIds.delete(member.id);
            }
        }
    }
    else {
        embed
            .setAuthor({
            name: join ? "Неизвестный на сервере пользователь вступил в клан" : "Неизвестный на сервере пользователь покинул клан",
        })
            .setColor(join ? colors.success : colors.kicked);
    }
    await clanLogChannel.send({ embeds: [embed] });
}
async function notifyJoinedUser(member) {
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setAuthor({ name: "Вы были приняты в клан!", iconURL: member.guild.iconURL() || icons.success })
        .setDescription(`Вы также получили все необходимые роли для доступа к каналам клана\n\nНа сервере разработано множество различных систем, команд и возможностей. При желании Вы можете ввести \`/\` и Discord вам предложит все слеш-команды сервера\nНа сервере есть несколько различных ботов и их команд, но клановыми являются 2: основной - Night 9, <@${client.user.id}> и музыкальный бот - Alfred Jodl, <@719262521768280074>\n\nПо любым вопросам **в любое время** пишите <@${ownerId}> (Вольве) в личные сообщения или <@${client.user.id}> в этом же чате`);
    await member.send({ embeds: [embed] });
}
