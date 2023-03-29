import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import { Op } from "sequelize";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { Command } from "../../structures/command.js";
import { isSnowflake } from "../../utils/general/utilities.js";
import { AuthData } from "../../utils/persistence/sequelize.js";
export default new Command({
    name: "auth",
    description: "Refresh the authorization data for a selected user",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "id",
            description: "Specify the user whose authorization data should be refreshed",
            required: true,
        },
    ],
    run: async ({ interaction }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const id = interaction.options.getString("id") === "me"
            ? interaction.user.id
            : interaction.options.getString("id", true);
        if (!isSnowflake(id)) {
            throw { errorType: UserErrors.WRONG_ID };
        }
        const data = await AuthData.findOne({
            where: { [Op.or]: [{ discordId: id }, { bungieId: id }] },
            attributes: ["displayName", "refreshToken"],
        });
        if (!data)
            throw { errorType: UserErrors.DB_USER_NOT_FOUND };
        try {
            const form = new URLSearchParams();
            form.append("grant_type", "refresh_token");
            form.append("refresh_token", data.refreshToken);
            var token = (await fetch(`https://www.bungie.net/Platform/App/OAuth/Token/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${process.env.AUTH}`,
                },
                body: form,
            }).then(async (response) => {
                return response.json();
            }));
        }
        catch (err) {
            throw { name: "[Error code: 1233] Request error", description: err?.error?.error_description || "no description available", err };
        }
        if (token) {
            await AuthData.update({
                accessToken: token.access_token,
                refreshToken: token.refresh_token,
            }, {
                where: {
                    membershipId: token.membership_id,
                },
            });
            const embed = new EmbedBuilder().setFooter({ text: `MembershipId: ${token.membership_id}` });
            if (id != null && token.membership_id != null) {
                embed.setColor(colors.success).setAuthor({ name: `${data.displayName} был обновлен`, iconURL: icons.success });
            }
            else {
                embed
                    .setColor(colors.error)
                    .setAuthor({ name: `Произошла ошибка во время обновления токена ${data.displayName}`, iconURL: icons.error });
            }
            (await deferredReply) && interaction.editReply({ embeds: [embed] });
        }
        else {
            throw { name: `${id} not updated` };
        }
    },
});