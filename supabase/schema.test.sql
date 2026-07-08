-- Run against a database that schema.sql has just been applied to (see
-- .github/workflows/ci.yml). Exercises the Postgres functions with real
-- assertions so CI catches the class of bug this schema has already hit
-- once by hand: a changed function signature silently leaving an old,
-- unauthenticated overload callable alongside the new one (see the
-- claim-token commit). Every prior verification of this file was a manual
-- psql session that leaves nothing behind for the next change to be
-- checked against — this does.

do $$
declare
  v_shards integer;
  v_token uuid;
  v_is_new boolean;
begin
  select shards, claim_token, is_new into v_shards, v_token, v_is_new
  from public.award_shards('test_player', 100);

  if v_shards != 100 then
    raise exception 'award_shards: expected 100 shards, got %', v_shards;
  end if;
  if v_is_new != true then
    raise exception 'award_shards: expected is_new = true for a brand-new player';
  end if;
  if v_token is null then
    raise exception 'award_shards: expected a non-null claim_token for a brand-new player';
  end if;

  -- Calling it again for the same player must not report is_new = true
  -- again — that would mean the token gets re-exposed to whoever merely
  -- triggers a later award for this player (e.g. by passing their
  -- challenge), not just its original owner.
  select shards, is_new into v_shards, v_is_new
  from public.award_shards('test_player', 50);

  if v_shards != 150 then
    raise exception 'award_shards: expected balance to accumulate to 150, got %', v_shards;
  end if;
  if v_is_new != false then
    raise exception 'award_shards: expected is_new = false on a repeat award for an existing player';
  end if;
end $$;

do $$
declare
  v_token uuid;
  v_balance integer;
begin
  select claim_token into v_token from public.players where player_name = 'test_player';

  begin
    perform public.purchase_cosmetic('test_player', 'iron-will', 100, gen_random_uuid());
    raise exception 'purchase_cosmetic: expected rejection for a wrong claim token';
  exception when others then
    if sqlerrm not like '%invalid claim token%' then
      raise exception 'purchase_cosmetic: expected an invalid-claim-token error, got: %', sqlerrm;
    end if;
  end;

  select public.purchase_cosmetic('test_player', 'iron-will', 100, v_token) into v_balance;
  if v_balance != 50 then
    raise exception 'purchase_cosmetic: expected balance 50 after a 100-cost purchase from 150, got %', v_balance;
  end if;

  -- Cost 10 here (not 100): the balance check runs before the ownership
  -- check inside purchase_cosmetic, so a cost the 50-shard balance can't
  -- cover would report insufficient funds first and never actually exercise
  -- the already-owns path this assertion is for.
  begin
    perform public.purchase_cosmetic('test_player', 'iron-will', 10, v_token);
    raise exception 'purchase_cosmetic: expected rejection for an already-owned cosmetic';
  exception when others then
    if sqlerrm not like '%already owns%' then
      raise exception 'purchase_cosmetic: expected an already-owns error, got: %', sqlerrm;
    end if;
  end;

  begin
    perform public.purchase_cosmetic('test_player', 'og', 500, v_token);
    raise exception 'purchase_cosmetic: expected rejection for insufficient funds';
  exception when others then
    if sqlerrm not like '%insufficient shards%' then
      raise exception 'purchase_cosmetic: expected an insufficient-shards error, got: %', sqlerrm;
    end if;
  end;

  begin
    perform public.equip_cosmetic('test_player', 'iron-will', gen_random_uuid());
    raise exception 'equip_cosmetic: expected rejection for a wrong claim token';
  exception when others then
    if sqlerrm not like '%invalid claim token%' then
      raise exception 'equip_cosmetic: expected an invalid-claim-token error, got: %', sqlerrm;
    end if;
  end;

  perform public.equip_cosmetic('test_player', 'iron-will', v_token);
  if not exists (
    select 1 from public.players where player_name = 'test_player' and active_cosmetic_id = 'iron-will'
  ) then
    raise exception 'equip_cosmetic: expected active_cosmetic_id to be set to iron-will';
  end if;

  begin
    perform public.equip_cosmetic('test_player', 'og', v_token);
    raise exception 'equip_cosmetic: expected rejection for an unowned cosmetic';
  exception when others then
    if sqlerrm not like '%does not own%' then
      raise exception 'equip_cosmetic: expected a does-not-own error, got: %', sqlerrm;
    end if;
  end;
end $$;

do $$
begin
  begin
    insert into public.challenges (slug, author_name, title, prompt, files, solution_file, test_command, status)
    values ('bad-status-test', 'x', 'x', 'x', '{}'::jsonb, 'a.js', array['node'], 'not-a-status');
    raise exception 'challenges: expected the status check constraint to reject an invalid status';
  exception when check_violation then
    null; -- expected
  end;
end $$;

select 'schema.test.sql: all assertions passed' as result;
