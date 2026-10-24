# GridWatch v1.1 — Release notes

## Added
- Smart Meter page with latest available reading, meter metadata, source labels, and reading history.
- Bills page with consumption, due dates, outstanding total, and simulated demo payment.
- GPS capture button in fault reporting; coordinates can be opened in a map from the complaint card.
- Demo meter reading and sample bill created by the seed script.
- Troubleshooting guide for sign-in “Failed to fetch”.

## Important boundaries
- Meter records are demo/manual unless a real authorized meter gateway is integrated. The UI does not claim live telemetry.
- “Pay demo bill” records a simulation only. No real payment is processed.
- GPS use requires browser permission and device location services.
