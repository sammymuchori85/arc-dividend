// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
// Dividend distributor: owner registers shareholders with shares; deposits USDC; holders claim pro-rata.
contract ArcDividend {
    struct Pool { address owner; string name; uint256 totalShares; uint256 totalDeposited; uint256 createdAt; }
    Pool[] public pools;
    mapping(uint256 => address[]) public holders;
    mapping(uint256 => mapping(address => uint256)) public shares;
    mapping(uint256 => mapping(address => uint256)) public claimed;
    event PoolCreated(uint256 indexed id, address owner, string name);
    event Deposited(uint256 indexed id, uint256 amount);
    event Claimed(uint256 indexed id, address holder, uint256 amount);
    function create(string calldata name, address[] calldata hs, uint256[] calldata sh) external {
        require(hs.length == sh.length && hs.length > 0, "Mismatch");
        uint256 id = pools.length; uint256 tot;
        pools.push(Pool(msg.sender, name, 0, 0, block.timestamp));
        for (uint256 i=0;i<hs.length;i++){ holders[id].push(hs[i]); shares[id][hs[i]] = sh[i]; tot += sh[i]; }
        pools[id].totalShares = tot;
        emit PoolCreated(id, msg.sender, name);
    }
    function deposit(uint256 id) external payable {
        require(pools[id].owner==msg.sender && msg.value>0, "no");
        pools[id].totalDeposited += msg.value;
        emit Deposited(id, msg.value);
    }
    function claimable(uint256 id, address u) public view returns (uint256) {
        Pool memory p = pools[id];
        if (p.totalShares == 0) return 0;
        uint256 entitled = p.totalDeposited * shares[id][u] / p.totalShares;
        return entitled > claimed[id][u] ? entitled - claimed[id][u] : 0;
    }
    function claim(uint256 id) external {
        uint256 amount = claimable(id, msg.sender);
        require(amount > 0, "Nothing");
        claimed[id][msg.sender] += amount;
        (bool ok,) = payable(msg.sender).call{value: amount}(""); require(ok,"fail");
        emit Claimed(id, msg.sender, amount);
    }
    function getPool(uint256 id) external view returns (Pool memory) { return pools[id]; }
    function getHolders(uint256 id) external view returns (address[] memory) { return holders[id]; }
    function totalPools() external view returns (uint256) { return pools.length; }
}