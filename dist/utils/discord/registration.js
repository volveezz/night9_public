import { EmbedBuilder, Message } from "discord.js";
import colors from "../../configs/colors.js";
import { logUserRegistrationAttempt } from "../logging/logUserRegistration.js";
import { InitData } from "../persistence/sequelize.js";
async function sendRegistrationLink(interaction) {
    const user = interaction instanceof Message ? interaction.author : interaction.user;
    const userId = user.id;
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
        .setDescription(` - По нажатию на ссылку вы будете перенаправлены на сайт Bungie (bungie.net)\n- На сайте необходимо авторизоваться через любой удобный для вас способ\n- К 1 аккаунту Discord можно привязать лишь 1 аккаунт Bungie\n- Авторизация происходит исключительно на официальном сайте, что исключает в свою очередь риск кражи пароля или другой информации`);
    logUserRegistrationAttempt(request.state, user, created);
    return embed;
}
export default sendRegistrationLink;
//# sourceMappingURL=registration.js.map