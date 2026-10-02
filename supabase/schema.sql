-- 新規のSupabaseプロジェクトに丸ごと作るためのスキーマ（現行の最終形）。
-- 既存DBへの変更は supabase/migrations/ の差分を使う。
-- アプリは service role キーでサーバー側からのみDBに触る（RLS有効・公開ロールの権限なし）。

CREATE TABLE IF NOT EXISTS public.bingo_cards (
  id             integer PRIMARY KEY,
  civilization   text    NOT NULL CHECK (civilization IN ('光', '水', '火', '自然', '闇')),
  cells          text[]  NOT NULL,                       -- 25要素。'FREE' またはカードID文字列
  assigned       boolean NOT NULL DEFAULT false,
  assigned_at    timestamptz,
  participant_id integer                                 -- 所有者（未配布は NULL）
);

CREATE TABLE IF NOT EXISTS public.participants (
  id              serial PRIMARY KEY,                    -- 参加者番号（表示用）
  token           uuid   NOT NULL DEFAULT gen_random_uuid(),  -- 秘密トークン（本人確認用）
  primary_card_id integer UNIQUE REFERENCES public.bingo_cards (id),  -- 旧仕様の名残（未使用）
  created_at      timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS participants_token_key ON public.participants (token);

ALTER TABLE public.bingo_cards
  ADD CONSTRAINT bingo_cards_participant_id_fkey
  FOREIGN KEY (participant_id) REFERENCES public.participants (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.participant_stamps (
  id             serial PRIMARY KEY,
  participant_id integer NOT NULL UNIQUE REFERENCES public.participants (id),
  stamp_ad       boolean DEFAULT false,
  stamp_nd       boolean DEFAULT false,
  stamp_rental   boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bingo_cards_participant ON public.bingo_cards (participant_id);
CREATE INDEX IF NOT EXISTS idx_bingo_cards_civ_free ON public.bingo_cards (civilization) WHERE participant_id IS NULL;

-- ---------------------------------------------------------------
-- 4. カード取得: 枚数・スタンプ条件の検証と配布を1トランザクションで行う
--    同じ参加者の同時リクエストは participants の行ロックで直列化される
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_bingo_card(p_civ text, p_participant integer)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_owned    integer;
  v_required integer;
  v_stamps   integer;
  v_card     bingo_cards;
BEGIN
  PERFORM 1 FROM participants WHERE id = p_participant FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_participant');
  END IF;

  SELECT count(*) INTO v_owned FROM bingo_cards WHERE participant_id = p_participant;
  IF v_owned >= 3 THEN
    RETURN jsonb_build_object('status', 'full');
  END IF;

  -- 1枚目:0個 / 2枚目:2個 / 3枚目:3個
  v_required := CASE v_owned WHEN 0 THEN 0 WHEN 1 THEN 2 ELSE 3 END;

  SELECT coalesce(stamp_ad::int, 0) + coalesce(stamp_nd::int, 0) + coalesce(stamp_rental::int, 0)
    INTO v_stamps
    FROM participant_stamps WHERE participant_id = p_participant;
  v_stamps := coalesce(v_stamps, 0);

  IF v_stamps < v_required THEN
    RETURN jsonb_build_object('status', 'stamp_required', 'required', v_required, 'current', v_stamps);
  END IF;

  SELECT * INTO v_card
    FROM bingo_cards
   WHERE civilization = p_civ AND participant_id IS NULL
   ORDER BY random()
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'sold_out');
  END IF;

  UPDATE bingo_cards
     SET participant_id = p_participant, assigned = true, assigned_at = now()
   WHERE id = v_card.id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'card', jsonb_build_object('id', v_card.id, 'civilization', v_card.civilization)
  );
END;
$$;

-- ---------------------------------------------------------------
-- 5. 参加者番号の振り直し（管理画面のリセット用・service role のみ）
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_participant_sequence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER SEQUENCE participants_id_seq RESTART WITH 1;
END;
$$;

-- ---------------------------------------------------------------
-- 6. RLS有効化 + 公開ロールの権限を全て剥奪
--    ポリシーを作らないので anon / authenticated は何も読み書きできない
-- ---------------------------------------------------------------
ALTER TABLE public.bingo_cards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_stamps ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.bingo_cards, public.participants, public.participant_stamps
  FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.claim_bingo_card(text, integer)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_participant_sequence()      FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bingo_card(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_participant_sequence()     TO service_role;

-- ===============================================================
-- 段階2: 出たカード・ビンゴ申告（supabase/migrations/20261002010000_phase2_game.sql と同じ）
-- ===============================================================

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
