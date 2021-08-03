import { Form, FormInstance } from 'antd';
import { ExplorerLink, ParsedAccount, utils } from '@oyster/common';
import { Governance } from '../../../../models/accounts';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import React from 'react';
import { formDefaults } from '../../../../tools/forms';
import { AccountFormItem } from '../../../../components/AccountFormItem/accountFormItem';

import { contexts } from '@oyster/common';
import * as anchor from '@project-serum/anchor';

// @ts-ignore
import poolIdl from '../../../../idls/ido_pool';

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

    const [poolSigner] = await anchor.web3.PublicKey.findProgramAddress(
      [watermelonMint.toBuffer()],
      program.programId,
    );

    const destinationAccount = new PublicKey(destinationId);

    const initSaleIx = await program.instruction.withdrawPoolUsdc({
      accounts: {
        poolAccount,
        poolSigner,
        poolUsdc,
        distributionAuthority: governance.pubkey,
        creatorUsdc: destinationAccount,
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
