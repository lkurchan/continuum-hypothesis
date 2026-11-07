// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Module A scaffold. Every entry point is intentionally unimplemented.
contract ContinuumStreams {
    error NotImplemented();

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

    function createStream(
        address recipient,
        IERC20 token,
        uint256 totalAmount,
        uint64 start,
        uint64 end,
        uint256 initialDeposit
    ) external returns (uint256 id) {
        revert NotImplemented();
    }

    function createStreamsBatch(
        address[] calldata recipients,
        uint256[] calldata totalAmounts,
        uint256[] calldata initialDeposits,
        IERC20 token,
        uint64 start,
        uint64 end
    ) external returns (uint256[] memory ids) {
        revert NotImplemented();
    }

    function topUp(uint256 id, uint256 amount) external {
        revert NotImplemented();
    }

    function withdrawTo(uint256 id, address to, uint256 amount) external {
        revert NotImplemented();
    }

    function cancel(uint256 id) external {
        revert NotImplemented();
    }

    function vestedAmount(uint256 id) external view returns (uint256) {
        revert NotImplemented();
    }

    function withdrawableAmount(uint256 id) external view returns (uint256) {
        revert NotImplemented();
    }

    function getStream(uint256 id) external view returns (Stream memory) {
        revert NotImplemented();
    }

    function nextStreamId() external view returns (uint256) {
        revert NotImplemented();
    }
}
