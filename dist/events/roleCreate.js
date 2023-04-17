import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildChannel = client.getCachedTextChannel(channelIds.guild);
export default new Event("roleCreate", (role) => {
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setAuthor({
        name: "Роль была создана",
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086267623534231705/3125-icon-modshield.png",
    })
        .setFooter({ text: `RoleId: ${role.id}` })
        .addFields([
        { name: "Роль", value: `<@&${role.id}>`, inline: true },
        { name: "Название", value: role.name, inline: true },
        { name: "Цвет", value: role.hexColor, inline: true },
    ]);
    guildChannel.send({ embeds: [embed] });
});
