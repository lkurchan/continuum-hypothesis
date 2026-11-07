// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice Linear token streams: the payer deposits up to `totalAmount` and the
/// recipient withdraws what has vested and been funded, at any time.
contract ContinuumStreams is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error NotPayer();
    error NotRecipient();
    error StreamNotFound();
    error StreamIsCanceled();
    error InvalidTimes();
    error ZeroAddress();
    error ZeroAmount();
    error DepositExceedsTotal();
    error AmountExceedsWithdrawable();
    error LengthMismatch();
    error EmptyBatch();

    struct Stream {
        address payer;
        address recipient;
        IERC20 token;
        uint256 totalAmount;
        uint256 deposited;
        uint256 withdrawn;
        uint64 start;
        uint64 end;
        uint64 canceledAt;
    }

    event StreamCreated(
        uint256 indexed id,
        address indexed payer,
        address indexed recipient,
        address token,
        uint256 totalAmount,
        uint64 start,
        uint64 end
    );
    event ToppedUp(uint256 indexed id, uint256 amount);
    event Withdrawn(uint256 indexed id, address indexed to, uint256 amount);
    event Canceled(uint256 indexed id, uint256 refundedToPayer, uint256 keptByRecipient);

    mapping(uint256 => Stream) private _streams;
    uint256 private _nextId = 1;

    function createStream(
        address recipient,
        IERC20 token,
        uint256 totalAmount,
        uint64 start,
        uint64 end,
        uint256 initialDeposit
    ) external nonReentrant returns (uint256 id) {
        id = _create(recipient, token, totalAmount, start, end, initialDeposit);
        if (initialDeposit > 0) token.safeTransferFrom(msg.sender, address(this), initialDeposit);
    }

    function createStreamsBatch(
        address[] calldata recipients,
        uint256[] calldata totalAmounts,
        uint256[] calldata initialDeposits,
        IERC20 token,
        uint64 start,
        uint64 end
    ) external nonReentrant returns (uint256[] memory ids) {
        uint256 n = recipients.length;
        if (n == 0) revert EmptyBatch();
        if (totalAmounts.length != n || initialDeposits.length != n) revert LengthMismatch();
        ids = new uint256[](n);
        uint256 sum;
        for (uint256 i; i < n; ++i) {
            ids[i] = _create(recipients[i], token, totalAmounts[i], start, end, initialDeposits[i]);
            sum += initialDeposits[i];
        }
        if (sum > 0) token.safeTransferFrom(msg.sender, address(this), sum);
    }

    function topUp(uint256 id, uint256 amount) external nonReentrant {
        Stream storage s = _get(id);
        if (msg.sender != s.payer) revert NotPayer();
        if (s.canceledAt != 0) revert StreamIsCanceled();
        if (amount == 0) revert ZeroAmount();
        if (s.deposited + amount > s.totalAmount) revert DepositExceedsTotal();
        s.deposited += amount;
        emit ToppedUp(id, amount);
        s.token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdrawTo(uint256 id, address to, uint256 amount) external nonReentrant {
        Stream storage s = _get(id);
        if (msg.sender != s.recipient) revert NotRecipient();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > _withdrawable(s)) revert AmountExceedsWithdrawable();
        s.withdrawn += amount;
        emit Withdrawn(id, to, amount);
        s.token.safeTransfer(to, amount);
    }

    function cancel(uint256 id) external nonReentrant {
        Stream storage s = _get(id);
        if (msg.sender != s.payer) revert NotPayer();
        if (s.canceledAt != 0) revert StreamIsCanceled();
        s.canceledAt = uint64(block.timestamp);
        uint256 kept = Math.min(_vested(s), s.deposited);
        uint256 refund = s.deposited - kept;
        s.deposited = kept;
        emit Canceled(id, refund, kept);
        if (refund > 0) s.token.safeTransfer(s.payer, refund);
    }

    function vestedAmount(uint256 id) external view returns (uint256) {
        return _vested(_get(id));
    }

    function withdrawableAmount(uint256 id) external view returns (uint256) {
        return _withdrawable(_get(id));
    }

    function getStream(uint256 id) external view returns (Stream memory) {
        return _get(id);
    }

    function nextStreamId() external view returns (uint256) {
        return _nextId;
    }

    /// @dev Registers the stream and emits its events; the caller pulls the tokens.
    function _create(
        address recipient,
        IERC20 token,
        uint256 totalAmount,
        uint64 start,
        uint64 end,
        uint256 initialDeposit
    ) private returns (uint256 id) {
        if (recipient == address(0) || address(token) == address(0)) revert ZeroAddress();
        if (totalAmount == 0) revert ZeroAmount();
        if (start >= end) revert InvalidTimes();
        if (initialDeposit > totalAmount) revert DepositExceedsTotal();
        id = _nextId++;
        _streams[id] = Stream({
            payer: msg.sender,
            recipient: recipient,
            token: token,
            totalAmount: totalAmount,
            deposited: initialDeposit,
            withdrawn: 0,
            start: start,
            end: end,
            canceledAt: 0
        });
        emit StreamCreated(id, msg.sender, recipient, address(token), totalAmount, start, end);
        if (initialDeposit > 0) emit ToppedUp(id, initialDeposit);
    }

    function _get(uint256 id) private view returns (Stream storage s) {
        s = _streams[id];
        if (s.payer == address(0)) revert StreamNotFound();
    }

    function _vested(Stream storage s) private view returns (uint256) {
        uint256 t = s.canceledAt != 0 ? s.canceledAt : block.timestamp;
        if (t <= s.start) return 0;
        if (t >= s.end) return s.totalAmount;
        return Math.mulDiv(s.totalAmount, t - s.start, s.end - s.start);
    }

    function _withdrawable(Stream storage s) private view returns (uint256) {
        return Math.min(_vested(s), s.deposited) - s.withdrawn;
    }
}
