-- Reserve set positions and scenario identities atomically across browser tabs.
-- Existing accounts, attempts and questions are retained unchanged.
ALTER TABLE platform_questions ADD COLUMN slot_index INTEGER;
ALTER TABLE platform_questions ADD COLUMN scenario_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS platform_question_daily_slot
 ON platform_questions(student_id,date,slot_index) WHERE slot_index IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS platform_question_set_scenario
 ON platform_questions(student_id,date,(slot_index / 20),scenario_id)
 WHERE slot_index IS NOT NULL AND scenario_id IS NOT NULL;
