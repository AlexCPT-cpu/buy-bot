const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const axios = require("axios");

const SOLANA_CLUSTER = clusterApiUrl("mainnet-beta");
const connection = new Connection(SOLANA_CLUSTER, {
  commitment: "confirmed",
  maxSupportedTransactionVersion: 0,
});

// Replace with your token's mint address
const TOKEN_MINT_ADDRESS = new PublicKey("Your_Token_Mint_Address");

// Function to monitor transactions
async function getTokenTransfers() {
  try {
    const signatureInfo = await connection.getSignaturesForAddress(
      TOKEN_MINT_ADDRESS,
      { limit: 50 }
    );

    for (const signature of signatureInfo) {
      try {
        const transaction = await connection.getParsedTransaction(
          signature.signature,
          "confirmed"
        );
        if (transaction) {
          parseTransaction(transaction, TOKEN_MINT_ADDRESS);
        }
      } catch (error) {
        console.error("Error fetching transaction:", error);
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

    for (let i = 0; i < postTokenBalances.length; i++) {
      const postBalance = postTokenBalances[i];
      const preBalance = preTokenBalances[i];

      if (
        postBalance &&
        preBalance &&
        postBalance.owner === preBalance.owner &&
        postBalance.mint === tokenMintAddress.toString() &&
        BigInt(postBalance.uiTokenAmount.amount) >
          BigInt(preBalance.uiTokenAmount.amount)
      ) {
        console.log(
          `Token buy detected! Transaction: ${transaction.transaction.signatures[0]}`
        );
        sendTelegramAlert(
          transaction.transaction.signatures[0],
          postBalance.owner
        );
      }
    }
  }
}
