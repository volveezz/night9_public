import { AwaitModalSubmitOptions, CacheType, CommandInteraction, MessageComponentInteraction, ModalSubmitInteraction } from "discord.js";

const activeModals = new Map<string, symbol>();

async function createModalCollector(
	ineraction: MessageComponentInteraction | CommandInteraction,
	options: AwaitModalSubmitOptions<ModalSubmitInteraction<CacheType>>
) {
	const modalId = Symbol();
	const userId = ineraction.user.id;
	activeModals.set(userId, modalId);

	const result = await ineraction.awaitModalSubmit(options);

	// The result has been received, now we check if it is from the active modal.
	if (activeModals.get(userId) === modalId) {
		activeModals.delete(userId);
		return result;
	}
}

export default createModalCollector;
