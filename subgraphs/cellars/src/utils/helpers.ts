import { Cellar as CellarContract } from "../../generated/Cellar/Cellar";
import { ERC20 } from "../../generated/Cellar/ERC20";
import {
  DepositWithdrawEvent,
  Cellar,
  CellarDayData,
  CellarHourData,
  CellarShare,
  CellarShareTransfer,
  DepositWithdrawAaveEvent,
  TokenERC20,
  Wallet,
  WalletDayData,
} from "../../generated/schema";
import { ZERO_BI, TEN_BI } from "./constants";
import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export const ID_DELIMITER = "-";
export const DAY_SECONDS = 60 * 60 * 24;
export const HOUR_SECONDS = 60 * 60;

export function initCellar(contractAddress: Address): Cellar {
  const id = contractAddress.toHexString();
  const cellar = new Cellar(id);

  // TODO remove
  cellar.name = "AaveStablecoinCellar";

  const contract = CellarContract.bind(contractAddress);
  cellar.depositLimit = contract.depositLimit();
  cellar.liquidityLimit = contract.liquidityLimit();

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
  const cellarDayData = new CellarDayData(id);

  cellarDayData.cellar = cellarAddress;
  cellarDayData.date = date as u32;
  cellarDayData.asset = assetAddress;

  return cellarDayData;
}

export function initCellarHourData(
  cellarAddress: string,
  id: string,
  date: number,
  assetAddress: string
): CellarHourData {
  const cellarHourData = new CellarHourData(id);

  cellarHourData.cellar = cellarAddress;
  cellarHourData.date = date as u32;
  cellarHourData.asset = assetAddress;

  return cellarHourData;
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
    cellarDayData = new CellarDayData(id);
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
    cellarHourData = new CellarHourData(id);
  }

  return cellarHourData;
}

export function initWalletDayData(
  wallet: Wallet,
  id: string,
  date: number
): WalletDayData {
  const walletDayData = new WalletDayData(id);

  walletDayData.wallet = wallet.id;
  walletDayData.date = date as u32;
  walletDayData.addedLiquidity = ZERO_BI;
  walletDayData.removedLiquidity = ZERO_BI;

  return walletDayData;
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
 * @returns CellarShare
 */
export function initCellarShare(cellar: Cellar, wallet: Wallet): CellarShare {
  const cellarShareID = wallet.id + "-" + cellar.id;
  const balanceInit = ZERO_BI;

  let cellarShare = new CellarShare(cellarShareID);
  cellarShare.wallet = wallet.id;
  cellarShare.cellar = cellar.id;
  cellarShare.balance = balanceInit;

  return cellarShare;
}

/** Loads the `CellarShare` corresponding to the given wallet and cellar.
 * @param  {Wallet} wallet
 * @param  {Cellar} cellar
 * @returns CellarShare
 */
export function loadCellarShare(wallet: Wallet, cellar: Cellar): CellarShare {
  const walletID = wallet.id;
  const cellarID = cellar.id;
  const cellarShareID = walletID + "-" + cellarID;

  let cellarShare = CellarShare.load(cellarShareID);
  if (cellarShare == null) {
    cellarShare = initCellarShare(cellar, wallet);
  }

  return cellarShare;
}

export function initCellarShareTransfer(
  from: string,
  to: string,
  cellar: Cellar,
  wallet: Wallet,
  amount: BigInt,
  block: BigInt,
  txId: string,
  timestamp: BigInt
): CellarShareTransfer {
  const id = timestamp
    .toString()
    .concat(ID_DELIMITER)
    .concat(cellar.id)
    .concat(ID_DELIMITER)
    .concat(wallet.id);

  const cellarShareTransfer = new CellarShareTransfer(id);
  cellarShareTransfer.from = from;
  cellarShareTransfer.to = to;
  cellarShareTransfer.cellar = cellar.id;
  cellarShareTransfer.wallet = wallet.id;
  cellarShareTransfer.amount = amount;
  cellarShareTransfer.txId = txId;
  cellarShareTransfer.block = block.toI32();
  cellarShareTransfer.timestamp = timestamp.toI32();

  return cellarShareTransfer;
}

export function createDepositWithdrawEvent(
  blockTimestamp: BigInt,
  cellarAddress: string,
  walletAddress: string,
  amount: BigInt,
  txId: string,
  blockNumber: BigInt
): DepositWithdrawEvent {
  const id = blockTimestamp
    .toString()
    .concat(ID_DELIMITER)
    .concat(walletAddress);
  const event = new DepositWithdrawEvent(id);

  event.cellar = cellarAddress;
  event.wallet = walletAddress;
  event.amount = amount;
  event.txId = txId;
  event.block = blockNumber.toI32();
  event.timestamp = blockTimestamp.toI32();
  event.save();

  return event;
}

export function createDepositWithdrawAaveEvent(
  blockTimestamp: BigInt,
  cellarAddress: string,
  amount: BigInt,
  txId: string,
  blockNumber: BigInt
): DepositWithdrawAaveEvent {
  // id: txId
  const id = txId;
  const event = new DepositWithdrawAaveEvent(id);

  event.cellar = cellarAddress;
  event.amount = amount;
  event.txId = txId;
  event.block = blockNumber.toI32();
  event.timestamp = blockTimestamp.toI32();
  event.save();

  return event;
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
