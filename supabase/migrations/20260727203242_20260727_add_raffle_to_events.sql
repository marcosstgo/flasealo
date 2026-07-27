/*
  # Add Raffle (Sorteo) Fields to Events

  ## Summary
  Adds optional raffle functionality to events. By default all events have raffle
  disabled. Organizers can activate the raffle mode per event, define a prize, and
  trigger the draw manually. The system randomly selects a winning photo (weighted
  naturally by upload count — more uploads = more chances).

  ## Changes

  ### Modified Table: `events`
  - `raffle_enabled` (boolean, default false): whether the raffle mode is active for this event
  - `raffle_prize` (text, nullable): description of the prize the winner receives
  - `raffle_winner_name` (text, nullable): uploader name of the drawn winner
  - `raffle_winner_photo_id` (uuid, nullable): ID of the winning photo
  - `raffle_drawn_at` (timestamptz, nullable): timestamp of when the draw was made

  ## Notes
  - All new columns are nullable (except raffle_enabled which defaults to false)
    so existing events are unaffected.
  - No RLS changes needed — the events table already has appropriate policies.
  - The draw is performed from the frontend by querying a random approved photo.
    More photos from the same uploader = more chances (natural weighting).
*/

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS raffle_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS raffle_prize text,
  ADD COLUMN IF NOT EXISTS raffle_winner_name text,
  ADD COLUMN IF NOT EXISTS raffle_winner_photo_id uuid,
  ADD COLUMN IF NOT EXISTS raffle_drawn_at timestamptz;
