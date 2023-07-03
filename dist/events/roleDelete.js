import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
let guildChannel = null;
export default new Event("roleDelete", async (role) => {
    const embed = new EmbedBuilder()
        .setColor(colors.error)
        .setAuthor({
        name: "Роль удалена",
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086267623534231705/3125-icon-modshield.png",
    })
        .setDescription(`Удаленная роль \`${role.name}\` (${role.id})`)
        .addFields([
        {
            name: "Дата создания",
            value: `<t:${Math.round(role.createdAt.getTime() / 1000)}>`,
        },
    ]);
    if (!guildChannel)
        guildChannel =
            client.getCachedTextChannel(process.env.GUILD_CHANNEL_ID) || (await client.getAsyncTextChannel(process.env.GUILD_CHANNEL_ID));
    await guildChannel.send({ embeds: [embed] });
});
//# sourceMappingURL=roleDelete.js.map