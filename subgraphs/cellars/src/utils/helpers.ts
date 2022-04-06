import { Cellar as CellarContract } from "../../generated/Cellar/Cellar";
import { ERC20 } from "../../generated/Cellar/ERC20";
import {
  DepositWithdrawEvent,
  Cellar,
  CellarDayData,
  CellarShare,
  CellarShareTransfer,
  AaveDepositWithdrawEvent,
  TokenERC20,
  Wallet,
  WalletDayData,
} from "../../generated/schema";
import { ZERO_BI, TEN_BI } from "./constants";
import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export const ID_DELIMITER = "-";
export const DAY_SECONDS = 60 * 60 * 24;

export function initCellar(contractAddress: Address): Cellar {
  const id = contractAddress.toHexString();
  const cellar = new Cellar(id);

  cellar.name = "AaveStablecoinCellar";

  const contract = CellarContract.bind(contractAddress);
  cellar.asset = contract.asset().toHexString();
  cellar.feePlatform = contract.PLATFORM_FEE();
  cellar.feePerformance = contract.PERFORMANCE_FEE();

  const token = loadTokenERC20(cellar.asset);
  const decimals = TEN_BI.pow(token.decimals as u8); // USDC decimals = 6, assume asset starts as USDC
  cellar.maxLiquidity = BigInt.fromI32(50000).times(decimals);

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
  cellar: Cellar,
  id: string,
  date: number
): CellarDayData {
  const cellarDayData = new CellarDayData(id);

  cellarDayData.cellar = cellar.id;
  cellarDayData.date = date as u32;
  cellarDayData.addedLiquidity = ZERO_BI;
  cellarDayData.removedLiquidity = ZERO_BI;
  cellarDayData.numWallets = 0;

  return cellarDayData;
}

export function loadCellarDayData(
  cellar: Cellar,
  blockTimestamp: BigInt
): CellarDayData {
  const date = (blockTimestamp.toI32() / DAY_SECONDS) * DAY_SECONDS;
  const id = date.toString().concat(ID_DELIMITER).concat(cellar.id);

  let cellarDayData = CellarDayData.load(id);
  if (cellarDayData == null) {
    cellarDayData = initCellarDayData(cellar, id, date);
  }

  return cellarDayData;
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

export function createDepositToWithdrawFromAaveEvent(
  blockTimestamp: BigInt,
  cellarAddress: string,
  amount: BigInt,
  txId: string,
  blockNumber: BigInt
): AaveDepositWithdrawEvent {
  // id: txId
  const id = txId;
  const event = new AaveDepositWithdrawEvent(id);

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

export function loadTokenERC20(address: string): TokenERC20 {
  let token = TokenERC20.load(address);
  if (token == null) {
    token = initToken(address);
  }

  return token;
}
