import {
  CellarV2,
  CellarV2__getPositionDataResult,
} from "../../generated/CellarV2/CellarV2";
import { Transfer, ERC20 } from "../../generated/USDC/ERC20";
import { V2Adaptor } from "../../generated/USDC/V2Adaptor";
import { getUsdPrice } from "../prices/index";
import {
  CELLAR_START,
  ONE_SHARE,
  ONE_BI,
  ZERO_BI,
  TEN_BI,
  NEGATIVE_ONE_BI,
} from "./constants";
import {
  convertDecimals,
  loadCellar,
  loadCellarDayData,
  loadCellarHourData,
  loadPrevCellarDayData,
  loadOrCreateTokenERC20,
  normalizeDecimals,
} from "./helpers";
import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  log,
} from "@graphprotocol/graph-ts";

export function snapshotDay(event: Transfer, cellarAddress: string): void {
  if (CELLAR_START.has(cellarAddress)) {
    const startBlock = CELLAR_START.get(cellarAddress);
    if (event.block.number.lt(startBlock)) {
      return;
    }
  }

  const address = Address.fromString(cellarAddress);
  const cellar = loadCellar(address);
  if (cellar.asset == null) {
    return;
  }

  const contract = CellarV2.bind(address);

  // Get positions, save on cellar
  // const positions = getPositions(contract);
  // cellar.positions = positions.keys();
  // cellar.positionDistribution = getPositionDistribution(positions, address);

  const cellarAsset = cellar.asset as string;

  const snapshot = loadCellarDayData(
    cellar.id,
    event.block.timestamp,
    cellarAsset
  );
  snapshot.positionDistribution = cellar.positionDistribution;

  const timestamp = event.block.timestamp.toI32();
  const secSinceUpdated = timestamp - snapshot.updatedAt;
  if (snapshot.updatedAt != 0 && secSinceUpdated < 60 * 1) {
    // Bail if we updated in the last minute
    return;
  }

  const asset = loadOrCreateTokenERC20(cellarAsset);

  // TODO
  // snapshot.tvlInvested = cellar.tvlInvested

  const convertShareResult = contract.try_convertToAssets(ONE_SHARE);
  if (convertShareResult.reverted) {
    log.warning("Could not call cellar.converToAssets: {}", [cellar.id]);
  } else {
    cellar.shareValue = convertShareResult.value;
    snapshot.shareValue = convertShareResult.value;

    // Set low candle
    if (
      snapshot.shareValueLow.equals(NEGATIVE_ONE_BI) || // default value
      snapshot.shareValue.lt(snapshot.shareValueLow)
    ) {
      snapshot.shareValueLow = snapshot.shareValue;
    }

    // Set high candle
    if (
      snapshot.shareValueHigh.equals(NEGATIVE_ONE_BI) || // default value
      snapshot.shareValue.gt(snapshot.shareValueHigh)
    ) {
      snapshot.shareValueHigh = snapshot.shareValue;
    }
  }

  const totalAssetsResult = contract.try_totalAssets();
  if (totalAssetsResult.reverted) {
    log.warning("Could not call cellar.totalAssets: {}", [cellar.id]);
  }

  if (!totalAssetsResult.reverted) {
    const holdingPosition = getHoldingPosition(contract);

    if (holdingPosition != Address.zero()) {
      const holdingContract = ERC20.bind(holdingPosition);
      const holdingBalance = holdingContract.balanceOf(address);

      const holdingAsset = loadOrCreateTokenERC20(
        holdingPosition.toHexString()
      );
      const holdingDecimals = BigInt.fromI32(holdingAsset.decimals);
      const inactiveAssets = normalizeDecimals(holdingBalance, holdingDecimals);

      const totalAssets = normalizeDecimals(
        totalAssetsResult.value,
        BigInt.fromI32(asset.decimals)
      );

      const singleShare = convertDecimals(ONE_BI, ZERO_BI, holdingDecimals);
      const shareProfitRatio = cellar.shareValue
        .minus(singleShare)
        .toBigDecimal()
        .div(singleShare.toBigDecimal());
      snapshot.shareProfitRatio = shareProfitRatio;
      snapshot.tvlInactive = inactiveAssets;
      snapshot.tvlTotal = totalAssets;
      snapshot.tvlActive = snapshot.tvlTotal.minus(inactiveAssets);

      cellar.shareProfitRatio = shareProfitRatio;
      cellar.tvlInactive = snapshot.tvlInactive;
      cellar.tvlTotal = snapshot.tvlTotal;
      cellar.tvlActive = snapshot.tvlActive;
      cellar.save();

      const prevSnap = loadPrevCellarDayData(
        cellar.id,
        event.block.timestamp,
        cellarAsset
      );

      // totalAssets[now] + withdrawnAssets[now] - totalAssets[yesterday] + withdrawnAssets[yesterday] - addedLiquidity[now]
      snapshot.earnings = snapshot.tvlTotal
        .minus(prevSnap.tvlTotal)
        .plus(prevSnap.removedLiquidity)
        .plus(snapshot.removedLiquidity)
        .minus(snapshot.addedLiquidity);
    }
  }

  snapshot.updatedAt = timestamp;
  snapshot.save();
}

