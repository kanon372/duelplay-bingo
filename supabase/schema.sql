-- bingo_cardsテーブル
CREATE TABLE IF NOT EXISTS bingo_cards (
  id          integer PRIMARY KEY,
  civilization text NOT NULL CHECK (civilization IN ('光', '水', '火', '自然', '闇')),
  cells       text[] NOT NULL,
  assigned    boolean NOT NULL DEFAULT false,
  assigned_at timestamptz
);

-- RLSを無効化（イベント用公開アプリのため）
ALTER TABLE bingo_cards DISABLE ROW LEVEL SECURITY;

-- インデックス（文明別未配布カードの検索を高速化）
CREATE INDEX IF NOT EXISTS idx_bingo_cards_civ_unassigned
  ON bingo_cards (civilization, assigned)
  WHERE assigned = false;

-- カード割り当てRPC（競合防止のためFOR UPDATE SKIP LOCKEDを使用）
CREATE OR REPLACE FUNCTION assign_bingo_card(civ text)
RETURNS bingo_cards AS $$
DECLARE
  card bingo_cards;
BEGIN
  SELECT * INTO card
  FROM bingo_cards
  WHERE civilization = civ AND assigned = false
  ORDER BY random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE bingo_cards
  SET assigned = true, assigned_at = now()
  WHERE id = card.id
  RETURNING * INTO card;

  RETURN card;
END;
$$ LANGUAGE plpgsql;

-- カードを未配布に戻すRPC
CREATE OR REPLACE FUNCTION unassign_bingo_card(card_id integer)
RETURNS void AS $$
BEGIN
  UPDATE bingo_cards
  SET assigned = false, assigned_at = null
  WHERE id = card_id;
END;
$$ LANGUAGE plpgsql;

-- 全カードリセットRPC
CREATE OR REPLACE FUNCTION reset_all_cards()
RETURNS void AS $$
BEGIN
  UPDATE bingo_cards
  SET assigned = false, assigned_at = null;
END;
$$ LANGUAGE plpgsql;
