import { ApplicationCommandOptionType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Command } from "../structures/command.js";
import createModalCollector from "../utils/discord/modalCollector.js";
import { addModalComponents } from "../utils/general/addModalComponents.js";
import { LfgDatabase } from "../utils/persistence/sequelizeModels/lfgDatabase.js";
import { RaidEvent } from "../utils/persistence/sequelizeModels/raidEvent.js";
const ERROR_EMBED = new EmbedBuilder()
    .setColor(colors.error)
    .setAuthor({ name: "Ошибка", iconURL: icons.error })
    .setDescription("Событие не найдено или у вас недостаточно прав для его изменения");
const SUCCESS_EMBED = new EmbedBuilder()
    .setColor(colors.success)
    .setAuthor({ name: "Успех", iconURL: icons.success })
    .setDescription("Сообщение было обновлено");
const SlashCommand = new Command({
    name: "activity-image",
    nameLocalizations: {
        ru: "изображение-активности",
    },
    description: "Change the image of the activity",
    descriptionLocalizations: { ru: "Измените изображение активности" },
    options: [
        {
            type: ApplicationCommandOptionType.Integer,
            minValue: 1,
            maxValue: 100,
            name: "id-рейда",
            nameLocalizations: { "en-US": "raid-id", "en-GB": "raid-id" },
            autocomplete: true,
            description: "Укажите Id редактируемого рейда",
            descriptionLocalizations: {
                "en-US": "Specify the raid id of the modified raid",
                "en-GB": "Specify the raid id of the modified raid",
            },
        },
        {
            name: "lfg-id",
            nameLocalizations: { ru: "id-сбора" },
            description: "Specify the lfg id",
            descriptionLocalizations: { ru: "Укажите Id сбора" },
            type: ApplicationCommandOptionType.Integer,
            autocomplete: true,
            minValue: 1,
            maxValue: 100,
        },
    ],
    run: async ({ client, interaction, args }) => {
        const raidId = args.getInteger("id-рейда", false);
        const lfgId = args.getInteger("lfg-id", false);
        if (!raidId && !lfgId)
            throw {
                errorType: "LFG_ACTIVITY_NOT_FOUND",
            };
        const member = await client.getMember(interaction.member || interaction.user.id);
        if (!member)
            throw { errorType: "MEMBER_NOT_FOUND" };
        if (!member?.permissions.has("Administrator") || !member?.roles.cache.has(process.env.PREMIUM_ROLE_4))
            throw { errorType: "MISSING_PERMISSIONS" };
        let activityMessageId, activityChannel;
        if (raidId) {
            const raidEvent = await RaidEvent.findByPk(raidId, { attributes: ["messageId", "creator"] });
            if (!raidEvent || raidEvent.creator !== interaction.user.id) {
                interaction.reply({ ephemeral: true, embeds: [ERROR_EMBED] });
                return;
            }
            activityMessageId = raidEvent.messageId;
            activityChannel = await client.getTextChannel(process.env.RAID_CHANNEL_ID);
        }
        else if (lfgId) {
            const lfgDatabase = await LfgDatabase.findByPk(lfgId, { attributes: ["messageId"] });
            if (!lfgDatabase) {
                interaction.reply({ ephemeral: true, embeds: [ERROR_EMBED] });
                return;
            }
            activityMessageId = lfgDatabase.messageId;
            activityChannel = await client.getTextChannel(process.env.PVE_PARTY_CHANNEL_ID);
        }
        if (!activityChannel || !activityMessageId)
            throw {};
        let activityMessage = await client.getAsyncMessage(activityChannel, activityMessageId);
        if (!activityMessage || activityMessage.embeds.length != 1) {
            console.error("[Error code: 2023]", activityChannel?.name || activityChannel, activityMessage?.id || activityMessage, activityMessage?.embeds?.length, raidId || lfgId);
            throw { name: "Произошла непредвиденная ошибка" };
        }
        const SUCCESS_MODAL = new ModalBuilder().setTitle("Укажите ссылки на новые изображения").setCustomId("activityCustomImage_modal");
        const IMAGE_TEXT_MODAL_FIELD = new TextInputBuilder()
            .setCustomId("activityCustomImage_imageField")
            .setLabel("Укажите ссылку на большое изображение")
            .setPlaceholder("Для удаления изображения введите знак -")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        const THUMBNAIL_TEXT_MODAL_FIELD = new TextInputBuilder()
            .setCustomId("activityCustomImage_thumbnailField")
            .setLabel("Укажите ссылку на маленькое изображение")
            .setPlaceholder("Оставьте поле пустым, если не хотите менять")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        const activityEmbed = activityMessage.embeds[0];
        const existingImageUrl = activityEmbed.image?.url;
        const existingThumbnailUrl = activityEmbed.thumbnail?.url;
        if (existingImageUrl && existingImageUrl.length > 0 && existingImageUrl.length < 100) {
            IMAGE_TEXT_MODAL_FIELD.setValue(existingImageUrl);
        }
        if (existingThumbnailUrl && existingThumbnailUrl.length > 0 && existingThumbnailUrl.length < 100) {
            THUMBNAIL_TEXT_MODAL_FIELD.setValue(existingThumbnailUrl);
        }
        SUCCESS_MODAL.setComponents(addModalComponents(IMAGE_TEXT_MODAL_FIELD, THUMBNAIL_TEXT_MODAL_FIELD));
        await interaction.showModal(SUCCESS_MODAL);
        const modalSubmitInteraction = await createModalCollector(interaction, {
            time: 60 * 10 * 1000,
            filter: (i) => i.user.id === interaction.user.id,
        }).catch((e) => {
            return null;
        });
        if (!modalSubmitInteraction) {
            console.error("[Error code: 2024] Didn't received a callback from modal collector");
            return;
        }
        const newImageUrlLink = modalSubmitInteraction.fields.getTextInputValue("activityCustomImage_imageField");
        const newThumbnailUrlLink = modalSubmitInteraction.fields.getTextInputValue("activityCustomImage_thumbnailField");
        activityMessage = await activityChannel.messages.fetch(activityMessageId);
        const updatedActivityEmbed = EmbedBuilder.from(activityMessage.embeds[0]);
        if (newImageUrlLink.length === 1) {
            updatedActivityEmbed.setImage(null);
        }
        else if (newImageUrlLink.length > 5 && newImageUrlLink !== existingImageUrl) {
            updatedActivityEmbed.setImage(newImageUrlLink);
        }
        if (newThumbnailUrlLink.length === 1) {
            updatedActivityEmbed.setThumbnail(null);
        }
        else if (newThumbnailUrlLink.length > 5 && newThumbnailUrlLink !== existingThumbnailUrl) {
            updatedActivityEmbed.setThumbnail(newThumbnailUrlLink);
        }
        await Promise.allSettled([
            activityMessage.edit({ embeds: [updatedActivityEmbed] }),
            modalSubmitInteraction.reply({ embeds: [SUCCESS_EMBED], ephemeral: true }),
        ]);
    },
});
export default SlashCommand;
//# sourceMappingURL=activity-image.js.map