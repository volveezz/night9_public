const blockedChannels: string[] = [
	"1107688692916686858",
	"1107688598595194951",
	"1107688497772494889",
	"1107688267387764796",
	"1158272399297482822",
	"1158267376572321813",
	"1158260630562803724",
	"1158259785217626152",
	"1158259139944919041",
	"677551388514844682",
	"941971466679889940",
];

export function isUserCanSendMessageInChannel(channelId: string, hasPermission: boolean = true): boolean {
	return blockedChannels.includes(channelId) && !hasPermission;
}
