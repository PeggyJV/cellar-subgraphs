import { CalculationsCurve as CalculationsCurveContract } from "../../../generated/CellarSnapshot/CalculationsCurve";
import * as constants from "../common/constants";
import { CustomPriceType } from "../common/types";
import * as utils from "../common/utils";
import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export function getCalculationsCurveContract(
  network: string
): CalculationsCurveContract {
  return CalculationsCurveContract.bind(
    constants.CURVE_CALCULATIONS_ADDRESS_MAP.get(network)!
  );
}

export function getTokenPriceFromCalculationCurve(
  tokenAddr: Address,
  network: string
): CustomPriceType {
  const calculationCurveContract = getCalculationsCurveContract(network);

  if (!calculationCurveContract) {
    return new CustomPriceType();
  }

  let tokenPrice: BigDecimal = utils
    .readValue<BigInt>(
      calculationCurveContract.try_getCurvePriceUsdc(tokenAddr),
      constants.BIGINT_ZERO
    )
    .toBigDecimal();

  return CustomPriceType.initialize(
    tokenPrice,
    constants.DEFAULT_USDC_DECIMALS
  );
}
