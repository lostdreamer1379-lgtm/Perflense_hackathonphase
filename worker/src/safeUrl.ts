import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const l = ip.toLowerCase();
  return (
    l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') ||
    l.startsWith('fe80') || l.startsWith('::ffff:')
  );
}

/** Accepts only http(s) URLs whose initial hostname resolves to public addresses. */
export async function assertSafeUrl(input: string): Promise<string> {
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('That does not look like a valid URL');
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw new Error('Only http and https URLs are allowed');
  }
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(u.hostname, { all: true });
  } catch {
    throw new Error(`Could not find a server for ${u.hostname}`);
  }
  if (addrs.some((a) => isPrivate(a.address))) {
    throw new Error('That URL points to a private or internal address');
  }
  return u.toString();
}

/** Network patterns blocked in Chrome to prevent common redirect/subresource SSRF targets. */
export const blockedPrivateUrlPatterns = [
  '*://localhost/*',
  '*://localhost:*/*',
  '*://127.*/*',
  '*://[::1]/*',
  '*://0.0.0.0/*',
  '*://10.*/*',
  '*://100.64.*/*',
  '*://169.254.*/*',
  '*://172.16.*/*',
  '*://172.17.*/*',
  '*://172.18.*/*',
  '*://172.19.*/*',
  '*://172.2[0-9].*/*',
  '*://172.3[0-1].*/*',
  '*://192.168.*/*',
  '*://[fc*]/*',
  '*://[fd*]/*',
  '*://metadata.google.internal/*',
  '*://169.254.169.254/*',
];
