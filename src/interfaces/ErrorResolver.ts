import {
	AnySelectMenuInteraction,
	ButtonInteraction,
	CacheType,
	ChatInputCommandInteraction,
	MessageContextMenuCommandInteraction,
	ModalSubmitInteraction,
	UserContextMenuCommandInteraction,
} from "discord.js";

export interface IErrorResolver {
	error: any;
	interaction:
		| ChatInputCommandInteraction
		| AnySelectMenuInteraction<CacheType>
		| ButtonInteraction<CacheType>
		| ModalSubmitInteraction<CacheType>
		| ChatInputCommandInteraction<CacheType>
		| MessageContextMenuCommandInteraction<CacheType>
		| UserContextMenuCommandInteraction<CacheType>;
	retryOperation?: boolean;
}
