import { Embed } from "discord.js";
import { BungieTwitterAuthor } from "../configs/BungieTwitterAuthor.js";

export interface TwitterEmbedGeneratorProps {
	twitterData: string;
	author: BungieTwitterAuthor;
	icon: string | undefined;
	url: string | undefined;
	content?: string | undefined;
	originalEmbed?: Embed;
	images?: string[];
}

export const enum TwitterAccountNames {
	BungieHelp = "bungiehelp",
	Bungie = "bungie",
	DestinyTheGame = "destinythegame",
	Destiny2Team = "destiny2team",
}

export interface TwitterAccount {
	name: TwitterAccountNames;
	interval: number;
	rssUrl: string;
	latestTweetInfo?: LatestTweetInfo;
}

export interface LatestTweetInfo {
	link: string;
	pubDate: string;
}
