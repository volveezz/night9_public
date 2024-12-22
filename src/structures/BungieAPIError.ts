import { PlatformErrorCodes } from "bungie-api-ts/common.js";

class BungieAPIError extends Error {
	statusCode: number;
	statusText: string;
	errorCode?: PlatformErrorCodes;
	errorStatus?: string;
	constructor(message: string, statusCode: number, statusText: string, errorCode?: PlatformErrorCodes, errorStatus?: string) {
		super(message);
		this.name = "APIError";
		this.statusCode = statusCode;
		this.statusText = statusText;
		this.errorCode = errorCode;
		this.errorStatus = errorStatus;
	}
}

export default BungieAPIError;
