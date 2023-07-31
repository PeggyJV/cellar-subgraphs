import { Address, BigInt } from "@graphprotocol/graph-ts";

export const SNAPSHOT_INTERVAL_SECS = 60 * 5; // 5 minutes

export const NEGATIVE_ONE_BI = BigInt.fromI32(-1);
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const TEN_BI = BigInt.fromI32(10);

export const NEGATIVE_ONE_BD = NEGATIVE_ONE_BI.toBigDecimal();
export const ZERO_BD = ZERO_BI.toBigDecimal();
export const ONE_BD = ONE_BI.toBigDecimal();

export const ONE_SHARE = ONE_BI.times(TEN_BI.pow(18));

export const WETH_ADDRESS = Address.fromString(
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
);

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
export const REAL_YIELD_ETH =
  "0xb5b29320d2dde5ba5bafa1ebcd270052070483ec".toLowerCase();
export const REAL_YIELD_LINK =
  "0x4068bdd217a45f8f668ef19f1e3a1f043e4c4934".toLowerCase();
export const REAL_YIELD_1INCH =
  "0xc7b69e15d86c5c1581dacce3cacaf5b68cd6596f".toLowerCase();
export const REAL_YIELD_UNI =
  "0x6a6af5393dc23d7e3db28d28ef422db7c40932b6".toLowerCase();
export const REAL_YIELD_SNX =
  "0xcbf2250f33c4161e18d4a2fa47464520af5216b5".toLowerCase();
export const REAL_YIELD_ENS =
  "0x18ea937aba6053bc232d9ae2c42abe7a8a2be440".toLowerCase();
export const REAL_YIELD_BTC =
  "0x0274a704a6d9129f90a62ddc6f6024b33ecdad36".toLowerCase();
export const DEFI_STARS =
  "0x03df2a53cbed19b824347d6a45d09016c2d1676a".toLowerCase();
export const FRAXIMAL =
  "0xdbe19d1c3f21b1bb250ca7bdae0687a97b5f77e6".toLowerCase();

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
CELLAR_START.set(REAL_YIELD_ETH, BigInt.fromI32(17023383));
CELLAR_START.set(REAL_YIELD_LINK, BigInt.fromI32(17377190));
CELLAR_START.set(REAL_YIELD_1INCH, BigInt.fromI32(17377190));
CELLAR_START.set(REAL_YIELD_UNI, BigInt.fromI32(17377190));
CELLAR_START.set(REAL_YIELD_SNX, BigInt.fromI32(17377190));
CELLAR_START.set(REAL_YIELD_ENS, BigInt.fromI32(17377190));
CELLAR_START.set(DEFI_STARS, BigInt.fromI32(17181497));
CELLAR_START.set(FRAXIMAL, BigInt.fromI32(17589948));
CELLAR_START.set(REAL_YIELD_BTC, BigInt.fromI32(17630563));

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
V2_CELLARS.push(REAL_YIELD_ETH);
V2_CELLARS.push(REAL_YIELD_LINK);
V2_CELLARS.push(REAL_YIELD_1INCH);
V2_CELLARS.push(REAL_YIELD_UNI);
V2_CELLARS.push(REAL_YIELD_SNX);
V2_CELLARS.push(REAL_YIELD_ENS);
V2_CELLARS.push(REAL_YIELD_BTC);
V2_CELLARS.push(DEFI_STARS);
V2_CELLARS.push(FRAXIMAL);
