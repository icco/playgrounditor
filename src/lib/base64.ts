import { Base64 } from 'js-base64';

export function encodeBase64(str: string): string {
  return Base64.encode(str);
}

export function decodeBase64(b64: string): string {
  return Base64.decode(b64);
}

// Returns null when the bytes are not valid UTF-8, because saving the decoded text would corrupt the file.
export function decodeUtf8Strict(b64: string): string | null {
  const clean = b64.replace(/\s/g, '');
  const text = Base64.decode(clean);
  return Base64.encode(text) === clean ? text : null;
}
