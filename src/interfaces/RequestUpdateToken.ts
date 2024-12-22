import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";
import { LeavedUsersData } from "../utils/persistence/sequelizeModels/leavedUsersData.js";

export interface RequestUpdateToken {
	userId?: string;
	table?: typeof AuthData | typeof LeavedUsersData;
	refresh_token?: string | null;
}
