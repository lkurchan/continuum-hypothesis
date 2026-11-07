// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ContinuumStreams} from "../src/ContinuumStreams.sol";

/// @notice Runs against real ARGt on an Arbitrum One fork. Skipped without ARBITRUM_RPC_URL.
contract ContinuumStreamsForkTest is Test {
    IERC20 constant ARGT = IERC20(0x59863989d080B22476DB95656d0C3CC18be92214);
    address constant CURVE_POOL = 0x356D349dA9ADd7Efb56a35fAB939A2c6D852f853;

    ContinuumStreams streams;
    address payer = makeAddr("payer");
    address worker = makeAddr("worker");
    address belo = makeAddr("belo");
    uint256 constant TOTAL = 1_000e18;

    function setUp() public {
        string memory rpc = vm.envOr("ARBITRUM_RPC_URL", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(rpc);
        vm.setEvmVersion("cancun"); // ARGt bytecode uses post-paris opcodes
        streams = new ContinuumStreams();
        _fund(payer, TOTAL);
    }

    function _fund(address to, uint256 amount) internal {
        // deal writes the balance slot; fall back to the Curve pool if the proxy layout defeats it.
        try this.dealArgt(to, amount) {}
        catch {
            vm.prank(CURVE_POOL);
            ARGT.transfer(to, amount);
        }
        assertEq(ARGT.balanceOf(to), amount);
    }

    function dealArgt(address to, uint256 amount) external {
        deal(address(ARGT), to, amount);
    }

    function test_fork_createAndWithdraw() public {
        uint64 start = uint64(block.timestamp);
        uint64 end = start + 30 days;

        vm.startPrank(payer);
        ARGT.approve(address(streams), TOTAL);
        uint256 id = streams.createStream(worker, ARGT, TOTAL, start, end, TOTAL);
        vm.stopPrank();
        assertEq(ARGT.balanceOf(address(streams)), TOTAL);

        vm.warp(start + 15 days);
        assertEq(streams.withdrawableAmount(id), TOTAL / 2);

        vm.startPrank(worker);
        streams.withdrawTo(id, worker, TOTAL / 4);
        streams.withdrawTo(id, belo, TOTAL / 4);
        vm.stopPrank();

        assertEq(ARGT.balanceOf(worker), TOTAL / 4);
        assertEq(ARGT.balanceOf(belo), TOTAL / 4);
        assertEq(ARGT.balanceOf(address(streams)), TOTAL / 2);
        assertEq(streams.withdrawableAmount(id), 0);
    }
}
