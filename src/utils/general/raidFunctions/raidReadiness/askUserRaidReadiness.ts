import {
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CacheType,
	ComponentType,
	EmbedBuilder,
	InteractionCollector,
	RESTJSONErrorCodes,
	Snowflake,
} from "discord.js";
import { RaidReadinessButtons } from "../../../../configs/Buttons.js";
import colors from "../../../../configs/colors.js";
import icons from "../../../../configs/icons.js";
import { client } from "../../../../index.js";
import { default as readinessInstance, default as readinessSystemInstance } from "../../../../structures/RaidReadinessSystem.js";
import kickMemberFromRaid from "../../../discord/raid/kickMemberFromRaid.js";
import { RaidEvent } from "../../../persistence/sequelizeModels/raidEvent.js";
import { addButtonsToMessage } from "../../addButtonsToMessage.js";
import nameCleaner from "../../nameClearer.js";
import getRaidEventData from "../getRaidEventData.js";
import { raidEmitter } from "../raidEmitter.js";

const { GUILD_ID, RAID_CHANNEL_ID } = process.env;

const generateEmbed = ({ raid, id, messageId }: RaidEvent) => {
	return [
		new EmbedBuilder()
			.setColor(colors.deepBlue)
			.setAuthor({
				name: `Проверка готовности к рейду ${id}-${raid}`,
				iconURL: icons.mark,
				url: `https://discord.com/channels/${GUILD_ID}/${RAID_CHANNEL_ID}/${messageId}`,
			})
			.setDescription("Подтвердите, что вы готовы к рейду, который начнётся через час"),
	];
};

const components = [
	new ButtonBuilder().setCustomId(RaidReadinessButtons.WillBeReady).setLabel("Буду готов к началу").setStyle(ButtonStyle.Success),
	new ButtonBuilder().setCustomId(RaidReadinessButtons.WillBeLate).setLabel("Немного опоздаю").setStyle(ButtonStyle.Secondary),
	new ButtonBuilder().setCustomId(RaidReadinessButtons.WontBeReady).setLabel("Не смогу прийти").setStyle(ButtonStyle.Danger),
];

raidEmitter.on("deleted", (raidData) => {
	const collectors = raidCollectors.get(raidData.id);
	if (!collectors) return;
	collectors.forEach((collector) => collector.stop());
});

export async function stopAllRaidReadinessCollectors() {
	raidCollectors.forEach((perRaidCollectors) => {
		perRaidCollectors.forEach((perUserCollector) => perUserCollector.stop());
	});
}

const raidCollectors = new Map<number, InteractionCollector<ButtonInteraction<CacheType>>[]>();
const notifiedUsersAboutClosedDM = new Set<string>();

export async function askRaidReadinessNotification(discordId: Snowflake, raidId: RaidEvent["id"]) {
	const member = client.getCachedMembers().get(discordId) || (await client.getMember(discordId));

	const raidEventData = await getRaidEventData(raidId);

	if (!raidEventData) {
		console.error("[Error code: 1985] Raid wasn't found", raidId);
		return;
	}

	if (!raidEventData.joined.includes(discordId)) {
		console.error("[Error code: 1995] User wasn't found in raid", raidId, discordId);
		return;
	}

	const embeds = generateEmbed(raidEventData);

	const message = await member.send({ embeds, components: addButtonsToMessage(components) }).catch(async (e) => {
		if (e.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
			const errorEmbed = new EmbedBuilder()
				.setColor(colors.error)
				.setAuthor({ name: `${nameCleaner(member.displayName)}, откройте свои личные сообщения` })
				.setDescription(
					"Поскольку у вас закрыты личные сообщения, вы не можете получить системное оповещение о готовности к рейду, и поэтому считаетесь неготовым участником"
				);
			const raidChannel = client.getCachedTextChannel(raidEventData.channelId) || (await client.getTextChannel(raidEventData.channelId));
			raidChannel.send({ embeds: [errorEmbed] });
			notifiedUsersAboutClosedDM.add(discordId);
			setTimeout(async () => {
				const updatedRaidData = await RaidEvent.findOne({ where: { id: raidId }, attributes: ["id", "time"] });
				if (updatedRaidData?.time !== raidEventData.time) return;
				askRaidReadinessNotification(discordId, raidId);
			}, 60 * 1000 * 5);
		} else {
			console.error("[Error code: 1986]", e);
		}
	});

	if (!message) return;

	const collectorTime = raidEventData.time * 1000 - Date.now();

	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		filter: (i) => i.user.id === discordId,
		time: collectorTime,
	});

	if (!raidCollectors.has(raidId)) {
		raidCollectors.set(raidId, []);
		await readinessInstance.updateReadinessMessage(raidId);
	}

	const raidCollectorsArray = raidCollectors.get(raidId);
	if (raidCollectorsArray) {
		raidCollectorsArray.push(collector);
	}

	collector.on("collect", (i) => {
		readinessSystemInstance.setUserReadinessStatus({ button: i.customId as RaidReadinessButtons, discordId, raidId });

		const authorFieldName = `Вы подтвердили свою ${
			i.customId === RaidReadinessButtons.WontBeReady ? "неготовность к рейду и были исключены с него" : "готовность к рейду"
		}`;

		const readinessReplyEmbed = new EmbedBuilder().setColor(colors.success).setAuthor({
			name: authorFieldName,
			iconURL: icons.success,
		});

		if (i.customId === RaidReadinessButtons.WontBeReady) {
			kickMemberFromRaid({ kickedMember: i.user, cachedRaidEvent: raidEventData });
		}

		if (i.customId === RaidReadinessButtons.WillBeLate) {
			const components = [
				new ButtonBuilder()
					.setCustomId(RaidReadinessButtons.ModalLateReason + `_${raidId}`)
					.setLabel("Указать причину и время опоздания")
					.setStyle(ButtonStyle.Secondary),
			];
			i.reply({ embeds: [readinessReplyEmbed], components: addButtonsToMessage(components), ephemeral: true });
			return;
		}

		i.reply({ embeds: [readinessReplyEmbed], ephemeral: true });
	});

	collector.on("end", (_, r) => {
		message.delete();
		if (raidCollectorsArray) {
			const index = raidCollectorsArray.indexOf(collector);
			if (index !== -1) {
				raidCollectorsArray.splice(index, 1);
			}
		}
	});
}
