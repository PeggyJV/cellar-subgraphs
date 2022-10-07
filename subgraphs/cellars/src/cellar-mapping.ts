import {
  Deposit,
  DepositIntoPosition,
  Withdraw,
  WithdrawFromPosition,
  Transfer,
  LiquidityLimitChanged,
} from "../generated/Cellar/Cellar";
import { Wallet } from "../generated/schema";
import { ZERO_BI } from "./utils/constants";
import {
  loadCellar,
  loadCellarDayData,
  loadCellarHourData,
  loadOrCreateTokenERC20,
  loadWalletCellarShare,
  loadWalletDayData,
  normalizeDecimals,
} from "./utils/helpers";
import { Address, BigInt, log } from "@graphprotocol/graph-ts";

export function handleDeposit(event: Deposit): void {
  // Cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);

  const cellarAsset = cellar.asset as string;
  const asset = loadOrCreateTokenERC20(cellarAsset);

  // Log cellar statistics
  const liqAmount = normalizeDecimals(
    event.params.assets,
    BigInt.fromI32(asset.decimals)
  );
  cellar.addedLiquidityAllTime = cellar.addedLiquidityAllTime.plus(liqAmount);
  cellar.currentDeposits = cellar.currentDeposits.plus(liqAmount);

  // Wallet
  const walletAddress = event.params.owner.toHexString();
  let wallet = Wallet.load(walletAddress);
  if (wallet == null) {
    // Create a new wallet if we haven't seen it before
    wallet = new Wallet(walletAddress);
    wallet.totalWithdrawals = ZERO_BI;
    wallet.currentDeposits = ZERO_BI;
    wallet.totalDeposits = ZERO_BI;
    cellar.numWalletsAllTime += 1;
    cellar.numWalletsActive += 1;
  }

  wallet.currentDeposits = wallet.currentDeposits.plus(liqAmount);
  wallet.totalDeposits = wallet.totalDeposits.plus(liqAmount);

  // Log cellar timeseries data
  const timestamp = event.block.timestamp;
  const cellarDayData = loadCellarDayData(cellar.id, timestamp, cellarAsset);
  cellarDayData.addedLiquidity = cellarDayData.addedLiquidity.plus(liqAmount);

  const cellarHourData = loadCellarHourData(cellar.id, timestamp, cellarAsset);
  cellarHourData.addedLiquidity = cellarHourData.addedLiquidity.plus(liqAmount);

  // Log wallet (user) timeseries data
  const walletDayData = loadWalletDayData(wallet, timestamp);
  walletDayData.addedLiquidity = walletDayData.addedLiquidity.plus(liqAmount);

  // Save the entities we've modified
  cellar.save();
  cellarDayData.save();
  cellarHourData.save();
  walletDayData.save();
  wallet.save();
}

export function handleWithdraw(event: Withdraw): void {
  // cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);
  if (cellar.asset == null) {
    return;
  }

  const cellarAsset = cellar.asset as string;
  const asset = loadOrCreateTokenERC20(cellarAsset);

  // removedLiquidityAllTime
  const liqAmount = normalizeDecimals(
    event.params.assets,
    BigInt.fromI32(asset.decimals)
  );

  cellar.removedLiquidityAllTime =
    cellar.removedLiquidityAllTime.plus(liqAmount);

  // cellarDayData - Log cellar timeseries data
  const timestamp = event.block.timestamp;
  const cellarDayData = loadCellarDayData(cellar.id, timestamp, cellarAsset);
  cellarDayData.removedLiquidity =
    cellarDayData.removedLiquidity.plus(liqAmount);

  const cellarHourData = loadCellarDayData(cellar.id, timestamp, cellarAsset);
  cellarHourData.removedLiquidity =
    cellarHourData.removedLiquidity.plus(liqAmount);

  // Wallet
  const walletAddress = event.params.owner.toHexString();
  let wallet = Wallet.load(walletAddress);
  if (wallet == null) {
    // Create a new wallet if we haven't seen it before
    wallet = new Wallet(walletAddress);
    wallet.totalWithdrawals = ZERO_BI;
    wallet.currentDeposits = ZERO_BI;
    wallet.totalDeposits = ZERO_BI;
    wallet.save();
    cellar.numWalletsAllTime += 1;
    cellar.numWalletsActive += 1;
  }

  const prevTotalWithdrawals = wallet.totalWithdrawals;
  wallet.totalWithdrawals = wallet.totalWithdrawals.plus(liqAmount);

  // Ensure cellar.currentDeposits is not a negative number
  let depositWithdrawAmount = liqAmount;
  if (prevTotalWithdrawals >= wallet.totalDeposits) {
    // User has alread withdrawn all deposits, current withdraws are gains only.
    depositWithdrawAmount = ZERO_BI;
  } else if (wallet.totalWithdrawals > wallet.totalDeposits) {
    // This withdrawal included gains that exceeded the original deposits
    depositWithdrawAmount = wallet.totalDeposits.minus(prevTotalWithdrawals);
  }
  cellar.currentDeposits = cellar.currentDeposits.minus(depositWithdrawAmount);
  wallet.currentDeposits = wallet.currentDeposits.minus(depositWithdrawAmount);

  //walletDayData - Log wallet (user) timeseries data
  const walletDayData = loadWalletDayData(wallet, timestamp);
  walletDayData.removedLiquidity =
    walletDayData.removedLiquidity.plus(liqAmount);

  // Save entities we've modified
  cellar.save();
  cellarDayData.save();
  cellarHourData.save();
  walletDayData.save();
  wallet.save();
}