export function snapshotHour(event: Transfer, cellarAddress: string): void {
  if (CELLAR_START.has(cellarAddress)) {
    const startBlock = CELLAR_START.get(cellarAddress);
    if (event.block.number.lt(startBlock)) {
      return;
    }
  }

  const address = Address.fromString(cellarAddress);
  const cellar = loadCellar(address);
  if (cellar.asset == null) {
    return;
  }

  const contract = CellarV2.bind(address);

  // Get positions, save on cellar
  // const positions = getPositions(contract);
  // cellar.positions = positions.keys();
  // cellar.positionDistribution = getPositionDistribution(positions, address);

  const cellarAsset = cellar.asset as string;

  const snapshot = loadCellarHourData(
    cellar.id,
    event.block.timestamp,
    cellarAsset
  );
  snapshot.positionDistribution = cellar.positionDistribution;

  const timestamp = event.block.timestamp.toI32();
  const secSinceUpdated = timestamp - snapshot.updatedAt;
  if (snapshot.updatedAt != 0 && secSinceUpdated < 60 * 1) {
    // Bail if we updated in the last minute
    return;
  }

  const asset = loadOrCreateTokenERC20(cellarAsset);

  // TODO
  // snapshot.tvlInvested = cellar.tvlInvested

  const convertShareResult = contract.try_convertToAssets(ONE_SHARE);
  if (convertShareResult.reverted) {
    log.warning("Could not call cellar.converToAssets: {}", [cellar.id]);
  } else {
    cellar.shareValue = convertShareResult.value;
    snapshot.shareValue = convertShareResult.value;

    // Set low candle
    if (
      snapshot.shareValueLow.equals(NEGATIVE_ONE_BI) || // default value
      snapshot.shareValue.lt(snapshot.shareValueLow)
    ) {
      snapshot.shareValueLow = snapshot.shareValue;
    }

    // Set high candle
    if (
      snapshot.shareValueHigh.equals(NEGATIVE_ONE_BI) || // default value
      snapshot.shareValue.gt(snapshot.shareValueHigh)
    ) {
      snapshot.shareValueHigh = snapshot.shareValue;
    }
  }

  const totalAssetsResult = contract.try_totalAssets();
  if (totalAssetsResult.reverted) {
    log.warning("Could not call cellar.totalAssets: {}", [cellar.id]);
  }

  if (!totalAssetsResult.reverted) {
    const holdingPosition = getHoldingPosition(contract);

    if (holdingPosition != Address.zero()) {
      const holdingContract = ERC20.bind(holdingPosition);
      const holdingBalance = holdingContract.balanceOf(address);

      const holdingAsset = loadOrCreateTokenERC20(
        holdingPosition.toHexString()
      );
      const holdingDecimals = BigInt.fromI32(holdingAsset.decimals);
      const inactiveAssets = normalizeDecimals(holdingBalance, holdingDecimals);

      const totalAssets = normalizeDecimals(
        totalAssetsResult.value,
        BigInt.fromI32(asset.decimals)
      );

      const singleShare = convertDecimals(ONE_BI, ZERO_BI, holdingDecimals);
      const shareProfitRatio = cellar.shareValue
        .minus(singleShare)
        .toBigDecimal()
        .div(singleShare.toBigDecimal());
      snapshot.shareProfitRatio = shareProfitRatio;
      snapshot.tvlInactive = inactiveAssets;
      snapshot.tvlTotal = totalAssets;
      snapshot.tvlActive = snapshot.tvlTotal.minus(inactiveAssets);

      cellar.shareProfitRatio = shareProfitRatio;
      cellar.tvlInactive = snapshot.tvlInactive;
      cellar.tvlTotal = snapshot.tvlTotal;
      cellar.tvlActive = snapshot.tvlActive;
      cellar.save();

      const prevSnap = loadPrevCellarDayData(
        cellar.id,
        event.block.timestamp,
        cellarAsset
      );

      // totalAssets[now] + withdrawnAssets[now] - totalAssets[yesterday] + withdrawnAssets[yesterday] - addedLiquidity[now]
      snapshot.earnings = snapshot.tvlTotal
        .minus(prevSnap.tvlTotal)
        .plus(prevSnap.removedLiquidity)
        .plus(snapshot.removedLiquidity)
        .minus(snapshot.addedLiquidity);
    }
  }

  snapshot.updatedAt = timestamp;
  snapshot.save();
}

