import * as EC from 'elliptic';
const ec = new EC.ec('secp256k1');

export const MINT_PRIVATE_ADDRESS =
  '0700a1ad28a20e5b2a517c00242d3e25a88d84bf54dce9e1733e6096e6d6495e';
export const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, 'hex');
export const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex');

export const privateKey =
  '62d101759086c306848a0c1020922a78e8402e1330981afe9404d0ecc0a4be3d';
export const keyPair = ec.keyFromPrivate(privateKey, 'hex');
export const publicKey = keyPair.getPublic('hex');
