# Evidence, scoring and metric semantics

## Presence

For every relevant departure, dwell is `max(0, estimated departure − now − 20 minutes)`. Presence contribution is `pax × clamp(dwell / 45, 0, 1)` inside the two-hour zone catchment. Queue measurements attenuate that total within a bounded factor. Segment shares and dwell are passenger-contribution-weighted aggregates. Gate assignments determine the zone; a gate change removes/introduces contributions in the old/new zones. Forecast charts use upcoming departure totals in fifteen-minute buckets.

Every result includes the five-minute window, method version, flight IDs, queue IDs, original timestamps, replay receipt timestamps and estimated/confidence labels. Demographics and trip purposes are seeded route/time heuristics; they are not measured passenger identities. Shares from different dimensions (for example holiday and family) overlap and need not sum together to 100%.

## Eligibility and business rules

Approval, creative approval, brand safety, pause, stock, schedule, zones/screens/gates, destination, international share, crowd, dwell, delay trigger, total budget, daily cap and per-screen daily frequency are hard filters. A screen outage suppresses delivery. Degraded screens halve modeled exposure.

Own-airline boarding messages receive priority after hard filters. Delay goodwill has priority on its designated third gate screen; S124 remains the worked-example commercial screen. A valid reserved booking is preferred among eligible candidates. Manual pins require an audit reason and cannot make an ineligible campaign eligible. Competitor separation rejects a different campaign in the previous category; it does not treat a campaign as its own competitor. Remaining ties use deterministic score order.

## Score

```text
match = clamp(weighted segment overlap × documented campaign affinity, 0, 1)
reach = clamp(estimated present / 840, 0, 1)
dwell = clamp(estimated dwell minutes / 100, 0, 1)
conversion = clamp(prior + min(0.1, live redemptions / live impressions), 0, 1)
base = 0.6×match + 0.1×reach + 0.1×dwell + 0.1×conversion + 0.1×yield
score = round(clamp((base + bounded deterministic exploration) × trigger boost, 0, 1), 2)
```

The fixture's campaign-specific affinity calibration is a disclosed regression model, not a general claim about retail performance. The example's three campaigns disable exploration so the reference ranking stays reproducible. Other screens use a small deterministic exploration term bounded by the configured global exploration rate.

At Gate 42 after XY501 receives a 45-minute delay, XY501 contributes 240 passengers at 55 minutes dwell; ZQ88 contributes 180 at 48 minutes. Weighted dwell is 52 minutes; presence is 420. Fixture profiles produce holiday .58, family .31, business .22 and international audience segment .57.

| Candidate | Match | Reach | Dwell | Prior | Yield | Boost | Score |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Perfume C1 | .71 | .50 | .52 | .203333333333 | .25 | 1.5 | .86 |
| Toys C2 | .49 | .50 | .52 | .78 | .46 | 1 | .52 |
| Lounge C3 | .18 | .50 | .52 | 0 | 0 | 1 | .21, placement-ineligible |

Before the delay, C1's trigger fails; C2 plays. No screen is assigned a hardcoded winner. Tests compute the entire result through the engine.

## Independent validation

`validateProposal` independently recomputes a candidate's score and verifies hard eligibility, trusted adapter identity, the existence of supporting flights, passenger/capacity consistency, zone consistency, parseable source timestamps and simulation-relative freshness. Missing, stale, contradictory or unverifiable inputs reject delivery of the proposed campaign and select approved airport information. The evidence lab injects each failure mode reproducibly; separate tests tamper actual scores and stored source records.

The audit record persists the candidate list, all rejected reasons, factors, boost, versions, audience snapshot, source references, creative, fallback reason, override reason and booking reference. UI views show the winner plus the strongest relevant alternatives, including the placement-rejected lounge in the worked example.

## Metrics and attribution

- **Ad play:** a screen delivery during a real domain slot or explicit event re-plan. Offline screens contribute none; approved airport information can count as a delivered play.
- **Impression:** `round(ZonePresence × .025)` per delivered slot, halved on a degraded screen. This is estimated exposure, not a unique person.
- **Scan:** a QR landing event. A broadcast QR issues an anonymous individual claim token; family tokens remain linked to their originating code.
- **Claim:** acceptance of an available, eligible, unexpired offer. It is distinct from purchase or use.
- **Redemption:** one validated use of a claimed token. A transaction prevents duplicate use. Previously claimed offers remain valid to their recorded expiry unless approval/stock availability changes.
- **Attributed revenue:** each completed demo redemption contributes exactly **24 reporting units**. This is a mock transaction rule, not proven retail sales.
- **Operator revenue today:** delivered commercial-slot charges (current-day media spend), distinct from the retailer's redemption-attributed purchase value. Future reservations appear as committed revenue in the inventory workspace.
- **Conversion:** redemptions divided by estimated impressions. Scan-to-claim values remain separate and visible.
- **Spend:** delivered commercial slots cost up to .12 units each; reservations cost the quoted slot price and reduce campaign budget. Current-day served-spend analytics exclude historical seed rows; booking commitments are visible separately in inventory/campaign spend.
- **ROI:** `(attributed revenue − activity spend) / activity spend`, zero when spend is zero.
- **A/B:** physical screen parity assigns seeded alternate English/Hindi headline variants. Activity and offer transactions carry the variant; the library compares stored exposure and conversion. It is a simple deterministic cohort comparison, not a randomized causal experiment.

Tomorrow's recommendations generate a date-specific synthetic forward schedule with bounded time/demand variation and rerun zone presence at candidate hours. They check screen health, approval, schedule, placement, budget, crowd/dwell and audience constraints, then rank fit × predicted exposure / price. Delay-triggered recommendations are conditional, stated in the explanation. They are forecasts, not measured future traffic.
