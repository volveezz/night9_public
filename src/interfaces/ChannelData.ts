import { Message, Snowflake, VoiceChannel } from "discord.js";

export interface LfgEvent {
	members: string[];
	channelMessage: Message;
	voiceChannel: VoiceChannel;
	isDeletable: boolean;
	creator: Snowflake;
}
