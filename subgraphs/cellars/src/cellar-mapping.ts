import {
  Deposit,
  DepositToAave,
  Withdraw,
  WithdrawFromAave,
  Transfer as CellarShareTransferEvent,
} from "../generated/Cellar/Cellar";
import { Wallet } from "../generated/schema";
import { ZERO_BI, TEN_BI } from "./utils/constants";
import {
  createDepositWithdrawEvent,
  createDepositWithdrawAaveEvent,
  loadCellar,
  loadCellarDayData,
  loadCellarHourData,
  loadCellarShare,
  loadOrCreateTokenERC20,
  loadWalletDayData,
  initCellarShareTransfer,
  normalizeDecimals,
} from "./utils/helpers";
import { Address, BigInt } from "@graphprotocol/graph-ts";

export function handleDeposit(event: Deposit): void {
  // Cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);
  if (cellar.asset == null) {
    return;
  }

  const cellarAsset = cellar.asset as string;
  const asset = loadOrCreateTokenERC20(cellarAsset);

  // Log cellar statistics
  const liqAmount = normalizeDecimals(
    event.params.assets,
    BigInt.fromI32(asset.decimals)
  );
  cellar.addedLiquidityAllTime = cellar.addedLiquidityAllTime.plus(liqAmount);

  // Wallet
  const walletAddress = event.params.owner.toHexString();
  let wallet = Wallet.load(walletAddress);
  if (wallet == null) {
    // Create a new wallet if we haven't seen it before
    wallet = new Wallet(walletAddress);
    wallet.save();
    cellar.numWalletsAllTime += 1;
    cellar.numWalletsActive += 1;
  }

  // Log cellar timeseries data
  const timestamp = event.block.timestamp;
  const cellarDayData = loadCellarDayData(cellar.id, timestamp, cellarAsset);
  cellarDayData.addedLiquidity = cellarDayData.addedLiquidity.plus(liqAmount);

  const cellarHourData = loadCellarHourData(cellar.id, timestamp, cellarAsset);
  cellarHourData.addedLiquidity = cellarHourData.addedLiquidity.plus(liqAmount);

  // Log wallet (user) timeseries data
  const walletDayData = loadWalletDayData(wallet, timestamp);
  walletDayData.addedLiquidity = walletDayData.addedLiquidity.plus(liqAmount);

  // Log the actual Deposit event
  createDepositWithdrawEvent(
    timestamp,
    cellar.id,
    wallet.id,
    liqAmount,
    event.transaction.hash.toHexString(),
    event.block.number
  );

  // Save the entities we've modified
  cellar.save();
  cellarDayData.save();
  cellarHourData.save();
  walletDayData.save();
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
    wallet.save();
    cellar.numWalletsAllTime += 1;
    cellar.numWalletsActive += 1;
  }

  //walletDayData - Log wallet (user) timeseries data
  const walletDayData = loadWalletDayData(wallet, timestamp);
  walletDayData.removedLiquidity =
    walletDayData.removedLiquidity.plus(liqAmount);

  // Log the event, cellarRemoveLiquidity, as `DepositWithdrawEvent`
  createDepositWithdrawEvent(
    timestamp,
    cellar.id,
    wallet.id,
    liqAmount.neg(),
    event.transaction.hash.toHexString(),
    event.block.number
  );

  // Save entities we've modified
  cellar.save();
  cellarDayData.save();
  cellarHourData.save();
  walletDayData.save();
}

export function handleDepositToAave(event: DepositToAave): void {
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

  // update liquidityLimit, see maxDeposit impl in contract
  if (cellar.liquidityLimit.notEqual(ZERO_BI)) {
    const decimals = TEN_BI.pow(token.decimals as u8);
    cellar.liquidityLimit = BigInt.fromI32(50000).times(decimals);
  }

  cellar.save();

  // createDepositWithdrawAaveEvent
  const timestamp = event.block.timestamp;
  createDepositWithdrawAaveEvent(
    timestamp,
    cellar.id,
    depositAmount,
    event.transaction.hash.toHexString(),
    event.block.number
  );
}

export function handleWithdrawFromAave(event: WithdrawFromAave): void {
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

  // createDepositWithdrawAaveEvent
  const timestamp = event.block.timestamp;
  createDepositWithdrawAaveEvent(
    timestamp,
    cellar.id,
    withdrawAmount.neg(),
    event.transaction.hash.toHexString(),
    event.block.number
  );
}

export function handleTransfer(event: CellarShareTransferEvent): void {
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
      wallet.save();
      cellar.numWalletsAllTime += 1;
      cellar.numWalletsActive += 1;
      cellar.save();
    }

    // Init cellarShare
    const cellarShare = loadCellarShare(wallet, cellar);
    cellarShare.balance = cellarShare.balance.plus(transferAmount);
    cellarShare.save();

    // cellarsharetransfer
    const timestamp = event.block.timestamp;
    const txHash = event.transaction.hash.toHexString();
    const cellarShareTransfer = initCellarShareTransfer(
      from.toHexString(),
      to.toHexString(),
      cellar,
      wallet,
      transferAmount,
      event.block.number,
      txHash,
      timestamp
    );
    cellarShareTransfer.save();
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
      wallet.save();
      cellar.numWalletsAllTime += 1;
      cellar.numWalletsActive += 1;
    }

    // Init cellarShare
    const cellarShare = loadCellarShare(wallet, cellar);
    cellarShare.balance = cellarShare.balance.minus(transferAmount);
    if (cellarShare.balance == ZERO_BI) {
      // Lower the 'numWallets' of the cellar in the case balance is zero.
      cellar.numWalletsActive -= 1;
      cellar.save();
    }
    cellarShare.save();

    // cellarsharetransfer
    const timestamp = event.block.timestamp;
    const txHash = event.transaction.hash.toHexString();
    const cellarShareTransfer = initCellarShareTransfer(
      from.toHexString(),
      to.toHexString(),
      cellar,
      wallet,
      transferAmount,
      event.block.number,
      txHash,
      timestamp
    );

    cellarShareTransfer.save();
  } else {
    // TransferEvent is neither a mint nor a burn.
  }
}

// export function handleLiquidityRestrictionRemoved(
//   event: LiquidityRestrictionRemoved
// ): void {
//   const cellar = loadCellar(event.address);
//   cellar.liquidityLimit = ZERO_BI;
//
//   cellar.save();
// }
//
// export function handleAccruedPlatformFees(event: AccruedPlatformFees) {
//   const cellar = loadCellar(event.address);
//   cellar.accruedPlatformFees = cellar.accruedPlatformFees.plus(
//     event.params.fees
//   );
//
//   cellar.save();
// }
//
// export function handleAccruedPerformanceFees(event: AccruedPerformanceFees) {
//   const cellar = loadCellar(event.address);
//   cellar.accruedPerformanceFees = cellar.accruedPerformanceFees.plus(
//     event.params.fees
//   );
//
//   cellar.save();
// }
//
// export function handleBurntPerformanceFees(event: BurntPerformanceFees) {
//   const cellar = loadCellar(event.address);
//   cellar.burntPerformanceFees = cellar.burntPerformanceFees.plus(
//     event.params.fees
//   );
//
//   cellar.save();
// }