const m = new Map<Address, CellarV2__getPositionDataResult>();
const k = m.keys();
const v = m.values();

// Returns Map of postition address: adaptor address
export function getPositions(
  contract: CellarV2
): Map<string, CellarV2__getPositionDataResult> {
  const result = contract.try_getCreditPositions();
  if (result.reverted) {
    return new Map<string, CellarV2__getPositionDataResult>();
  }

  const addresses = new Map<string, CellarV2__getPositionDataResult>();

  const positionIds = result.value;
  for (let i = 0; i < positionIds.length; i++) {
    const id = positionIds[i];
    const data = contract.try_getPositionData(id);
    if (data.reverted) {
      log.warning("Could not get position data: {}", [id.toString()]);
      continue;
    }

    const adaptorData = data.value.getAdaptorData();
    const addrs = adaptorDataToAddresses(adaptorData);

    for (let j = 0; j < addrs.length; j++) {
      const position = addrs[j].toHexString();
      addresses.set(position, data.value);
    }
  }

  return addresses;
}

export function getPositionDistribution(
  positionDatas: Map<string, CellarV2__getPositionDataResult>,
  cellarAddress: Address
): BigDecimal[] {
  const distribution = new Array<BigDecimal>();
  const positions = positionDatas.keys();

  for (let i = 0; i < positions.length; i++) {
    // Fetch balance
    const positionAddress = positions[i];
    const position = Address.fromString(positionAddress);
    const erc20 = ERC20.bind(position);
    const balanceResult = erc20.try_balanceOf(cellarAddress);

    if (balanceResult.reverted) {
      log.warning("Could not get balance of ERC20: {}", [positions[i]]);
      distribution.push(BigDecimal.zero());
      continue;
    }

    // Fetch underlying asset
    const positionData = positionDatas.get(positionAddress);
    const adaptor = positionData.getAdaptor();
    const adaptorContract = V2Adaptor.bind(adaptor);
    const adaptorData = positionData.getAdaptorData();
    const assetOfResult = adaptorContract.try_assetOf(adaptorData);
    if (assetOfResult.reverted) {
      log.warning("Could not call assetOf for adaptor {} with asset {}", [
        adaptor.toHexString(),
        positionAddress,
      ]);
    }

    // Calculate value
    // For v2 cellars get the balanceOf(position) * usdValue(underlying)
    const underlying = assetOfResult.value;
    const tokenEntity = loadOrCreateTokenERC20(positionAddress);
    const balance = getAmountFromDecimals(
      tokenEntity.decimals,
      balanceResult.value
    );

    // get value of underlying
    const amount = getUsdPrice(underlying, balance);
    distribution.push(amount);
  }

  return distribution;
}

export function adaptorDataToAddresses(data: Bytes): Address[] {
  const str = data.toHexString();
  const len = str.length;
  let idx = 2;

  const addresses = new Array<Address>();
  while (idx < len) {
    idx = idx + 64;
    const start = idx - 40;

    addresses.push(Address.fromString(`0x${str.slice(start, idx)}`));
  }

  return addresses;
}

export function getHoldingPosition(contract: CellarV2): Address {
  let value = Address.zero();
  const holdingPositionResult = contract.try_holdingPosition();
  if (!holdingPositionResult.reverted) {
    const holdingPositionIdx = holdingPositionResult.value;
    const creditPositionResult =
      contract.try_creditPositions(holdingPositionIdx);
    if (!creditPositionResult.reverted) {
      const holdingPositionId = creditPositionResult.value;
      const positionDataResult =
        contract.try_getPositionData(holdingPositionId);

      if (!positionDataResult.reverted) {
        const data = positionDataResult.value.getAdaptorData();
        value = adaptorDataToAddresses(data)[0];
      } else {
        log.warning("Could not call getPositionData with id: {}", [
          holdingPositionId.toString(),
        ]);
      }
    } else {
      log.warning("index out of bounds in creditPositions array: {}", [
        holdingPositionIdx.toString(),
      ]);
    }
  } else {
    log.warning("Could not call cellar.holdingPosition", []);
  }

  return value;
}

// TODO move to helpers
export function getAmountFromDecimals(
  decimals: number,
  amount: BigInt
): BigDecimal {
  if (decimals < 1) {
    return ZERO_BI.toBigDecimal();
  }

  const denom = TEN_BI.pow(decimals as u8).toBigDecimal();
  return amount.toBigDecimal().div(denom);
}

function toHexString(address: Address, index: i32, array: Address[]): string {
  return address.toHexString();
}
