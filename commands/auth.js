import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import fetch from "node-fetch";
import { Op } from "sequelize";
import { colors } from "../base/colors.js";
import { auth_data } from "../handlers/sequelize.js";
export default {
    name: "auth",
    description: "Manual auth renewal",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "id",
            description: "id",
            required: true,
        },
    ],
    callback: async (_client, interaction, _member, _guild, _channel) => {
        let id = interaction.options.getString("id", true) === "me" ? interaction.user.id : interaction.options.getString("id", true);
        try {
            BigInt(id);
        }
        catch (error) {
            throw { name: "Ошибка Id", message: error.toString() };
        }
        const data = await auth_data.findOne({
            where: { [Op.or]: [{ discord_id: id }, { bungie_id: id }] },
            attributes: ["refresh_token"],
        });
        if (!data)
            throw { name: "Запись в БД отсутствует", message: `Id: ${id}` };
        try {
            const form = new URLSearchParams();
            form.append("grant_type", "refresh_token");
            form.append("refresh_token", data.refresh_token);
            var token = await fetch(`https://www.bungie.net/Platform/App/OAuth/Token/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${process.env.AUTH}`,
                },
                body: form,
            }).then(async (response) => {
                return response.json();
            });
        }
        catch (err) {
            throw { name: "Request error", message: err?.error?.error_description || "no description available", err };
        }
        if (token) {
            await auth_data.update({
                access_token: token.access_token,
                refresh_token: token.refresh_token,
            }, {
                where: {
                    membership_id: token.membership_id,
                },
            });
            const embed = new EmbedBuilder()
                .setColor(colors.default)
                .setFooter({ text: `Id: ${id}` })
                .setTitle(`MembershipId: ${token.membership_id} обновлен`);
            interaction.reply({ embeds: [embed], ephemeral: true });
        }
        else {
            throw { name: `${id} not updated` };
        }
    },
};
