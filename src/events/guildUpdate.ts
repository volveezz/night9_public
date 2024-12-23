import { EmbedBuilder, Guild, TextChannel } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import nameCleaner from "../utils/general/nameClearer.js";

let guildChannel: TextChannel | null = null;

export default new Event("guildUpdate", async (oldGuild, newGuild) => {
	const embed = new EmbedBuilder().setColor(colors.default).setAuthor({
		name: "Сервер обновлен",
	});

	if (oldGuild.name !== newGuild.name) {
		embed.addFields({
			name: "Название сервера обновлено",
			value: `${oldGuild.name} → ${newGuild.name}`,
		});
	}

	if (oldGuild.icon !== newGuild.icon) {
		embed.addFields({
			name: "Иконка обновлена",
			value: `[До изменения](${oldGuild.iconURL() || "https://natribu.org/"}) → [После](${
				newGuild.iconURL() || "https://natribu.org/"
			})`,
		});
	}

	if (oldGuild.premiumTier !== newGuild.premiumTier) {
		embed.addFields({
			name: "Статус буста сервера обновлен",
			value: `\`${oldGuild.premiumTier}\` → \`${newGuild.premiumTier}\``,
		});
	}

	if (oldGuild.ownerId !== newGuild.ownerId) {
		embed.addFields({
			name: "Владелец сервера обновлен",
			value: `${nameCleaner((await newGuild.fetchOwner()).displayName, true)}`,
		});
	}

	// Handle any other changes to guild objects
	const guildChanges = [];
	const oldGuildEntries = Object.entries(oldGuild);
	const newGuildEntries = Object.entries(newGuild);
	for (const [key, value] of oldGuildEntries) {
		if (newGuildEntries.find(([k, v]) => k === key && v !== value)) {
			if (key === "features") {
				try {
					// @ts-ignore
					const beforeChanges = value.filter((v: any) => !newGuild[key as keyof Guild]!.includes(v));
					// @ts-ignore
					const afterChanges = newGuild[key as keyof Guild].filter((v) => !value.includes(v));
					if ((beforeChanges.length === 0 && afterChanges.length === 0) || (!beforeChanges && !afterChanges)) continue;

					const removedKeys = beforeChanges.map((k: string) => `❌${k}`).join("\n");
					const addedKeys = afterChanges.map((k: string) => `✅${k}`).join("\n");

					const changeDetails = [removedKeys, addedKeys].filter((detail) => detail.length > 0).join("\n");

					guildChanges.push({
						name: "Features обновлены",
						value: changeDetails,
					});
				} catch (e) {
					console.error("[Error code: 1655]", e);
				}
				continue;
			} else if (key === "systemChannelFlags") {
				try {
					const systemObject = JSON.stringify(value);
					const systemObjectUpdated = JSON.stringify(newGuild[key]);

					if (systemObject == systemObjectUpdated) continue;

					guildChanges.push({ name: "systemChannelFlags обновлены", value: `${systemObject} → ${systemObjectUpdated}` });
				} catch (error) {
					console.error("[Error code: 1658]", error);
				}
				continue;
			}
			guildChanges.push({
				name: `${key} обновлено`,
				value: `${value} → ${newGuild[key as keyof Guild]}`,
			});
		}
	}
	if (guildChanges.length > 0) {
		embed.addFields(guildChanges);
	}

	if (!guildChannel)
		guildChannel =
			client.getCachedTextChannel(process.env.GUILD_CHANNEL_ID!) || (await client.getTextChannel(process.env.GUILD_CHANNEL_ID!));

	await guildChannel.send({ embeds: [embed] });
});
