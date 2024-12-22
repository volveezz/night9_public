import { DestinyProfileResponse } from "bungie-api-ts/destiny2/interfaces.js";

const minActiveScore = 2000;

const checkRequirements = (userProfile: DestinyProfileResponse) => {
	let message = "";
	let allRequirementsMet = true;

	const userActiveScore = userProfile.profileRecords.data!.activeScore;

	if (userActiveScore < minActiveScore) {
		message += `Вы не подходите по следующим требованиям:\n - Минимальный счёт активных триумфов (минимум ${minActiveScore}, у вас: ${userActiveScore})\n`;
		allRequirementsMet = false;
	}

	return { allRequirementsMet, message };
};

export default checkRequirements;
