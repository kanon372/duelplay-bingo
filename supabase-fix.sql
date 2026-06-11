-- =====================================================
-- 負荷対策: assign_bingo_card を FOR UPDATE SKIP LOCKED に更新
-- Supabase SQL Editor で実行してください
-- =====================================================

CREATE OR REPLACE FUNCTION assign_bingo_card(civ TEXT)
RETURNS bingo_cards
LANGUAGE plpgsql
AS $$
DECLARE
  selected_card bingo_cards;
BEGIN
  -- FOR UPDATE SKIP LOCKED: 同時リクエストが来ても別々のカードを確実に取得
  SELECT * INTO selected_card
  FROM bingo_cards
  WHERE civilization = civ
    AND assigned = FALSE
  ORDER BY id
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF selected_card.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE bingo_cards
  SET assigned = TRUE, assigned_at = NOW()
  WHERE id = selected_card.id;

  RETURN selected_card;
END;
$$;

-- =====================================================
-- インデックス追加（検索を高速化）
-- =====================================================

-- assign検索用: civilization + assigned の複合インデックス
CREATE INDEX IF NOT EXISTS idx_bingo_cards_civ_assigned
  ON bingo_cards (civilization, assigned)
  WHERE assigned = FALSE;

-- participant_stamps 検索用
CREATE INDEX IF NOT EXISTS idx_participant_stamps_participant_id
  ON participant_stamps (participant_id);

-- participants の primary_card_id 検索用（already UNIQUE だが念のため）
CREATE INDEX IF NOT EXISTS idx_participants_primary_card_id
  ON participants (primary_card_id);
