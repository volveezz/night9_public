import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
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
        await interaction.reply({ embeds: [TweetNotFoundEmbed], ephemeral: true });
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
    return await interaction.reply({ embeds: [embed], components: addButtonsToMessage(components), ephemeral: true });
};
const handleVote = async (interaction, userVote) => {
    const userId = interaction.user.id;
    const messageId = interaction.message.id;
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
            return;
        }
        const uniqueId = Symbol();
        const userAwaiter = activeAwaiters.get(interaction.user.id);
        if (userAwaiter) {
            userAwaiter.interaction.deleteReply();
        }
        activeAwaiters.set(interaction.user.id, { uniqueId, interaction });
        try {
            const userInteraction = await interactionReply.awaitMessageComponent({
                time: 1000 * 60 * 5,
                filter: (i) => i.user.id === interaction.user.id,
                componentType: ComponentType.Button,
            });
            if (activeAwaiters.get(interaction.user.id)?.uniqueId !== uniqueId || !userInteraction) {
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
            await handleVote(userInteraction, userVote);
            activeAwaiters.delete(interaction.user.id);
            await interactionReply.edit({ components: [] });
        }
        catch (error) {
            interaction.deleteReply();
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=main.js.map