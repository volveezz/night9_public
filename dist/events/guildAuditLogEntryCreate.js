import { AuditLogEvent } from "discord.js";
import { Event } from "../structures/event.js";
export default new Event("guildAuditLogEntryCreate", async (auditLog) => {
    console.debug(`Received audit log for message delete event. Action type: ${auditLog.action}`);
    const { action, executorId, target, targetId } = auditLog;
    if (action !== AuditLogEvent.MessageDelete)
        return;
    console.debug(`Received audit log for message delete event`);
    console.debug(`Audit log: ${JSON.stringify(auditLog)}`);
});
//# sourceMappingURL=guildAuditLogEntryCreate.js.map