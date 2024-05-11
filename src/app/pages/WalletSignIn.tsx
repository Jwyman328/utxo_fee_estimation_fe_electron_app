import { useNavigate } from 'react-router-dom';
import { useCreateWallet } from '../hooks/wallet';
import React, { useMemo, useState } from 'react';
import { Network } from '../types/network';
import { Loader, Notification } from '@mantine/core';

import vaultImage from '../images/vault.jpeg';
import {
  ComboboxItem,
  Select,
  Input,
  InputLabel,
  Button,
  Tabs,
  Radio,
  Stack,
  Textarea,
} from '@mantine/core';
import { configs } from '../configs';
import { useGetServerHealthStatus } from '../hooks/healthStatus';
import { IconX } from '@tabler/icons-react';
import { ScriptTypes, scriptTypeToDescriptorMap } from '../types/scriptTypes';

type PublicElectrumUrl = {
  name: string;
  ports: Record<Network, number>;
};
const xIcon = <IconX style={{ width: '20rem', height: '20rem' }} />;

export const WalletSignIn = () => {
  const defaultDescriptor = configs.defaultDescriptor;

  const mockElectrumUrl = configs.defaultElectrumServerUrl;
  const serverHealthStatusQuery = useGetServerHealthStatus();
  const isServerAvailableAndHealthy =
    serverHealthStatusQuery.isSuccess &&
    serverHealthStatusQuery.data.status === 'good' &&
    !serverHealthStatusQuery.isLoading;

  const [descriptor, setDescriptor] = useState(defaultDescriptor);
  const [privateElectrumUrl, setPrivateElectrumUrl] = useState(mockElectrumUrl);
  const [activeTab, setActiveTab] = useState<string | null>('public');
  const [isUsingPublicServer, setIsUsingPublicServer] = useState(true);

  const scriptTypeOptions = [
    { value: ScriptTypes.P2WPKH, label: 'Native Segwit (P2WPKH)' },
    { value: ScriptTypes.P2PKH, label: 'Legacy (P2PKH)' },
    { value: ScriptTypes.P2SHP2WPKH, label: 'Nested Segwit (P2SH-P2WPKH)' },
    { value: ScriptTypes.P2TR, label: 'Taproot (P2TR)' },
  ];

  const networkOptions = [
    { value: Network.TESTNET, label: Network.TESTNET },
    // TODO implement regtest { value: Network.REGTEST, label: Network.REGTEST },
    { value: Network.BITCOIN, label: Network.BITCOIN },
    // TODO implement signet { value: Network.SIGNET, label: Network.SIGNET },
  ];

  // Testnet electrum public servers https://github.com/spesmilo/electrum/blob/master/electrum/servers_testnet.json
  // Bitcoin electrum public servers https://github.com/spesmilo/electrum/blob/master/electrum/servers.json
  const publicElectrumUrls: PublicElectrumUrl[] = [
    {
      name: 'electrum.blockstream.info',
      ports: {
        [Network.TESTNET]: 60001,
        [Network.BITCOIN]: 50001,
      },
    },
    {
      name: 'bitcoin.aranguren.org',
      ports: {
        [Network.TESTNET]: 51001,
        [Network.BITCOIN]: 50001,
      },
    },
    {
      name: 'blockstream.info',
      ports: {
        [Network.TESTNET]: 143,
        [Network.BITCOIN]: 110,
      },
    },
  ];

  const publicElectrumOptions = publicElectrumUrls.map((server) => ({
    value: server.name,
    label: server.name,
  }));

  const [selectedPublicServer, setSelectedPublicServer] = useState(
    publicElectrumOptions[0],
  );
  const [displayInitiateWalletError, setDisplayInitateWalletError] =
    useState(false);

  const [network, setNetwork] = useState<ComboboxItem>(networkOptions[0]);

  const [scriptType, setScriptType] = useState<ComboboxItem>(
    scriptTypeOptions[0],
  );

  const navigate = useNavigate();

  const handleWalletInitiated = () => {
    navigate('/home');
  };

  const handleWalletError = () => {
    setDisplayInitateWalletError(true);
    console.log('Error initiating wallet');
  };

  const electrumUrl = useMemo(() => {
    if (isUsingPublicServer) {
      const electrumServer = publicElectrumUrls.find(
        (server) => server.name === selectedPublicServer?.value,
      );

      if (!electrumServer) {
        return '';
      }

      if (
        electrumServer.name === 'bitcoin.aranguren.org' &&
        network.value === Network.TESTNET
      ) {
        electrumServer.name = 'testnet.aranguren.org';
      }

      return `${electrumServer.name}:${
        electrumServer.ports[network.value as Network]
      }`;
    }
    return privateElectrumUrl;
  }, [
    isUsingPublicServer,
    selectedPublicServer,
    privateElectrumUrl,
    network,
    publicElectrumUrls,
  ]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescriptor(e.target.value);
  };

  const handlePrivateElectrumInput = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setPrivateElectrumUrl(e.target.value);
  };

  const formItemWidth = 'w-80';
  const labelWidth = 'w-80';

  const [derivationPath, setDerivationPath] = useState<string>(
    configs.defaultDerivationPath,
  );
  const handleDerivationPathChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setDerivationPath(e.target.value);
  };

  const [xpub, setXpub] = useState<string>(configs.defaultXpub);
  const handleXpubChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setXpub(e.target.value);
  };

  const [masterFingerPrint, setMasterFingerPrint] = useState<string>(
    configs.defaultMasterFingerprint,
  );
  const handleMasterFingerPrint = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMasterFingerPrint(e.target.value);
  };

  const generateDescriptor = () => {
    // take the inputs from the various fields and create a descriptor
    // @ts-ignore
    let scriptTypeDescription: any = scriptTypeToDescriptorMap[
      scriptType.value
    ] as any;

    const isNestedSegWit =
      scriptTypeDescription === scriptTypeToDescriptorMap.P2SHP2WPKH;
    const closingParam = isNestedSegWit ? '))' : ')';
    const pubType = network.value === Network.TESTNET ? 'tpub' : 'xpub';

    const computedDescriptor = `${scriptTypeDescription}([${masterFingerPrint}/${derivationPath}]${pubType}${xpub}/0/*${closingParam}`;
    return computedDescriptor;
  };

  const initiateWalletRequest = useCreateWallet(
    network.value as Network,
    electrumUrl,
    handleWalletInitiated,
    handleWalletError,
  );

  const signIn = async () => {
    try {
      const fullDescriptor = generateDescriptor();
      await initiateWalletRequest.mutateAsync(fullDescriptor);
    } catch (e) {
      console.log('Error', e);
    }
  };

  const isLoginEnabled =
    !!xpub &&
    !!generateDescriptor() &&
    !!scriptType?.value &&
    !!masterFingerPrint &&
    !!derivationPath &&
    !!network.value &&
    !!electrumUrl;
  return isServerAvailableAndHealthy ? (
    <div className="flex flex-row w-screen h-screen overflow-scroll">
      <div className="px-4 flex-1 w-1/2 flex flex-col items-center justify-center h-screen">
        {displayInitiateWalletError && (
          <Notification
            withCloseButton={true}
            onClose={() => setDisplayInitateWalletError(false)}
            className="border-red-500 border-2 top-2 right-1 self-end w-1/2 z-10"
            style={{ position: 'absolute' }}
            icon={xIcon}
            color="red"
            title="Error!"
          >
            Error initiating wallet
          </Notification>
        )}
        <h1
          className={`text-4xl font-semibold mb-8 ${labelWidth} text-blue-500`}
        >
          Setup wallet
        </h1>

        <InputLabel className={`mt-0 mb-2 ${labelWidth}`}>Network</InputLabel>
        <Select
          className={formItemWidth}
          data={networkOptions}
          value={network ? network.value : null}
          onChange={(_value, option) => setNetwork(option)}
        />

        <InputLabel className={`mt-4 mb-2 ${labelWidth}`}>
          Script type
        </InputLabel>
        <Select
          className={`mb-4 ${formItemWidth}`}
          data={scriptTypeOptions}
          value={scriptType ? scriptType.value : null}
          onChange={(_value, option) => setScriptType(option)}
        />

        <InputLabel className={`mb-2 ${labelWidth}`}>
          Master fingerprint
        </InputLabel>
        <Input
          className={`${formItemWidth}`}
          placeholder="00000000"
          value={masterFingerPrint}
          onInput={handleMasterFingerPrint}
        />
        <InputLabel className={`mb-2 mt-6 ${labelWidth}`}>
          Derivation path
        </InputLabel>
        <Input
          className={`${formItemWidth}`}
          placeholder="m/49'/0'/0'"
          value={derivationPath}
          onInput={handleDerivationPathChange}
        />

        <InputLabel className={`mt-4 mb-2 ${labelWidth}`}>xpub</InputLabel>
        <Textarea
          className={`${formItemWidth}`}
          styles={{ input: { minHeight: '6.3rem' } }}
          placeholder="xpub"
          onInput={handleXpubChange}
          value={xpub}
        />

        <InputLabel className={`mt-4 mb-2 ${labelWidth}`}>
          Server type
        </InputLabel>
        <Stack className={labelWidth}>
          <Radio
            checked={isUsingPublicServer}
            onClick={(e) => {
              // @ts-ignore
              const isSelected = e?.target.value === 'on';
              setIsUsingPublicServer(isSelected);
            }}
            label="Public electrum server"
          />
          <Radio
            checked={!isUsingPublicServer}
            onClick={(e) => {
              // @ts-ignore
              const isSelected = e?.target.value === 'on';
              setIsUsingPublicServer(!isSelected);
            }}
            label="Private electrum server"
          />
        </Stack>

        <InputLabel className={`mt-4 mb-0 ${labelWidth}`}>
          Electrum url
        </InputLabel>
        <Tabs
          className={formItemWidth}
          value={activeTab}
          onChange={setActiveTab}
        >
          <Tabs.List>
            <Tabs.Tab value="public">Public electrum</Tabs.Tab>
            <Tabs.Tab value="private">Private electrum</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="public">
            <Select
              disabled={!isUsingPublicServer}
              data={publicElectrumOptions}
              value={selectedPublicServer ? selectedPublicServer.value : null}
              onChange={(_value, option) => setSelectedPublicServer(option)}
              className={formItemWidth}
            />
          </Tabs.Panel>
          <Tabs.Panel value="private">
            <Input
              disabled={isUsingPublicServer}
              type="text"
              placeholder="Enter electrum url"
              onInput={handlePrivateElectrumInput}
              value={privateElectrumUrl}
              className="mt-2 w-80"
            />
          </Tabs.Panel>
        </Tabs>
        <div className={formItemWidth}>
          <Button
            disabled={!isLoginEnabled}
            className="mt-4"
            fullWidth
            type="button"
            onClick={signIn}
          >
            {initiateWalletRequest.isLoading ? (
              <Loader size={20} color="white" />
            ) : (
              'Setup'
            )}
          </Button>
        </div>
      </div>

      <img src={vaultImage} className=" w-1/2 min-h-screen" />
    </div>
  ) : serverHealthStatusQuery.isLoading ? (
    <div className="flex flex-row justify-center items-center h-full w-screen">
      <Loader size={50} />
    </div>
  ) : (
    <div className="p-8">
      <Notification
        withCloseButton={false}
        className="border-red-500 border-2"
        icon={xIcon}
        color="red"
        title="Error!"
      >
        There is a problem connecting with the server, please restart the app
        and try again.
      </Notification>
    </div>
  );
};
