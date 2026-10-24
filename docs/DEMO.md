# Fifteen-minute walkthrough

| Time | Presenter action | Observable result |
| --- | --- | --- |
| 0:00–1:00 | Open `/welcome`, enter Admin, reset | One shared 14:10 clock, 900 flights and 180 screens |
| 1:00–2:30 | Show T1/T2 map, terminal/search filters and a screen inspector | Status, estimated density and persisted evidence are linked |
| 2:30–3:30 | Enable split screen; choose S124 | Toy ad, nearby flights and an offer QR |
| 3:30–4:30 | Inject +45m XY501 | Airline status changes, presence 233→420, dwell 52m, perfume selection |
| 4:30–5:30 | Open Why this ad | .86 perfume, .52 toys, .21 lounge rejected for placement; source references |
| 5:30–6:30 | Scan QR on phone or click for mobile page; claim and redeem | Separate scan/claim/use; retailer earns one redemption and 24 simulated units |
| 6:30–7:30 | Share a family code and try duplicate redemption | One linked code, same expiry; duplicate redemption rejected |
| 7:30–8:30 | Retailer → Campaigns → Create; choose targets/weights/budget | Live match preview and a persisted pending campaign |
| 8:30–9:30 | Media → Approvals; complete brand safety and approve | The campaign becomes eligible for subsequent screen decisions |
| 9:30–10:30 | Media → Inventory; book a suggested tomorrow slot | Reserved calendar cell, changed availability and spend |
| 10:30–11:30 | Retailer → Library; brief festive sweets, 20% | Editable bilingual offline template; save/reuse and A/B context |
| 11:30–12:30 | Airline → Flights / Messaging; inspect S126 | Delayed flight and automatically activated co-funded goodwill offer |
| 12:30–13:30 | Admin → Decision intelligence; inject stale evidence | Safe airport information replaces the unvalidated choice |
| 13:30–14:15 | Restore fresh evidence, inject gate change or screen outage | Affected catchments change; offline delivery stops; >5 simulated minutes creates incident |
| 14:15–15:00 | Play 60×; switch Hindi, portrait and roles | Shared time, four evaluations per real tick, responsive roles and bilingual signage |

Keep both devices on the same reachable network and configure `PUBLIC_BASE_URL` before the presentation. The offer clock is simulation time; do the phone segment while paused. Reset between presentations. Public HTTPS deployment is a remaining external step; no public link is claimed in this repository.
