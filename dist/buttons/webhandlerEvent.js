import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import { Op } from "sequelize";
import { ClanButtons, TimezoneButtons } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { groupId, ownerId } from "../configs/ids.js";
import { client } from "../index.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
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
        const timezoneComponent = new ButtonBuilder()
            .setCustomId(TimezoneButtons.button)
            .setLabel("Установить часовой пояс")
            .setStyle(ButtonStyle.Secondary);
        if (authData.length === 2) {
            if (invitee_clan === true) {
                interaction.channel?.isDMBased()
                    ? interaction.channel?.messages.fetch(interaction.message.id).then(async (msg) => {
                        msg.edit({ components: await addButtonsToMessage([timezoneComponent]) });
                    })
                    : "";
                (await deferredReply) && interaction.editReply("Вы уже являетесь участником нашего клана :)");
                return;
            }
            const clanInviteRequest = (await (await fetch(`https://www.bungie.net/platform/GroupV2/${groupId}/Members/IndividualInvite/${invitee_platform}/${invitee_bungieId}/`, {
                method: "POST",
                headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${inviter_accessToken}` },
                body: JSON.stringify({ description: "Автоматическое приглашение в клан Night 9" }),
            })).json());
            const embed = getEmbedResponse(clanInviteRequest.ErrorCode);
            await deferredReply;
            await interaction.editReply({ embeds: [embed] });
            if (!interaction.channel?.isDMBased() || clanInviteRequest.ErrorCode === 1626)
                return;
            const message = await interaction.channel.messages.fetch(interaction.message.id);
            if (message.embeds[0].data.author?.name === "Уведомление об исключении из клана") {
                await message.edit({
                    components: await addButtonsToMessage([
                        new ButtonBuilder().setCustomId(ClanButtons.modal).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary),
                    ]),
                });
                return;
            }
            const updatedEmbed = EmbedBuilder.from(message.embeds[0]).setDescription(null);
            await message.edit({ embeds: [updatedEmbed], components: await addButtonsToMessage([timezoneComponent]) });
        }
        else {
            throw { name: "Произошла неизвестная ошибка", description: "Возможно, вы уже участник нашего клана" };
        }
        function getEmbedResponse(code) {
            const embed = new EmbedBuilder().setColor(colors.error);
            const bungieNetUrl = `[Bungie.net](https://www.bungie.net/ru/ClanV2?groupid=${groupId})`;
            switch (code) {
                case 1:
                    return embed
                        .setColor(colors.success)
                        .setAuthor({ name: "Приглашение было отправлено", iconURL: icons.success })
                        .setDescription(`Принять приглашение можно в игре или на [сайте Bungie](https://www.bungie.net/ru/ClanV2?groupId=${groupId})`);
                case 676:
                    return embed.setColor(colors.success).setAuthor({ name: "Вы уже участник клана", iconURL: icons.success });
                case 695:
                    return embed
                        .setAuthor({ name: "Ошибка. Приглашение не отправлено", iconURL: icons.error })
                        .setDescription(`На вашем аккаунте стоит запрет на получение приглашений в клан\nВы всё ещё можете вступить вручную через ${bungieNetUrl} или через участника клана в игре`);
                case 1626:
                    return embed
                        .setAuthor({ name: "Произошла ошибка на стороне Bungie", iconURL: icons.error })
                        .setDescription("Попробуйте перезайти в игру и удостоверится в том, что игра сейчас стабильна и корректно работает\n\nОшибка гласит о том, что Ваши данные не были обновлены до актуальной версии игры");
                case 5:
                    return embed
                        .setAuthor({ name: "API в данный момент недоступно", iconURL: icons.error })
                        .setDescription(`Попробуйте повторить попытку позже, или напишите в личные сообщения лидеру клана <@${ownerId}> ||(ему можно писать даже когда он не в сети)||`);
                default:
                    console.error("[Error code: 1633]", code);
                    return embed
                        .setAuthor({ name: "Произошла неизвестная ошибка", iconURL: icons.error })
                        .setDescription(`Администрация была оповещена об этой ошибке и при необходимости свяжется с Вами\n\n### Если Вы не получили приглашение в клан, то Вы можете вступить в него следующими способами:\n1. Написав лидеру клана в личные сообщения (лидер клана <@${ownerId}>)\n2. Вступив в клан через сайт ${bungieNetUrl}\n3. Вступив через любого участника в игре, который уже в нашем клане\n\nПо любым вопросам Вы можете написать <@${ownerId}> или <@${client.user.id}> в любое время без ограничений`);
                    break;
            }
        }
    },
};
