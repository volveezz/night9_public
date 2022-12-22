import { EmbedBuilder } from "discord.js";
import { RegisterButtons } from "../enums/Buttons.js";
import { sendRegistrationLink } from "../functions/registration.js";
import colors from "../configs/colors.js";
const emoji = "<:dot:1018321568218226788>";
export default {
    name: "initEvent",
    run: async ({ interaction }) => {
        if (interaction.customId === RegisterButtons.why) {
            const replyEmbed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle("Для чего нужна регистрация?")
                .setDescription(`Регистрация на нашем сервере нужна для работы множества функций сервера, включая, но не ограничиваясь:\n ${emoji}Возможностью проверки статистики ваших персонажей\n ${emoji}Возможностью вступления в клан не заходя в игру\n ${emoji}Возможностью создания и записи на наборы с статистикой из игры\n ${emoji}Возможностью удобно общаться на сервере - ваш ник в игре синхронизируется с ником Discord`);
            return interaction.reply({ embeds: [replyEmbed], ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        const embed = await sendRegistrationLink(interaction);
        return interaction.editReply({ embeds: [embed] });
    },
};