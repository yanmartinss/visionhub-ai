import { isIP } from "node:net";

const isPrivateIpv4 = (address: string) => {
  const [a = 0, b = 0] = address.split(".").map(Number);
  return (
    a === 0 || // "this" network
    a === 10 ||
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast and reserved
  );
};

const isPrivateIpv6 = (raw: string) => {
  const address = raw.toLowerCase();
  if (address === "::" || address === "::1") return true;

  // IPv4-mapped (::ffff:a.b.c.d or ::ffff:7f00:1): judge by the embedded IPv4.
  const dotted = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return isPrivateIpv4(dotted[1]!);
  const hex = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const high = parseInt(hex[1]!, 16);
    const low = parseInt(hex[2]!, 16);
    return isPrivateIpv4(
      `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`,
    );
  }

  // NAT64 can embed any IPv4; refuse it rather than parse it.
  if (address.startsWith("64:ff9b:")) return true;

  const firstHextet = parseInt(address.split(":")[0] || "0", 16);
  return (
    (firstHextet & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (firstHextet & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (firstHextet & 0xff00) === 0xff00 // multicast
  );
};

// Anything that is not a valid IP is reported as private (fail closed).
export const isPrivateIp = (address: string) => {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
};
