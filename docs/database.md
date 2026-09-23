# Database Model — VisionHub AI (MVP)

Database: **PostgreSQL**

## Main entities

### `cameras`

| Field              | Type           | Description                                                                                                                                               |
| ------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                 | UUID (PK)      | Camera identifier                                                                                                                                         |
| name               | TEXT           | Camera name/location (e.g. "Main gate")                                                                                                                   |
| location           | TEXT           | Location description                                                                                                                                      |
| active             | BOOLEAN        | Whether the camera is under monitoring                                                                                                                    |
| referenceImagePath | TEXT, nullable | Local path of a still reference image, used as a backdrop to draw `areas`; served through `GET /cameras/:id/reference-image`, never exposed as a raw path |
| createdAt          | TIMESTAMP      | Registration date                                                                                                                                         |

### `areas`

Pure geometry, with no `active` flag (unlike `cameras`/`rules`/`users`): nothing else references an area, so it can be deleted
outright instead of soft-deleted. There is no FK from `rules` to `areas` — the two are linked only by a shared `type`, matched
at detection time (a camera can have more than one area of the same type).

| Field    | Type                   | Description                                                                                                      |
| -------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| id       | UUID (PK)              | Area identifier                                                                                                  |
| cameraId | UUID (FK → cameras.id) | Camera the area belongs to                                                                                       |
| type     | TEXT                   | `restricted` \| `sensitive` \| `noParking` \| `parkingLot` \| `trash`                                            |
| polygon  | JSONB                  | Area outline as normalized `{x, y}` points (0–1, independent of the reference image's display size); 3–20 points |

### `rules`

One rule per (`cameraId`, `eventType`) — enforced by a unique index; configuring a rule is an upsert
(`PUT /cameras/:id/rules/:eventType`), not a plain insert.

| Field            | Type                   | Description                                                                                                                           |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| id               | UUID (PK)              | Rule identifier                                                                                                                       |
| cameraId         | UUID (FK → cameras.id) | Associated camera                                                                                                                     |
| eventType        | TEXT                   | `gateOpen` \| `occupancy` \| `restrictedArea` \| `abandonedObject` \| `illegalParking` \| `childRunning` \| `petWaste` \| `other`     |
| timeLimitSeconds | INTEGER, nullable      | Required for `gateOpen`, `occupancy`, `abandonedObject`, `illegalParking`; must be absent for the other event types (app-level check) |
| active           | BOOLEAN                | Whether the rule is active                                                                                                            |

Whether an event type also needs a matching `areas.type` (and which one) is listed in `backend/src/lib/event-types.ts`
(mirrored in `frontend/src/lib/eventTypes.ts`, since the two apps don't share a package):

| eventType         | needs an area of type | needs `timeLimitSeconds` |
| ----------------- | --------------------- | ------------------------ |
| `gateOpen`        | —                     | yes                      |
| `occupancy`       | `sensitive`           | yes                      |
| `restrictedArea`  | `restricted`          | no                       |
| `abandonedObject` | —                     | yes                      |
| `illegalParking`  | `noParking`           | yes                      |
| `childRunning`    | `parkingLot`          | no                       |
| `petWaste`        | `trash`               | no                       |
| `other`           | —                     | no                       |

### `events`

One row per fused event, upserted by the finalization pass (`(cameraId, type, occurredAt)` is UNIQUE — its key). An
update from a later finalization run never touches `status`, so a status the user set is preserved across a segment
reprocess or a rule edit. For auto-generated events, `startedAt` and `occurredAt` hold the same value (kept as two
columns for history/compatibility — see Notes).

| Field                | Type                              | Description                                                                                                            |
| -------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| id                   | UUID (PK)                         | Event identifier                                                                                                       |
| cameraId             | UUID (FK → cameras.id)            | Camera where the event occurred                                                                                        |
| type                 | TEXT                              | Type of detected event                                                                                                 |
| status               | TEXT                              | `pending` \| `inProgress` \| `resolved`; default `pending`, set by the user                                            |
| technicalDescription | TEXT                              | Raw description generated by the rules layer (finalization), e.g. "Portão aberto detectado por 4 min (confiança 82%)." |
| startedAt            | TIMESTAMP                         | Event start                                                                                                            |
| endedAt              | TIMESTAMP                         | Event end (when applicable)                                                                                            |
| segmentId            | UUID (FK → segments.id), nullable | Segment the event was first detected in                                                                                |
| occurredAt           | TIMESTAMP, nullable               | Real-world time of the detection (segment `startedAt` + offset inside the video)                                       |
| confidence           | FLOAT, nullable                   | Highest detection confidence contributing to the fused event                                                           |
| thumbnailPath        | TEXT, nullable                    | Object key of the event thumbnail (MinIO)                                                                              |
| clipPath             | TEXT, nullable                    | Object key of the compressed event clip (MinIO); cleared when the clip retention expires                               |
| createdAt            | TIMESTAMP                         | System registration date                                                                                               |

### `detectionIntervals`

Passo A's output (per segment): raw detections already resolved to an event type and merged into a state interval — the
material the finalization pass (Passo B) fuses across segments. Replaced (deleted + recreated) every time the segment
is (re)processed; never read outside the same batch's finalization.

| Field         | Type                    | Description                                                                     |
| ------------- | ----------------------- | ------------------------------------------------------------------------------- |
| id            | UUID (PK)               | Interval identifier                                                             |
| segmentId     | UUID (FK → segments.id) | Segment this interval came from                                                 |
| eventType     | TEXT                    | Event type this interval could contribute to (area containment already applied) |
| startSec      | FLOAT                   | Interval start, seconds inside the segment's video                              |
| endSec        | FLOAT                   | Interval end, seconds inside the segment's video                                |
| touchesStart  | BOOLEAN                 | Whether the interval reaches the segment's very start (within tolerance)        |
| touchesEnd    | BOOLEAN                 | Whether the interval reaches the segment's very end (within tolerance)          |
| maxConfidence | FLOAT                   | Highest confidence among the detections merged into this interval               |
| createdAt     | TIMESTAMP               | Creation date                                                                   |

### `alerts`

| Field   | Type                                       | Description                                 |
| ------- | ------------------------------------------ | ------------------------------------------- |
| id      | UUID (PK)                                  | Alert identifier                            |
| eventId | UUID (FK → events.id, `ON DELETE CASCADE`) | Event that originated the alert             |
| sentAt  | TIMESTAMP                                  | Sending time                                |
| viewed  | BOOLEAN                                    | Whether the alert was seen in the dashboard |

### `dailySummaries`

| Field          | Type                                           | Description                                  |
| -------------- | ---------------------------------------------- | -------------------------------------------- |
| id             | UUID (PK)                                      | Summary identifier                           |
| referenceDate  | DATE                                           | Day the summary refers to                    |
| generatedText  | TEXT                                           | Natural-language summary generated by the AI |
| recordingDayId | UUID (FK → recordingDays.id, UNIQUE), nullable | Batch the summary was generated from         |
| createdAt      | TIMESTAMP                                      | Generation date                              |

The summary is generated when the `recordingDay` becomes `completed`.

### `recordingDays`

A batch: **1 camera + 1 day**. Composed of several `segments`.

| Field     | Type                   | Description                                                       |
| --------- | ---------------------- | ----------------------------------------------------------------- |
| id        | UUID (PK)              | Batch identifier                                                  |
| cameraId  | UUID (FK → cameras.id) | Camera the recordings belong to                                   |
| date      | DATE                   | Day covered by the recordings                                     |
| status    | TEXT                   | `pending` \| `processing` \| `completed` \| `partial` \| `failed` |
| createdBy | UUID (FK → users.id)   | User who created the batch                                        |
| createdAt | TIMESTAMP              | Creation date                                                     |
| updatedAt | TIMESTAMP              | Last update                                                       |

`(cameraId, date)` is UNIQUE. The batch is `completed` when all its segments are `completed`, `partial` when some are `failed`.

### `segments`

One recording file (DVRs export pieces of 15 min to 1 h). Each segment is an independent queue job.

| Field             | Type                         | Description                                                                                                                                  |
| ----------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| id                | UUID (PK)                    | Segment identifier                                                                                                                           |
| recordingDayId    | UUID (FK → recordingDays.id) | Batch the segment belongs to                                                                                                                 |
| sourceType        | TEXT                         | `upload` \| `link`                                                                                                                           |
| sourceRef         | TEXT                         | Source URL (`link`) or original file name (`upload`)                                                                                         |
| storagePath       | TEXT, nullable               | Local file path relative to the storage root; set once the file is stored (immediately for uploads, after the worker downloads it for links) |
| fileHash          | TEXT, nullable               | File hash, filled once received (idempotency)                                                                                                |
| startedAt         | TIMESTAMP                    | Real-world start time of the recording, as informed by the síndico                                                                           |
| durationSec       | INTEGER, nullable            | Video duration in seconds (ffprobe)                                                                                                          |
| metadataStartedAt | TIMESTAMP, nullable          | Start time read from the file's own metadata (ffprobe `creation_time`), when present                                                         |
| warning           | TEXT, nullable               | Non-blocking notice, e.g. `startedAt` differs from `metadataStartedAt` by more than `START_TIME_MISMATCH_MIN`                                |
| status            | TEXT                         | `received` \| `processing` \| `completed` \| `failed`                                                                                        |
| attempts          | INTEGER                      | Number of processing attempts                                                                                                                |
| error             | TEXT, nullable               | Last failure reason (short, safe text), or a note such as "Duplicate of segment …, skipped" on a completed segment                           |
| createdAt         | TIMESTAMP                    | Creation date                                                                                                                                |
| updatedAt         | TIMESTAMP                    | Last update                                                                                                                                  |

### `users`

| Field        | Type          | Description                         |
| ------------ | ------------- | ----------------------------------- |
| id           | UUID (PK)     | User identifier                     |
| name         | TEXT          | User name                           |
| email        | TEXT (UNIQUE) | Login email                         |
| passwordHash | TEXT          | Hashed password                     |
| role         | TEXT          | `manager` \| `employees` \| `admin` |

## Relationships (summary)

```
cameras 1 ── N areas
cameras 1 ── N rules
cameras 1 ── N events
cameras 1 ── N recordingDays
users 1 ── N recordingDays (createdBy)
recordingDays 1 ── N segments
recordingDays 1 ── 0..1 dailySummaries
segments 1 ── N events
segments 1 ── N detectionIntervals
events 1 ── N alerts
```

> `dailySummaries` is generated from an aggregate query over the day's `events` + a call to the language model, once the `recordingDay` is `completed`. `recordingDayId` links the summary to its batch (nullable for summaries not tied to a batch).

## Notes

- All tables must have an `id UUID` primary key (`genRandomUuid()`).
- An index on `events(cameraId, startedAt)` is recommended for period-based history queries; `events(segmentId)` and `segments(recordingDayId, startedAt)` support batch progress and timeline queries.
- `segments(recordingDayId, fileHash)` is UNIQUE so re-sending the same file does not duplicate events (PostgreSQL allows multiple NULL hashes until the file is received).
- `events.segmentId`, `occurredAt`, `confidence`, `thumbnailPath` and `clipPath` are nullable so events created before the batch model remain valid.
- `rules(cameraId, eventType)` is UNIQUE: one configured rule per event type per camera.
- `events(cameraId, type, occurredAt)` is UNIQUE: the finalization pass's upsert key. `startedAt` and `occurredAt` are
  historically two separate columns (`occurredAt` was added later to record the real-world detection time precisely);
  auto-generated events set both to the same value rather than removing either column.
- `detectionIntervals` exists only to feed the same batch's finalization; it is never read by any other feature and is
  fully replaced on every (re)processing of its segment.
- Videos are never stored in the database. Only event clips and thumbnails are kept (in object storage), and clips are deleted after the retention period; events and thumbnails are kept.
- This model covers only the MVP (condominium module). Future modules should reuse `events`, `alerts` and `rules`, adapting only `eventType` and the interpretation logic.
