export function containsSecret(text) {
  return /(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|[sr]k_(?:test|live)_[A-Za-z0-9]{20,}|whsec_[A-Za-z0-9]{20,}|cfut_[A-Za-z0-9_-]{20,}|e2b_[A-Za-z0-9_-]{20,}|re_[A-Za-z0-9_]{20,}|gh[opsu]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[A-Z0-9]{16})/.test(
    text,
  );
}
