import { PlatformErrorCodes } from "bungie-api-ts/common.js";
import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { getAdminAccessToken } from "../commands/clan/main.js";
import { ClanButtons, TimezoneButtons } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { Button } from "../structures/button.js";
import { sendApiPostRequest } from "../utils/api/sendApiPostRequest.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";

const ButtonCommand = new Button({
	name: "webhandlerEvent",
	run: async ({ interaction }) => {
		const deferredReply = interaction.deferReply({ ephemeral: true });

		if (interaction.user.id === process.env.OWNER_ID!) {
			await deferredReply;
			await interaction.editReply({ content: "Вам нельзя вступать в клан" });
			return;
		}

		const authData = await AuthData.findByPk(interaction.user.id, {
			attributes: ["clan", "bungieId", "platform", "accessToken"],
		});

		if (!authData) {
			await deferredReply;
			throw { errorType: UserErrors.DB_USER_NOT_FOUND };
		}

		const { clan: invitee_clan, bungieId: invitee_bungieId, platform: invitee_platform } = authData;
		const inviter_accessToken = await getAdminAccessToken(process.env.OWNER_ID!);

		const timezoneComponent = new ButtonBuilder()
			.setCustomId(TimezoneButtons.button)
			.setLabel("Установить часовой пояс")
			.setStyle(ButtonStyle.Secondary);

		if (invitee_clan === true) {
			if (interaction.channel?.isDMBased()) {
				await interaction.channel.messages.fetch(interaction.message!.id).then(async (msg) => {
					await msg.edit({ components: addButtonsToMessage([timezoneComponent]) });
				});
			}

			await deferredReply;
			interaction.editReply("Вы уже являетесь участником нашего клана :)");
			return;
		}

		const clanInviteRequest = await sendApiPostRequest({
			apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID!}/Members/IndividualInvite/${invitee_platform}/${invitee_bungieId}/`,
			requestData: { description: "Автоматическое приглашение в клан Night 9" },
			accessToken: inviter_accessToken,
			returnResponse: false,
		});

		if (!clanInviteRequest) {
			throw { name: "Произошла неизвестная ошибка", description: "Попробуйте повторить попытку позже" };
		}

		const embed = getEmbedResponse(clanInviteRequest.ErrorCode);

		await deferredReply;
		await interaction.editReply({ embeds: [embed] });

		// Exit if not in DM
		if (!interaction.channel?.isDMBased() || clanInviteRequest.ErrorCode === PlatformErrorCodes.DestinyInternalError) return;

		const message = await interaction.channel.messages.fetch(interaction.message!.id);

		if (message.embeds[0].data.author?.name === "Уведомление об исключении из клана") {
			await message.edit({
				components: addButtonsToMessage([
					new ButtonBuilder().setCustomId(ClanButtons.modal).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary),
				]),
			});
			return;
		}

		const updatedEmbed = EmbedBuilder.from(message.embeds[0]).setDescription(null);
		await message.edit({ embeds: [updatedEmbed], components: addButtonsToMessage([timezoneComponent]) });
		function getEmbedResponse(code: PlatformErrorCodes) {
			const embed = new EmbedBuilder().setColor(colors.error);
			const bungieNetUrl = `[Bungie.net](https://www.bungie.net/ru/ClanV2?groupid=${process.env.GROUP_ID!})`;

			switch (code) {
				case PlatformErrorCodes.Success:
					return embed
						.setColor(colors.success)
						.setAuthor({ name: "Приглашение было отправлено", iconURL: icons.success })
						.setDescription(
							`Принять приглашение можно в игре или на [сайте Bungie](https://www.bungie.net/ru/ClanV2?groupId=${process.env
								.GROUP_ID!})`
						);

				case PlatformErrorCodes.ClanInviteAlreadyMember:
					return embed.setColor(colors.success).setAuthor({ name: "Вы уже участник клана", iconURL: icons.success });

				case PlatformErrorCodes.ClanTargetDisallowsInvites:
					return embed
						.setAuthor({ name: "Ошибка. Приглашение не отправлено", iconURL: icons.error })
						.setDescription(
							`На вашем аккаунте стоит запрет на получение приглашений в клан\nВы всё ещё можете вступить вручную через ${bungieNetUrl} или через участника клана в игре`
						);

				case PlatformErrorCodes.DestinyInternalError:
					return embed
						.setAuthor({ name: "Произошла ошибка на стороне Bungie", iconURL: icons.error })
						.setDescription(
							"Попробуйте перезайти в игру и удостоверится в том, что игра сейчас стабильна и корректно работает\n\nОшибка гласит о том, что Ваши данные не были обновлены до актуальной версии игры"
						);
				case PlatformErrorCodes.SystemDisabled:
					return embed
						.setAuthor({ name: "API в данный момент недоступно", iconURL: icons.error })
						.setDescription(
							`Попробуйте повторить попытку позже, или напишите в личные сообщения лидеру клана <@${process.env
								.OWNER_ID!}> ||(ему можно писать даже когда он не в сети)||`
						);

				default:
					console.error("[Error code: 1633]", code);
					return embed
						.setAuthor({ name: "Произошла неизвестная ошибка", iconURL: icons.error })
						.setDescription(
							`Администрация была оповещена об этой ошибке и при необходимости свяжется с Вами\n\n### Если Вы не получили приглашение в клан, то Вы можете вступить в него следующими способами:\n1. Написав лидеру клана в личные сообщения (лидер клана <@${process
								.env
								.OWNER_ID!}>)\n2. Вступив в клан через сайт ${bungieNetUrl}\n3. Вступив через любого участника в игре, который уже в нашем клане\n\nПо любым вопросам Вы можете написать <@${process
								.env.OWNER_ID!}> или <@${client.user.id}> в любое время без ограничений`
						);
					break;
			}
		}
	},
});

export default ButtonCommand;
