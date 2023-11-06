import pkg from "lodash";
import { VotingDatabase } from "../utils/persistence/sequelizeModels/votingDatabase.js";
const { debounce } = pkg;
class VoteSystem {
    static instance;
    votingData = new Map();
    saveToDatabaseDebounced;
    constructor() {
        this.saveToDatabaseDebounced = debounce(this.saveToDatabase.bind(this), 5 * 60 * 1000);
    }
    static getInstance() {
        if (!VoteSystem.instance) {
            VoteSystem.instance = new VoteSystem();
        }
        return VoteSystem.instance;
    }
    flushSaveToDatabase() {
        this.saveToDatabaseDebounced.flush();
    }
    async init() {
        const voteRecords = await VotingDatabase.findAll();
        for (const voteRecord of voteRecords) {
            const { channelId, messageId, creatorId } = voteRecord;
            const votes = new Map();
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
    async saveToDatabase() {
        await VotingDatabase.destroy({ where: {} });
        for (const [uniqueId, voteData] of this.votingData) {
            const { channelId, messageId, creatorId } = voteData;
            const voteOptions = [];
            for (const [voteOption, voteOptionSet] of voteData.votes) {
                voteOptions.push({ option: voteOption, discordIds: Array.from(voteOptionSet) });
            }
            await VotingDatabase.create({ uniqueId, multiVote: voteData.multiVote, votes: voteOptions, channelId, messageId, creatorId });
        }
    }
    removePreviousVote(uniqueId, discordId) {
        const voteData = this.votingData.get(uniqueId);
        if (!voteData) {
            throw new Error(`No vote found with uniqueId ${uniqueId}`);
        }
        for (const voteOptionSet of voteData.votes.values()) {
            voteOptionSet.delete(discordId);
        }
    }
    vote({ discordId, uniqueId, voteOption }) {
        const voteData = this.votingData.get(uniqueId);
        if (!voteData) {
            throw new Error(`No vote found with uniqueId ${uniqueId}`);
        }
        const { multiVote, votes } = voteData;
        if (!multiVote) {
            this.removePreviousVote(uniqueId, discordId);
        }
        let voteOptionSet = votes.get(voteOption);
        if (!voteOptionSet) {
            voteOptionSet = new Set();
            votes.set(voteOption, voteOptionSet);
        }
        if (voteOptionSet.has(discordId)) {
            voteOptionSet.delete(discordId);
        }
        else {
            voteOptionSet.add(discordId);
        }
        this.saveToDatabaseDebounced();
        return this.getVoteCounts(uniqueId);
    }
    addVote(uniqueId, multiVote, messageId, creatorId, channelId) {
        if (this.votingData.has(uniqueId)) {
            throw new Error(`Vote with uniqueId ${uniqueId} already exists`);
        }
        const votes = new Map();
        this.votingData.set(uniqueId, {
            multiVote: multiVote,
            votes,
            messageId,
            creatorId,
            channelId,
        });
    }
    getVoteCounts(uniqueId) {
        const voteData = this.votingData.get(uniqueId);
        if (!voteData) {
            throw new Error(`No vote found with uniqueId ${uniqueId}`);
        }
        const voteCounts = {};
        for (const [voteOption, voteOptionSet] of voteData.votes) {
            voteCounts[voteOption] = voteOptionSet.size;
        }
        return voteCounts;
    }
}
export default VoteSystem;
//# sourceMappingURL=VoteSystem.js.map