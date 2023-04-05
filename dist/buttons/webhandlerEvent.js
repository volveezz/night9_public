import { EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import { Op } from "sequelize";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { ownerId } from "../configs/ids.js";
import { AuthData } from "../utils/persistence/sequelize.js";
export default {
    name: "webhandlerEvent",
    run: async ({ interaction }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        if (interaction.user.id === ownerId) {
            await deferredReply;
            await interaction.editReply({ content: "Вам нельзя вступать в клан" });
            return;
        }
        const authData = await AuthData.findAll({
            attributes: ["clan", "bungieId", "platform", "accessToken"],
            where: {
                [Op.or]: [{ discordId: interaction.user.id }, { discordId: ownerId }],
            },
        });
        if (authData.length !== 2) {
            await deferredReply;
            throw { errorType: UserErrors.DB_USER_NOT_FOUND };
        }
        if (authData[0].discordId === ownerId) {
            var { clan: invitee_clan, bungieId: invitee_bungieId, platform: invitee_platform } = authData[1];
            var { accessToken: inviter_accessToken } = authData[0];
        }
        else {
            var { clan: invitee_clan, bungieId: invitee_bungieId, platform: invitee_platform } = authData[0];
            var { accessToken: inviter_accessToken } = authData[1];
        }
        if (authData.length === 2) {
            if (invitee_clan === true) {
                interaction.channel?.isDMBased()
                    ? interaction.channel?.messages.fetch(interaction.message.id).then(async (msg) => {
                        msg.edit({ components: [] });
                    })
                    : "";
                (await deferredReply) && interaction.editReply("Вы уже являетесь участником нашего клана :)");
                return;
            }
            const clanInviteRequest = (await (await fetch(`https://www.bungie.net/platform/GroupV2/4123712/Members/IndividualInvite/${invitee_platform}/${invitee_bungieId}/`, {
                method: "POST",
                headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${inviter_accessToken}` },
                body: JSON.stringify({ description: "Автоматическое приглашение в клан Night 9" }),
            })).json());
            if (clanInviteRequest.ErrorCode === 1) {
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setAuthor({ name: "Приглашение было отправлено", iconURL: icons.success })
                    .setDescription(`Принять приглашение можно в игре или на [сайте Bungie](https://www.bungie.net/ru/ClanV2?groupId=4123712)`);
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
                if (!interaction.channel?.isDMBased())
                    return;
                interaction.channel?.messages
                    .fetch(interaction.message.id)
                    .then((msg) => {
                    const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                    msg.edit({ embeds: [reEmbed], components: [] });
                })
                    .catch((err) => {
                    if (err.code !== 10008)
                        console.error(`[Error code: 1107]`, err);
                });
            }
            else if (clanInviteRequest.ErrorCode === 676) {
                const embed = new EmbedBuilder().setColor(colors.success).setTitle("Вы уже участник нашего клана :)");
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
                if (!interaction.channel?.isDMBased())
                    return;
                interaction.channel?.messages.fetch(interaction.message.id).then((msg) => {
                    const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                    msg.edit({ components: [], embeds: [reEmbed] });
                });
                return;
            }
            else if (clanInviteRequest.ErrorCode === 695) {
                const embed = new EmbedBuilder()
                    .setColor(colors.error)
                    .setAuthor({ name: "Ошибка", iconURL: icons.close })
                    .setDescription(`На вашем аккаунте стоит запрет на получение приглашений в клан\nПопробуйте вступить вручную через [bungie.net](https://www.bungie.net/ru/ClanV2?groupid=4123712)`);
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
                if (!interaction.channel?.isDMBased())
                    return;
                interaction.channel?.messages.fetch(interaction.message.id).then((msg) => {
                    const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                    msg.edit({ components: [], embeds: [reEmbed] });
                });
                return;
            }
            else {
                console.error(`[Error code: 1633]`, clanInviteRequest);
                throw { name: "Критическая ошибка", description: "API игры, скорее всего, недоступно в данный момент" };
            }
        }
        else {
            throw { name: "Произошла неизвестная ошибка", description: "Возможно, вы уже участник нашего клана" };
        }
    },
};
