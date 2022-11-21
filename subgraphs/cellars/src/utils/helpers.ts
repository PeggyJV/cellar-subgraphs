import { Cellar as CellarContract } from "../../generated/Cellar/Cellar";
import { ERC20 } from "../../generated/Cellar/ERC20";
import {
  Cellar,
  CellarDayData,
  CellarHourData,
  TokenERC20,
  Wallet,
  WalletCellarShare,
  WalletDayData,
} from "../../generated/schema";
import { ZERO_BD, ZERO_BI, TEN_BI } from "./constants";
import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export const ID_DELIMITER = "-";
export const DAY_SECONDS = 60 * 60 * 24;
export const HOUR_SECONDS = 60 * 60;

export function initCellar(contractAddress: Address): Cellar {
  const id = contractAddress.toHexString();
  const cellar = new Cellar(id);

  // Fetch data from chain
  const contract = CellarContract.bind(contractAddress);
  cellar.name = contract.name();
  cellar.asset = contract.asset().toHexString();
  cellar.depositLimit = contract.depositLimit();
  cellar.liquidityLimit = contract.liquidityLimit();

  // Initialize
  cellar.tvlActive = ZERO_BI;
  cellar.tvlInactive = ZERO_BI;
  cellar.tvlInvested = ZERO_BI;
  cellar.tvlTotal = ZERO_BI;
  cellar.currentDeposits = ZERO_BI;
  cellar.addedLiquidityAllTime = ZERO_BI;
  cellar.removedLiquidityAllTime = ZERO_BI;
  cellar.numWalletsAllTime = 0;
  cellar.numWalletsActive = 0;
  cellar.sharesTotal = ZERO_BI;
  cellar.shareValue = ZERO_BI;
  cellar.shareProfitRatio = ZERO_BD;

  cellar.positions = new Array<string>();
  cellar.positionDistribution = new Array<BigDecimal>();

  return cellar;
}

export function loadCellar(contractAddress: Address): Cellar {
  const id = contractAddress.toHexString();
  let cellar = Cellar.load(id);
  if (cellar == null) {
    cellar = initCellar(contractAddress);
  }

  return cellar;
}

export function initCellarDayData(
  cellarAddress: string,
  id: string,
  date: number,
  assetAddress: string
): CellarDayData {
  const entity = new CellarDayData(id);

  entity.date = date as u32;
  entity.cellar = cellarAddress;
  entity.asset = assetAddress;
  entity.updatedAt = 0;
  entity.addedLiquidity = ZERO_BI;
  entity.removedLiquidity = ZERO_BI;
  entity.numWallets = 0;
  entity.tvlActive = ZERO_BI;
  entity.tvlInactive = ZERO_BI;
  entity.tvlInvested = ZERO_BI;
  entity.tvlTotal = ZERO_BI;
  entity.earnings = ZERO_BI;
  entity.shareValue = ZERO_BI;
  entity.shareValueLow = ZERO_BI;
  entity.shareValueHigh = ZERO_BI;
  entity.shareProfitRatio = ZERO_BD;
  entity.positionDistribution = new Array<BigDecimal>();

  return entity;
}

export function initCellarHourData(
  cellarAddress: string,
  id: string,
  date: number,
  assetAddress: string
): CellarHourData {
  const entity = new CellarHourData(id);

  entity.date = date as u32;
  entity.cellar = cellarAddress;
  entity.asset = assetAddress;
  entity.updatedAt = 0;
  entity.addedLiquidity = ZERO_BI;
  entity.removedLiquidity = ZERO_BI;
  entity.numWallets = 0;
  entity.tvlActive = ZERO_BI;
  entity.tvlInactive = ZERO_BI;
  entity.tvlInvested = ZERO_BI;
  entity.tvlTotal = ZERO_BI;
  entity.earnings = ZERO_BI;
  entity.shareValue = ZERO_BI;
  entity.shareValueLow = ZERO_BI;
  entity.shareValueHigh = ZERO_BI;
  entity.shareProfitRatio = ZERO_BD;
  entity.positionDistribution = new Array<BigDecimal>();

  return entity;
}

export function getDayId(
  cellarAddress: string,
  blockTimestamp: BigInt
): string {
  const date = (blockTimestamp.toI32() / DAY_SECONDS) * DAY_SECONDS;
  const id = date.toString().concat(ID_DELIMITER).concat(cellarAddress);

  return id;
}

export function loadCellarDayData(
  cellarAddress: string,
  blockTimestamp: BigInt,
  assetAddress: string
): CellarDayData {
  const date = (blockTimestamp.toI32() / DAY_SECONDS) * DAY_SECONDS;
  const id = `${cellarAddress}${ID_DELIMITER}${assetAddress}${ID_DELIMITER}${date.toString()}`;

  let cellarDayData = CellarDayData.load(id);
  if (cellarDayData == null) {
    cellarDayData = initCellarDayData(cellarAddress, id, date, assetAddress);
  }

  return cellarDayData;
}

