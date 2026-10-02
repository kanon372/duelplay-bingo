-- 段階2: 出たカードの管理・ビンゴ申告（最速ビンゴの順位づけ）
--   * draws        : ゲーム内のパックから「出たカード」（全参加者共通）。運営が入力する
--   * game_state   : ゲーム全体の設定（受付中/終了、景品の人数）。常に1行
--   * bingo_claims : お客さんのビンゴ申告。申告順(seq)がそのまま順位になる
--   * claim_bingo  : 申告の受付。サーバー側で「本当にそろっているか」を自動判定する
--   アプリは service role キーでサーバー側からのみ触る（RLS有効・公開ロールの権限なし）

-- ---------------------------------------------------------------
-- 1. ゲーム設定（1行のみ）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_state (
  id                        integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status                    text    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  prize_limit               integer NOT NULL DEFAULT 1 CHECK (prize_limit >= 1),
  one_prize_per_participant boolean NOT NULL DEFAULT true,
  updated_at                timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.game_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 2. 出たカード（カードIDは bingo_cards.cells の要素と同じ文字列）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.draws (
  card_no  text PRIMARY KEY,
  seq      bigserial NOT NULL,
  drawn_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- 3. ビンゴ申告
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bingo_claims (
  id             serial PRIMARY KEY,
  participant_id integer NOT NULL REFERENCES public.participants (id) ON DELETE CASCADE,
  card_id        integer NOT NULL UNIQUE REFERENCES public.bingo_cards (id) ON DELETE CASCADE,
  lines          integer NOT NULL,                       -- 申告時点でそろっていたライン数
  seq            integer NOT NULL UNIQUE,                -- 受付順（小さいほど早い）
  status         text    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  claimed_at     timestamptz NOT NULL DEFAULT clock_timestamp(),
  decided_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_bingo_claims_participant ON public.bingo_claims (participant_id);

-- ---------------------------------------------------------------
-- 4. ビンゴ申告の受付
--    game_state の行ロックで申告を直列化するので、受付順(seq)は必ず一意に決まる。
--    カードの所有者・ゲーム受付中・ラインがそろっているかを全てここで検証する。
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_bingo(p_participant integer, p_card integer)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_game     game_state;
  v_cells    text[];
  v_drawn    text[];
  v_lines    integer;
  v_existing bingo_claims;
  v_seq      integer;
  v_id       integer;
  -- 横5・縦5・斜め2（1始まりの配列添字）
  c_lines constant integer[] := ARRAY[
    1,2,3,4,5,   6,7,8,9,10,   11,12,13,14,15,   16,17,18,19,20,   21,22,23,24,25,
    1,6,11,16,21, 2,7,12,17,22, 3,8,13,18,23,   4,9,14,19,24,   5,10,15,20,25,
    1,7,13,19,25, 5,9,13,17,21
  ];
  i integer;
  j integer;
  v_all boolean;
BEGIN
  SELECT * INTO v_game FROM game_state WHERE id = 1 FOR UPDATE;
  IF v_game.status <> 'open' THEN
    RETURN jsonb_build_object('status', 'closed');
  END IF;

  SELECT cells INTO v_cells FROM bingo_cards WHERE id = p_card AND participant_id = p_participant;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_owner');
  END IF;

  -- すでに申告済み（このカード、または1人1回の設定なら同じ参加者の別カード）
  SELECT * INTO v_existing FROM bingo_claims
   WHERE card_id = p_card
      OR (v_game.one_prize_per_participant AND participant_id = p_participant AND status <> 'rejected')
   ORDER BY seq LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'already', 'claimId', v_existing.id, 'cardId', v_existing.card_id);
  END IF;

  SELECT coalesce(array_agg(card_no), ARRAY[]::text[]) INTO v_drawn FROM draws;

  v_lines := 0;
  FOR i IN 0..11 LOOP
    v_all := true;
    FOR j IN 1..5 LOOP
      IF NOT (v_cells[c_lines[i * 5 + j]] = 'FREE' OR v_cells[c_lines[i * 5 + j]] = ANY (v_drawn)) THEN
        v_all := false;
        EXIT;
      END IF;
    END LOOP;
    IF v_all THEN v_lines := v_lines + 1; END IF;
  END LOOP;

  IF v_lines = 0 THEN
    RETURN jsonb_build_object('status', 'not_bingo');
  END IF;

  SELECT coalesce(max(seq), 0) + 1 INTO v_seq FROM bingo_claims;
  INSERT INTO bingo_claims (participant_id, card_id, lines, seq)
  VALUES (p_participant, p_card, v_lines, v_seq)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status', 'ok', 'claimId', v_id, 'cardId', p_card, 'lines', v_lines, 'seq', v_seq);
END;
$$;

-- ---------------------------------------------------------------
-- 5. RLS有効化 + 公開ロールの権限を全て剥奪
-- ---------------------------------------------------------------
ALTER TABLE public.game_state   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bingo_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.game_state, public.draws, public.bingo_claims FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.claim_bingo(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bingo(integer, integer) TO service_role;
