import { AutocompleteInteraction, CommandInteractionOption, Interaction } from "discord.js";
import { client } from "../../index.js";
import nameCleaner from "../general/nameClearer.js";

const parseOptions = (options: readonly CommandInteractionOption[]): string =>
	options
		.map((option) =>
			option
				? `${option.name}${option.value !== undefined ? `:${option.value}` : ""}${
						option.options?.length ? ` ${parseOptions(option.options)}` : ""
				  }`
				: ""
		)
		.join(" ");

const getEmbedTitleOrAuthorName = (embeds: any[]): string => {
	const firstEmbed = embeds?.[0];
	return firstEmbed?.title ? ` on ${firstEmbed.title}` : firstEmbed?.author?.name ? ` on ${firstEmbed.author.name}` : "";
};

const extractOptionsData = (optionsData: readonly CommandInteractionOption[]): string =>
	optionsData?.length ? ` ${parseOptions(optionsData)}` : "";

const extractChannelName = (channel: any): string => (channel && !channel.isDMBased() ? ` in ${channel.name}` : "");

const logCommandInteraction = async (interaction: Interaction): Promise<void> => {
	if (interaction instanceof AutocompleteInteraction) return;

	const discordId: string = interaction.user.id;
	const memberDisplayName = client.getCachedMembers().get(discordId)?.displayName || (await client.getMember(discordId)).displayName;
	const username: string = nameCleaner(memberDisplayName) || interaction.user.username;

	const embedInfo: string =
		interaction.isMessageComponent() && interaction.message && interaction.message.embeds
			? getEmbedTitleOrAuthorName(interaction.message.embeds)
			: "";

	const optionsData: string = interaction.isCommand() ? extractOptionsData(interaction.options?.data || []) : "";
	const channelName: string = extractChannelName(interaction.channel);

	const interactionName: string = interaction.isCommand() ? `\x1b[36m${interaction.commandName}` : `\x1b[33m${interaction.customId}`;

	console.info(`\x1b[37m${username}\x1b[0m used ${interactionName}\x1b[0m${embedInfo}${optionsData}${channelName}`);
};

export default logCommandInteraction;
