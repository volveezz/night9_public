import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import fetch from "node-fetch";
import { Op } from "sequelize";
import colors from "../../configs/colors.js";
import UserErrors from "../../enums/UserErrors.js";
import { AuthData } from "../../handlers/sequelize.js";
import { Command } from "../../structures/command.js";
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
        const deferredInteraction = interaction.deferReply({ ephemeral: true });
        const id = (interaction.options.getString("id") === "me"
            ? interaction.user.id
            : interaction.options.getString("id"));
        try {
            BigInt(id);
        }
        catch (error) {
            throw { errorType: UserErrors.WRONG_ID };
        }
        const data = await AuthData.findOne({
            where: { [Op.or]: [{ discordId: id }, { bungieId: id }] },
            attributes: ["refreshToken"],
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
            const embed = new EmbedBuilder()
                .setColor(colors.default)
                .setFooter({ text: `Id: ${id}` })
                .setTitle(`MembershipId: ${token.membership_id} обновлен`);
            (await deferredInteraction) && interaction.editReply({ embeds: [embed] });
        }
        else {
            throw { name: `${id} not updated` };
        }
    },
});
