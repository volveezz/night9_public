import { Snowflake } from "discord.js";
import { TypedEmitter } from "tiny-typed-emitter";
import { RaidEventEvents } from "../../../interfaces/RaidReadiness.js";
import readinessSystemInstance from "../../../structures/RaidReadinessSystem.js";

class RaidEmitter extends TypedEmitter<RaidEventEvents> {
	constructor() {
		super();
	}
}

export const raidEmitter = new RaidEmitter();

raidEmitter.on("join", async (raidData, userId) => {
	const raidInfo = await defaultEmitFunction(raidData.id, userId);

	if (!raidInfo) return;

	raidInfo.readyMembers.add(userId);
	readinessSystemInstance.updateReadinessMessage(raidData.id);
});

raidEmitter.on("leave", async (raidData, userId) => {
	const raidInfo = await defaultEmitFunction(raidData.id, userId);

	if (!raidInfo) return;

	readinessSystemInstance.updateReadinessMessage(raidData.id);
});

async function defaultEmitFunction(raidId: number, userId: Snowflake) {
	const raidInfo = readinessSystemInstance.raidDetailsMap.get(raidId);

	if (!raidInfo) return;

	raidInfo.readyMembers.delete(userId);
	raidInfo.notReadyMembers.delete(userId);
	raidInfo.unmarkedMembers.delete(userId);
	raidInfo.lateMembers.delete(userId);

	raidInfo.lateReasons.delete(userId);

	return raidInfo;
}
