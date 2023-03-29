import { EmbedBuilder, Message } from "discord.js";
import colors from "../../configs/colors.js";
import { logRegistrationLinkRequest } from "../logging/logger.js";
import { AuthData, InitData } from "../persistence/sequelize.js";
const emoji = "<:dot:1018321568218226788>";
export async function sendRegistrationLink(interaction) {
    const user = interaction instanceof Message ? interaction.author : interaction.user;
    const userId = user.id;
    const checker = await AuthData.findOne({
        where: { discordId: userId },
    });
    if (checker !== null) {
        throw {
            name: "Вы уже зарегистрированы",
        };
    }
    const [request, created] = await InitData.findOrCreate({
        where: { discordId: userId },
        defaults: {
            discordId: userId,
        },
    });
    const embed = new EmbedBuilder()
        .setTitle("Нажмите для перехода к авторизации")
        .setURL(`https://www.bungie.net/ru/OAuth/Authorize?client_id=34432&response_type=code&state=${request.state}`)
        .setColor(colors.default)
        .setDescription(`${emoji}По нажатию на ссылку вы будете перенаправлены на сайт Bungie (bungie.net)\n${emoji}На сайте достаточно авторизоваться через любой удобный для вас способ\n${emoji}К 1 аккаунту Discord можно привязать лишь 1 аккаунт Bungie\n${emoji}По нажатию на ссылку вас перенаправит на официальный сайт Bungie - это исключает риск кражи паролей и другой информации`);
    logRegistrationLinkRequest(request.state, user, created);
    return embed;
}
