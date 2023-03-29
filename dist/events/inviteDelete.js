import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildChannel = client.getCachedTextChannel(ids.guildChnId);
export default new Event("inviteDelete", (invite) => {
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Приглашение ${invite.code} удалено` })
        .setColor(colors.error)
        .addFields([
        {
            name: "Приглашение в",
            value: `<#${invite.channelId}>`,
            inline: true,
        },
    ]);
    guildChannel.send({ embeds: [embed] });
});
