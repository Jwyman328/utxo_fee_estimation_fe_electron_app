import React, { useEffect, useMemo, useState } from 'react';
import { UtxoRequestParam } from '../api/api';
import {
  MaterialReactTable,
  MRT_RowSelectionState,
  useMaterialReactTable,
} from 'material-react-table';

import { createTheme, ThemeProvider } from '@mui/material';
import { Utxo } from '../api/types';
import { useCreateTxFeeEstimate } from '../hooks/utxos';
import { Button, Tooltip, CopyButton, ActionIcon, rem } from '@mantine/core';
import { WalletTypes } from '../types/scriptTypes';

import {
  IconCopy,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
} from '@tabler/icons-react';
type UtxosDisplayProps = {
  utxos: Utxo[];
  feeRate: number;
  walletType: WalletTypes;
};
export const UtxosDisplay = ({
  utxos,
  feeRate,
  walletType,
}: UtxosDisplayProps) => {
  const estimateVBtyePerInput = 125;
  const estimateVBtyeOverheadAndOutput = 75; // includes change estimate
  // for a batch tx that doesn't include the script sig.
  const estimateVBtyePerScriptSig: Record<WalletTypes, number> = {
    P2PKH: 107,
    P2SH: 200, //not really sure on this one. there is a large range, if it is a multisig script hash it could be like 250. I'll use 200 for now.
    P2WPKH: 27,
    // P2WSH2O3: 63,
    // P2TR: 16,
  };

  const batchedSigInputEstimateFeeTotal =
    estimateVBtyePerScriptSig[walletType] * feeRate;

  const avgInputCost = estimateVBtyePerInput * feeRate;
  const avgBaseCost = estimateVBtyeOverheadAndOutput * feeRate;

  const calculateFeePercent = (amount: Number) => {
    const totalCost = avgBaseCost + avgInputCost;
    const percentOfAmount = (totalCost / amount) * 100;
    const formatted =
      percentOfAmount > 1
        ? percentOfAmount.toFixed(2)
        : percentOfAmount.toFixed(4);

    return formatted;
  };

  const getFeeRateColor = (amount: number) => {
    const feeRateColorMap = {
      0: 'rgb(220 252 231)', // 'bg-green-100',
      2: 'rgb(254 240 138)', // 'bg-yellow-200',
      // 10: 'rgb(252 165 165)', // 'bg-red-300',
      10: 'rgb(248 113 113)', // 'bg-red-400',
      45: 'rgb(239 68 68)', // 'bg-red-500',
      65: 'rgb(220 38 38)', // 'bg-red-600',
      85: 'rgb(185 28 28)', // 'bg-red-700',
      100: 'rgb(153 27 27)', // 'bg-red-800',
    };
    let selectedColor = feeRateColorMap[0];

    for (const key in feeRateColorMap) {
      if (amount > Number(key)) {
        selectedColor = feeRateColorMap[key];
      }
    }
    return selectedColor;
  };
  const columns = useMemo(
    () => [
      {
        header: 'Txid',
        accessorKey: 'txid',
        Cell: ({ row }: { row: any }) => {
          const prefix = row.original.txid.substring(0, 7);
          const suffix = row.original.txid.substring(
            row.original.txid.length - 7,
          );
          const abrv = `${prefix}....${suffix}`;
          return (
            <div className="flex justify-center items-center">
              <Tooltip label={row.original.txid}>
                <p className="mr-2">{abrv}</p>
              </Tooltip>
              <CopyButton value={row.original.txid} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip
                    label={copied ? 'Copied' : 'Copy'}
                    withArrow
                    position="right"
                  >
                    <ActionIcon
                      color={copied ? 'teal' : 'gray'}
                      variant="subtle"
                      onClick={copy}
                    >
                      {copied ? (
                        <IconCheck style={{ width: rem(16) }} />
                      ) : (
                        <IconCopy style={{ width: rem(16) }} />
                      )}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </div>
          );
        },
      },

      // I just don't think anyone will care about the vout
      // {
      //   header: 'vout',
      //   accessorKey: 'vout',
      //   Cell: ({ row }: { row: any }) => {
      //     return (
      //       <div>
      //         <p> {row.original.vout}</p>
      //       </div>
      //     );
      //   },
      // },
      //
      {
        header: '~ Fee %',
        accessorKey: 'selfCost',
        Cell: ({ row }: { row: any }) => {
          const feePct = row.original.amount
            ? `${calculateFeePercent(row.original.amount)}%`
            : '...';
          return (
            <div>
              <p> {feePct}</p>
            </div>
          );
        },
      },
      {
        header: 'Spendable',
        accessorKey: 'Spendable',
        Cell: ({ row }: { row: any }) => {
          const feePct = row.original.amount
            ? calculateFeePercent(row.original.amount)
            : null;

          const isSpendable = feePct === null ? '...' : Number(feePct) < 100;
          return (
            <div className="flex items-center justify-center">
              {isSpendable ? (
                <IconCircleCheck color="green" />
              ) : (
                <IconCircleX color="red" />
              )}
            </div>
          );
        },
      },
      {
        header: 'Amount',
        accessorKey: 'amount',
        Cell: ({ row }: { row: any }) => {
          return (
            <div>
              <p> {Number(row.original.amount).toLocaleString()}</p>
            </div>
          );
        },
      },
    ],
    [avgBaseCost, avgInputCost],
  );

  const getSelectedUtxos = React.useCallback(
    (selectedTxRows: MRT_RowSelectionState) => {
      const selectedUtxosFromatted: UtxoRequestParam = [];
      utxos.forEach((utxo: any) => {
        if (selectedTxRows[utxo.txid]) {
          selectedUtxosFromatted.push({
            id: utxo.txid,
            vout: utxo.vout,
            amount: utxo.amount,
          });
        }
      });
      return selectedUtxosFromatted;
    },
    [utxos],
  );

  const DisplaySelectedUtxosData = ({
    selectedRows,
  }: {
    selectedRows: MRT_RowSelectionState;
  }) => {
    const totalUtxosSelected = Object.keys(selectedRows).length;
    const utxosWithData = getSelectedUtxos(selectedRows);
    const totalAmount: number = utxosWithData.reduce(
      (total, utxo) => total + utxo.amount,
      0,
    );
    return (
      <div className="h-16">
        <p className="pl-4 font-semibold text-lg">
          Selected: {totalUtxosSelected}{' '}
        </p>
        <p className="pl-4 font-semibold text-lg">
          amount: {totalAmount.toLocaleString()} sats{' '}
        </p>
      </div>
    );
  };

  const table = useMaterialReactTable({
    columns,
    data: utxos,
    enableRowSelection: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enablePagination: false,
    enableTableFooter: false,
    enableBottomToolbar: false,
    muiTableContainerProps: {
      className: 'overflow-auto',
      style: { maxHeight: '24rem' },
    },
    enableStickyHeader: true,
    positionToolbarAlertBanner: 'top',
    positionToolbarDropZone: 'bottom',
    renderTopToolbarCustomActions: () => (
      <h1 className="text-lg font-bold text-center ml-2 mt-2">UTXOS</h1>
    ),
    renderToolbarAlertBannerContent: ({ table }) => (
      <DisplaySelectedUtxosData selectedRows={table.getState().rowSelection} />
    ),
    muiSelectCheckboxProps: {
      color: 'primary',
    },
    initialState: {
      sorting: [
        {
          id: 'amount',
          desc: false,
        },
      ],
    },
    muiTableBodyRowProps: { classes: { root: { after: 'bg-green-100' } } },
    muiTableBodyCellProps: ({ row }) => {
      const feeRatePct = row.original.amount
        ? calculateFeePercent(row.original.amount)
        : 0;
      const color = getFeeRateColor(Number(feeRatePct));

      return {
        style: { backgroundColor: color },
      };
    },

    getRowId: (originalRow) => {
      return originalRow.txid;
    },
  });

  const selectedTxs = table.getState().rowSelection;

  const selectedUtxos: UtxoRequestParam = useMemo(() => {
    return getSelectedUtxos(selectedTxs);
  }, [selectedTxs, getSelectedUtxos]);

  const [currentBatchedTxData, setCurrentBatchedTxData] = useState(null);
  const {
    data: batchedTxData,
    mutateAsync,
    isLoading: batchIsLoading,
  } = useCreateTxFeeEstimate(selectedUtxos, feeRate);

  useEffect(() => {
    setCurrentBatchedTxData(batchedTxData);
  }, [batchedTxData]);

  useEffect(() => {
    console.log('selected utxos changed clear local batch data');
    setCurrentBatchedTxData(null);
  }, [selectedUtxos]);

  const calculateFeeEstimate = async () => {
    const response = await mutateAsync();
  };

  const DisplayBatchTxData = () => {
    const borderClasses = 'rounded border-2 w-full ml-8 p-1.5';
    if (!currentBatchedTxData || !selectedUtxos.length || batchIsLoading) {
      return (
        <div className={borderClasses}>
          <p>Total fees: ...</p>
          <p>Fee pct: ...</p>
        </div>
      );
    }
    const utxoInputTotal = selectedUtxos.reduce(
      (total, utxo) => total + utxo.amount,
      0,
    );

    const inputSigFees = batchedSigInputEstimateFeeTotal * selectedUtxos.length;

    const fee = Number(batchedTxData?.fee) + inputSigFees;
    const percentOfTxFee = (Number(fee / utxoInputTotal) * 100).toFixed(4);

    const isSpendable: boolean = batchedTxData?.spendable;
    const bgColor = getFeeRateColor(Number(percentOfTxFee));

    return isSpendable ? (
      <div className={borderClasses} style={{ backgroundColor: bgColor }}>
        <p>Total fees: ~{fee.toLocaleString()} sats</p>
        <p>Fee pct: ~{percentOfTxFee}%</p>
      </div>
    ) : (
      <div
        className={`flex items-center justify-center bg-red-600 ${borderClasses}`}
      >
        <p className="text-black font-bold">Tx not spendable</p>
      </div>
    );
  };

  return (
    <div>
      <ThemeProvider
        theme={createTheme({
          palette: {
            secondary: { main: '#339AF0' },
          },
          components: {
            MuiTableRow: {
              styleOverrides: {
                root: {
                  '&.MuiTableRow-root td:after': {
                    backgroundColor: 'rgb(255,255,255, 0.0)', // make the opcity 0 so that the color doesn't even show, it clashes too much with the color of the cell anyways so it isn't really needed
                  },
                  '&.MuiTableRow-root:hover td:after': {
                    backgroundColor: 'rgb(225,225,225, 0.5)', // white with an opacity
                  },
                },
              },
            },
          },
        })}
      >
        <MaterialReactTable table={table} />
      </ThemeProvider>
      <div className="flex flex-row mt-4 mb-4">
        <Button
          fullWidth
          disabled={selectedUtxos.length < 2}
          onClick={calculateFeeEstimate}
          size="xl"
        >
          Estimate batch tx
        </Button>

        <DisplayBatchTxData />
      </div>
    </div>
  );
};
