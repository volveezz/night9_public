import { VoteSystemVoteParams } from "VoteSystem.js";
import pkg, { DebouncedFunc } from "lodash";
import { VotingDatabase } from "../utils/persistence/sequelizeModels/votingDatabase.js";
// @ts-ignore
const { debounce } = pkg;

class VoteSystem {
	private static instance: VoteSystem;
	private votingData = new Map<
		string,
		{ multiVote: boolean; votes: Map<number, Set<string>>; channelId: string; messageId: string; creatorId: string }
	>();
	private saveToDatabaseDebounced: DebouncedFunc<() => Promise<void>>;

	private constructor() {
		this.saveToDatabaseDebounced = debounce(this.saveToDatabase.bind(this), 5 * 60 * 1000);
	}

	public static getInstance(): VoteSystem {
		if (!VoteSystem.instance) {
			VoteSystem.instance = new VoteSystem();
		}

		return VoteSystem.instance;
	}

	public flushSaveToDatabase() {
		// console.debug(`Received a call. Beginning of vote database synchronization");
		this.saveToDatabaseDebounced.flush();
	}

	public async init() {
		const voteRecords = await VotingDatabase.findAll();
		for (const voteRecord of voteRecords) {
			const { channelId, messageId, creatorId } = voteRecord;
			const votes = new Map<number, Set<string>>();
			for (const voteOption of voteRecord.votes) {
				votes.set(voteOption.option, new Set(voteOption.discordIds));
			}
			this.votingData.set(voteRecord.uniqueId, {
				multiVote: voteRecord.multiVote,
				votes,
				channelId,
				creatorId,
				messageId,
			});
		}
	}

	private async saveToDatabase() {
		// Clear database
		await VotingDatabase.destroy({ where: {} });

		// Push current local data to the database
		for (const [uniqueId, voteData] of this.votingData) {
			const { channelId, messageId, creatorId } = voteData;
			const voteOptions: { option: number; discordIds: string[] }[] = [];
			for (const [voteOption, voteOptionSet] of voteData.votes) {
				voteOptions.push({ option: voteOption, discordIds: Array.from(voteOptionSet) });
			}
			await VotingDatabase.create({ uniqueId, multiVote: voteData.multiVote, votes: voteOptions, channelId, messageId, creatorId });
		}
	}

	private removePreviousVote(uniqueId: string, discordId: string) {
		const voteData = this.votingData.get(uniqueId);
		if (!voteData) {
			throw new Error(`No vote found with uniqueId ${uniqueId}`);
		}
		for (const voteOptionSet of voteData.votes.values()) {
			voteOptionSet.delete(discordId);
		}
	}

	public vote({ discordId, uniqueId, voteOption }: VoteSystemVoteParams) {
		const voteData = this.votingData.get(uniqueId);
		if (!voteData) {
			throw new Error(`No vote found with uniqueId ${uniqueId}`);
		}

		const { multiVote, votes } = voteData;

		if (!multiVote) {
			// If multiVote is not allowed, remove the user's previous vote (if any)
			this.removePreviousVote(uniqueId, discordId);
		}

		let voteOptionSet = votes.get(voteOption);
		if (!voteOptionSet) {
			voteOptionSet = new Set();
			votes.set(voteOption, voteOptionSet);
		}

		// If the user has already voted for this option, remove the vote; otherwise, add it.
		if (voteOptionSet.has(discordId)) {
			voteOptionSet.delete(discordId);
		} else {
			voteOptionSet.add(discordId);
		}

		this.saveToDatabaseDebounced();

		return this.getVoteCounts(uniqueId);
	}

	public addVote(uniqueId: string, multiVote: boolean, messageId: string, creatorId: string, channelId: string) {
		if (this.votingData.has(uniqueId)) {
			throw new Error(`Vote with uniqueId ${uniqueId} already exists`);
		}

		const votes = new Map<number, Set<string>>();
		this.votingData.set(uniqueId, {
			multiVote: multiVote,
			votes,
			messageId,
			creatorId,
			channelId,
		});
	}

	public getVoteCounts(uniqueId: string) {
		const voteData = this.votingData.get(uniqueId);
		if (!voteData) {
			throw new Error(`No vote found with uniqueId ${uniqueId}`);
		}

		const voteCounts: { [voteOption: number]: number } = {};
		for (const [voteOption, voteOptionSet] of voteData.votes) {
			voteCounts[voteOption] = voteOptionSet.size;
		}

		return voteCounts;
	}
}

export default VoteSystem;
