import { triageTicket } from "./ts/triage.js";
import type { Ticket }  from "./ts/types.js";

const sampleTicket: Ticket = {
  subject: "Outbound SMS webhooks not firing",
  body: `Hi, since yesterday our outbound SMS messages are sending fine (customers are
receiving them) but we're not getting any status callback webhooks for delivered/failed
events. Our endpoint hasn't changed. This is affecting our reporting dashboard for our
support team.`,
};

const outcome = await triageTicket(sampleTicket);

if (outcome.ok) {
  console.log(`✓ Triaged successfully in ${outcome.attempts} attempt(s):\n`);
  console.log(JSON.stringify(outcome.result, null, 2));
} else {
  console.error(`✗ Triage failed (${outcome.reason}):`);
  console.error(outcome.lastErrors);
}
