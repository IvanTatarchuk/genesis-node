-- ============================================================
-- GENESIS NODE – Referral System
-- Referrer + referee both get 200 credits on first signup
-- ============================================================

-- Add referral fields to profiles
alter table public.profiles
  add column if not exists referral_code   text unique,
  add column if not exists referred_by     uuid references public.profiles(id),
  add column if not exists referral_count  integer not null default 0,
  add column if not exists referral_earned integer not null default 0; -- credits earned via referrals

-- Generate referral code on profile creation
create or replace function public.generate_referral_code()
returns text language plpgsql as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i      int;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Auto-assign referral code on new profile
create or replace function public.assign_referral_code()
returns trigger language plpgsql as $$
declare
  code text;
  attempts int := 0;
begin
  loop
    code := public.generate_referral_code();
    begin
      update public.profiles set referral_code = code where id = new.id;
      exit;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 10 then
        raise exception 'Could not generate unique referral code';
      end if;
    end;
  end loop;
  return new;
end;
$$;

create trigger assign_referral_code_trigger
  after insert on public.profiles
  for each row execute procedure public.assign_referral_code();

-- Backfill existing profiles with referral codes
do $$
declare
  p record;
  code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  for p in select id from public.profiles where referral_code is null loop
    loop
      code := '';
      for i in 1..8 loop
        code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      end loop;
      begin
        update public.profiles set referral_code = code where id = p.id;
        exit;
      exception when unique_violation then
        -- retry
      end;
    end loop;
  end loop;
end $$;

-- Function to apply referral reward (called after confirmed signup)
create or replace function public.apply_referral(
  p_new_user_id   uuid,
  p_referral_code text
) returns boolean language plpgsql security definer as $$
declare
  v_referrer_id   uuid;
  v_reward        integer := 200; -- credits each
begin
  -- Find referrer
  select id into v_referrer_id
  from public.profiles
  where referral_code = upper(trim(p_referral_code))
    and id <> p_new_user_id;

  if v_referrer_id is null then
    return false;
  end if;

  -- Check: new user hasn't already been referred
  if exists (select 1 from public.profiles where id = p_new_user_id and referred_by is not null) then
    return false;
  end if;

  -- Reward referrer
  update public.profiles
  set
    balance          = balance + v_reward,
    referral_count   = referral_count + 1,
    referral_earned  = referral_earned + v_reward
  where id = v_referrer_id;

  -- Reward new user + mark who referred them
  update public.profiles
  set
    balance     = balance + v_reward,
    referred_by = v_referrer_id
  where id = p_new_user_id;

  -- Log transactions for both
  insert into public.credit_transactions (profile_id, amount, type, description)
  values
    (v_referrer_id, v_reward, 'bonus', 'Referral reward: new user signed up with your code'),
    (p_new_user_id, v_reward, 'bonus', 'Welcome bonus: joined via referral link');

  return true;
end;
$$;
