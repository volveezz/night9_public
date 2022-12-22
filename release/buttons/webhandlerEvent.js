import { EmbedBuilder } from "discord.js";
import { Op } from "sequelize";
import { ownerId } from "../configs/ids.js";
import { AuthData } from "../handlers/sequelize.js";
import fetch from "node-fetch";
import colors from "../configs/colors.js";
import UserErrors from "../enums/UserErrors.js";
export default {
    name: "webhandlerEvent",
    run: async ({ interaction }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        if (interaction.user.id === ownerId)
            return deferredReply.then((v) => interaction.editReply({ content: "Вам нельзя вступать в клан" }));
        const authData = await AuthData.findAll({
            attributes: ["clan", "bungieId", "platform", "accessToken"],
            where: {
                [Op.or]: [{ discordId: interaction.user.id }, { discordId: ownerId }],
            },
        });
        if (authData.length !== 2)
            throw { errorType: UserErrors.DB_USER_NOT_FOUND };
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
                await deferredReply;
                interaction.editReply("Вы уже являетесь участником нашего клана :)");
                return;
            }
            const clanInviteRequest = await (await fetch(`https://www.bungie.net/platform/GroupV2/4123712/Members/IndividualInvite/${invitee_platform}/${invitee_bungieId}/`, {
                method: "POST",
                headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${inviter_accessToken}` },
                body: JSON.stringify({ description: "Автоматическое приглашение в клан Night 9" }),
            })).json();
            if (clanInviteRequest.ErrorCode === 1) {
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle("Приглашение было отправлено")
                    .setDescription(`Принять приглашение можно в игре или на [сайте Bungie](https://www.bungie.net/ru/ClanV2?groupId=4123712)`);
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
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
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                if (!interaction.channel?.isDMBased())
                    return;
                interaction.channel?.messages.fetch(interaction.message.id).then((msg) => {
                    const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                    msg.edit({ components: [], embeds: [reEmbed] });
                });
                return;
            }
            else {
                console.error(clanInviteRequest);
                throw { name: "Неожиданная ошибка", description: "Возможно, вы уже участник нашего клана" };
            }
        }
        else {
            throw { name: "Произошла неизвестная ошибка", description: "Возможно, вы уже участник нашего клана" };
        }
    },
};
