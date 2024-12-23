import { EmbedBuilder } from "discord.js";
import { isNitterUrlAllowed } from "./isNitterUrlAllowed.js";
function resolveAuthor({ author, icon, url, originalAuthor }) {
    const embed = new EmbedBuilder();
    if (url)
        embed.setURL(url);
    const authorIcon = icon && isNitterUrlAllowed(icon) ? icon : undefined;
    switch (author) {
        case 2:
            return embed.setColor("#d3d2d0").setAuthor({
                name: "Bungie",
                iconURL: authorIcon || "https://cdn.discordapp.com/attachments/679191036849029167/1130624168568823899/BW5plrkw_400x400.png",
                url,
            });
        case 3:
            return embed.setColor("#FFA500").setAuthor({
                name: "BungieHelp",
                iconURL: authorIcon || "https://cdn.discordapp.com/attachments/679191036849029167/1097538580571758612/vNe1WM28_400x400.png",
                url,
            });
        case 1:
            return embed.setColor("#8fcdf6").setAuthor({
                name: "DestinyTheGame",
                iconURL: authorIcon || "https://cdn.discordapp.com/attachments/679191036849029167/1097538571142963280/1hh-HGZb_400x400.png",
                url,
            });
        case 4:
            return embed.setColor("#68EDFF").setAuthor({
                name: "Destiny2Team",
                iconURL: authorIcon || "https://cdn.discordapp.com/attachments/679191036849029167/1098350594575577188/zPtKbIQx.jpg",
                url,
            });
        default:
            return embed.setColor("#006CFF").setAuthor({
                name: originalAuthor || "Автор",
                iconURL: authorIcon,
                url,
            });
    }
}
export default resolveAuthor;
//# sourceMappingURL=resolveAuthor.js.map