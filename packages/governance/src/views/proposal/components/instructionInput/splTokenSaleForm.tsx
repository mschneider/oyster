import { Form, FormInstance, InputNumber, DatePicker } from 'antd';
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
import { BN } from '@project-serum/anchor';

const { useAccount: useTokenAccount } = contexts.Accounts;
const { useConnection } = contexts.Connection;
const { useWallet } = contexts.Wallet;

export const SplTokenSaleForm = ({
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
  const sourceTokenAccount = useTokenAccount(governance.info.governedAccount);
  const { token: tokenProgramId } = utils.programIds();

  const onCreate = async ({
    programId,
    mintId,
    amount,
    start,
    endDeposits,
    endSale,
  }: {
    programId: string;
    mintId: string;
    amount: number;
    start: any;
    endDeposits: any;
    endSale: any;
  }) => {
    const provider = new anchor.Provider(
      connection,
      { ...wallet!, publicKey: wallet!.publicKey! },
      anchor.Provider.defaultOptions(),
    );

    const sourceMint = sourceTokenAccount!.info.mint;
    const sourceMintInfo = await serum.getMintInfo(provider, sourceMint);
    const bidMint = new PublicKey(mintId);
    const bidMintInfo = await serum.getMintInfo(provider, bidMint);
    const redeemableMint = new Account();
    const soldVault = new Account();
    const bidVault = new Account();
    const pool = new Account();

    const program = new anchor.Program(
      poolIdl,
      new PublicKey(programId),
      provider,
    );
    const [poolSigner, nonce] = await anchor.web3.PublicKey.findProgramAddress(
      [sourceMint.toBuffer()],
      program.programId,
    );

    const tx = new Transaction();
    const addToTx = async (instructions: Promise<TransactionInstruction[]>) => {
      for (let ins of await instructions) {
        tx.add(ins);
      }
    };

    await addToTx(
      serum.createMintInstructions(
        provider,
        poolSigner,
        redeemableMint.publicKey,
        bidMintInfo.decimals,
      ),
    );

    await addToTx(
      serum.createTokenAccountInstrs(
        provider,
        soldVault.publicKey,
        sourceTokenAccount?.info.mint!,
        poolSigner,
      ),
    );

    await addToTx(
      serum.createTokenAccountInstrs(
        provider,
        bidVault.publicKey,
        bidMint,
        poolSigner,
      ),
    );

    tx.add(await program.account.poolAccount.createInstruction(pool));

    tx.recentBlockhash = (await connection.getRecentBlockhash('max')).blockhash;

    const signers = [redeemableMint, soldVault, bidVault, pool];
    tx.setSigners(wallet!.publicKey!, ...signers.map(s => s.publicKey));
    if (signers.length > 0) {
      tx.partialSign(...signers);
    }

    const signed = await wallet?.signTransaction(tx);
    const txid = await connection.sendRawTransaction(signed!.serialize());

    const nativeAmountSold = (
      amount * Math.pow(10, sourceMintInfo.decimals)
    ).toString();
    console.log('selling', nativeAmountSold, 'setup tx', txid);

    const startIdoTs = new BN(start.unix());
    const endDepositsTs = new BN(endDeposits.unix());
    const endIdoTs = new BN(endSale.unix());

    const initSaleIx = await program.instruction.initializePool(
      new BN(nativeAmountSold),
      nonce,
      startIdoTs,
      endDepositsTs,
      endIdoTs,
      {
        accounts: {
          poolAccount: pool.publicKey,
          poolSigner,
          distributionAuthority: governance.pubkey,
          creatorWatermelon: sourceTokenAccount!.pubkey,
          redeemableMint: redeemableMint.publicKey,
          usdcMint: bidMint,
          poolWatermelon: soldVault.publicKey,
          poolUsdc: bidVault.publicKey,
          tokenProgram: tokenProgramId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
      },
    );

    onCreateInstruction(initSaleIx);
  };

  return (
    <Form
      {...formDefaults}
      form={form}
      onFinish={onCreate}
      initialValues={{ amount: 1 }}
    >
      <Form.Item label="source account">
        <ExplorerLink
          address={governance.info.governedAccount}
          type="address"
        />
      </Form.Item>
      <Form.Item label="account owner (governance account)">
        <ExplorerLink address={governance.pubkey} type="address" />
      </Form.Item>
      <Form.Item name="amount" label="amount" rules={[{ required: true }]}>
        <InputNumber min={0} />
      </Form.Item>

      <AccountFormItem
        name="programId"
        label="sale program"
        required
      ></AccountFormItem>
      <AccountFormItem
        name="mintId"
        label="sale proceed mint"
        required
      ></AccountFormItem>

      <Form.Item name="start" label="start" rules={[{ required: true }]}>
        <DatePicker showTime />
      </Form.Item>
      <Form.Item
        name="endDeposits"
        label="end deposits"
        rules={[{ required: true }]}
      >
        <DatePicker showTime />
      </Form.Item>
      <Form.Item name="endSale" label="end sale" rules={[{ required: true }]}>
        <DatePicker showTime />
      </Form.Item>
    </Form>
  );
};
