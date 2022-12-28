import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildMemberChannel = client.channels.cache.get(ids.guildMemberChnId);
export default new Event("guildMemberUpdate", (oldMember, newMember) => {
    if (!oldMember.joinedTimestamp || (!oldMember.nickname && oldMember.roles.cache.size === 0))
        return;
    const embed = new EmbedBuilder().setColor(colors.default).setFooter({ text: `Id: ${oldMember.id}` });
    if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
        const roleDifferenceStatus = oldMember.roles.cache.size > newMember.roles.cache.size ? false : true;
        const roleDifference = oldMember.roles.cache.difference(newMember.roles.cache).map((role) => `<@&${role.id}>`);
        if (roleDifference.length > 0) {
            embed
                .setAuthor({
                name: `У ${newMember.displayName} ${roleDifferenceStatus
                    ? roleDifference.length === 1
                        ? "была выдана роль"
                        : "были выданы роли"
                    : roleDifference.length === 1
                        ? "была удалена роль"
                        : "были удалены роли"}`,
                iconURL: newMember.displayAvatarURL(),
            })
                .addFields([
                {
                    name: "Пользователь",
                    value: `<@${newMember.id}>`,
                    inline: true,
                },
                {
                    name: roleDifference.length === 1 ? "Роль" : "Роли",
                    value: roleDifference.join(", ").length > 1023 ? "*Слишком много ролей*" : roleDifference.join(", "),
                    inline: true,
                },
            ]);
            guildMemberChannel.send({ embeds: [embed] });
        }
        else {
            console.debug(`[Error code: 1213] DEBUG: ${roleDifference}, ${roleDifferenceStatus}`, oldMember, newMember);
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
