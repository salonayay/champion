// Characters chosen deliberately: no 0/O, no 1/I/L. People will read these
// codes aloud over voice chat, and those pairs are indistinguishable when
// spoken or in most fonts. Losing a few characters is worth avoiding
// "is that a zero or an oh?" every single time.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

// 31 characters, 6 positions = about 887 million combinations.
// Collisions are vanishingly rare, but "rare" isn't "never" — the database has
// a unique constraint on code, and createRoom retries if one happens.
