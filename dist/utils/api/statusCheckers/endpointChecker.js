import { pause } from "../../general/utilities.js";
import { checkEndpointStatus } from "./endpointStatusChecker.js";
import { endpointCheckers, updateEndpointStatus } from "./statusTracker.js";
export async function startEndpointCheck(endpoint) {
    try {
        while (true) {
            await pause(1000 * 60);
            const status = await checkEndpointStatus(endpoint);
            updateEndpointStatus(endpoint, status);
            if (status === 1) {
                console.info(`\x1b[32mEndpoint ${endpoint} is now available\x1b[0m`);
                break;
            }
        }
    }
    finally {
        endpointCheckers[endpoint] = undefined;
    }
}
//# sourceMappingURL=endpointChecker.js.map