import { Account, PublicKey, TransactionInstruction } from '@solana/web3.js';

import { withCreateAccountGovernance } from '../models/withCreateAccountGovernance';
import { GovernanceType } from '../models/enums';
import { GovernanceConfig } from '../models/accounts';
import { withCreateProgramGovernance } from '../models/withCreateProgramGovernance';
import { sendTransactionWithNotifications } from '../tools/transactions';
import { withCreateMintGovernance } from '../models/withCreateMintGovernance';
import { withCreateTokenGovernance } from '../models/withCreateTokenGovernance';
import { RpcContext } from '../models/api';
import { withCreateSplTokenAccount } from '../models/withCreateSplTokenAccount';

export const registerGovernance = async (
  { connection, wallet, programId, walletPubkey }: RpcContext,
  governanceType: GovernanceType,
  realm: PublicKey,
  governedAccount: PublicKey,
  config: GovernanceConfig,
  transferAuthority?: boolean,
  createAccount?: boolean,
  mintAccount?: PublicKey,
): Promise<PublicKey> => {
  let instructions: TransactionInstruction[] = [];
  let signers: Account[] = [];

  let governanceAddress;

  switch (governanceType) {
    case GovernanceType.Account: {
      governanceAddress = (
        await withCreateAccountGovernance(
          instructions,
          programId,
          realm,
          governedAccount,
          config,
          walletPubkey,
        )
      ).governanceAddress;
      break;
    }
    case GovernanceType.Program: {
      governanceAddress = (
        await withCreateProgramGovernance(
          instructions,
          programId,
          realm,
          governedAccount,
          config,
          transferAuthority!,
          walletPubkey,
          walletPubkey,
        )
      ).governanceAddress;
      break;
    }
    case GovernanceType.Mint: {
      governanceAddress = (
        await withCreateMintGovernance(
          instructions,
          programId,
          realm,
          governedAccount,
          config,
          transferAuthority!,
          walletPubkey,
          walletPubkey,
        )
      ).governanceAddress;
      break;
    }
    case GovernanceType.Token: {
      if (createAccount) {
        governedAccount = (
          await withCreateSplTokenAccount(
            connection,
            wallet,
            instructions,
            signers,
            mintAccount!,
          )
        ).tokenAccountAddress;
        transferAuthority = true;
      }

      governanceAddress = (
        await withCreateTokenGovernance(
          instructions,
          programId,
          realm,
          governedAccount,
          config,
          transferAuthority!,
          walletPubkey,
          walletPubkey,
        )
      ).governanceAddress;
      break;
    }
    default: {
      throw new Error(
        `Governance type ${governanceType} is not supported yet.`,
      );
    }
  }

  await sendTransactionWithNotifications(
    connection,
    wallet,
    instructions,
    signers,
    'Registering governance',
    'Governance has been registered',
  );

  return governanceAddress;
};
