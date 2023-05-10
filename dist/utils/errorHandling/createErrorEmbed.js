import { EmbedBuilder } from "discord.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { errorMessages } from "./errorMessages.js";
function createErrorEmbed({ name, description, errorType, errorData }) {
    const type = errorType;
    if (errorType && UserErrors[type] !== undefined) {
        const { embeds, components } = errorMessages(type, errorData);
        return { embeds, components };
    }
    else {
        const embeds = [new EmbedBuilder().setColor(colors.error).setDescription(description || null)];
        embeds[0].setAuthor({
            name: name || "Произошла ошибка. Попробуйте позже",
            iconURL: icons.error,
        });
        return {
            embeds,
        };
    }
}
export default createErrorEmbed;
