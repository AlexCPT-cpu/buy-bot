const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, AccountLayout } = require("@solana/spl-token");
const fetch = require("node-fetch");

const SOLANA_CLUSTER = clusterApiUrl("mainnet-beta");
const connection = new Connection(SOLANA_CLUSTER, "confirmed");

// Replace with your token's mint address
const TOKEN_MINT_ADDRESS = new PublicKey("");

async function getTokenTransfers(tokenMintAddress) {
  const signatureInfo = await connection.getSignaturesForAddress(
    tokenMintAddress,
    { limit: 10 }
  );

  for (const signature of signatureInfo) {
    const transaction = await connection.getTransaction(signature.signature);
    if (transaction) {
      parseTransaction(transaction, tokenMintAddress);
    }
  }
}

function parseTransaction(transaction, tokenMintAddress) {
  const {
    meta,
    transaction: { message },
  } = transaction;

  if (meta && message) {
    const accountKeys = message.accountKeys.map((pubKey) => pubKey.toString());
    const postBalances = meta.postBalances;
    const preBalances = meta.preBalances;

    for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys[i] === tokenMintAddress.toString()) {
        const preBalance = preBalances[i];
        const postBalance = postBalances[i];

        if (postBalance > preBalance) {
          console.log(
            `Token buy detected! Transaction: ${transaction.transaction.signatures[0]}`
          );
          sendAlert(transaction.transaction.signatures[0]);
        }
      }
    }
  }
}

function sendAlert(transactionSignature) {
  // Implement your alert system here (email, Slack, etc.)
  console.log(
    `Alert: Token purchase detected in transaction ${transactionSignature}`
  );
}

// Monitor for token transfers
setInterval(() => {
  getTokenTransfers(TOKEN_MINT_ADDRESS);
}, 10000); // Check every 10 seconds