export function handleDepositIntoPosition(event: DepositIntoPosition): void {
  const tokenAddress = event.params.position.toHexString();

  // cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);

  // input asset = new aave lending token
  const token = loadOrCreateTokenERC20(tokenAddress);
  cellar.asset = token.id;

  const depositAmount = normalizeDecimals(
    event.params.assets,
    BigInt.fromI32(token.decimals)
  );

  cellar.tvlInvested = cellar.tvlInvested.plus(depositAmount);
  cellar.save();
}

export function handleWithdrawFromPosition(event: WithdrawFromPosition): void {
  // cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);
  if (cellar.asset == null) {
    return;
  }

  const cellarAsset = cellar.asset as string;
  const asset = loadOrCreateTokenERC20(cellarAsset);
  const withdrawAmount = normalizeDecimals(
    event.params.assets,
    BigInt.fromI32(asset.decimals)
  );

  if (cellar.tvlInvested < withdrawAmount) {
    cellar.tvlInvested = ZERO_BI;
  } else {
    cellar.tvlInvested = cellar.tvlInvested.minus(withdrawAmount);
  }

  cellar.save();
}

export function handleTransfer(event: Transfer): void {
  const transferAmount = event.params.amount;
  const from = event.params.from;
  const to = event.params.to;

  const isMint = from == Address.zero() && to != Address.zero();
  const isBurn = to == Address.zero() && from != Address.zero();

  // Init cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);

  if (isMint) {
    /* From ERC20.sol
     ```solidity
     event Transfer(address indexed from, address indexed to, uint256 amount);

     function _mint(address to, uint256 amount) {
       totalSupply += amount;
       balanceOf[to] += amount;
       emit Transfer(address(0), to, amount)
     }
     ```
     */

    // Init wallet
    const walletAddress = to.toHexString();
    let wallet = Wallet.load(walletAddress);
    if (wallet == null) {
      // Create a new wallet if we haven't seen it before
      wallet = new Wallet(walletAddress);
      wallet.totalWithdrawals = ZERO_BI;
      wallet.currentDeposits = ZERO_BI;
      wallet.totalDeposits = ZERO_BI;
      wallet.save();
      cellar.numWalletsAllTime += 1;
      cellar.numWalletsActive += 1;
      cellar.save();
    }

    // Init cellarShare
    const cellarShare = loadWalletCellarShare(wallet, cellar);
    cellarShare.balance = cellarShare.balance.plus(transferAmount);
    cellarShare.save();
  } else if (isBurn) {
    /* From ERC20.sol
    event Transfer(address indexed from, address indexed to, uint256 amount);

    ```solidity
    function _burn(address from, uint256 amount) {
      balanceOf[from] -= amount;
      unchecked {totalSupply -= amount;}
      emit Transfer(from, address(0), amount)
    }
    ```
    */
    const walletAddress = from.toHexString();
    let wallet = Wallet.load(walletAddress);
    if (wallet == null) {
      // Create a new wallet if we haven't seen it before
      wallet = new Wallet(walletAddress);
      wallet.totalWithdrawals = ZERO_BI;
      wallet.currentDeposits = ZERO_BI;
      wallet.totalDeposits = ZERO_BI;
      wallet.save();
      cellar.numWalletsAllTime += 1;
      cellar.numWalletsActive += 1;
    }

    // Init cellarShare
    const cellarShare = loadWalletCellarShare(wallet, cellar);
    cellarShare.balance = cellarShare.balance.minus(transferAmount);
    if (cellarShare.balance == ZERO_BI) {
      // Lower the 'numWallets' of the cellar in the case balance is zero.
      cellar.numWalletsActive -= 1;
      cellar.save();
    }
    cellarShare.save();
  } else {
    // TransferEvent is neither a mint nor a burn.
    // TODO
  }
}

export function handleLiquidityLimitChanged(
  event: LiquidityLimitChanged
): void {
  // cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);

  cellar.liquidityLimit = event.params.newLimit;
  cellar.save();
}
