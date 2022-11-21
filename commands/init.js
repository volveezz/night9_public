import { EmbedBuilder } from "discord.js";
import { colors } from "../base/colors.js";
import { init_register } from "../handlers/logger.js";
import { auth_data, init_data } from "../handlers/sequelize.js";
const emoji = "<:dot:1018321568218226788>";
export async function initCommand_register(interaction) {
    const checker = await auth_data.findOne({
        where: { discord_id: interaction.user.id },
    });
    if (checker !== null) {
        throw {
            name: "Вы уже зарегистрированы",
        };
    }
    const [request, created] = await init_data.findOrCreate({
        where: { discord_id: interaction.user.id },
        defaults: {
            discord_id: interaction.user.id,
        },
    });
    const embed = new EmbedBuilder()
        .setTitle("Нажмите для перехода к авторизации")
        .setURL(`https://www.bungie.net/ru/OAuth/Authorize?client_id=34432&response_type=code&state=${request.state}`)
        .setColor(colors.default)
        .setDescription(`${emoji}По нажатию на ссылку вы будете перенаправлены на сайт Bungie (bungie.net)\n${emoji}На сайте достаточно авторизоваться через любой удобный для вас способ\n${emoji}К 1 аккаунту Discord можно привязать лишь 1 аккаунт Bungie\n${emoji}По нажатию на ссылку вас перенаправит на официальный сайт Bungie - это исключает риск кражи паролей и другой информации`);
    init_register(request.state, interaction.user, created);
    return embed;
}
export default {
    name: "init",
    description: "Свяжите свой аккаунт Destiny с аккаунтом Discord",
    global: true,
    callback: async (_client, interaction, _member, _guild, _channel) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const embed = await initCommand_register(interaction);
        await deferredReply;
        return interaction.editReply({ embeds: [embed] });
    },
};
