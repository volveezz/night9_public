import { PlatformErrorCodes } from "bungie-api-ts/common.js";
import { ButtonBuilder, ButtonStyle, EmbedBuilder, RESTJSONErrorCodes } from "discord.js";
import fetch from "node-fetch";
import Sequelize from "sequelize";
import { RegisterButtons } from "../configs/Buttons.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import BungieGrantType from "../interfaces/BungieGrantType.js";
import { RequestUpdateToken } from "../interfaces/RequestUpdateToken.js";
import tokenRefresher from "../structures/tokenRefresher.js";
import { getEndpointStatus, updateEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import setMemberRoles from "../utils/discord/setRoles.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { pause } from "../utils/general/utilities.js";
import { recentlyExpiredAuthUsersBungieIds } from "../utils/persistence/dataStore.js";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";
import { LeavedUsersData } from "../utils/persistence/sequelizeModels/leavedUsersData.js";

const BUNGIE_TOKEN_URL = "https://www.bungie.net/Platform/App/OAuth/Token/";
const { Op } = Sequelize;

export async function requestTokenRefresh({
	userId,
	table = AuthData,
	refresh_token,
}: RequestUpdateToken): Promise<BungieGrantType | null> {
	let refreshToken = refresh_token;
	if (!refreshToken) {
		if (table === AuthData) {
			refreshToken = (await AuthData.findByPk(userId, { attributes: ["refreshToken"] }))?.refreshToken;
		} else if (table === LeavedUsersData) {
			refreshToken = (await LeavedUsersData.findByPk(userId, { attributes: ["refreshToken"] }))?.refreshToken;
		}
	}

	if (!refreshToken) {
		console.error("[Error code: 1698]", userId, refreshToken);
		return null;
	}

	const form = new URLSearchParams(
		Object.entries({
			grant_type: "refresh_token",
			refresh_token: refreshToken!,
		})
	);

	const fetchRequest = await fetch(BUNGIE_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${process.env.AUTH!}`,
		},
		body: form,
	});

	const json = (await fetchRequest.json().catch((e) => {
		console.error("[Error code: 2117]", e, fetchRequest.status, fetchRequest.statusText);
	})) as BungieGrantType;

	if (!json) {
		throw fetchRequest;
	}

	return json;
}

async function bungieGrantRequest(row: AuthData | LeavedUsersData, retry: boolean = false) {
	try {
		const request = await requestTokenRefresh({ refresh_token: row.refreshToken });

		if (request?.access_token) {
			row.accessToken = request.access_token;
			row.refreshToken = request.refresh_token;
			await row.save();

			tokenRefresher.updateTokenRefreshTime();
		} else if ((request as any)?.error_description === "AuthorizationRecordExpired") {
			console.info(`${row.discordId}/${row.bungieId} authorization token has expiried`);
			handleAuthorizationRecordExpired(row);
		} else {
			handleRequestError(request, row, retry);
		}
	} catch (error: any) {
		console.error(`[Error code: 1744] Token refresher ${retry} for ${row.bungieId}\n`, error);

		if (error?.error_description === "SystemDisabled") {
			updateEndpointStatus("oauth", PlatformErrorCodes.SystemDisabled);
			return;
		}

		if (!retry) {
			bungieGrantRequest(row, true);
		}
	}
}

async function handleRequestError(request: any, row: AuthData | LeavedUsersData, retry: boolean) {
	if (request && request.error_description === "SystemDisabled") {
		updateEndpointStatus("oauth", PlatformErrorCodes.SystemDisabled);
		return;
	}

	if (retry === false) {
		console.error(`[Error code: 1745] First time error for ${row.discordId}/${row.bungieId} | ${request?.error_description}`);

		if (request && request.error_description === "SystemDisabled") {
			return;
		}

		bungieGrantRequest(row, true);
	} else {
		console.error(`[Error code: 1231] Second error in a row for ${row.discordId}/${row.bungieId}\n`, request);
		await handleSpecificError(request, row);
	}
}

async function handleSpecificError(request: any, row: AuthData | LeavedUsersData) {
	if (request.error_description === "AuthorizationRecordRevoked") {
		await handleAuthorizationRecordRevoked(row);
	} else if (request.error_description === "AuthorizationRecordExpired") {
		await handleAuthorizationRecordExpired(row);
	}
}

async function handleAuthorizationRecordRevoked(row: AuthData | LeavedUsersData) {
	const dbPromise = row.destroy();

	if (row instanceof LeavedUsersData) return;

	const memberPromise = client.getMember(row.discordId);

	const [member, _] = await Promise.all([memberPromise, dbPromise]);
	console.log(
		`The database row for (${row.discordId}) has been removed from the ${row instanceof AuthData ? "main table" : "secondary table"}`
	);

	setMemberRoles({
		member,
		roles: [member.roles.cache.has(process.env.KICKED!) ? process.env.KICKED! : process.env.NEWBIE!],
		reason: "User revoked access token",
	});

	const embed = new EmbedBuilder()
		.setColor(colors.warning)
		.setAuthor({ name: "Данные вашей авторизации были удалены", iconURL: icons.warning })
		.setDescription(
			"Вы отозвали права, выданные при регистрации. Рекомендуется повторно зарегистрироваться, в ином случае вам будет недоступен большая часть функционала сервера"
		);

	member
		.send({ embeds: [embed] })
		.catch((e) =>
			console.error(`[Error code: 2087] Cannot send the notification to ${nameCleaner(member.displayName)} since he closed his DM`, e)
		);
}

const REGISTER_BUTTON = new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success);

async function handleAuthorizationRecordExpired(row: AuthData | LeavedUsersData) {
	const { discordId, bungieId } = row;

	if (row instanceof AuthData) {
		recentlyExpiredAuthUsersBungieIds.add(bungieId);

		row.accessToken = null;
		row.refreshToken = null;

		const [member, _] = await Promise.all([client.getMember(discordId), row.save()]);

		console.log(`The authorization data for (${discordId}) has been removed from the main table because their token expired`);

		const components = addButtonsToMessage([REGISTER_BUTTON]);

		const embed = new EmbedBuilder()
			.setColor(colors.warning)
			.setAuthor({ name: "Необходима повторная регистрация", iconURL: icons.warning })
			.setDescription("У вашего авторизационного токена истек срок действия. Зарегистрируйтесь повторно");

		member.send({ embeds: [embed], components }).catch(async (e) => {
			if (e.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
				console.error("[Error code: 2086] Received unexpected error while sending message to user", e);
				return;
			}

			const botChannel = await client.getTextChannel(process.env.PUBLIC_BOT_CHANNEL_ID!);
			embed.setAuthor({
				name: `${nameCleaner(member.displayName)}`,
				iconURL: member.displayAvatarURL(),
			});
			botChannel.send({ embeds: [embed], components });
		});
	} else {
		await row.destroy();

		console.log(`The database row for (${discordId}) has been removed from the secondary table because their token expired.`);
	}
}

async function refreshTokens(table: "AuthData" | "LeavedUsersData") {
	if (getEndpointStatus("oauth") !== PlatformErrorCodes.Success) return;

	const attributes = ["discordId", "bungieId", "refreshToken"];
	const data =
		table === "AuthData"
			? await AuthData.findAll({
					attributes,
					where: {
						refreshToken: {
							[Op.ne]: null,
						},
					},
			  })
			: await LeavedUsersData.findAll({ attributes });

	for (const row of data) {
		try {
			await bungieGrantRequest(row, false);
			await pause(1000);
		} catch (error) {
			console.error("[Error code: 1242] Error during refreshing token of", row.bungieId, error);
		}
	}
}

async function tokenManagment() {
	await refreshTokens("AuthData");
	await refreshTokens("LeavedUsersData");

	// Use a separate function for the recursive setTimeout
	async function recursiveAuthDataTokenRefresh() {
		try {
			await refreshTokens("AuthData");
		} catch (error) {
			console.error("[Error code: 2085] Error during periodic token refresh:", error);
		} finally {
			setTimeout(recursiveAuthDataTokenRefresh, 1000 * 60 * 50);
		}
	}

	// Initialize the first call
	recursiveAuthDataTokenRefresh();
}

export default tokenManagment;
