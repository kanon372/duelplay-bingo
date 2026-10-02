-- 段階1: 安全性の修正
--   * 参加者に秘密トークンを導入（参加者番号だけでは本人確認できないため）
--   * カードの所有者(participant_id)をサーバー側で管理
--   * カード取得をDB関数 claim_bingo_card に一本化（枚数・スタンプ条件を原子的に検証）
--   * RLS有効化: anon / authenticated から全テーブル・関数へのアクセスを遮断
--     （アプリは service role キーを使うサーバー側APIからのみDBに触る）

-- ---------------------------------------------------------------
-- 1. 参加者: 秘密トークン
-- ---------------------------------------------------------------
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS participants_token_key ON public.participants (token);

-- 1参加者が複数カードを持つため、primary_card_id は必須ではなくなる
ALTER TABLE public.participants ALTER COLUMN primary_card_id DROP NOT NULL;

-- ---------------------------------------------------------------
-- 2. カード: 所有者
-- ---------------------------------------------------------------
ALTER TABLE public.bingo_cards
  ADD COLUMN IF NOT EXISTS participant_id integer
  REFERENCES public.participants (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bingo_cards_participant ON public.bingo_cards (participant_id);

-- 既存データの引き継ぎ: 旧仕様では participants.primary_card_id が「その参加者の最初のカード」だった。
-- 新仕様の所有者(participant_id)に反映する（何度流しても同じ結果になる）。
UPDATE public.bingo_cards c
   SET participant_id = p.id
  FROM public.participants p
 WHERE p.primary_card_id = c.id
   AND c.participant_id IS NULL;

-- 未配布カードの検索用（文明別）。旧インデックス idx_bingo_cards_civ_unassigned / _civ_assigned は
-- 使われなくなるが、削除は行わず残す（削除したい場合は手動で DROP INDEX）。
CREATE INDEX IF NOT EXISTS idx_bingo_cards_civ_free
  ON public.bingo_cards (civilization) WHERE participant_id IS NULL;

-- ---------------------------------------------------------------
-- 3. 使われなくなったテーブル / 旧関数は削除せず、公開ロールから遮断する
--    （stamp_cards と assign_bingo_card / unassign_bingo_card / reset_all_cards は新コードから使わない。
--      不要になったら手動で DROP してよい）
-- ---------------------------------------------------------------
ALTER TABLE IF EXISTS public.stamp_cards ENABLE ROW LEVEL SECURITY;

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
DO $$
BEGIN
  IF to_regclass('public.stamp_cards') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON public.stamp_cards FROM anon, authenticated';
  END IF;
  IF to_regprocedure('public.assign_bingo_card(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.assign_bingo_card(text) FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regprocedure('public.unassign_bingo_card(integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.unassign_bingo_card(integer) FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regprocedure('public.reset_all_cards()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.reset_all_cards() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.claim_bingo_card(text, integer)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_participant_sequence()      FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bingo_card(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_participant_sequence()     TO service_role;
