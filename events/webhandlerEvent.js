import { EmbedBuilder } from "discord.js";
import { Op } from "sequelize";
import { ownerId } from "../base/ids.js";
import { auth_data } from "../handlers/sequelize.js";
import fetch from "node-fetch";
export default {
    callback: async (_client, interaction, _member, _guild, _channel) => {
        if (interaction.customId !== "webhandlerEvent_clan_request")
            return;
        await interaction.deferReply({ ephemeral: true });
        const authData = await auth_data.findAll({
            attributes: ["clan", "bungie_id", "platform", "access_token"],
            where: {
                [Op.or]: [{ discord_id: interaction.user.id }, { discord_id: ownerId }],
            },
        });
        if (authData[0].toJSON().discord_id === ownerId) {
            var { clan: invitee_clan, bungie_id: invitee_bungie_id, platform: invitee_platform } = authData[1].toJSON();
            var { access_token: inviter_access_token } = authData[0].toJSON();
        }
        else {
            var { clan: invitee_clan, bungie_id: invitee_bungie_id, platform: invitee_platform } = authData[0].toJSON();
            var { access_token: inviter_access_token } = authData[1].toJSON();
        }
        if (authData.length === 2) {
            if (invitee_clan === true) {
                interaction.channel?.messages.fetch(interaction.message.id).then((msg) => {
                    const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                    msg.edit({ components: [] });
                    interaction.editReply({ embeds: [reEmbed] });
                });
                return;
            }
            try {
                await fetch(`https://www.bungie.net/platform/GroupV2/4123712/Members/IndividualInvite/${invitee_platform}/${invitee_bungie_id}/`, {
                    method: "POST",
                    headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${inviter_access_token}` },
                    body: JSON.stringify({ message: "IndividualInvite" }),
                });
            }
            catch (err) {
                if (err.error?.ErrorCode === 676) {
                    const embed = new EmbedBuilder().setColor("DarkGreen").setTitle("Вы уже участник нашего клана :)");
                    interaction.editReply({ embeds: [embed] });
                    interaction.channel?.messages.fetch(interaction.message.id).then((msg) => {
                        const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                        msg.edit({ components: [], embeds: [reEmbed] });
                    });
                    return;
                }
                else {
                    console.error(err.error);
                    return;
                }
            }
            if (true) {
                const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Приглашение было отправлено")
                    .setDescription(`Принять приглашение можно в игре или на сайте Bungie`);
                interaction.editReply({ embeds: [embed] });
                interaction.channel?.messages
                    .fetch(interaction.message.id)
                    .then((msg) => {
                    const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                    msg.edit({ components: [], embeds: [reEmbed] });
                })
                    .catch((err) => {
                    if (err.code !== 10008)
                        console.error(err);
                });
            }
        }
        else {
            throw { name: "Произошла неизвестная ошибка" };
        }
    },
};
