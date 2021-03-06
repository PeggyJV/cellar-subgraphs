import {
  Deposit,
  DepositToAave,
  LiquidityRestrictionRemoved,
  Withdraw,
  WithdrawFromAave,
  Transfer,
} from "../generated/Cellar/Cellar";
import { Wallet } from "../generated/schema";
import { ZERO_BI, TEN_BI } from "./utils/constants";
import {
  createDepositWithdrawEvent,
  createAaveDepositWithdrawEvent,
  loadCellar,
  loadCellarDayData,
  loadCellarShare,
  loadTokenERC20,
  loadWalletDayData,
  initCellarShareTransfer,
} from "./utils/helpers";
import { Address, BigInt } from "@graphprotocol/graph-ts";

export function handleDeposit(event: Deposit): void {
  // Cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);

  // Log cellar statistics
  const liqAmount = event.params.assets;
  cellar.addedLiquidityAllTime = cellar.addedLiquidityAllTime.plus(liqAmount);
  cellar.tvlInactive = cellar.tvlInactive.plus(liqAmount);
  cellar.tvlTotal = cellar.tvlTotal.plus(liqAmount);

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
  const cellarDayData = loadCellarDayData(cellar, timestamp);
  cellarDayData.addedLiquidity = cellarDayData.addedLiquidity.plus(liqAmount);

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
  walletDayData.save();
}

export function handleWithdraw(event: Withdraw): void {
  // cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);

  // removedLiquidityAllTime
  const liqAmount = event.params.assets;
  cellar.removedLiquidityAllTime =
    cellar.removedLiquidityAllTime.plus(liqAmount);
  cellar.tvlInactive = cellar.tvlInactive.minus(liqAmount);
  cellar.tvlTotal = cellar.tvlTotal.minus(liqAmount);

  // cellarDayData - Log cellar timeseries data
  const timestamp = event.block.timestamp;
  const cellarDayData = loadCellarDayData(cellar, timestamp);
  cellarDayData.removedLiquidity =
    cellarDayData.removedLiquidity.plus(liqAmount);

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
  walletDayData.save();
}

export function handleDepositToAave(event: DepositToAave): void {
  const depositAmount = event.params.amount;
  const tokenAddress = event.params.token.toHexString();
  const token = loadTokenERC20(tokenAddress);

  // cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);
  cellar.tvlActive = cellar.tvlActive.plus(depositAmount);
  cellar.tvlInactive = cellar.tvlInactive.minus(depositAmount);

  // input asset = new aave lending token
  cellar.asset = token.id;

  // update maxLiquidity, see maxDeposit impl in contract
  if (cellar.maxLiquidity.notEqual(ZERO_BI)) {
    const decimals = TEN_BI.pow(token.decimals as u8);
    cellar.maxLiquidity = BigInt.fromI32(50000).times(decimals);
  }

  cellar.save();

  // createAaveDepositWithdrawEvent
  const timestamp = event.block.timestamp;
  createAaveDepositWithdrawEvent(
    timestamp,
    cellar.id,
    depositAmount,
    event.transaction.hash.toHexString(),
    event.block.number
  );
}

export function handleWithdrawFromAave(event: WithdrawFromAave): void {
  const withdrawAmount = event.params.amount;

  // cellar
  const cellarAddress = event.address;
  const cellar = loadCellar(cellarAddress);
  cellar.tvlActive = cellar.tvlActive.minus(withdrawAmount);
  cellar.tvlInactive = cellar.tvlInactive.plus(withdrawAmount);
  cellar.save();

  // createEvent
  const timestamp = event.block.timestamp;
  createAaveDepositWithdrawEvent(
    timestamp,
    cellar.id,
    withdrawAmount.neg(),
    event.transaction.hash.toHexString(),
    event.block.number
  );
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

export function handleLiquidityRestrictionRemoved(
  event: LiquidityRestrictionRemoved
): void {
  const cellar = loadCellar(event.address);
  cellar.maxLiquidity = ZERO_BI;

  cellar.save();
}
