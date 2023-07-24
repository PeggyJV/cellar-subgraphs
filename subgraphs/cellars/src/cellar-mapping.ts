import { Deposit, DepositIntoPosition, DepositLimitChanged, Withdraw, WithdrawFromPosition, Transfer, LiquidityLimitChanged, Cellar } from "../generated/Cellar/Cellar";
import { ZERO_BI, ONE_SHARE } from "./utils/constants";
import { loadWallet, loadOrCreateWallet, loadWalletCellarData, loadBalanceChange } from "./utils/entities";
import { loadCellar, loadCellarDayData, loadCellarHourData, loadOrCreateTokenERC20, loadWalletCellarShare, loadWalletDayData, normalizeDecimals } from "./utils/helpers";
import { Address, BigInt } from "@graphprotocol/graph-ts";


export function handleDeposit(event: Deposit): void {
  // Cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);
  const contract = Cellar.bind(cellarAddress);

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
  const wallet = loadWallet(walletAddress, cellar);
  wallet.currentDeposits = wallet.currentDeposits.plus(liqAmount);
  wallet.totalDeposits = wallet.totalDeposits.plus(liqAmount);

  // WalletCellarData
  const walletCellarData = loadWalletCellarData(walletAddress, cellar.id);
  walletCellarData.currentDeposits =
    walletCellarData.currentDeposits.plus(liqAmount);
  walletCellarData.totalDeposits =
    walletCellarData.totalDeposits.plus(liqAmount);

  // Log cellar timeseries data
  const timestamp = event.block.timestamp;
  const cellarDayData = loadCellarDayData(cellar.id, timestamp, cellarAsset);
  cellarDayData.addedLiquidity = cellarDayData.addedLiquidity.plus(liqAmount);

  const cellarHourData = loadCellarHourData(cellar.id, timestamp, cellarAsset);
  cellarHourData.addedLiquidity = cellarHourData.addedLiquidity.plus(liqAmount);

  // Log wallet (user) timeseries data
  const walletDayData = loadWalletDayData(wallet, timestamp);
  walletDayData.addedLiquidity = walletDayData.addedLiquidity.plus(liqAmount);

  const depositData = loadBalanceChange(
    event.transaction.hash.toHexString(),
    event.logIndex.toString(),
    walletAddress,
    cellarAddress.toHexString(),
    timestamp.toI32(),
    liqAmount,
    event.params.shares,
    contract.try_convertToAssets(ONE_SHARE).value,
    "DEPOSIT"
  );

  // Save the entities we've modified
  cellar.save();
  cellarDayData.save();
  cellarHourData.save();
  walletDayData.save();
  wallet.save();
  walletCellarData.save();
  depositData.save();
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
  const contract = Cellar.bind(cellarAddress);

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

  // Wallet & WalletCellarData
  const walletAddress = event.params.owner.toHexString();
  const wallet = loadWallet(walletAddress, cellar);
  const walletCellarData = loadWalletCellarData(walletAddress, cellar.id);

  wallet.totalWithdrawals = wallet.totalWithdrawals.plus(liqAmount);
  walletCellarData.totalWithdrawals =
    walletCellarData.totalWithdrawals.plus(liqAmount);

  wallet.currentDeposits = wallet.currentDeposits.minus(liqAmount);
  walletCellarData.currentDeposits =
    walletCellarData.currentDeposits.minus(liqAmount);

  // Ensure currentDeposits is not negative
  // If it is negative, all deposits have been withdrawn and what is left are gains
  if (wallet.currentDeposits.lt(ZERO_BI)) {
    wallet.currentDeposits = ZERO_BI;
  }

  if (walletCellarData.currentDeposits.lt(ZERO_BI)) {
    walletCellarData.currentDeposits = ZERO_BI;
  }

  //walletDayData - Log wallet (user) timeseries data
  const walletDayData = loadWalletDayData(wallet, timestamp);
  walletDayData.removedLiquidity =
    walletDayData.removedLiquidity.plus(liqAmount);

  const withdrawData = loadBalanceChange(
    event.transaction.hash.toHexString(),
    event.logIndex.toString(),
    walletAddress,
    cellarAddress.toHexString(),
    timestamp.toI32(),
    liqAmount,
    event.params.shares,
    contract.try_convertToAssets(ONE_SHARE).value,
    "WITHDRAW"
  );

  // Save entities we've modified
  cellar.save();
  cellarDayData.save();
  cellarHourData.save();
  walletDayData.save();
  wallet.save();
  walletCellarData.save();
  withdrawData.save();
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
    const wallet = loadOrCreateWallet(walletAddress, cellar);

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
    const wallet = loadOrCreateWallet(walletAddress, cellar);

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
    // TransferEvent is a transfer
    const fromAddress = from.toHexString();
    const fromWallet = loadOrCreateWallet(fromAddress, cellar);
    const fromShare = loadWalletCellarShare(fromWallet, cellar);
    fromShare.balance = fromShare.balance.minus(transferAmount);
    if (fromShare.balance == ZERO_BI) {
      cellar.numWalletsActive -= 1;
      cellar.save();
    }

    const toAddress = to.toHexString();
    const toWallet = loadOrCreateWallet(toAddress, cellar);
    const toShare = loadWalletCellarShare(toWallet, cellar);
    toShare.balance = toShare.balance.plus(transferAmount);

    fromShare.save();
    toShare.save();
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

export function handleDepositLimitChanged(event: DepositLimitChanged): void {
  // cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);

  cellar.depositLimit = event.params.newLimit;
  cellar.save();
}