import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildChannel = client.channels.cache.get(ids.guildChnId);
export default new Event("inviteCreate", (invite) => {
    if (invite.inviterId === client.user.id)
        return;
    const member = client.guilds.cache.get(invite.guild.id).members.cache.get(invite.inviterId);
    const embed = new EmbedBuilder()
        .setAuthor({
        name: `${member?.displayName || invite.inviter?.username} создал приглашение`,
        iconURL: member?.displayAvatarURL() || invite.inviter?.displayAvatarURL(),
    })
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
