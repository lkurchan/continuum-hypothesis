// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ContinuumStreams} from "../src/ContinuumStreams.sol";

contract Deploy is Script {
    function run() external returns (ContinuumStreams streams) {
        vm.startBroadcast();
        streams = new ContinuumStreams();
        vm.stopBroadcast();
        console2.log("ContinuumStreams deployed at", address(streams));
    }
}
