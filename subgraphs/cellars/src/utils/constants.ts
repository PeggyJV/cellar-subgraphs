import { BigInt } from "@graphprotocol/graph-ts";

export const NEGATIVE_ONE_BI = BigInt.fromI32(-1);
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const TEN_BI = BigInt.fromI32(10);

export const NEGATIVE_ONE_BD = NEGATIVE_ONE_BI.toBigDecimal();
export const ZERO_BD = ZERO_BI.toBigDecimal();
export const ONE_BD = ONE_BI.toBigDecimal();

export const ONE_SHARE = ONE_BI.times(TEN_BI.pow(18));

export const CELLAR_AAVE_LATEST =
  "0x7bad5df5e11151dc5ee1a648800057c5c934c0d5".toLowerCase();
// ETH-BTC Trend
export const CELLAR_CLEARGATE_A =
  "0x6b7f87279982d919Bbf85182DDeAB179B366D8f2".toLowerCase();
// ETH-BTC Momentum
export const CELLAR_CLEARGATE_B =
  "0x6E2dAc3b9E9ADc0CbbaE2D0B9Fd81952a8D33872".toLowerCase();
// TEST A
export const CELLAR_CLEARGATE_C =
  "0xbfC413eA6Cb68c05dedA0D9aa7DaF8E51A7dDdfF".toLowerCase();
// TEST B
export const CELLAR_CLEARGATE_D =
  "0x8bdd3d5b889f3d0d735eb4db5d87782df2b4647d".toLowerCase();
// Steady BTC
export const CELLAR_CLEARGATE_E =
  "0x4986fd36b6b16f49b43282ee2e24c5cf90ed166d".toLowerCase();
// Steady ETH
export const CELLAR_CLEARGATE_F =
  "0x3f07a84ecdf494310d397d24c1c78b041d2fa622".toLowerCase();

export const CELLAR_START = new Map<string, BigInt>();
CELLAR_START.set(CELLAR_CLEARGATE_A, BigInt.fromI32(15733768));
CELLAR_START.set(CELLAR_CLEARGATE_B, BigInt.fromI32(15733768));
CELLAR_START.set(CELLAR_CLEARGATE_C, BigInt.fromI32(15727154));
CELLAR_START.set(CELLAR_CLEARGATE_D, BigInt.fromI32(15740970));
CELLAR_START.set(CELLAR_CLEARGATE_E, BigInt.fromI32(15991609));
CELLAR_START.set(CELLAR_CLEARGATE_F, BigInt.fromI32(15991609));

export const CLEARGATE_CELLARS = new Array<string>();
// ETH-BTC
CLEARGATE_CELLARS.push(CELLAR_CLEARGATE_A);
CLEARGATE_CELLARS.push(CELLAR_CLEARGATE_B);

// TEST
// CLEARGATE_CELLARS.push(CELLAR_CLEARGATE_C);
// CLEARGATE_CELLARS.push(CELLAR_CLEARGATE_D);

// Steady
CLEARGATE_CELLARS.push(CELLAR_CLEARGATE_E);
CLEARGATE_CELLARS.push(CELLAR_CLEARGATE_F);
