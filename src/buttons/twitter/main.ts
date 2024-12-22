import { APIEmbed, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, EmbedBuilder, RESTJSONErrorCodes } from "discord.js";
import { TwitterVoteButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { Button } from "../../structures/button.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { originalTweetData, twitterOriginalVoters } from "../../utils/persistence/dataStore.js";

const TweetNotFoundEmbed = new EmbedBuilder()
	.setColor(colors.error)
	.setAuthor({ name: "Ошибка. Оригинал сообщения не найден", iconURL: icons.error });

const TwitterVoteButtonsComponents = [
	new ButtonBuilder().setCustomId(TwitterVoteButtons.originalBetter).setLabel("Оригинал лучше перевода").setStyle(ButtonStyle.Secondary),
	new ButtonBuilder()
		.setCustomId(TwitterVoteButtons.translationBetter)
		.setLabel("Перевод лучше оригинала")
		.setStyle(ButtonStyle.Secondary),
];

const VoteRecordedEmbed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Голос учтён", iconURL: icons.voted });

const activeAwaiters = new Map<string, { uniqueId: any; interaction: ButtonInteraction }>();

const handleMessageInteraction = async (interaction: ButtonInteraction) => {
	const messageData = originalTweetData.get(interaction.message.id);

	if (!messageData) {
		interaction.reply({ embeds: [TweetNotFoundEmbed], ephemeral: true });
		interaction.message.edit({ components: [] });
		return;
	}

	const embeds = interaction.message.embeds;

	let newEmbedData = JSON.parse(JSON.stringify(embeds[0].data));

	newEmbedData.description = messageData;
	let newEmbed: APIEmbed = { ...newEmbedData };

	const voteData = twitterOriginalVoters.get(interaction.message.id);
	let components: ButtonBuilder[] = [];

	if (voteData) {
		components = TwitterVoteButtonsComponents;
	}

	return interaction.reply({ embeds: [newEmbed, ...embeds.slice(1)], components: addButtonsToMessage(components), ephemeral: true });
};

const handleVote = async (interaction: ButtonInteraction, userVote: string, messageId: string) => {
	const userId = interaction.user.id;

	let voteRecord = twitterOriginalVoters.get(messageId);
	if (!voteRecord) {
		voteRecord = { original: new Set(), translation: new Set() };
		twitterOriginalVoters.set(messageId, voteRecord);
	}

	if (userVote === "originalBetter") {
		voteRecord.translation.delete(userId);
		voteRecord.original.add(userId);
		interaction.reply({ embeds: [VoteRecordedEmbed], ephemeral: true });
	} else if (userVote === "translationBetter") {
		voteRecord.original.delete(userId);
		voteRecord.translation.add(userId);
		interaction.reply({ embeds: [VoteRecordedEmbed], ephemeral: true });
	}
};

const ButtonCommand = new Button({
	name: "twitter",
	run: async ({ interaction }) => {
		const interactionReply = await handleMessageInteraction(interaction);

		if (!interactionReply) {
			console.error(`[Error code: 1999] Error, not found a translation data for message ${interaction.message.id}`);
			return;
		}

		const uniqueId = Symbol();

		const userAwaiter = activeAwaiters.get(interaction.user.id);

		if (userAwaiter) {
			try {
				userAwaiter.interaction.deleteReply();
			} catch (error: any) {
				console.error("[Error code: 1983]", error.stack || error);
			}
		}

		activeAwaiters.set(interaction.user.id, { uniqueId, interaction });
		setTimeout(() => {
			const awaiter = activeAwaiters.get(interaction.user.id);
			if (awaiter?.uniqueId === uniqueId) activeAwaiters.delete(interaction.user.id);
		}, 1000 * 60 * 5);

		try {
			const userInteraction = await interaction.message
				.awaitMessageComponent({
					time: 1000 * 60 * 5,
					filter: (btnI) => btnI.user.id === interaction.user.id,
					componentType: ComponentType.Button,
				})
				.catch((e) => console.error("[Error code: 2001] No interaction was received"));

			if (!userInteraction || activeAwaiters.get(interaction.user.id)?.uniqueId !== uniqueId) {
				console.info("Received an incorrect interaction component");
				return;
			}

			let userVote: "originalBetter" | "translationBetter";

			switch (userInteraction.customId) {
				case TwitterVoteButtons.originalBetter:
					userVote = "originalBetter";
					break;
				case TwitterVoteButtons.translationBetter:
					userVote = "translationBetter";
					break;
				default:
					return;
			}

			await handleVote(userInteraction, userVote, interaction.message.id);

			activeAwaiters.delete(interaction.user.id);
			try {
				interactionReply.edit({ components: [] });
			} catch (e: any) {
				console.error(
					"[Error code: 1979]",
					e.code == RESTJSONErrorCodes.UnknownMessage
						? "Message was deleted before the bot could edit it"
						: `Received a unknown error code: ${e.code}/${e.code == 10008}`
				);
			}
		} catch (error: any) {
			console.error("[Error code: 1978]", error.stack || error, error?.code);
			try {
				interaction.deleteReply();
			} catch (e: any) {
				console.error(
					"[Error code: 1982]",
					e.code === RESTJSONErrorCodes.InvalidWebhookToken
						? "Invalid Webhook token. Most likely the message was hidden by the user"
						: e.code == RESTJSONErrorCodes.UnknownMessage
						? "Message was deleted before the bot could edit it"
						: `Received a unknown error code: ${e.code}`
				);
			}
		}
	},
});

export default ButtonCommand;
