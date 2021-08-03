import React, { useState } from 'react';
import { ButtonProps, Radio, Checkbox } from 'antd';
import { Form } from 'antd';
import { PublicKey } from '@solana/web3.js';

import { LABELS } from '../../../constants';

import { Redirect } from 'react-router';

import { GovernanceType } from '../../../models/enums';
import { registerGovernance } from '../../../actions/registerGovernance';

import { useKeyParam } from '../../../hooks/useKeyParam';
import { ModalFormAction } from '../../../components/ModalFormAction/modalFormAction';

import { AccountFormItem } from '../../../components/AccountFormItem/accountFormItem';

import { useRpcContext } from '../../../hooks/useRpcContext';
import { getGovernanceUrl } from '../../../tools/routeTools';
import {
  getGovernanceConfig,
  GovernanceConfigFormItem,
  GovernanceConfigValues,
} from '../../../components/governanceConfigFormItem/governanceConfigFormItem';
import { ParsedAccount } from '../../../../../common/dist/lib';
import { Realm } from '../../../models/accounts';

function AccountGovernanceForm() {
  return (
    <>
      <AccountFormItem
        name="governedAccountAddress"
        label={LABELS.ACCOUNT_ADDRESS}
        required
      ></AccountFormItem>
    </>
  );
}

function ProgramGovernanceForm() {
  return (
    <>
      <AccountFormItem
        name="governedAccountAddress"
        label={LABELS.PROGRAM_ID_LABEL}
        required
      ></AccountFormItem>
      <Form.Item
        name="transferAuthority"
        label={`transfer ${LABELS.UPGRADE_AUTHORITY} to governance`}
        valuePropName="checked"
      >
        <Checkbox></Checkbox>
      </Form.Item>
    </>
  );
}

function SplTokenMintGovernanceForm() {
  return (
    <>
      <AccountFormItem
        name="governedAccountAddress"
        label={LABELS.MINT_ADDRESS_LABEL}
        required
      ></AccountFormItem>
      <Form.Item
        name="transferAuthority"
        label={`transfer ${LABELS.MINT_AUTHORITY} to governance`}
        valuePropName="checked"
      >
        <Checkbox></Checkbox>
      </Form.Item>
    </>
  );
}

function SplTokenGovernanceForm() {
  const [create, setCreate] = useState(false);

  const onChange = (e: any) => {
    setCreate(e.target.checked);
  };

  return (
    <>
      <Form.Item
        name="createAccount"
        label={`create new ${LABELS.TOKEN_ACCOUNT}`}
        valuePropName="checked"
      >
        <Checkbox onChange={onChange}></Checkbox>
      </Form.Item>
      {create && (
        <AccountFormItem
          name="mintAccountAddress"
          label={LABELS.MINT_ADDRESS_LABEL}
          required
        ></AccountFormItem>
      )}
      <AccountFormItem
        name="governedAccountAddress"
        label={LABELS.TOKEN_ACCOUNT_ADDRESS}
        disabled={create}
        required={!create}
      ></AccountFormItem>
      <Form.Item
        name="transferAuthority"
        label={`transfer ${LABELS.TOKEN_OWNER} to governance`}
        valuePropName="checked"
      >
        <Checkbox disabled={create}></Checkbox>
      </Form.Item>
    </>
  );
}

export function RegisterGovernanceButton({
  buttonProps,
  realm,
}: {
  buttonProps?: ButtonProps;
  realm: ParsedAccount<Realm> | undefined;
}) {
  const [redirectTo, setRedirectTo] = useState('');
  const rpcContext = useRpcContext();
  const { programId } = rpcContext;

  const realmKey = useKeyParam();
  const [governanceType, setGovernanceType] = useState(GovernanceType.Account);

  const onSubmit = async (
    values: {
      governanceType: GovernanceType;
      governedAccountAddress: string;
      transferAuthority: boolean;
      createAccount: boolean;
      mintAccountAddress?: string;
    } & GovernanceConfigValues,
  ) => {
    const config = getGovernanceConfig(values);

    return await registerGovernance(
      rpcContext,
      values.governanceType,
      realmKey,
      values.governedAccountAddress
        ? new PublicKey(values.governedAccountAddress)
        : PublicKey.default,
      config,
      values.transferAuthority,
      values.createAccount,
      values.createAccount && values.mintAccountAddress
        ? new PublicKey(values.mintAccountAddress)
        : undefined,
    );
  };

  const onComplete = (pk: PublicKey) => {
    setRedirectTo(pk.toBase58());
  };

  if (redirectTo) {
    return <Redirect push to={getGovernanceUrl(redirectTo, programId)} />;
  }

  return (
    <ModalFormAction<PublicKey>
      label={LABELS.CREATE_NEW_GOVERNANCE}
      buttonProps={buttonProps}
      formTitle={LABELS.CREATE_NEW_GOVERNANCE}
      formAction={LABELS.CREATE}
      formPendingAction={LABELS.CREATING}
      onSubmit={onSubmit}
      onComplete={onComplete}
      initialValues={{
        governanceType: GovernanceType.Account,
        transferAuthority: true,
      }}
    >
      <Form.Item label={LABELS.GOVERNANCE_OVER} name="governanceType">
        <Radio.Group onChange={e => setGovernanceType(e.target.value)}>
          <Radio.Button value={GovernanceType.Account}>
            {LABELS.ACCOUNT}
          </Radio.Button>
          <Radio.Button value={GovernanceType.Program}>
            {LABELS.PROGRAM}
          </Radio.Button>
          <Radio.Button value={GovernanceType.Mint}>{LABELS.MINT}</Radio.Button>
          <Radio.Button value={GovernanceType.Token}>
            {LABELS.TOKEN_ACCOUNT}
          </Radio.Button>
        </Radio.Group>
      </Form.Item>

      {governanceType === GovernanceType.Account ? (
        <AccountGovernanceForm />
      ) : governanceType === GovernanceType.Program ? (
        <ProgramGovernanceForm />
      ) : governanceType === GovernanceType.Mint ? (
        <SplTokenMintGovernanceForm />
      ) : governanceType === GovernanceType.Token ? (
        <SplTokenGovernanceForm />
      ) : (
        `unhandled governanceType ${governanceType}`
      )}

      <GovernanceConfigFormItem realm={realm}></GovernanceConfigFormItem>
    </ModalFormAction>
  );
}
