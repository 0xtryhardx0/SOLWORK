import { 
  Connection, 
  PublicKey, 
  Keypair, 
  SystemProgram, 
  Transaction, 
  TransactionInstruction 
} from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const PROGRAM_ID = new PublicKey("84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk");

// Seeds derivation helper
export function deriveCampaignPDA(creator: PublicKey, campaignId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("campaign"),
      creator.toBuffer(),
      Buffer.from(campaignId)
    ],
    PROGRAM_ID
  );
}

async function runTest() {
  console.log("=========================================");
  console.log("SolWork Solana Program Interaction Helper");
  console.log("=========================================");

  // Create mock keys
  const client = Keypair.generate();
  const authority = Keypair.generate();
  const worker = Keypair.generate();
  
  const campaignId = "medical_labeling_001";
  
  // 1. Derive Campaign PDA
  const [campaignPDA, bump] = deriveCampaignPDA(client.publicKey, campaignId);
  console.log(`Campaign PDA: ${campaignPDA.toBase58()}`);
  console.log(`Bump seed: ${bump}`);

  // 2. Mock token accounts
  console.log(`AI Client wallet: ${client.publicKey.toBase58()}`);
  console.log(`Platform Authority validator: ${authority.publicKey.toBase58()}`);
  console.log(`Worker payout destination: ${worker.publicKey.toBase58()}`);

  console.log("\nInstruction payload mock constructed successfully.");
}

runTest().catch(console.error);
