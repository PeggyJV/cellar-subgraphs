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
export const STEADY_BTC =
  "0x4986fd36b6b16f49b43282ee2e24c5cf90ed166d".toLowerCase();
// Steady ETH
export const STEADY_ETH =
  "0x3f07a84ecdf494310d397d24c1c78b041d2fa622".toLowerCase();
export const STEADY_UNI =
  "0x6f069f711281618467dae7873541ecc082761b33".toLowerCase();
export const STEADY_MATIC =
  "0x05641a27c82799aaf22b436f20a3110410f29652".toLowerCase();
export const REAL_YIELD_USD =
  "0x97e6e0a40a3d02f12d1cec30ebfbae04e37c119e".toLowerCase();

export const CELLAR_START = new Map<string, BigInt>();
CELLAR_START.set(CELLAR_CLEARGATE_A, BigInt.fromI32(15733768));
CELLAR_START.set(CELLAR_CLEARGATE_B, BigInt.fromI32(15733768));
CELLAR_START.set(CELLAR_CLEARGATE_C, BigInt.fromI32(15727154));
CELLAR_START.set(CELLAR_CLEARGATE_D, BigInt.fromI32(15740970));
CELLAR_START.set(STEADY_BTC, BigInt.fromI32(15991609));
CELLAR_START.set(STEADY_ETH, BigInt.fromI32(15991609));
CELLAR_START.set(STEADY_UNI, BigInt.fromI32(16242434));
CELLAR_START.set(STEADY_MATIC, BigInt.fromI32(16242434));
CELLAR_START.set(REAL_YIELD_USD, BigInt.fromI32(16431804));

export const V1PT5_CELLARS = new Array<string>();
// ETH-BTC
V1PT5_CELLARS.push(CELLAR_CLEARGATE_A);
V1PT5_CELLARS.push(CELLAR_CLEARGATE_B);

// TEST
// V1PT5_CELLARS.push(CELLAR_CLEARGATE_C);
// V1PT5_CELLARS.push(CELLAR_CLEARGATE_D);

// Steady
V1PT5_CELLARS.push(STEADY_BTC);
V1PT5_CELLARS.push(STEADY_ETH);
V1PT5_CELLARS.push(STEADY_UNI);
V1PT5_CELLARS.push(STEADY_MATIC);

export const V2_CELLARS = new Array<string>();
V2_CELLARS.push(REAL_YIELD_USD);
