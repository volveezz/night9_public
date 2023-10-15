import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { Command } from "../../structures/command.js";
import { uploadImageToImgur } from "../../utils/general/uploadImageToImgur.js";
const SlashCommand = new Command({
    name: "upload",
    description: "Upload an image to Imgur",
    descriptionLocalizations: {
        ru: "Загрузите изображение на Imgur",
    },
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "link",
            nameLocalizations: { ru: "ссылка" },
            description: "Specify the link to the image you want to upload",
            descriptionLocalizations: {
                ru: "Указать ссылку на изображение, которое вы хотите загрузить",
            },
            required: true,
        },
    ],
    run: async ({ interaction, args }) => {
        const link = args.getString("link", true);
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const linkToUploadedImage = await uploadImageToImgur(link);
        const embed = new EmbedBuilder();
        if (linkToUploadedImage) {
            embed
                .setAuthor({ name: "Изображение загружено", iconURL: icons.success, url: linkToUploadedImage })
                .setImage(linkToUploadedImage)
                .setColor(colors.success);
        }
        else {
            embed.setAuthor({ name: "Ошибка загрузки изображения", iconURL: icons.error }).setColor(colors.error);
        }
        await deferredReply;
        await interaction.editReply({ embeds: [embed] });
    },
});
export default SlashCommand;
//# sourceMappingURL=upload.js.map