import { BigInt } from "@graphprotocol/graph-ts";
import { Cellar, CellarShare, Denom, Wallet } from "../../generated/schema";
import {
  DAY_SECONDS,
  ID_DELIMITER,
  loadCellarDayData,
  loadWalletDayData,
} from "./helpers";

const cellarAddress = "0xc3761EB917CD790B30dAD99f6Cc5b4Ff93C4F9eA";
const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const walletAddress = "0x02299f744a416bc6482f1f52a861e5826d546d80";

export function seed(): void {
  const cellar = Cellar.load(cellarAddress);
  if (cellar == null) {
    seedCellar();
    seedUser();
  }
}

const active = BigInt.fromI32(1234560);
const inactive = BigInt.fromI32(78900);
const total = active.plus(inactive);
const zero = BigInt.fromI32(0);
const day = BigInt.fromI32(DAY_SECONDS);
const thou = BigInt.fromI32(1000);
const now = BigInt.fromI32(1646549404);

function createCellarDayData(
  cellar: Cellar,
  timestamp: BigInt,
  addedLiquidity: number,
  removedLiquidity: number,
  numWallets: number
): void {
  const cellarDay = loadCellarDayData(cellar, timestamp);
  cellarDay.addedLiquidity = BigInt.fromI32(addedLiquidity as u32);
  cellarDay.removedLiquidity = BigInt.fromI32(removedLiquidity as u32);
  cellarDay.numWallets = numWallets as u32;
  cellarDay.save();
}

const ccdd = createCellarDayData;

export function seedCellar(): void {
  // Denom
  const denom = new Denom(usdcAddress);
  denom.symbol = "USDC";
  denom.decimals = 6;
  denom.save();

  // Cellar
  const cellar = new Cellar(cellarAddress);
  cellar.name = "Aave Stablecoin Cellar";
  cellar.denom = usdcAddress;
  cellar.tvlActive = active;
  cellar.tvlInactive = inactive;
  cellar.tvlTotal = total;
  cellar.addedLiquidityAllTime = total;
  cellar.removedLiquidityAllTime = zero;
  cellar.numWalletsActive = 1;
  cellar.numWalletsAllTime = 1;
  cellar.sharesTotal = total;
  cellar.save();

  // 7 days worth of statistics
  ccdd(cellar, now.minus(day.times(BigInt.fromI32(7))), 100000, 25000, 2);
  ccdd(cellar, now.minus(day.times(BigInt.fromI32(6))), 200000, 100000, 5);
  ccdd(cellar, now.minus(day.times(BigInt.fromI32(5))), 300000, 50000, 4);
  ccdd(cellar, now.minus(day.times(BigInt.fromI32(4))), 10000, 100000, 3);
  ccdd(cellar, now.minus(day.times(BigInt.fromI32(3))), 300000, 20000, 2);
  ccdd(cellar, now.minus(day.times(BigInt.fromI32(2))), 0, 615000, 0);
  ccdd(cellar, now, total.toI32(), 0, 1);
}

export function seedUser(): void {
  // User
  const wallet = new Wallet(walletAddress);
  wallet.save();

  // User Position
  const cellarShareId = cellarAddress
    .concat(ID_DELIMITER)
    .concat(walletAddress);
  const cellarShare = new CellarShare(cellarShareId);
  cellarShare.cellar = cellarAddress;
  cellarShare.wallet = walletAddress;
  cellarShare.balance = total;
  cellarShare.save();

  // One day worth of statistics
  const dayData = loadWalletDayData(wallet, now);
  dayData.addedLiquidity = total;
  dayData.save();
}
