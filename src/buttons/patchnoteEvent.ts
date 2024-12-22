import { ButtonBuilder, ButtonStyle, TextChannel } from "discord.js";
import { PatchnoteButtons } from "../configs/Buttons.js";
import { client } from "../index.js";
import { Button } from "../structures/button.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";

let channelOfGods: TextChannel | null = null;
let newsChannel: TextChannel | null = null;

const ButtonCommand = new Button({
	name: "patchnoteEvent",
	run: async ({ interaction }) => {
		const content = interaction.message.content;

		switch (interaction.customId) {
			case PatchnoteButtons.sendToGodsWithoutButtons:
			case PatchnoteButtons.sendToGods: {
				const components =
					interaction.customId === PatchnoteButtons.sendToGods
						? addButtonsToMessage([
								new ButtonBuilder()
									.setCustomId(PatchnoteButtons.sendToPublic)
									.setStyle(ButtonStyle.Success)
									.setLabel("Опубликовать для всех"),
						  ])
						: [];

				const messageOptions = { content, components, allowedMentions: { parse: [] } };

				if (!channelOfGods) channelOfGods = await client.getTextChannel(process.env.GOD_BOT_CHANNEL_ID!);

				await channelOfGods.send(messageOptions);

				await interaction.reply({ content: `Отправлено в <#${process.env.GOD_BOT_CHANNEL_ID!}>`, ephemeral: true });
				await interaction.message.delete();

				return;
			}

			case PatchnoteButtons.sendToPublic: {
				if (!newsChannel) newsChannel = await client.getTextChannel(process.env.NEWS_CHANNEL_ID!);

				await newsChannel.send({ content, allowedMentions: { parse: [] } });

				await interaction.reply({ content: `Отправлено в <#${process.env.NEWS_CHANNEL_ID!}>`, ephemeral: true });
				await interaction.message.delete();

				return;
			}

			case PatchnoteButtons.cancel: {
				await interaction.message.delete();
				await interaction.deferUpdate();

				return;
			}
		}
	},
});

export default ButtonCommand;
