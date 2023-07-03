import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import nameCleaner from "../utils/general/nameClearer.js";
let guildChannel = null;
export default new Event("inviteCreate", async (invite) => {
    if (invite.inviterId === client.user.id)
        return;
    const embed = new EmbedBuilder()
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
    ])
        .setColor(colors.default);
    if (invite.channelId) {
        embed.addFields({
            name: "Приглашение в",
            value: `<#${invite.channelId}>`,
            inline: true,
        });
    }
    else {
        embed.addFields({
            name: "Приглашение",
            value: "Прямиком на сервер",
            inline: true,
        });
    }
    if (invite.inviterId) {
        const member = await client.getAsyncMember(invite.inviterId);
        embed
            .setAuthor({
            name: `${nameCleaner(member.displayName)} создал приглашение`,
            iconURL: member.displayAvatarURL(),
        })
            .setFooter({ text: `UserId: ${invite.inviterId}` });
    }
    else {
        embed.setAuthor({ name: "Было создано кем-то", iconURL: icons.moderation });
    }
    if (!guildChannel)
        guildChannel =
            client.getCachedTextChannel(process.env.GUILD_CHANNEL_ID) || (await client.getAsyncTextChannel(process.env.GUILD_CHANNEL_ID));
    await guildChannel.send({ embeds: [embed] });
});
//# sourceMappingURL=inviteCreate.js.map