--
-- Generates a secure random token using a 62-character alphabet
--

-- Enable pgcrypto for cryptographically secure random bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function: gen_secure_token(integer DEFAULT 20) -> text
CREATE OR REPLACE FUNCTION gen_secure_token(size integer DEFAULT 20)
RETURNS text
AS $function$
DECLARE
  alphabet constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result text := '';
  randval integer;
BEGIN
  WHILE char_length(result) < size LOOP
    randval := get_byte(gen_random_bytes(1), 0);
    IF randval < floor(256.0/62.0)::integer * 62 THEN
      result := result || substr(alphabet, (randval % 62) + 1, 1);
    END IF;
  END LOOP;
  RETURN result;
END;
$function$ LANGUAGE plpgsql VOLATILE;
