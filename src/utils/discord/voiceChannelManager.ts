import { ChannelType, Collection, VoiceBasedChannel, VoiceChannel, VoiceState } from "discord.js";
import { channelDataMap } from "../persistence/dataStore.js";
import { VoiceChannels } from "../persistence/sequelizeModels/voiceChannels.js";

const managedVoiceChannelIds = new Set<string>();
const ignoredCategories = new Set([process.env.ADMIN_CATEGORY!, process.env.TECHNICAL_CATEGORY!]);

const romanNumbers = ["𝐈", "𝐈𝐈", "𝐈𝐈𝐈", "𝐈𝐕", "𝐕", "𝐕𝐈", "𝐕𝐈𝐈", "𝐕𝐈𝐈𝐈", "𝐈𝐗", "𝐗"];

async function loadChannels() {
	const channels = await VoiceChannels.findAll();
	for (const channel of channels) {
		managedVoiceChannelIds.add(channel.channelId);
	}
}
loadChannels();

async function manageVoiceChannels(oldState: VoiceState, newState: VoiceState) {
	const oldChannel = oldState.channel;
	const newChannel = newState.channel;

	// Handle the case when a user leaves a channel
	if (oldChannel?.parentId && !ignoredCategories.has(oldChannel.parentId)) {
		// Get the parent category channels
		const parentChannels = oldChannel.parent!.children.cache.filter((channel) => channel.type === ChannelType.GuildVoice) as Collection<
			string,
			VoiceChannel
		>;
		if (!parentChannels) return;

		// Check if all channels have no members
		const allChannelsEmpty = parentChannels.every((channel) => channel.members.size === 0);

		// If all channels are empty, delete the created channels
		if (allChannelsEmpty) {
			parentChannels.forEach(async (channel) => {
				if (managedVoiceChannelIds.has(channel.id)) {
					await removeChannel(channel);
				}
			});
		}

		// If the old channel has no members and it's not a base channel, delete it
		else if (managedVoiceChannelIds.has(oldChannel.id) && oldChannel.members.size === 0) {
			const emptyChannels = parentChannels.filter((channel) => channel.members.size === 0);
			// Sort the channels based on their numerals to find the highest numbered empty channel
			const sortedEmptyChannels = emptyChannels.sort((a, b) => {
				const numeralA = a.name.match(/[𝐈𝐕𝐗]+$/)?.[0] || "𝐈";
				const numeralB = b.name.match(/[𝐈𝐕𝐗]+$/)?.[0] || "𝐈";
				return romanNumbers.indexOf(numeralA) - romanNumbers.indexOf(numeralB);
			});
			const highestEmptyChannel = sortedEmptyChannels.at(sortedEmptyChannels.size - 1);
			if (emptyChannels.size > 1) {
				await removeChannel(highestEmptyChannel || oldChannel);
			}
		}
	}

	// Handle the case when a user joins a channel
	if (newChannel?.parent && !ignoredCategories.has(newChannel.parentId!) && !channelDataMap.has(newChannel.id)) {
		let categoryChannels = newChannel.parent.children.cache.filter((channel) => channel.type === ChannelType.GuildVoice);
		if (categoryChannels.size >= 10) return;

		// Check if all channels have at least one member
		const allChannelsFilled = categoryChannels.every((channel) => channel.members.size > 0);

		if (!allChannelsFilled) return;

		// Create a map of all numerals in the current channels
		// const numeralsInUse = new Map<string, boolean>();
		const numeralsInUse = new Set<string>();
		for (const channel of categoryChannels.values()) {
			const numeral = channel.name.match(/[𝐈𝐕𝐗]+$/)?.[0] || "𝐈";
			numeralsInUse.add(numeral);
		}
		// categoryChannels.forEach((channel) => {
		// 	const numeral = channel.name.match(/[𝐈𝐕𝐗]+$/);
		// 	if (numeral) {
		// 		numeralsInUse.set(numeral[0], true);
		// 	} else if (!managedVoiceChannelIds.has(channel.id)) {
		// Base channels don't have numerals
		// 		numeralsInUse.set("𝐈", true);
		// 	}
		// });

		// Find the lowest available roman numeral
		let numeral = "𝐈";
		for (const roman of romanNumbers) {
			if (!numeralsInUse.has(roman)) {
				numeral = roman;
				break;
			}
		}

		numeralsInUse.clear();

		if (categoryChannels.size === 1 && numeral === "𝐈") {
			numeral = "𝐈𝐈";
		}

		const nameWithoutEmoji = newChannel.name.split("｜")[1];
		const baseName = (nameWithoutEmoji || newChannel.name).replace(/[𝐈𝐕𝐗]+$/, "").trim();
		const firstEmoji = Array.from(newChannel.name)[0];
		const emoji = getCategoryEmoji(newChannel.parentId!, firstEmoji);
		const newChannelName = `${emoji}｜${baseName} ${numeral}`;

		const channel = await newChannel.guild.channels.create({
			name: newChannelName,
			type: ChannelType.GuildVoice,
			parent: newChannel.parent,
			reason: "Users have filled all existing channels",
		});

		managedVoiceChannelIds.add(channel.id);
		await VoiceChannels.create({ channelId: channel.id }, { returning: false });
	}
}

async function removeChannel(channel: VoiceBasedChannel) {
	// Prevent base channels from being deleted
	if (!managedVoiceChannelIds.has(channel.id)) return;

	channel.delete();
	managedVoiceChannelIds.delete(channel.id);
	VoiceChannels.destroy({ where: { channelId: channel.id } });
}

function getCategoryEmoji(categoryId: string, emoji?: string) {
	let emojis;

	switch (categoryId) {
		case process.env.MAIN_VOICE_CATEGORY!:
			emojis = ["🔰", "🔶", "🔷", "🔹", "💦", "🧊", "⚓️"];
			break;
		case process.env.RAID_CATEGORY!:
			emojis = ["🏥", "💪", "🩸", "🪖", "💥", "🥩"];
			break;
		case process.env.PVE_PARTY_CATEGORY!:
			emojis = ["🦞", "🐸", "🦖", "🐲", "🌪"];
			break;
		default:
			emojis = ["🌐", "🪢", "💧", "🥂", "🍷", "🍸"];
	}

	if (emoji) {
		emojis = emojis.filter((e) => e !== emoji);
	}
	const randomIndex = Math.floor(Math.random() * emojis.length);

	return emojis[randomIndex];
}

export default manageVoiceChannels;
