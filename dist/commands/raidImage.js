import { ApplicationCommandOptionType, EmbedBuilder, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Command } from "../structures/command.js";
import createModalCollector from "../utils/discord/modalCollector.js";
import { addModalComponents } from "../utils/general/addModalComponents.js";
import { RaidEvent } from "../utils/persistence/sequelize.js";
const ERROR_EMBED = new EmbedBuilder()
    .setColor(colors.error)
    .setAuthor({ name: "Ошибка", iconURL: icons.error })
    .setDescription("Рейд не найден или у вас недостаточно прав для его изменения");
const SUCCESS_EMBED = new EmbedBuilder()
    .setColor(colors.success)
    .setAuthor({ name: "Успех", iconURL: icons.success })
    .setDescription("Сообщение было обновлено");
const SlashCommand = new Command({
    name: "raid-image",
    description: "Receive access to a specific text channel of the guild",
    descriptionLocalizations: { ru: "Получите доступ к определенным каналам сервера" },
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
    ],
    run: async ({ client, interaction, args }) => {
        const raidId = args.getInteger("id-рейда", true);
        const raidEventPromise = RaidEvent.findByPk(raidId, { attributes: ["messageId", "creator"] });
        const member = (interaction.member instanceof GuildMember ? interaction.member : client.getCachedMembers().get(interaction.user.id)) ||
            (await client.getAsyncMember(interaction.user.id));
        const raidEvent = await raidEventPromise;
        if (!raidEvent || (raidEvent.creator !== interaction.user.id && member?.permissions.has("Administrator"))) {
            interaction.reply({ ephemeral: true, embeds: [ERROR_EMBED] });
            return;
        }
        const { messageId } = raidEvent;
        const raidChannel = client.getCachedTextChannel(process.env.RAID_CHANNEL_ID) || (await client.getAsyncTextChannel(process.env.RAID_CHANNEL_ID));
        let raidMessage = raidChannel.messages.cache.get(messageId) || (await client.getAsyncMessage(raidChannel, messageId));
        if (!raidMessage || raidMessage.embeds.length != 1) {
            console.error("[Error code: 2023]", raidChannel?.name || raidChannel, raidMessage?.id || raidMessage, raidMessage?.embeds?.length, raidEvent.id);
            throw { name: "Произошла непредвиденная ошибка" };
        }
        const SUCCESS_MODAL = new ModalBuilder().setTitle("Укажите ссылки на новые изображения").setCustomId("raidCustomImage_modal");
        const IMAGE_TEXT_MODAL_FIELD = new TextInputBuilder()
            .setCustomId("raidCustomImage_imageField")
            .setLabel("Укажите ссылку на большое изображение")
            .setPlaceholder("Для удаления изображения введите знак -")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        const THUMBNAIL_TEXT_MODAL_FIELD = new TextInputBuilder()
            .setCustomId("raidCustomImage_thumbnailField")
            .setLabel("Укажите ссылку на маленькое изображение")
            .setPlaceholder("Оставьте поле пустым, если не хотите менять")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        const raidEmbed = raidMessage.embeds[0];
        const existingImageUrl = raidEmbed.image?.url;
        const existingThumbnailUrl = raidEmbed.thumbnail?.url;
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
        const newImageUrlLink = modalSubmitInteraction.fields.getTextInputValue("raidCustomImage_imageField");
        const newThumbnailUrlLink = modalSubmitInteraction.fields.getTextInputValue("raidCustomImage_thumbnailField");
        raidMessage = await raidChannel.messages.fetch(messageId);
        const updatedRaidEmbed = EmbedBuilder.from(raidMessage.embeds[0]);
        if (newImageUrlLink.length === 1) {
            updatedRaidEmbed.setImage(null);
        }
        else if (newImageUrlLink.length > 5 && newImageUrlLink !== existingImageUrl) {
            updatedRaidEmbed.setImage(newImageUrlLink);
        }
        if (newThumbnailUrlLink.length === 1) {
            updatedRaidEmbed.setThumbnail(null);
        }
        else if (newThumbnailUrlLink.length > 5 && newThumbnailUrlLink !== existingThumbnailUrl) {
            updatedRaidEmbed.setThumbnail(newThumbnailUrlLink);
        }
        await Promise.all([
            raidMessage.edit({ embeds: [updatedRaidEmbed] }),
            modalSubmitInteraction.reply({ embeds: [SUCCESS_EMBED], ephemeral: true }),
        ]);
    },
});
export default SlashCommand;
//# sourceMappingURL=raidImage.js.map