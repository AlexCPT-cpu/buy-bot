const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

const SOLANA_CLUSTER = clusterApiUrl("mainnet-beta");
const connection = new Connection(SOLANA_CLUSTER, {
  commitment: "confirmed",
  maxSupportedTransactionVersion: 0, // Support version 0 transactions
  confirmTransactionInitialTimeout: 60_000,
});

// Replace with your token's mint address
const TOKEN_MINT_ADDRESS = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
const REQUEST_DELAY = 10000; // 1 second delay
const MAX_REQUESTS_PER_MINUTE = 1; // Adjust as per your rate limits
let requestCounter = 0;

async function getTokenTransfers(tokenMintAddress) {
  try {
    // Fetch the list of recent signatures
    const signatureInfo = await connection.getSignaturesForAddress(
      tokenMintAddress,
      { limit: 10 }
    );

    for (const signature of signatureInfo) {
      try {
        // Respect rate limits
        if (requestCounter >= MAX_REQUESTS_PER_MINUTE) {
          console.warn("Rate limit reached, waiting for next minute...");
          await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait for 1 minute
          requestCounter = 0; // Reset request counter
        }

        // Fetch transaction details
        const transaction = await connection.getParsedTransaction(
          signature.signature,
          {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0, // Ensure support for version 0 transactions
          }
        );

        requestCounter++; // Increment request counter

        if (transaction) {
          parseTransaction(transaction, tokenMintAddress);
        }
      } catch (error) {
        if (error.code === -32015 && error.message.includes("version")) {
          console.error("Unsupported transaction version, skipping...");
          continue; // Skip unsupported version
        } else {
          console.error("Error fetching transaction:", error);
        }
      }

      // Add a delay between each request to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
    }
  } catch (error) {
    console.error("Error fetching signatures:", error);
  }
}

function parseTransaction(transaction, tokenMintAddress) {
  const {
    meta,
    transaction: { message },
  } = transaction;

  if (meta && message) {
    const accountKeys = message.accountKeys.map((pubKey) =>
      pubKey.pubkey.toString()
    );
    const preTokenBalances = meta.preTokenBalances || [];
    const postTokenBalances = meta.postTokenBalances || [];

    // Find relevant token account changes
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
        sendAlert(transaction.transaction.signatures[0], postBalance.owner);
      }
    }
  }
}

function sendAlert(transactionSignature, buyerAddress) {
  // Implement your alert system here (email, Slack, etc.)
  console.log(
    `Alert: Token purchase detected in transaction ${transactionSignature} by ${buyerAddress}`
  );
}

// Monitor for token transfers
setInterval(() => {
  getTokenTransfers(TOKEN_MINT_ADDRESS);
}, 10000); // Check every 10 seconds

// async function getTokenTransfers(tokenMintAddress) {
//     try {
//       const signatureInfo = await connection.getSignaturesForAddress(
//         tokenMintAddress,
//         { limit: 10 }
//       );

//       for (const signature of signatureInfo) {
//         try {
//           // Fetch the transaction details
//           const transaction = await connection.getParsedTransaction(
//             signature.signature,
//             {
//               commitment: 'confirmed',
//               maxSupportedTransactionVersion: 0, // Attempt to handle specific versions
//             }
//           );

//           if (transaction) {
//             parseTransaction(transaction, tokenMintAddress);
//           }
//         } catch (error) {
//           if (error.code === -32015 && error.message.includes("version")) {
//             console.error("Unsupported transaction version, skipping...");
//             continue; // Skip this transaction
//           } else {
//             console.error("Error fetching transaction:", error);
//           }
//         }

//         // Add a delay between each request to avoid rate limits
//         await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
//       }
//     } catch (error) {
//       console.error("Error fetching signatures:", error);
//     }
//   }
