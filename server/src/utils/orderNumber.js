const crypto = require('crypto');

// Letters/digits that are hard to confuse when read out over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** e.g. "PZ-7K3QM9" */
function generateOrderNumber() {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return `PZ-${code}`;
}

module.exports = { generateOrderNumber };
