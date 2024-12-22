import { EmbedBuilder } from "discord.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { errorMessages } from "./errorMessages.js";

interface ErrorEmbedParams {
	name?: string;
	description?: string;
	errorType?: UserErrors;
	errorData?: any; // Adjust this type according to your data
}

function createErrorEmbed({ name, description, errorType, errorData }: ErrorEmbedParams): { embeds: EmbedBuilder[]; components?: any } {
	if (errorType) {
		const { embeds, components } = errorMessages(errorType, errorData);
		return { embeds, components };
	} else {
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
