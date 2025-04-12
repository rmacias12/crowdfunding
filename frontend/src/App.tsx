import { useEffect } from "react";
import { useState } from "react";
import "./App.css";
import idl from "./idl.json";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
console.log("IDL Object:", idl);
declare global {
  interface Window {
    solana?: any;
  }
}
import { Program, AnchorProvider, web3, utils, BN } from "@coral-xyz/anchor";
import { Buffer } from "buffer";

globalThis.Buffer = Buffer;

const programID = new PublicKey(idl.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
};
const { SystemProgram } = web3;

// Define the Campaign interface
interface Campaign {
  pubkey: PublicKey;
  amountDonated: number;
  name: string;
  description: string;
}

const App = () => {
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const [walletAddress, setWalletAddress] = useState(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const getProvider = () => {
    const connection = new Connection(
      network,
      opts.preflightCommitment as web3.Commitment
    );
    const provider = new AnchorProvider(connection, window.solana, {
      preflightCommitment: opts.preflightCommitment as web3.Commitment,
    });
    return provider;
  };
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window as any;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
          const response = await solana.connect({
            onlyIfTrusted: true,
          });
          console.log(
            "Connected with Public Key:",
            response.publicKey.toString()
          );
          setWalletAddress(response.publicKey.toString());
        } else {
          alert("Please install the Phantom Wallet!");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };
  const disconnectWallet = async () => {
    const { solana } = window as any;
    if (solana) {
      await solana.disconnect();
      console.log("Disconnected from wallet");
      setWalletAddress(null);
    }
  };
  const connectWallet = async () => {
    try {
      const { solana } = window as any;
      if (solana) {
        const response = await solana.connect();
        console.log(
          "Connected with Public Key:",
          response.publicKey.toString()
        );
        setWalletAddress(response.publicKey.toString());
      }
    } catch (error) {
      console.error(error);
    }
  };
  const getCampaigns = async () => {
    const connection = new Connection(
      network,
      opts.preflightCommitment as web3.Commitment
    );
    const provider = getProvider();
    const program = new Program(idl, provider);
    // await connection.getProgramAccounts(programID);
    Promise.all(
      (await connection.getProgramAccounts(programID)).map(
        async (campaign) => ({
          ...(await program.account.campaign.fetch(campaign.pubkey)),
          pubkey: campaign.pubkey,
        })
      )
    ).then((campaigns) => setCampaigns(campaigns));
  };
  const createCampaign = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, provider);
      const [campaign] = await PublicKey.findProgramAddress(
        [
          utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
          provider.wallet.publicKey.toBuffer(),
        ],
        program.programId
      );
      await program.rpc.create("Campaign name", "campaign description", {
        accounts: {
          campaign,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      });
      console.log("Campaign account created:", campaign.toString());
    } catch (error) {
      console.error("Error creating campaign:", error);
    }
  };
  const renderNotConnectedContainer = () => (
    <button
      type="button"
      className="text-neutral-700 dark:text-neutral-700 bg-green-400 rounded-lg p-3 m-3 hover:bg-green-300 hover:text-black shadow border-1 border-neutral-400 cursor-pointer"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );
  const renderDisconnectContainer = () => (
    <button
      type="button"
      className="text-neutral-700 dark:text-neutral-700 bg-green-400 rounded-lg p-3 m-3 hover:bg-green-300 hover:text-black shadow border-1 border-neutral-400 cursor-pointer"
      onClick={disconnectWallet}
    >
      Disconnect
    </button>
  );
  const renderConnectedContainer = () => (
    <>
      <button
        type="button"
        className="text-neutral-700 dark:text-neutral-700 bg-green-400 rounded-lg p-3 m-3 hover:bg-green-300 hover:text-black shadow border-1 border-neutral-400 cursor-pointer"
        onClick={createCampaign}
      >
        Create Campaign
      </button>
      <button
        type="button"
        className="text-neutral-700 dark:text-neutral-700 bg-green-400 rounded-lg p-3 m-3 hover:bg-green-300 hover:text-black shadow border-1 border-neutral-400 cursor-pointer"
        onClick={getCampaigns}
      >
        Get Campaigns
      </button>
      <br />
      {campaigns.map((campaign: Campaign) => (
        <>
          <p>Campaign ID: {campaign.pubkey.toString()}</p>
          <p>
            Amount Donated:{" "}
            {(campaign.amountDonated / web3.LAMPORTS_PER_SOL).toString()}
          </p>
          <p>Balance: {campaign.name}</p>
          <p>Description: {campaign.description}</p>
        </>
      ))}
    </>
  );
  return (
    <div className="App">
      <header className="App-header">
        {walletAddress ? (
          <h1>Welcome back!</h1>
        ) : (
          <>
            <h1>Welcome to Solana</h1>
            <p>Connect your wallet to get started!</p>
          </>
        )}
        {walletAddress ? (
          <>
            {renderDisconnectContainer()}
            {renderConnectedContainer()}
          </>
        ) : (
          renderNotConnectedContainer()
        )}
      </header>
    </div>
  );
};

export default App;
