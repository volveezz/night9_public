import { EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { errorMessages } from "./errorMessages.js";
function createErrorEmbed({ name, description, errorType, errorData }) {
    if (errorType) {
        const { embeds, components } = errorMessages(errorType, errorData);
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
//# sourceMappingURL=createErrorEmbed.js.map