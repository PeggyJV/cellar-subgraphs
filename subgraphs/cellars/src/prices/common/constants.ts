import { SushiSwapPair__getReservesResult } from "../../../generated/CellarSnapshot/SushiSwapPair";
import { UniswapPair__getReservesResult } from "../../../generated/CellarSnapshot/UniswapPair";
import * as ARBITRUM_ONE from "../config/arbitrumOne";
import * as BSC from "../config/bsc";
import * as FANTOM from "../config/fantom";
import * as MAINNET from "../config/mainnet";
import { Address, BigDecimal, BigInt, TypedMap } from "@graphprotocol/graph-ts";

///////////////////////////////////////////////////////////////////////////
/////////////////////////////////// COMMON ////////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const BIGINT_ZERO = BigInt.fromI32(0);
export const BIGINT_TEN = BigInt.fromI32(10);
export const BIGINT_TEN_THOUSAND = BigInt.fromI32(10000);

export const BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);

export const DEFAULT_USDC_DECIMALS = 6;
export const DEFAULT_DECIMALS = BigInt.fromI32(18);

export const ZERO_ADDRESS_STRING = "0x0000000000000000000000000000000000000000";

export const ZERO_ADDRESS = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);
export const CHAIN_LINK_USD_ADDRESS = Address.fromString(
  "0x0000000000000000000000000000000000000348"
);

export const WHITELIST_TOKENS_LIST: string[] = [
  "WETH",
  "USDT",
  "DAI",
  "USDC",
  "ETH",
  "WBTC",
  "EURS",
  "LINK",
  "gfUSDT",
  "WFTM",
  "fBTC",
  "FRAX",
  "CRV",
  "SWETH",
];

///////////////////////////////////////////////////////////////////////////
///////////////////////////// CURVE CONTRACT //////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const CURVE_CALCULATIONS_ADDRESS_MAP = new TypedMap<string, Address>();
CURVE_CALCULATIONS_ADDRESS_MAP.set(
  MAINNET.NETWORK_STRING,
  MAINNET.CURVE_CALCULATIONS_ADDRESS
);
CURVE_CALCULATIONS_ADDRESS_MAP.set(
  BSC.NETWORK_STRING,
  BSC.CURVE_CALCULATIONS_ADDRESS
);
CURVE_CALCULATIONS_ADDRESS_MAP.set(
  FANTOM.NETWORK_STRING,
  FANTOM.CURVE_CALCULATIONS_ADDRESS
);
CURVE_CALCULATIONS_ADDRESS_MAP.set(
  ARBITRUM_ONE.NETWORK_STRING,
  ARBITRUM_ONE.CURVE_CALCULATIONS_ADDRESS
);

export const CURVE_REGISTRY_ADDRESS_MAP = new TypedMap<string, Address>();
CURVE_REGISTRY_ADDRESS_MAP.set(
  MAINNET.NETWORK_STRING,
  MAINNET.CURVE_REGISTRY_ADDRESS
);
CURVE_REGISTRY_ADDRESS_MAP.set(BSC.NETWORK_STRING, BSC.CURVE_REGISTRY_ADDRESS);
CURVE_REGISTRY_ADDRESS_MAP.set(
  FANTOM.NETWORK_STRING,
  FANTOM.CURVE_REGISTRY_ADDRESS
);
CURVE_REGISTRY_ADDRESS_MAP.set(
  ARBITRUM_ONE.NETWORK_STRING,
  ARBITRUM_ONE.CURVE_REGISTRY_ADDRESS
);

