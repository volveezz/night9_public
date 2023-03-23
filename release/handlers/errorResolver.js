import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import UserErrors from "../enums/UserErrors.js";
import { errorMessages } from "../utils/errorMessages.js";
function errorResolver({ name, description, errorType, errorData }) {
    const type = errorType;
    if (errorType && UserErrors[type] !== undefined) {
        const { embeds, components } = errorMessages(type, errorData);
        return { embeds, components };
    }
    else if (name || description) {
        const embeds = [new EmbedBuilder().setColor(colors.error).setDescription(description || null)];
        if (name)
            embeds[0].setAuthor({
                name,
                iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
            });
        return {
            embeds,
        };
    }
    else {
        return {
            embeds: [
                new EmbedBuilder()
                    .setAuthor({
                    name: "Произошла ошибка. Попробуйте позже",
                    iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086268847948042300/6426-error.png",
                })
                    .setColor(colors.error),
            ],
        };
    }
}
export default errorResolver;
