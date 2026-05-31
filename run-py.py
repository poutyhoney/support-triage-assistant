import asyncio
import json
import os
import sys

# Add py/ to the path so each module can be imported directly by name.
# This mirrors how Node resolves ./js/ and ./ts/ without package prefixes.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "py"))

from models import Ticket
from triage import triage_ticket, TriageSuccess


async def main() -> None:
    sample_ticket = Ticket(
        subject="Outbound SMS webhooks not firing",
        body=(
            "Hi, since yesterday our outbound SMS messages are sending fine "
            "(customers are receiving them) but we're not getting any status callback "
            "webhooks for delivered/failed events. Our endpoint hasn't changed. "
            "This is affecting our reporting dashboard for our support team."
        ),
    )

    outcome = await triage_ticket(sample_ticket)

    if isinstance(outcome, TriageSuccess):
        # outcome.result is a Pydantic model — .model_dump() converts it to a plain dict
        print(f"✓ Triaged successfully in {outcome.attempts} attempt(s):\n")
        print(json.dumps(outcome.result.model_dump(), indent=2))
    else:
        print(f"✗ Triage failed ({outcome.reason}):")
        print(outcome.last_errors)


if __name__ == "__main__":
    asyncio.run(main())
