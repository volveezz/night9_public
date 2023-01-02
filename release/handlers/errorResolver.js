import { EmbedBuilder } from "discord.js";
import { errorMessages } from "../utils/errorMessages.js";
import UserErrors from "../enums/UserErrors.js";
import colors from "../configs/colors.js";
function errorResolver({ name, description, errorType, errorData }) {
    const type = errorType;
    if (errorType && UserErrors[type] !== undefined) {
        const { embeds, components } = errorMessages(type, errorData);
        return { embeds, components };
    }
    else if (name || description) {
        return {
            embeds: [
                new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle(name || null)
                    .setDescription(description || null),
            ],
        };
    }
    else {
        return { embeds: [new EmbedBuilder().setTitle("Произошла ошибка. Попробуйте позже").setColor(colors.error)] };
    }
}
export default errorResolver;
