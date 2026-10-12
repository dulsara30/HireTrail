import { BlockList, isIP } from 'node:net';

const blocked = new BlockList();

const V4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];
const V6_RANGES: Array<[string, number]> = [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
  ['2001:db8::', 32],
  ['64:ff9b::', 96],
  ['100::', 64],
];

for (const [addr, prefix] of V4_RANGES) blocked.addSubnet(addr, prefix, 'ipv4');
for (const [addr, prefix] of V6_RANGES) blocked.addSubnet(addr, prefix, 'ipv6');

/** True only for globally routable unicast addresses (IPv4 and IPv6). */
export function isPublicIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return !blocked.check(ip, 'ipv4');
  if (family === 6) {
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
    if (mapped?.[1]) return isPublicIp(mapped[1]);
    return !blocked.check(ip, 'ipv6');
  }
  return false;
}
