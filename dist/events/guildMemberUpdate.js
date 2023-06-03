import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { channelIds } from "../configs/ids.js";
import { automaticallyUpdatedUsernames } from "../core/guildNicknameManagement.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { escapeString } from "../utils/general/utilities.js";
import { AuthData } from "../utils/persistence/sequelize.js";
const guildMemberChannel = client.getCachedTextChannel(channelIds.guildMember);
export default new Event("guildMemberUpdate", async (oldMember, newMember) => {
    if (!oldMember.joinedTimestamp || (!oldMember.nickname && oldMember.roles.cache.size === 0))
        return;
    const embed = new EmbedBuilder().setColor(colors.default);
    if (oldMember.roles.cache !== newMember.roles.cache) {
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;
        const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));
        if (addedRoles.size > 0) {
            const addedRolesString = addedRoles
                .map((r) => {
                return `<@&${r.id}>`;
            })
                .join(", ");
            embed.addFields({
                name: `${addedRoles.size === 1 ? "Роль добавлена" : "Роли добавлены"}`,
                value: addedRolesString.length > 1024 ? "Слишком много ролей" : addedRolesString,
            });
        }
        if (removedRoles.size > 0) {
            const removedRolesString = removedRoles
                .map((r) => {
                return `<@&${r.id}>`;
            })
                .join(", ");
            embed.addFields([
                {
                    name: `${removedRoles.size === 1 ? "Роль удалена" : "Роли удалены"}`,
                    value: removedRolesString.length > 1024 ? "Слишком много ролей" : removedRolesString,
                },
            ]);
        }
        if (addedRoles.size > 0 || removedRoles.size > 0) {
            embed.setAuthor({ name: `У ${nameCleaner(newMember.displayName)} были обновлены роли`, iconURL: newMember.displayAvatarURL() });
            await guildMemberChannel.send({ embeds: [embed] });
        }
    }
    if (oldMember.displayName !== newMember.displayName) {
        embed
            .setAuthor({
            name: `${newMember.displayName} обновил никнейм`,
            iconURL: newMember.displayAvatarURL(),
        })
            .addFields({ name: "До изменения", value: escapeString(oldMember.displayName), inline: true }, { name: "После", value: escapeString(newMember.displayName), inline: true });
        await guildMemberChannel.send({ embeds: [embed] });
        if (!automaticallyUpdatedUsernames.has(newMember.id)) {
            testAutonameUserStatus(newMember);
        }
    }
    if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
        if (!oldMember.communicationDisabledUntilTimestamp) {
            embed
                .setAuthor({
                name: `${newMember.displayName} был выдан тайм-аут`,
                iconURL: newMember.displayAvatarURL(),
            })
                .setColor(colors.default)
                .addFields({
                name: "Тайм-аут до",
                value: `<t:${Math.round(newMember.communicationDisabledUntilTimestamp / 1000)}>`,
            });
        }
        else {
            embed
                .setAuthor({
                name: `${newMember.displayName} был снят тайм-аут`,
                iconURL: newMember.displayAvatarURL(),
            })
                .setColor(colors.default);
        }
        await guildMemberChannel.send({ embeds: [embed] });
    }
});
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
