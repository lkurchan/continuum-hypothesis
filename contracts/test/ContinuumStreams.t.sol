// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ContinuumStreams} from "../src/ContinuumStreams.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CallbackToken is MockERC20 {
    bytes4 public callbackError;

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        try ContinuumStreams(to).createStream(address(this), this, 1, 1, 2, 0) {
            callbackError = bytes4(0);
        } catch (bytes memory reason) {
            callbackError = bytes4(reason);
        }
        return super.transferFrom(from, to, amount);
    }
}

contract ContinuumStreamsTest is Test {
    ContinuumStreams streams;
    MockERC20 token;

    address payer = makeAddr("payer");
    address worker = makeAddr("worker");
    address belo = makeAddr("belo");

    uint64 constant START = 1_000;
    uint64 constant END = 1_000 + 30 days;
    uint256 constant TOTAL = 1_000_000e18;

    function setUp() public {
        streams = new ContinuumStreams();
        token = new MockERC20();
        token.mint(payer, 10 * TOTAL);
        vm.prank(payer);
        token.approve(address(streams), type(uint256).max);
        vm.warp(START);
    }

    function _create(uint256 deposit) internal returns (uint256 id) {
        vm.prank(payer);
        id = streams.createStream(worker, token, TOTAL, START, END, deposit);
    }

    // 1. Vesting
    function test_vesting_curve() public {
        vm.warp(START - 1);
        uint256 id = _create(TOTAL);
        assertEq(streams.vestedAmount(id), 0);
        vm.warp(START);
        assertEq(streams.vestedAmount(id), 0);
        vm.warp(START + (END - START) / 2);
        assertEq(streams.vestedAmount(id), TOTAL / 2);
        vm.warp(END);
        assertEq(streams.vestedAmount(id), TOTAL);
        vm.warp(END + 365 days);
        assertEq(streams.vestedAmount(id), TOTAL);
    }

    function test_vesting_roundsDown() public {
        vm.prank(payer);
        uint256 id = streams.createStream(worker, token, 10, START, START + 3, 10);
        vm.warp(START + 1);
        assertEq(streams.vestedAmount(id), 3); // 10 * 1 / 3 = 3.33
    }

    // 2. Withdrawable
    function test_withdrawable_fullyFunded() public {
        uint256 id = _create(TOTAL);
        vm.warp(START + 10 days);
        assertEq(streams.withdrawableAmount(id), streams.vestedAmount(id));
    }

    function test_withdrawable_cappedByDeposit() public {
        uint256 id = _create(TOTAL / 4);
        vm.warp(START + (END - START) / 2); // vested = TOTAL/2 > deposited
        assertEq(streams.withdrawableAmount(id), TOTAL / 4);
        vm.prank(worker);
        streams.withdrawTo(id, worker, TOTAL / 8);
        assertEq(streams.withdrawableAmount(id), TOTAL / 8);
    }

    // 3. Withdraw
    function test_withdraw_partialAndFull() public {
        uint256 id = _create(TOTAL);
        vm.warp(START + (END - START) / 2);
        vm.startPrank(worker);
        vm.expectEmit(address(streams));
        emit ContinuumStreams.Withdrawn(id, worker, TOTAL / 10);
        streams.withdrawTo(id, worker, TOTAL / 10);
        streams.withdrawTo(id, worker, streams.withdrawableAmount(id));
        vm.stopPrank();
        assertEq(token.balanceOf(worker), TOTAL / 2);
        assertEq(streams.withdrawableAmount(id), 0);
        assertEq(streams.getStream(id).withdrawn, TOTAL / 2);
    }

    function test_withdraw_toOtherAddress() public {
        uint256 id = _create(TOTAL);
        vm.warp(END);
        vm.prank(worker);
        streams.withdrawTo(id, belo, 5e18);
        assertEq(token.balanceOf(belo), 5e18);
        assertEq(token.balanceOf(worker), 0);
    }

    function test_withdraw_reverts() public {
        uint256 id = _create(TOTAL);
        vm.warp(START + 1 days);
        uint256 w = streams.withdrawableAmount(id);

        vm.startPrank(worker);
        vm.expectRevert(ContinuumStreams.AmountExceedsWithdrawable.selector);
        streams.withdrawTo(id, worker, w + 1);
        vm.expectRevert(ContinuumStreams.ZeroAmount.selector);
        streams.withdrawTo(id, worker, 0);
        vm.expectRevert(ContinuumStreams.ZeroAddress.selector);
        streams.withdrawTo(id, address(0), 1);
        vm.expectRevert(ContinuumStreams.StreamNotFound.selector);
        streams.withdrawTo(99, worker, 1);
        vm.stopPrank();

        vm.prank(payer);
        vm.expectRevert(ContinuumStreams.NotRecipient.selector);
        streams.withdrawTo(id, payer, 1);
    }

    // 4. Top-up
    function test_topUp() public {
        uint256 id = _create(0);
        vm.prank(payer);
        vm.expectEmit(address(streams));
        emit ContinuumStreams.ToppedUp(id, TOTAL / 2);
        streams.topUp(id, TOTAL / 2);
        assertEq(streams.getStream(id).deposited, TOTAL / 2);
        assertEq(token.balanceOf(address(streams)), TOTAL / 2);
    }

    function test_topUp_reverts() public {
        uint256 id = _create(TOTAL / 2);

        vm.prank(worker);
        vm.expectRevert(ContinuumStreams.NotPayer.selector);
        streams.topUp(id, 1);

        vm.startPrank(payer);
        vm.expectRevert(ContinuumStreams.DepositExceedsTotal.selector);
        streams.topUp(id, TOTAL / 2 + 1);
        vm.expectRevert(ContinuumStreams.ZeroAmount.selector);
        streams.topUp(id, 0);
        vm.expectRevert(ContinuumStreams.StreamNotFound.selector);
        streams.topUp(0, 1);
        streams.topUp(id, TOTAL / 2); // exactly reaches total
        streams.cancel(id);
        vm.expectRevert(ContinuumStreams.StreamIsCanceled.selector);
        streams.topUp(id, 1);
        vm.stopPrank();
    }

    // 5. Cancel
    function test_cancel_refundsAndWorkerKeepsVested() public {
        uint256 id = _create(TOTAL);
        vm.warp(START + (END - START) / 4);
        vm.prank(worker);
        streams.withdrawTo(id, worker, TOTAL / 8);

        uint256 payerBefore = token.balanceOf(payer);
        vm.prank(payer);
        vm.expectEmit(address(streams));
        emit ContinuumStreams.Canceled(id, TOTAL - TOTAL / 4, TOTAL / 4);
        streams.cancel(id);
        assertEq(token.balanceOf(payer) - payerBefore, TOTAL - TOTAL / 4);

        ContinuumStreams.Stream memory s = streams.getStream(id);
        assertEq(s.canceledAt, block.timestamp);
        assertEq(s.deposited, TOTAL / 4);

        // vesting is frozen at cancel time
        vm.warp(END + 1);
        assertEq(streams.vestedAmount(id), TOTAL / 4);
        assertEq(streams.withdrawableAmount(id), TOTAL / 8);
        vm.prank(worker);
        streams.withdrawTo(id, worker, TOTAL / 8);
        assertEq(token.balanceOf(worker), TOTAL / 4);
        assertEq(token.balanceOf(address(streams)), 0);
    }

    function test_cancel_partialFundingRefundsNothingWhenVestedExceedsDeposit() public {
        uint256 id = _create(TOTAL / 4);
        vm.warp(START + (END - START) / 2);
        vm.prank(payer);
        vm.expectEmit(address(streams));
        emit ContinuumStreams.Canceled(id, 0, TOTAL / 4);
        streams.cancel(id);
    }

    function test_cancel_afterEnd() public {
        uint256 id = _create(TOTAL);
        vm.warp(END + 1 days);
        vm.prank(payer);
        vm.expectEmit(address(streams));
        emit ContinuumStreams.Canceled(id, 0, TOTAL);
        streams.cancel(id);
    }

    function test_cancel_reverts() public {
        uint256 id = _create(TOTAL);
        vm.prank(worker);
        vm.expectRevert(ContinuumStreams.NotPayer.selector);
        streams.cancel(id);

        vm.startPrank(payer);
        vm.expectRevert(ContinuumStreams.StreamNotFound.selector);
        streams.cancel(2);
        streams.cancel(id);
        vm.expectRevert(ContinuumStreams.StreamIsCanceled.selector);
        streams.cancel(id);
        vm.stopPrank();
    }

    // 6. Batch
    function test_batch() public {
        address[] memory r = new address[](3);
        uint256[] memory t = new uint256[](3);
        uint256[] memory d = new uint256[](3);
        for (uint256 i; i < 3; ++i) {
            r[i] = makeAddr(string(abi.encode(i)));
            t[i] = (i + 1) * 100e18;
            d[i] = i * 10e18; // first one with no initial deposit
        }
        assertEq(streams.nextStreamId(), 1);

        vm.expectCall(address(token), abi.encodeWithSelector(IERC20.transferFrom.selector), 1);
        vm.expectCall(address(token), abi.encodeCall(IERC20.transferFrom, (payer, address(streams), 30e18)), 1);
        vm.prank(payer);
        uint256[] memory ids = streams.createStreamsBatch(r, t, d, token, START, END);

        assertEq(ids.length, 3);
        for (uint256 i; i < 3; ++i) {
            assertEq(ids[i], i + 1);
            ContinuumStreams.Stream memory s = streams.getStream(ids[i]);
            assertEq(s.recipient, r[i]);
            assertEq(s.totalAmount, t[i]);
            assertEq(s.deposited, d[i]);
        }
        assertEq(streams.nextStreamId(), 4);
        assertEq(token.balanceOf(address(streams)), 30e18);
    }

    function test_batch_reverts() public {
        address[] memory r = new address[](2);
        uint256[] memory t = new uint256[](1);
        uint256[] memory d = new uint256[](2);
        r[0] = worker;
        r[1] = belo;
        vm.startPrank(payer);
        vm.expectRevert(ContinuumStreams.LengthMismatch.selector);
        streams.createStreamsBatch(r, t, d, token, START, END);
        vm.expectRevert(ContinuumStreams.EmptyBatch.selector);
        streams.createStreamsBatch(new address[](0), new uint256[](0), new uint256[](0), token, START, END);
        vm.stopPrank();
    }

    // 7. Creation validations
    function test_batch_rollsBackEarlierItemsIfLaterItemIsInvalid() public {
        address[] memory recipients = new address[](2);
        uint256[] memory totals = new uint256[](2);
        uint256[] memory deposits = new uint256[](2);
        recipients[0] = worker;
        recipients[1] = address(0);
        totals[0] = totals[1] = 100;
        deposits[0] = deposits[1] = 50;
        vm.prank(payer);
        vm.expectRevert(ContinuumStreams.ZeroAddress.selector);
        streams.createStreamsBatch(recipients, totals, deposits, token, START, END);
        assertEq(streams.nextStreamId(), 1);
        assertEq(token.balanceOf(address(streams)), 0);
        vm.expectRevert(ContinuumStreams.StreamNotFound.selector);
        streams.getStream(1);
    }

    function test_batch_rollsBackOnFailedTransfer() public {
        address[] memory recipients = new address[](2);
        uint256[] memory totals = new uint256[](2);
        uint256[] memory deposits = new uint256[](2);
        recipients[0] = recipients[1] = worker;
        totals[0] = totals[1] = 100;
        deposits[0] = deposits[1] = 50;
        vm.prank(payer);
        token.approve(address(streams), 0);
        vm.prank(payer);
        vm.expectRevert();
        streams.createStreamsBatch(recipients, totals, deposits, token, START, END);
        assertEq(streams.nextStreamId(), 1);
        assertEq(token.balanceOf(address(streams)), 0);
        vm.expectRevert(ContinuumStreams.StreamNotFound.selector);
        streams.getStream(1);
    }

    function test_failedWithdrawalTransferPreservesAccounting() public {
        uint256 id = _create(TOTAL);
        vm.warp(END);
        vm.mockCallRevert(address(token), abi.encodeCall(IERC20.transfer, (worker, 10)), "token failed");
        vm.prank(worker);
        vm.expectRevert(bytes("token failed"));
        streams.withdrawTo(id, worker, 10);
        assertEq(streams.getStream(id).withdrawn, 0);
        assertEq(streams.withdrawableAmount(id), TOTAL);
        assertEq(token.balanceOf(address(streams)), TOTAL);
    }

    function test_tokenCallbackCannotReenterCreation() public {
        CallbackToken callbackToken = new CallbackToken();
        callbackToken.mint(payer, 100);
        vm.startPrank(payer);
        callbackToken.approve(address(streams), 100);
        streams.createStream(worker, callbackToken, 100, START, END, 100);
        vm.stopPrank();
        assertEq(callbackToken.callbackError(), ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        assertEq(streams.nextStreamId(), 2);
        assertEq(callbackToken.balanceOf(address(streams)), 100);
    }

    function test_create_reverts() public {
        vm.startPrank(payer);
        vm.expectRevert(ContinuumStreams.InvalidTimes.selector);
        streams.createStream(worker, token, TOTAL, END, END, 0);
        vm.expectRevert(ContinuumStreams.InvalidTimes.selector);
        streams.createStream(worker, token, TOTAL, END, START, 0);
        vm.expectRevert(ContinuumStreams.ZeroAddress.selector);
        streams.createStream(address(0), token, TOTAL, START, END, 0);
        vm.expectRevert(ContinuumStreams.ZeroAddress.selector);
        streams.createStream(worker, IERC20(address(0)), TOTAL, START, END, 0);
        vm.expectRevert(ContinuumStreams.ZeroAmount.selector);
        streams.createStream(worker, token, 0, START, END, 0);
        vm.expectRevert(ContinuumStreams.DepositExceedsTotal.selector);
        streams.createStream(worker, token, TOTAL, START, END, TOTAL + 1);
        vm.stopPrank();
    }

    function test_ids_startAtOne_andMissingReverts() public {
        vm.expectRevert(ContinuumStreams.StreamNotFound.selector);
        streams.getStream(0);
        vm.expectRevert(ContinuumStreams.StreamNotFound.selector);
        streams.vestedAmount(1);
        vm.expectRevert(ContinuumStreams.StreamNotFound.selector);
        streams.withdrawableAmount(1);

        vm.expectEmit(address(streams));
        emit ContinuumStreams.StreamCreated(1, payer, worker, address(token), TOTAL, START, END);
        vm.expectEmit(address(streams));
        emit ContinuumStreams.ToppedUp(1, 7);
        assertEq(_create(7), 1);
        assertEq(_create(0), 2);
        assertEq(streams.nextStreamId(), 3);
    }

    // 8. Fuzz: contract balance always equals deposited - withdrawn
    function testFuzz_balanceMatchesAccounting(uint256 seed, uint256 initialDeposit) public {
        initialDeposit = bound(initialDeposit, 0, TOTAL);
        uint256 id = _create(initialDeposit);

        for (uint256 i; i < 16; ++i) {
            uint256 r = uint256(keccak256(abi.encode(seed, i)));
            vm.warp(block.timestamp + (r % 5 days));
            ContinuumStreams.Stream memory s = streams.getStream(id);
            uint256 op = (r >> 8) % 3;
            if (op == 0 && s.canceledAt == 0 && s.deposited < s.totalAmount) {
                vm.prank(payer);
                streams.topUp(id, bound(r >> 16, 1, s.totalAmount - s.deposited));
            } else if (op == 1) {
                uint256 w = streams.withdrawableAmount(id);
                if (w > 0) {
                    vm.prank(worker);
                    streams.withdrawTo(id, worker, bound(r >> 16, 1, w));
                }
            } else if (op == 2 && s.canceledAt == 0 && (r >> 16) % 4 == 0) {
                vm.prank(payer);
                streams.cancel(id);
            }
            s = streams.getStream(id);
            assertEq(token.balanceOf(address(streams)), s.deposited - s.withdrawn);
            assertLe(s.withdrawn, s.deposited);
        }
    }
}