export function loadPrevCellarDayData(
  cellarAddress: string,
  blockTimestamp: BigInt,
  assetAddress: string
): CellarDayData {
  const date = (blockTimestamp.toI32() / DAY_SECONDS) * DAY_SECONDS;
  const prevDay = date - DAY_SECONDS;
  const id = `${cellarAddress}${ID_DELIMITER}${assetAddress}${ID_DELIMITER}${prevDay.toString()}`;

  let cellarDayData = CellarDayData.load(id);
  if (cellarDayData == null) {
    // if we are on the first snapshot after a rebalance, there will be no previous data so fake it
    cellarDayData = initCellarDayData(
      cellarAddress,
      id,
      blockTimestamp.toI32(),
      assetAddress
    );
  }

  return cellarDayData;
}

export function loadCellarHourData(
  cellarAddress: string,
  blockTimestamp: BigInt,
  assetAddress: string
): CellarHourData {
  const date = (blockTimestamp.toI32() / HOUR_SECONDS) * HOUR_SECONDS;
  const id = `${cellarAddress}${ID_DELIMITER}${assetAddress}${ID_DELIMITER}${date.toString()}`;

  let cellarHourData = CellarHourData.load(id);
  if (cellarHourData == null) {
    cellarHourData = initCellarHourData(cellarAddress, id, date, assetAddress);
  }

  return cellarHourData;
}

export function loadPrevCellarHourData(
  cellarAddress: string,
  blockTimestamp: BigInt,
  assetAddress: string
): CellarHourData {
  const date = (blockTimestamp.toI32() / HOUR_SECONDS) * HOUR_SECONDS;
  const prevHour = date - HOUR_SECONDS;
  const id = `${cellarAddress}${ID_DELIMITER}${assetAddress}${ID_DELIMITER}${prevHour.toString()}`;

  let cellarHourData = CellarHourData.load(id);
  if (cellarHourData == null) {
    // if we are on the first snapshot after a rebalance, there will be no previous data so fake it
    cellarHourData = initCellarHourData(
      cellarAddress,
      id,
      blockTimestamp.toI32(),
      assetAddress
    );
  }

  return cellarHourData;
}

export function initWalletDayData(
  wallet: Wallet,
  id: string,
  date: number
): WalletDayData {
  const entity = new WalletDayData(id);

  entity.date = date as u32;
  entity.wallet = wallet.id;
  entity.addedLiquidity = ZERO_BI;
  entity.removedLiquidity = ZERO_BI;

  return entity;
}

export function loadWalletDayData(
  wallet: Wallet,
  blockTimestamp: BigInt
): WalletDayData {
  const date = (blockTimestamp.toI32() / DAY_SECONDS) * DAY_SECONDS;
  const id = date.toString().concat(ID_DELIMITER).concat(wallet.id);

  let walletDayData = WalletDayData.load(id);
  if (walletDayData == null) {
    walletDayData = initWalletDayData(wallet, id, date);
  }

  return walletDayData;
}

/**
 * @param  {Cellar} cellar The cellar for which shares are owned.
 * @param  {Wallet} wallet The wallet that owns the shares.
 * @returns WalletWalletCellarShare
 */
export function initWalletCellarShare(
  cellar: Cellar,
  wallet: Wallet
): WalletCellarShare {
  const cellarShareID = wallet.id + "-" + cellar.id;
  const balanceInit = ZERO_BI;

  let cellarShare = new WalletCellarShare(cellarShareID);
  cellarShare.cellar = cellar.id;
  cellarShare.wallet = wallet.id;
  cellarShare.balance = balanceInit;

  return cellarShare;
}

/** Loads the `WalletCellarShare` corresponding to the given wallet and cellar.
 * @param  {Wallet} wallet
 * @param  {Cellar} cellar
 * @returns WalletCellarShare
 */
export function loadWalletCellarShare(
  wallet: Wallet,
  cellar: Cellar
): WalletCellarShare {
  const walletID = wallet.id;
  const cellarID = cellar.id;
  const cellarShareID = walletID + "-" + cellarID;

  let cellarShare = WalletCellarShare.load(cellarShareID);
  if (cellarShare == null) {
    cellarShare = initWalletCellarShare(cellar, wallet);
  }

  return cellarShare;
}

export function initToken(address: string): TokenERC20 {
  const token = new TokenERC20(address);

  const contract = ERC20.bind(Address.fromString(address));
  const sym = contract.try_symbol();
  if (!sym.reverted) {
    token.symbol = sym.value;
  }

  const decimals = contract.try_decimals();
  if (!decimals.reverted) {
    token.decimals = decimals.value;
  }

  token.save();
  return token;
}

export function loadOrCreateTokenERC20(address: string): TokenERC20 {
  let token = TokenERC20.load(address);
  if (token == null) {
    token = initToken(address);
    token.save();
  }

  return token;
}

export function convertDecimals(
  value: BigInt,
  fromDecimals: BigInt,
  toDecimals: BigInt
): BigInt {
  const delta = toDecimals.minus(fromDecimals);
  if (delta.equals(ZERO_BI)) {
    return value;
  }

  const multiplier = TEN_BI.pow(delta.toI32() as u8);

  if (delta.gt(ZERO_BI)) {
    return value.times(multiplier);
  }

  return value.div(multiplier);
}

// TODO configure
const decimals = BigInt.fromI32(18);
export function normalizeDecimals(value: BigInt, fromDecimals: BigInt): BigInt {
  return convertDecimals(value, fromDecimals, decimals);
}
