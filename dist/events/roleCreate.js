import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
let guildChannel = null;
export default new Event("roleCreate", async (role) => {
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
    if (!guildChannel)
        guildChannel =
            client.getCachedTextChannel(process.env.GUILD_CHANNEL_ID) || (await client.getAsyncTextChannel(process.env.GUILD_CHANNEL_ID));
    await guildChannel.send({ embeds: [embed] });
});
//# sourceMappingURL=roleCreate.js.map