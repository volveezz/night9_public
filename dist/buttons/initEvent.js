import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Button } from "../structures/button.js";
import sendRegistrationLink from "../utils/discord/registration.js";
const ButtonCommand = new Button({
    name: "initEvent",
    run: async ({ interaction }) => {
        if (interaction.customId === "initEvent_why") {
            const replyEmbed = new EmbedBuilder()
                .setColor(colors.serious)
                .setAuthor({ name: "Для чего нужна регистрация?", iconURL: icons.notify })
                .setDescription("Регистрация на нашем сервере нужна для работы множества функций сервера, включая, но не ограничиваясь:\n- Возможностью проверки статистики ваших персонажей\n- Возможностью вступления в клан не заходя в игру\n- Возможностью создания и записи на наборы с статистикой из игры\n- Возможностью удобно общаться на сервере - Ваш ник в игре синхронизируется с ником Discord");
            return await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
        }
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const embed = await sendRegistrationLink(interaction);
        await deferredReply;
        await interaction.editReply({ embeds: [embed] });
        return;
    },
});
export default ButtonCommand;
//# sourceMappingURL=initEvent.js.map