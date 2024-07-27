require("dotenv").config();
const { Connection, PublicKey } = require("@solana/web3.js");
const { Alchemy, Network } = require("@alch/alchemy-sdk");

// Connect to Solana mainnet using Alchemy
const connection = new Connection(
  `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0, // Set this parameter here as well
  }
);

// Token mint address for the token you want to monitor
const TOKEN_MINT_ADDRESS = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

// Function to monitor transactions
async function getTokenTransfers(tokenMintAddress) {
  try {
    // Fetch recent transaction signatures for the token mint address
    const signatures = await connection.getSignaturesForAddress(
      tokenMintAddress,
      { limit: 50 }
    );

    for (const signatureInfo of signatures) {
      // Fetch and parse each transaction
      const transaction = await connection.getParsedTransaction(
        signatureInfo.signature,
        {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0, // Set this parameter here as well
        }
      );

      if (transaction) {
        parseTransaction(transaction, tokenMintAddress);
      }
    }
  } catch (error) {
    console.error("Error fetching signatures:", error);
  }
}

// Function to parse transactions
function parseTransaction(transaction, tokenMintAddress) {
  const {
    meta,
    transaction: { message },
  } = transaction;

  if (meta && message) {
    const preTokenBalances = meta.preTokenBalances || [];
    const postTokenBalances = meta.postTokenBalances || [];
    const accountKeys = message.accountKeys.map((pubKey) => pubKey.toString());

    // Iterate over each account balance to detect buy transactions
    for (let i = 0; i < postTokenBalances.length; i++) {
      const preBalance = preTokenBalances[i];
      const postBalance = postTokenBalances[i];
      console.log("first condition");
      //   console.log(
      //     `postBalance: ${postBalance}\n,
      //     preBalance: ${preBalance}\n,

      //     tokenMintAddress: ${tokenMintAddress.toString()}\n`
      //   );
      //   console.log(postBalance.mint, tokenMintAddress.toString());
      //   console.log("Pre: ", preBalance);
      //   console.log("Post: ", postBalance);
      //   console.log(preBalance.mint !== postBalance.mint)

      console.log("second condition"); //   console.log(
      //     postBalance.owner,
      //     preBalance.owner,
      //     BigInt(postBalance.uiTokenAmount.amount),
      //     BigInt(preBalance.uiTokenAmount.amount)
      //   );
      if (
        postBalance &&
        preBalance &&
        postBalance.mint === tokenMintAddress.toString() &&
        BigInt(postBalance.uiTokenAmount.amount) >
          BigInt(preBalance.uiTokenAmount.amount)
      ) {
        console.log("looping post");
        const amountReceived =
          BigInt(postBalance.uiTokenAmount.amount) -
          BigInt(preBalance.uiTokenAmount.amount);

        const buyer = postBalance.owner;

        // Calculate the amount spent in the buy transaction
        const accountIndex = accountKeys.indexOf(buyer);
        console.log(accountIndex !== -1, accountIndex);
        if (accountIndex !== -1) {
          console.log(`index found ${accountIndex}`);
          const preLamports = meta.preBalances[accountIndex];
          const postLamports = meta.postBalances[accountIndex];
          const solSpent = (preLamports - postLamports) / 1e9;

          console.log(`Transaction: ${transaction.transaction.signatures[0]}`);
          console.log(`Buyer: ${buyer}`);
          console.log(`SOL Spent: ${solSpent}`);
          console.log(`Tokens Received: ${amountReceived}`);
          console.log("-----------------------------------------");
        }
      }
    }
  }
}

// Monitor for token transfers every 10 seconds
setInterval(() => {
  console.log("Checking for buy transactions...");
  getTokenTransfers(TOKEN_MINT_ADDRESS);
}, 10000); // 10 seconds
