import { EmbedBuilder, Message } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { pause } from "../general/utilities.js";

const notifiedUsers = new Set<string>();
let recentlyNotified = false;

async function blockChannelMessage(message: Message<boolean>): Promise<void> {
	const { channel, author } = message;

	setTimeout(() => message.delete().catch((_) => null), 1000 * 5);

	if (notifiedUsers.has(author.id)) return;

	notifiedUsers.add(author.id);

	if (recentlyNotified) return;
	recentlyNotified = true;

	const notifyEmbed = new EmbedBuilder()
		.setColor(colors.warning)
		.setAuthor({ name: "В этом канале нельзя отправлять сообщения!", iconURL: icons.warning });

	if (message.channelId === process.env.RAID_CHANNEL_ID!) {
		notifyEmbed.setDescription(
			"По всем вопросам, связанным с рейдом, обращайтесь в уникальный канал для этого рейда, который создается автоматически для каждого существующего рейда.\nДоступ к каналу вы получите после присоединения к рейду как его участник или как возможный участник."
		);
	} else if (message.channelId === process.env.PVE_PARTY_CHANNEL_ID!) {
		notifyEmbed.setDescription(
			`В этом канале можно отправлять лишь сообщения, относящиеся к созданию сборов.\nПо вопросам создания сборов обращайтесь к <@${process
				.env.OWNER_ID!}>\nПо вопросам созданных сборов обращайтесь к создателю сбора`
		);
	} else {
		notifyEmbed.setDescription("В этом канале нельзя отправлять сообщения. Сама возможность отправки есть для удобства ввода команд");
	}

	const notifyMessage = channel.isSendable() && (await channel.send({ embeds: [notifyEmbed] }));

	if (notifyMessage) {
		await pause(1000 * 10);
		await notifyMessage.delete().catch((_) => null);

		recentlyNotified = false;
	} else {
		console.error("[Error code: 2122] User's channel isn't sendable.", author.id);
	}
}

export default blockChannelMessage;
