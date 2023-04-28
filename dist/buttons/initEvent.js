import { EmbedBuilder } from "discord.js";
import { RegisterButtons } from "../configs/Buttons.js";
import colors from "../configs/colors.js";
import sendRegistrationLink from "../utils/discord/registration.js";
const emoji = "<:dot:1018321568218226788>";
export default {
    name: "initEvent",
    run: async ({ interaction }) => {
        if (interaction.customId === RegisterButtons.why) {
            const replyEmbed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle("Для чего нужна регистрация?")
                .setDescription(`Регистрация на нашем сервере нужна для работы множества функций сервера, включая, но не ограничиваясь:\n - Возможностью проверки статистики ваших персонажей\n - Возможностью вступления в клан не заходя в игру\n - Возможностью создания и записи на наборы с статистикой из игры\n - Возможностью удобно общаться на сервере - ваш ник в игре синхронизируется с ником Discord`);
            return await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
        }
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const embed = await sendRegistrationLink(interaction, deferredReply);
        await deferredReply;
        return await interaction.editReply({ embeds: [embed] });
    },
};
