# Default Durations

Loaded by the app at startup as the defaults. Edit the mm:ss column, or use
"Save as default file" on the Config tab (open the site with ?instructor=1)
to regenerate this file. It lives in public/defaults.md.

## In-flight Timings

|  NM | To touchdown (mm:ss) |
| --: | -------------------: |
|  80 |                16:00 |
|  60 |                12:00 |
|  40 |                10:00 |
|  25 |                 8:00 |
|  20 |                 6:00 |
|  10 |                 3:00 |
|   7 |                 2:30 |
|   5 |                 2:00 |

## Ground Phases

| id          | Phase                          | Duration (mm:ss) |
| ----------- | ------------------------------ | ---------------: |
| pushback    | Start Push → Push Complete     |             3:00 |
| taxi        | Start Taxi → TWY P             |             1:00 |
| twy_p_f     | TWY P → TWY F                  |             1:00 |
| twy_f_hp    | TWY F → Holding Point          |             2:00 |
| hp_lineup   | Holding Point → Line Up        |             1:00 |
| lineup_roll | Line Up → Rolling for Take-off |             0:30 |

## Circuit Phases

| id        | Phase                | Duration (mm:ss) |
| --------- | -------------------- | ---------------: |
| upwind    | Upwind → Crosswind   |             1:00 |
| crosswind | Crosswind → Downwind |             1:00 |
| downwind  | Downwind → Base      |             1:00 |
| base      | Base → Final         |             0:45 |
| final     | Final → Touchdown    |             0:45 |
| touchdown | Touchdown → Upwind   |             0:30 |

## Break Phases

| id      | Phase           | Duration (mm:ss) |
| ------- | --------------- | ---------------: |
| initial | Initial → Break |             1:00 |
| turn180 | 180° Turn       |             1:30 |
| base    | Base Leg        |             0:30 |
| landing | Landing         |             1:00 |
