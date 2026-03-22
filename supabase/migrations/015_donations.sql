-- Add 'donation' to txn_type for donor debit and optional recipient credit
ALTER TYPE public.txn_type ADD VALUE IF NOT EXISTS 'donation';
