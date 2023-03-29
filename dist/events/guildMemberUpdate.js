import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import nameCleaner from "../utils/general/nameClearer.js";
const guildMemberChannel = client.getCachedTextChannel(ids.guildMemberChnId);
export default new Event("guildMemberUpdate", (oldMember, newMember) => {
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
            embed.addFields([
                {
                    name: `${addedRoles.size === 1 ? `Роль добавлена` : `Роли добавлены`}`,
                    value: addedRolesString.length > 1024 ? "Слишком много ролей" : addedRolesString,
                },
            ]);
        }
        if (removedRoles.size > 0) {
            const removedRolesString = removedRoles
                .map((r) => {
                return `<@&${r.id}>`;
            })
                .join(", ");
            embed.addFields([
                {
                    name: `${removedRoles.size === 1 ? `Роль удалена` : `Роли удалены`}`,
                    value: removedRolesString.length > 1024 ? "Слишком много ролей" : removedRolesString,
                },
            ]);
        }
        if (addedRoles.size > 0 || removedRoles.size > 0) {
            embed.setAuthor({ name: `У ${nameCleaner(newMember.displayName)} были обновлены роли`, iconURL: newMember.displayAvatarURL() });
            guildMemberChannel.send({ embeds: [embed] });
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
            { name: "До изменения", value: `\`${oldMember.displayName}\``, inline: true },
            { name: "После", value: `\`${newMember.displayName}\``, inline: true },
        ]);
        guildMemberChannel.send({ embeds: [embed] });
    }
    if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
        if (!oldMember.communicationDisabledUntilTimestamp) {
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
        guildMemberChannel.send({ embeds: [embed] });
    }
});
