// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ContinuumStreams} from "../src/ContinuumStreams.sol";

/// @notice Creates one demo stream per worker from the platform wallet.
/// Env: DEMO_PK_PLATFORM, STREAMS_CONTRACT_ADDRESS, WORKER1_ADDRESS, WORKER2_ADDRESS.
/// Optional: ARGT_ADDRESS, SEED_TOTAL (wei per worker, default 100e18),
/// SEED_DEPOSIT (wei per worker, default SEED_TOTAL), SEED_DURATION (seconds, default 1 day).
contract SeedDemo is Script {
    function run() external returns (uint256[] memory ids) {
        ContinuumStreams streams = ContinuumStreams(vm.envAddress("STREAMS_CONTRACT_ADDRESS"));
        IERC20 token = IERC20(vm.envOr("ARGT_ADDRESS", 0x59863989d080B22476DB95656d0C3CC18be92214));
        uint256 total = vm.envOr("SEED_TOTAL", uint256(100e18));
        uint256 deposit = vm.envOr("SEED_DEPOSIT", total);
        uint64 duration = uint64(vm.envOr("SEED_DURATION", uint256(1 days)));

        address[] memory recipients = new address[](2);
        recipients[0] = vm.envAddress("WORKER1_ADDRESS");
        recipients[1] = vm.envAddress("WORKER2_ADDRESS");
        uint256[] memory totals = new uint256[](2);
        uint256[] memory deposits = new uint256[](2);
        for (uint256 i; i < 2; ++i) {
            totals[i] = total;
            deposits[i] = deposit;
        }
        uint64 start = uint64(block.timestamp);

        vm.startBroadcast(vm.envUint("DEMO_PK_PLATFORM"));
        token.approve(address(streams), deposit * 2);
        ids = streams.createStreamsBatch(recipients, totals, deposits, token, start, start + duration);
        vm.stopBroadcast();

        console2.log("Seeded stream ids", ids[0], ids[1]);
    }
}
