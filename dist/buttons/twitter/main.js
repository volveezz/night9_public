import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, RESTJSONErrorCodes } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { Button } from "../../structures/button.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { originalTweetData, twitterOriginalVoters } from "../../utils/persistence/dataStore.js";
const TweetNotFoundEmbed = new EmbedBuilder()
    .setColor(colors.error)
    .setAuthor({ name: "Ошибка. Оригинал сообщения не найден", iconURL: icons.error });
const TwitterVoteButtonsComponents = [
    new ButtonBuilder().setCustomId("twitterVote_originalBetter").setLabel("Оригинал лучше перевода").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
        .setCustomId("twitterVote_translationBetter")
        .setLabel("Перевод лучше оригинала")
        .setStyle(ButtonStyle.Secondary),
];
const VoteRecordedEmbed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Голос учтён", iconURL: icons.voted });
const activeAwaiters = new Map();
const handleMessageInteraction = async (interaction) => {
    const messageData = originalTweetData.get(interaction.message.id);
    if (!messageData) {
        interaction.reply({ embeds: [TweetNotFoundEmbed], ephemeral: true });
        await interaction.message.edit({ components: [] });
        return;
    }
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.setDescription(messageData);
    const voteData = twitterOriginalVoters.get(interaction.message.id);
    let components = [];
    if (voteData) {
        components = TwitterVoteButtonsComponents;
    }
    return interaction.reply({ embeds: [embed], components: addButtonsToMessage(components), ephemeral: true });
};
const handleVote = async (interaction, userVote, messageId) => {
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
    }
    else if (userVote === "translationBetter") {
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
            console.error("[Error code: 1987]", interactionReply);
            return;
        }
        const uniqueId = Symbol();
        const userAwaiter = activeAwaiters.get(interaction.user.id);
        if (userAwaiter) {
            try {
                userAwaiter.interaction.deleteReply();
            }
            catch (error) {
                console.error("[Error code: 1983]", error.stack || error);
            }
        }
        activeAwaiters.set(interaction.user.id, { uniqueId, interaction });
        setTimeout(() => {
            const awaiter = activeAwaiters.get(interaction.user.id);
            if (awaiter?.uniqueId === uniqueId)
                activeAwaiters.delete(interaction.user.id);
        }, 1000 * 60 * 5);
        try {
            const userInteraction = await interaction.message.channel
                .awaitMessageComponent({
                time: 1000 * 60 * 5,
                filter: (btnI) => btnI.user.id === interaction.user.id,
                componentType: ComponentType.Button,
            })
                .catch();
            if (!userInteraction || activeAwaiters.get(interaction.user.id)?.uniqueId !== uniqueId) {
                console.info("Received an incorrect interaction component");
                return;
            }
            let userVote;
            switch (userInteraction.customId) {
                case "twitterVote_originalBetter":
                    userVote = "originalBetter";
                    break;
                case "twitterVote_translationBetter":
                    userVote = "translationBetter";
                    break;
                default:
                    return;
            }
            await handleVote(userInteraction, userVote, interaction.message.id);
            activeAwaiters.delete(interaction.user.id);
            try {
                interactionReply.edit({ components: [] });
            }
            catch (e) {
                console.error("[Error code: 1979]", e.code == RESTJSONErrorCodes.UnknownMessage
                    ? "Message was deleted before the bot could edit it"
                    : `Received a unknown error code: ${e.code}/${e.code == 10008}`);
            }
        }
        catch (error) {
            console.error("[Error code: 1978]", error.stack || error, error?.code);
            try {
                interaction.deleteReply();
            }
            catch (e) {
                console.error("[Error code: 1982]", e.code === RESTJSONErrorCodes.InvalidWebhookToken
                    ? "Invalid Webhook token. Most likely the message was hidden by the user"
                    : e.code == RESTJSONErrorCodes.UnknownMessage
                        ? "Message was deleted before the bot could edit it"
                        : `Received a unknown error code: ${e.code}`);
            }
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=main.js.map