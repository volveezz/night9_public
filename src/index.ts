import cookieParser from "cookie-parser";
import "dotenv/config";
import express, { Express } from "express";
import { join, resolve } from "path";
import { LFGController } from "./structures/LFGController.js";
import VoteSystem from "./structures/VoteSystem.js";
import { ExtendedClient } from "./structures/client.js";
import webHandler from "./utils/api/webHandler.js";
import calculateVoteResults from "./utils/discord/twitterHandler/twitterTranslationVotes.js";
import { forceUpdateUserActivity } from "./utils/discord/userActivityHandler.js";
import { interactionErrorResolver } from "./utils/errorHandling/interactionErrorResolver.js";
import { getOAuthTokens, getOAuthUrl, getUserData, updateMetadata } from "./utils/general/linkedRoles.js";
import { stopAllRaidReadinessCollectors } from "./utils/general/raidFunctions/raidReadiness/askUserRaidReadiness.js";
import saveDataToRedis from "./utils/general/redisData/saveDataToRedis.js";
import { redisClient } from "./utils/persistence/redis.js";
import { storeDiscordTokens } from "./utils/persistence/webStorage.js";

export const client = new ExtendedClient();

client.rest.on("rateLimited", (rateLimit) => {
	console.error(
		`Ratelimited for ${rateLimit.timeToReset} ms, route: ${rateLimit.route}${
			rateLimit.majorParameter ? `, parameter: ${rateLimit.majorParameter}` : ""
		}`
	);
	if (rateLimit.majorParameter) {
		console.error(rateLimit.method, rateLimit.url);
	}
});

process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);

async function handleExit(signal: NodeJS.Signals) {
	console.log(`Received ${signal}. Saving data...`);

	await Promise.allSettled([
		LFGController.getInstance().saveToDatabaseFlush(),
		VoteSystem.getInstance().flushSaveToDatabase(),
		forceUpdateUserActivity(),
		calculateVoteResults(),
		stopAllRaidReadinessCollectors(),
		saveDataToRedis(),
	]);

	await Promise.allSettled([client.destroy(), redisClient.quit()]);

	console.info("Data saved and the client had been shut down. Exiting from process...");

	process.exit(0);
}
process.on("uncaughtException", (error) => {
	console.error("UncaughtException at top level", error);
});
process.on("unhandledRejection", async (error: any, promise) => {
	if (error.interaction) {
		console.error("[Error code: 2057] Received an interaction error", error.interaction?.customId, error.interaction?.user?.id);
		if (error.deferred) await error.deferred;
		await interactionErrorResolver({ error: error.error, interaction: error.interaction, retryOperation: false });
		return;
	}

	if (error.code === "ECONNRESET") return console.error(`[Error code: 1060] ${error.code} ${error.name}`);
	if (error.code === "EPROTO") return console.error(`[Error code: 1061] ${error.code} ${error.name}`);
	if (error.code === "ETIMEDOUT") return console.error(`[Error code: 1102] ${error.code} ${error.name}`);
	if (error.statusCode >= 400 && error.statusCode <= 599) return console.error(`[Error code: 1214] ${error.statusCode}`);
	if (error.code >= 400 && error.code <= 599) return console.error(`[Error code: 1215] ${error.code}`);

	console.error("UnhandledRejection at top level", error.stack || error, promise);
});

const app: Express = express();
const port = process.env.PORT! || 3000;
const __dirname = resolve();

app.use(cookieParser(process.env.COOKIE_SECRET!));

app.get("/", async (req, res) => {
	if (
		req.query.code &&
		parseInt(req.query.code.length?.toString() || "0") > 20 &&
		req.query.state &&
		parseInt(req.query.state.length?.toString() || "0") > 20
	) {
		webHandler(req.query.code.toString(), req.query.state.toString(), res);
	} else res.status(404).send("Not found");
});

app.get("/verify", async (req, res) => {
	const { url, state } = getOAuthUrl();

	// Store the signed state param in the user's cookies so we can verify
	// the value later. See:
	// https://discord.com/developers/docs/topics/oauth2#state-and-security
	res.cookie("clientState", state, { maxAge: 1000 * 60 * 5, signed: true });

	// Send the user to the Discord owned OAuth2 authorization endpoint
	res.redirect(url);
});

/**
 * Route configured in the Discord developer console, the redirect Url to which
 * the user is sent after approving the bot for their Discord account. This
 * completes a few steps:
 * 1. Uses the code to acquire Discord OAuth2 tokens
 * 2. Uses the Discord Access Token to fetch the user profile
 * 3. Stores the OAuth2 Discord Tokens in Redis / Firestore
 * 4. Lets the user know it's all good and to go back to Discord
 */
app.get("/callback", async (req, res) => {
	try {
		// 1. Uses the code and state to acquire Discord OAuth2 tokens
		const code = req.query["code"];
		const discordState = req.query["state"];

		// make sure the state parameter exists
		const { clientState } = req.signedCookies;
		if (clientState !== discordState) {
			console.error("State verification failed");
			res.sendStatus(403);
			return;
		}

		const tokens = (await getOAuthTokens(code)) as any;

		// 2. Uses the Discord Access Token to fetch the user profile
		const meData = (await getUserData(tokens)) as any;
		const userId = meData.user.id;
		await storeDiscordTokens(userId, {
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token,
			expires_at: Date.now() + tokens.expires_in * 1000,
		});

		// 3. Update the users metadata, assuming future updates will be posted to the '/update-metadata' endpoint
		await updateMetadata(userId);

		// res.send("You did it! Now go back to Discord");
		res.send("<script>location.replace('index.html')</script>");
	} catch (e) {
		console.error(e);
		res.sendStatus(500);
	}
});
app.use(express.static(join(__dirname, "public")));
app.listen(port);
