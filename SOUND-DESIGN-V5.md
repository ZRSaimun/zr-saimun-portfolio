# Portal Open-World Sound Design V5

The existing soundscape covers the portfolio, aircraft, weather and basic car feedback. The open-world portal milestone needs these additional, short, loopable, locally licensed effects:

## Portal transition

- `portal-hum-loop.mp3` — low dimensional gateway tone while approaching a photograph
- `portal-charge.mp3` — rising energy as the car crosses the trigger threshold
- `glass-impact-heavy.mp3` — close, physical windscreen impact
- `glass-shards-wide.mp3` — stereo fragment burst during the camera-through-glass transition
- `world-arrival-whoosh.mp3` — transition whoosh into the destination world

## Driving and surface response

- `tyre-gravel.mp3` — gravel shoulder and side-road tyres
- `tyre-snow-crunch.mp3` — packed snow tyre loop
- `tyre-ice-slip.mp3` — brief low-grip skid
- `puddle-splash.mp3` — rain puddle impact
- `road-junction-pass.mp3` — subtle road/intersection pass-by bed
- `suspension-bump.mp3` — soft body movement over uneven roads
- `handbrake-slide.mp3` — optional controlled slide effect

## Tromsø world ambience

- `arctic-wind-gust.mp3` — one-shot gust with stereo movement
- `snowfall-close.mp3` — close snow particle texture
- `distant-fjord.mp3` — quiet open-water/shore ambience
- `mountain-wind.mp3` — distant ridge wind layer
- `winter-town-bed.mp3` — sparse lights, distant traffic and town presence

## Exploration and discovery

- `district-unlock.mp3` — new streamed district becomes available
- `landmark-discover.mp3` — landmark/photo discovery confirmation
- `gps-route-confirm.mp3` — route selection confirmation
- `gps-recalculate.mp3` — route changed after a turn
- `photo-mode-shutter.mp3` — camera capture sound
- `world-exit.mp3` — voluntary return through the portal

## Mix rules

- Keep portal and discovery effects on the effects bus.
- Keep engine and tyre loops on the vehicle bus.
- Keep snow, fjord, mountain and town beds on the ambience bus.
- Do not fetch remote audio at runtime; every file must be locally licensed and decoded by `npm run check`.
- Keep user “Sound off” and reduced-motion behaviour authoritative.

