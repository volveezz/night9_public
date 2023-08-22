import { EmbedBuilder, Message } from "discord.js";
import icons from "../../configs/icons.js";
import { logUserRegistrationAttempt } from "../logging/logUserRegistration.js";
import { InitData } from "../persistence/sequelize.js";
const clientId = process.env.BUNGIE_CLIENT_ID || "34432";
const EMBED_COLOR = "#cdf9ff";
async function sendRegistrationLink(interaction) {
    const user = interaction instanceof Message ? interaction.author : interaction.user;
    const userId = user.id;
    const [request, created] = await InitData.findOrCreate({
        where: { discordId: userId },
        defaults: {
            discordId: userId,
        },
    });
    const url = `https://www.bungie.net/ru/OAuth/Authorize?client_id=${clientId}&response_type=code&state=${request.state}`;
    const EMBED_DESCRIPTION = `- При нажатии [на ссылку](${url}) вы будете перенаправлены на сайт Bungie\n- На сайте вам нужно авторизоваться любым удобным для вас способом\n- К одному аккаунту Discord можно привязать только один аккаунт Bungie\n- Авторизация производится исключительно на официальном сайте, что исключает риск кражи пароля или другой информации`;
    const embed = new EmbedBuilder()
        .setAuthor({ name: "Нажмите на этот текст для перехода к авторизации", iconURL: icons.crossSave, url })
        .setColor(EMBED_COLOR)
        .setDescription(EMBED_DESCRIPTION);
    logUserRegistrationAttempt(request.state, user, created);
    return embed;
}
export default sendRegistrationLink;
//# sourceMappingURL=registration.js.map