import { Form, FormInstance } from 'antd';
import { ExplorerLink, ParsedAccount, utils } from '@oyster/common';
import { Governance } from '../../../../models/accounts';
import {
  Account,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import React from 'react';
import { formDefaults } from '../../../../tools/forms';
import { AccountFormItem } from '../../../../components/AccountFormItem/accountFormItem';

import { contexts } from '@oyster/common';
import * as anchor from '@project-serum/anchor';
import * as serum from '@project-serum/common';

// @ts-ignore
import poolIdl from '../../../../idls/ido_pool';

const { useAccount: useTokenAccount } = contexts.Accounts;
const { useConnection } = contexts.Connection;
const { useWallet } = contexts.Wallet;

export const SplTokenSaleTransferForm = ({
  form,
  governance,
  onCreateInstruction,
}: {
  form: FormInstance;
  governance: ParsedAccount<Governance>;
  onCreateInstruction: (instruction: TransactionInstruction) => void;
}) => {
  const connection = useConnection();
  const { wallet } = useWallet();
  const { token: tokenProgramId } = utils.programIds();

  const onCreate = async ({
    programId,
    poolId,
    destinationId,
  }: {
    programId: string;
    poolId: string;
    destinationId: string;
  }) => {
    const provider = new anchor.Provider(
      connection,
      { ...wallet!, publicKey: wallet!.publicKey! },
      anchor.Provider.defaultOptions(),
    );

    const program = new anchor.Program(
      poolIdl,
      new PublicKey(programId),
      provider,
    );

    const poolAccount = new PublicKey(poolId);
    const {
      poolUsdc,
      watermelonMint,
    } = (await program.account.poolAccount.fetch(poolAccount)) as any;

    const poolUsdcInfo = await serum.getTokenAccount(provider, poolUsdc);

    // todo: get rid of intermediate account and use destination account instead
    const intermediateAccount = new Account();

    const [poolSigner, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
      [watermelonMint.toBuffer()],
      program.programId,
    );

    const tx = new Transaction();
    const addToTx = async (instructions: Promise<TransactionInstruction[]>) => {
      for (let ins of await instructions) {
        tx.add(ins);
      }
    };

    await addToTx(
      serum.createTokenAccountInstrs(
        provider,
        intermediateAccount.publicKey,
        poolUsdcInfo.mint,
        governance.pubkey,
      ),
    );

    tx.recentBlockhash = (await connection.getRecentBlockhash('max')).blockhash;

    const signers = [intermediateAccount];
    tx.setSigners(wallet!.publicKey!, ...signers.map(s => s.publicKey));
    if (signers.length > 0) {
      tx.partialSign(...signers);
    }

    const signed = await wallet?.signTransaction(tx);
    const txid = await connection.sendRawTransaction(signed!.serialize());

    console.log(txid, intermediateAccount.publicKey.toBase58());

    const initSaleIx = await program.instruction.withdrawPoolUsdc({
      accounts: {
        poolAccount,
        poolSigner,
        poolUsdc,
        distributionAuthority: governance.pubkey,
        creatorUsdc: intermediateAccount.publicKey,
        tokenProgram: tokenProgramId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
    });

    onCreateInstruction(initSaleIx);
  };

  return (
    <Form {...formDefaults} form={form} onFinish={onCreate}>
      <Form.Item label="account owner (governance account)">
        <ExplorerLink address={governance.pubkey} type="address" />
      </Form.Item>

      <AccountFormItem
        name="programId"
        label="sale program"
        required
      ></AccountFormItem>
      <AccountFormItem
        name="poolId"
        label="token sale account"
        required
      ></AccountFormItem>
      <AccountFormItem
        name="destinationId"
        label="sale proceeds token account"
        required
      ></AccountFormItem>
    </Form>
  );
};
