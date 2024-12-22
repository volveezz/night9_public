export default interface BungieGrantType {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	refresh_expires_in: number;
	membership_id: string;
	error?: string;
}

export interface LoggableTokenResponse extends Omit<BungieGrantType, "access_token" | "refresh_token"> {
	access_token?: string;
	refresh_token?: string;
}
