import { Form, FormInstance } from 'antd';
import { ParsedAccount } from '@oyster/common';
import { Governance } from '../../../../models/accounts';
import { TransactionInstruction } from '@solana/web3.js';
import React, { useState } from 'react';

import { formDefaults } from '../../../../tools/forms';

import { GovernanceConfigForm } from './governanceConfigForm';

import { InstructionSelector, InstructionType } from './instructionSelector';
import { SplTokenSaleForm } from './splTokenSaleForm';
import { SplTokenSaleTransferForm } from './splTokenSaleTransferForm';
import { SplTokenTransferForm } from './splTokenTransferForm';

export const TokenInstructionsForm = ({
  form,
  governance,
  onCreateInstruction,
}: {
  form: FormInstance;
  governance: ParsedAccount<Governance>;
  onCreateInstruction: (instruction: TransactionInstruction) => void;
}) => {
  const [instruction, setInstruction] = useState(
    InstructionType.SplTokenTransfer,
  );

  let instructions = [
    InstructionType.SplTokenTransfer,
    InstructionType.SplTokenSale,
    InstructionType.SplTokenSaleTransfer,
    InstructionType.GovernanceSetConfig,
  ];

  return (
    <Form {...formDefaults} initialValues={{ instructionType: instruction }}>
      <InstructionSelector
        instructions={instructions}
        onChange={setInstruction}
      ></InstructionSelector>
      {instruction === InstructionType.SplTokenTransfer && (
        <SplTokenTransferForm
          form={form}
          governance={governance}
          onCreateInstruction={onCreateInstruction}
        ></SplTokenTransferForm>
      )}
      {instruction === InstructionType.SplTokenSale && (
        <SplTokenSaleForm
          form={form}
          governance={governance}
          onCreateInstruction={onCreateInstruction}
        ></SplTokenSaleForm>
      )}
      {instruction === InstructionType.SplTokenSaleTransfer && (
        <SplTokenSaleTransferForm
          form={form}
          governance={governance}
          onCreateInstruction={onCreateInstruction}
        ></SplTokenSaleTransferForm>
      )}
      {instruction === InstructionType.GovernanceSetConfig && (
        <GovernanceConfigForm
          form={form}
          governance={governance}
          onCreateInstruction={onCreateInstruction}
        ></GovernanceConfigForm>
      )}
    </Form>
  );
};
