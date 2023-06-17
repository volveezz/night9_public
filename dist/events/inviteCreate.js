import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildChannel = await client.getAsyncTextChannel(channelIds.guild);
export default new Event("inviteCreate", async (invite) => {
    if (invite.inviterId === client.user.id)
        return;
    const member = client.guilds.cache.get(invite.guild.id).members.cache.get(invite.inviterId);
    const embed = new EmbedBuilder()
        .setAuthor({
        name: `${member?.displayName || invite.inviter?.username} создал приглашение`,
        iconURL: member?.displayAvatarURL({ forceStatic: false }) || invite.inviter?.displayAvatarURL({ forceStatic: false }),
    })
        .setFooter({ text: `Id: ${invite.inviterId}` })
        .addFields([
        { name: "Ссылка", value: `https://discord.gg/${invite.code}` },
        {
            name: "Использований",
            value: invite.maxUses ? `${invite.uses}/${invite.maxUses}` : "без ограничений",
            inline: true,
        },
        {
            name: "Действительно до",
            value: invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}>` : `бессрочно`,
            inline: true,
        },
        {
            name: "Приглашение в",
            value: `<#${invite.channelId}>`,
            inline: true,
        },
    ])
        .setColor(colors.default);
    await guildChannel.send({ embeds: [embed] });
});