export const CURVE_POOL_REGISTRY_ADDRESS_MAP = new TypedMap<string, Address>();
CURVE_POOL_REGISTRY_ADDRESS_MAP.set(
  MAINNET.NETWORK_STRING,
  MAINNET.CURVE_POOL_REGISTRY_ADDRESS
);
CURVE_POOL_REGISTRY_ADDRESS_MAP.set(
  BSC.NETWORK_STRING,
  BSC.CURVE_POOL_REGISTRY_ADDRESS
);
CURVE_POOL_REGISTRY_ADDRESS_MAP.set(
  FANTOM.NETWORK_STRING,
  FANTOM.CURVE_POOL_REGISTRY_ADDRESS
);
CURVE_POOL_REGISTRY_ADDRESS_MAP.set(
  ARBITRUM_ONE.NETWORK_STRING,
  ARBITRUM_ONE.CURVE_POOL_REGISTRY_ADDRESS
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////// SUSHISWAP CONTRACT //////////////////////////
///////////////////////////////////////////////////////////////////////////

export const SUSHISWAP_DEFAULT_RESERVE_CALL =
  new SushiSwapPair__getReservesResult(BIGINT_ZERO, BIGINT_ZERO, BIGINT_ZERO);

export const SUSHISWAP_CALCULATIONS_ADDRESS_MAP = new TypedMap<
  string,
  Address
>();
SUSHISWAP_CALCULATIONS_ADDRESS_MAP.set(
  MAINNET.NETWORK_STRING,
  MAINNET.SUSHISWAP_CALCULATIONS_ADDRESS
);
SUSHISWAP_CALCULATIONS_ADDRESS_MAP.set(
  BSC.NETWORK_STRING,
  BSC.SUSHISWAP_CALCULATIONS_ADDRESS
);
SUSHISWAP_CALCULATIONS_ADDRESS_MAP.set(
  FANTOM.NETWORK_STRING,
  FANTOM.SUSHISWAP_CALCULATIONS_ADDRESS
);
SUSHISWAP_CALCULATIONS_ADDRESS_MAP.set(
  ARBITRUM_ONE.NETWORK_STRING,
  ARBITRUM_ONE.SUSHISWAP_CALCULATIONS_ADDRESS
);

export const SUSHISWAP_WETH_ADDRESS = new TypedMap<string, Address>();
SUSHISWAP_WETH_ADDRESS.set(
  MAINNET.NETWORK_STRING,
  MAINNET.SUSHISWAP_WETH_ADDRESS
);
SUSHISWAP_WETH_ADDRESS.set(BSC.NETWORK_STRING, BSC.SUSHISWAP_WETH_ADDRESS);
SUSHISWAP_WETH_ADDRESS.set(
  FANTOM.NETWORK_STRING,
  FANTOM.SUSHISWAP_WETH_ADDRESS
);
SUSHISWAP_WETH_ADDRESS.set(
  ARBITRUM_ONE.NETWORK_STRING,
  ARBITRUM_ONE.SUSHISWAP_WETH_ADDRESS
);

export const SUSHISWAP_ROUTER_ADDRESS_MAP = new TypedMap<
  string,
  TypedMap<string, Address>
>();
SUSHISWAP_ROUTER_ADDRESS_MAP.set(
  MAINNET.NETWORK_STRING,
  MAINNET.SUSHISWAP_ROUTER_ADDRESS
);
SUSHISWAP_ROUTER_ADDRESS_MAP.set(
  BSC.NETWORK_STRING,
  BSC.SUSHISWAP_ROUTER_ADDRESS
);
SUSHISWAP_ROUTER_ADDRESS_MAP.set(
  FANTOM.NETWORK_STRING,
  FANTOM.SUSHISWAP_ROUTER_ADDRESS
);
SUSHISWAP_ROUTER_ADDRESS_MAP.set(
  ARBITRUM_ONE.NETWORK_STRING,
  ARBITRUM_ONE.SUSHISWAP_ROUTER_ADDRESS
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////// UNISWAP CONTRACT ////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const UNISWAP_DEFAULT_RESERVE_CALL = new UniswapPair__getReservesResult(
  BIGINT_ZERO,
  BIGINT_ZERO,
  BIGINT_ZERO
);

export const UNISWAP_ROUTER_CONTRACT_ADDRESSES = new TypedMap<
  string,
  TypedMap<string, Address>
>();
UNISWAP_ROUTER_CONTRACT_ADDRESSES.set(
  MAINNET.NETWORK_STRING,
  MAINNET.UNISWAP_ROUTER_ADDRESS
);
UNISWAP_ROUTER_CONTRACT_ADDRESSES.set(
  BSC.NETWORK_STRING,
  BSC.UNISWAP_ROUTER_ADDRESS
);
UNISWAP_ROUTER_CONTRACT_ADDRESSES.set(
  FANTOM.NETWORK_STRING,
  FANTOM.SPOOKY_SWAP_ROUTER_ADDRESS
);
UNISWAP_ROUTER_CONTRACT_ADDRESSES.set(
  ARBITRUM_ONE.NETWORK_STRING,
  ARBITRUM_ONE.UNISWAP_ROUTER_ADDRESS
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////// YEARNLENS CONTRACT //////////////////////////
///////////////////////////////////////////////////////////////////////////

export const YEARN_LENS_CONTRACT_ADDRESS = new Map<string, string>();
YEARN_LENS_CONTRACT_ADDRESS.set(
  MAINNET.NETWORK_STRING,
  MAINNET.YEARN_LENS_CONTRACT_ADDRESS
);
YEARN_LENS_CONTRACT_ADDRESS.set(
  BSC.NETWORK_STRING,
  BSC.YEARN_LENS_CONTRACT_ADDRESS
);
YEARN_LENS_CONTRACT_ADDRESS.set(
  FANTOM.NETWORK_STRING,
  FANTOM.YEARN_LENS_CONTRACT_ADDRESS
);
YEARN_LENS_CONTRACT_ADDRESS.set(
  ARBITRUM_ONE.NETWORK_STRING,
  ARBITRUM_ONE.YEARN_LENS_CONTRACT_ADDRESS
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////// CHAINLINK CONTRACT //////////////////////////
///////////////////////////////////////////////////////////////////////////

export const CHAIN_LINK_CONTRACT_ADDRESS = new Map<string, Address>();
CHAIN_LINK_CONTRACT_ADDRESS.set(
  MAINNET.NETWORK_STRING,
  MAINNET.CHAIN_LINK_CONTRACT_ADDRESS
);
CHAIN_LINK_CONTRACT_ADDRESS.set(
  BSC.NETWORK_STRING,
  BSC.CHAIN_LINK_CONTRACT_ADDRESS
);
CHAIN_LINK_CONTRACT_ADDRESS.set(
  FANTOM.NETWORK_STRING,
  FANTOM.CHAIN_LINK_CONTRACT_ADDRESS
);
CHAIN_LINK_CONTRACT_ADDRESS.set(
  ARBITRUM_ONE.NETWORK_STRING,
  ARBITRUM_ONE.CHAIN_LINK_CONTRACT_ADDRESS
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////////// HELPERS /////////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const USDC_DECIMALS_MAP = new TypedMap<string, i32>();
USDC_DECIMALS_MAP.set(MAINNET.NETWORK_STRING, MAINNET.USDC_DECIMALS);
USDC_DECIMALS_MAP.set(BSC.NETWORK_STRING, BSC.USDC_DECIMALS);
USDC_DECIMALS_MAP.set(FANTOM.NETWORK_STRING, FANTOM.USDC_DECIMALS);
USDC_DECIMALS_MAP.set(ARBITRUM_ONE.NETWORK_STRING, ARBITRUM_ONE.USDC_DECIMALS);

export const WHITELIST_TOKENS_MAP = new TypedMap<
  string,
  TypedMap<string, Address>
>();
WHITELIST_TOKENS_MAP.set(MAINNET.NETWORK_STRING, MAINNET.WHITELIST_TOKENS);
WHITELIST_TOKENS_MAP.set(BSC.NETWORK_STRING, BSC.WHITELIST_TOKENS);
WHITELIST_TOKENS_MAP.set(FANTOM.NETWORK_STRING, FANTOM.WHITELIST_TOKENS);
WHITELIST_TOKENS_MAP.set(
  ARBITRUM_ONE.NETWORK_STRING,
  ARBITRUM_ONE.WHITELIST_TOKENS
);
