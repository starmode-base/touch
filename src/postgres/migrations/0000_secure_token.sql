--
-- Custom SQL migration file
--

-- Enable pgcrypto for cryptographically secure random bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generate a secure random token using a 62-character alphabet (similar to NanoID)
CREATE OR REPLACE FUNCTION gen_secure_token(size INT DEFAULT 24)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE  -- Ensures unique values on each call
AS $$
DECLARE
  alphabet CONSTANT TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result    TEXT := '';
  randval   INT;
BEGIN
  WHILE char_length(result) < size LOOP
    randval := get_byte(gen_random_bytes(1), 0);
    IF randval < floor(256.0/62.0)::INT * 62 THEN
      result := result || substr(alphabet, (randval % 62) + 1, 1);
    END IF;
  END LOOP;
  RETURN result;
END;
$$;
