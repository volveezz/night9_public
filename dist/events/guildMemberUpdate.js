import { AuditLogEvent, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { escapeString } from "../utils/general/utilities.js";
import { AuthData } from "../utils/persistence/sequelize.js";
const guildMemberChannel = await client.getAsyncTextChannel(channelIds.guildMember);
export default new Event("guildMemberUpdate", async (oldMember, newMember) => {
    if (!oldMember.joinedTimestamp || (!oldMember.nickname && oldMember.roles.cache.size === 0))
        return;
    const embeds = [];
    const rolesEmbed = await generateRoleEmbed(oldMember, newMember);
    if (rolesEmbed)
        embeds.push(rolesEmbed);
    const nameEmbed = await generateNameEmbed(oldMember, newMember);
    if (nameEmbed)
        embeds.push(nameEmbed);
    const muteEmbed = generateMuteEmbed(oldMember, newMember);
    if (muteEmbed)
        embeds.push(muteEmbed);
    if (embeds.length > 0) {
        await guildMemberChannel.send({ embeds });
    }
});
async function generateRoleEmbed(oldMember, newMember) {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
    const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));
    if (addedRoles.size === 0 && removedRoles.size === 0)
        return null;
    const embed = new EmbedBuilder().setColor(colors.default).setAuthor({
        name: `У ${nameCleaner(newMember.displayName)} были обновлены роли`,
        iconURL: newMember.displayAvatarURL(),
    });
    addRolesField(addedRoles, "Роль добавлена", "Роли добавлены", embed);
    addRolesField(removedRoles, "Роль удалена", "Роли удалены", embed);
    return embed;
}
async function checkNameExecutor(member) {
    const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberUpdate,
    });
    const nicknameChange = fetchedLogs.entries.first();
    if (!nicknameChange)
        return member;
    const { executor } = nicknameChange;
    if (!executor)
        return null;
    if (executor.id === member.id)
        return null;
    const executorMember = await client.getAsyncMember(executor.id);
    return executorMember;
}
async function generateNameEmbed(oldMember, newMember) {
    if (oldMember.displayName === newMember.displayName)
        return null;
    const nameExecutor = await checkNameExecutor(newMember);
    const authorText = nameExecutor
        ? `${nameExecutor.displayName} обновил никнейм ${newMember.displayName}`
        : `${newMember.displayName} обновил свой никнейм`;
    const embed = new EmbedBuilder()
        .setColor(colors.default)
        .setAuthor({
        name: authorText,
        iconURL: newMember.displayAvatarURL(),
    })
        .addFields({ name: "До изменения", value: escapeString(oldMember.displayName), inline: true }, { name: "После", value: escapeString(newMember.displayName), inline: true });
    if (!nameExecutor) {
        testAutonameUserStatus(newMember);
    }
    return embed;
}
function generateMuteEmbed(oldMember, newMember) {
    if (oldMember.communicationDisabledUntilTimestamp === newMember.communicationDisabledUntilTimestamp)
        return null;
    const embed = new EmbedBuilder().setColor(colors.default);
    if (!oldMember.communicationDisabledUntilTimestamp) {
        embed.setAuthor({ name: `${newMember.displayName} был выдан тайм-аут`, iconURL: newMember.displayAvatarURL() }).addFields({
            name: "Тайм-аут до",
            value: `<t:${Math.round(newMember.communicationDisabledUntilTimestamp / 1000)}>`,
        });
    }
    else {
        embed.setAuthor({ name: `${newMember.displayName} был снят тайм-аут`, iconURL: newMember.displayAvatarURL() });
    }
    return embed;
}
function addRolesField(roles, singularTitle, pluralTitle, embed) {
    if (roles.size === 0)
        return;
    const rolesString = roles.map((r) => `<@&${r.id}>`).join(", ");
    embed.addFields({
        name: roles.size === 1 ? singularTitle : pluralTitle,
        value: rolesString.length > 1024 ? "Слишком много ролей" : rolesString,
    });
}
const notifiedUsers = new Set();
async function testAutonameUserStatus(member) {
    if (notifiedUsers.has(member.id))
        return;
    const authData = await AuthData.findOne({ where: { discordId: member.id }, attributes: ["displayName", "timezone"] });
    if (!authData || authData.displayName.startsWith("⁣"))
        return;
    function checkUserName(databaseName, displayName, timezone) {
        const expectedName = timezone !== null ? `[+${timezone}] ${databaseName}` : databaseName;
        return displayName === expectedName;
    }
    if (checkUserName(authData.displayName, member.displayName, authData.timezone))
        return;
    notifiedUsers.add(member.id);
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setAuthor({ name: "Вы изменили никнейм с включенной системой за слежкой за ником", iconURL: icons.notify })
        .setDescription(`На сервере работает система слежки за никнеймами пользователей в игре\n\n> Ваш никнейм в игре: \`${escapeString(authData.displayName)}\`\n> Текущий никнейм: \`${escapeString(member.displayName)}\`${`\n> Текущий часовой пояс: ${authData.timezone ? `\`${authData.timezone}\`` : `не указан. Введите \`/timezone\` (</timezone:1055308734794043503>)`}`}\n\nВаш текущий никнейм будет изменен в течение часа на тот, который в игре\nОтключить эту систему Вы можете введя команду \`/autoname\` (работает в любых каналах на сервере Night 9)`);
    await member.send({ embeds: [embed] });
}
