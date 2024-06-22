import {
  app,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
} from 'electron';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

import * as fs from 'fs';
import { Wallet, WalletConfigs } from '../app/types/wallet';
import { importJSONFile } from './util';

type WalletDetails = {
  walletDetails: Wallet;
  walletConfigs: WalletConfigs;
};
export default class MenuBuilder {
  mainWindow: BrowserWindow;
  static menu: Menu & WalletDetails;
  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu(): Menu & WalletDetails {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDarwinTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    //@ts-ignore
    MenuBuilder.menu = menu;

    //@ts-ignore

    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.mainWindow });
    });
  }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'UTXO Fee Estimator',
      submenu: [
        {
          label: 'Hide',
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    };
    const subMenuFile: MenuItemConstructorOptions = {
      label: 'File',
      submenu: [
        {
          label: 'Import wallet',
          id: 'importWallet',
          enabled: false,
          click: () => {
            // Open file dialog to select JSON file
            const { dialog } = require('electron');
            dialog
              .showOpenDialog({
                filters: [{ name: 'JSON Files', extensions: ['json'] }],
                properties: ['openFile'],
              })
              .then((result: any) => {
                if (!result.canceled && result.filePaths.length > 0) {
                  const filePath = result.filePaths[0];
                  const mainWindow = BrowserWindow.getAllWindows()[0];
                  importJSONFile(filePath, mainWindow);
                }
              })
              .catch((err: any) => {
                console.error('Error opening file dialog:', err);
              });
          },
        },

        {
          label: 'Save wallet',
          id: 'saveWallet',
          enabled: false,
          click: () => {
            const { dialog } = require('electron');
            dialog
              .showSaveDialog({
                title: 'Save JSON File',
                defaultPath: './my_wallet.json', // Specify the default file name
                filters: [{ name: 'JSON Files', extensions: ['json'] }],
              })
              .then((result) => {
                if (!result.canceled && result.filePath) {
                  const jsonFilePath = result.filePath;
                  const walletDetails = MenuBuilder.menu.walletDetails;
                  const walletConfigs = MenuBuilder.menu.walletConfigs;
                  const walletData = { ...walletDetails, ...walletConfigs };
                  saveJsonToFile(walletData, jsonFilePath);
                }
              })
              .catch((err) => {
                console.error('Error saving JSON file:', err);
              });
          },
        },
      ],
    };
    const saveJsonToFile = (jsonData: Wallet, filePath: string) => {
      fs.writeFile(
        filePath,
        JSON.stringify(jsonData, null, 2),
        'utf8',
        (err) => {
          if (err) {
            console.error('Error saving JSON file:', err);
          } else {
            console.log('JSON file saved successfully');
          }
        },
      );
    };
    const subMenuViewProd: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
      ],
    };
    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    };
    const subMenuHelp: MenuItemConstructorOptions = {
      label: 'Help',
      submenu: [
        {
          label: 'Open source code',
          click() {
            shell.openExternal(
              'https://github.com/Jwyman328/utxo_fee_estimation_fe_electron_app',
            );
          },
        },
        {
          label: 'Documentation',
          click() {
            shell.openExternal(
              'https://github.com/Jwyman328/utxo_fee_estimation_fe_electron_app?tab=readme-ov-file',
            );
          },
        },
        {
          label: 'Search Issues',
          click() {
            shell.openExternal(
              'https://github.com/Jwyman328/utxo_fee_estimation_fe_electron_app/issues',
            );
          },
        },
      ],
    };

    const subMenuView =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
        ? subMenuViewDev
        : subMenuViewProd;

    return [subMenuAbout, subMenuFile, subMenuView, subMenuWindow, subMenuHelp];
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: 'UTXO Fee Estimator',
        submenu: [
          {
            label: 'Hide',
            accelerator: 'Command+H',
            selector: 'hide:',
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: 'File',
        submenu: [
          {
            label: 'Import JSON',
            click: () => {
              console.log('import json');
            },
          },
        ],
      },
      {
        label: '&View',
        submenu:
          process.env.NODE_ENV === 'development' ||
          process.env.DEBUG_PROD === 'true'
            ? [
                {
                  label: '&Reload',
                  accelerator: 'Ctrl+R',
                  click: () => {
                    this.mainWindow.webContents.reload();
                  },
                },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen(),
                    );
                  },
                },
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click: () => {
                    this.mainWindow.webContents.toggleDevTools();
                  },
                },
              ]
            : [
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen(),
                    );
                  },
                },
              ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Open source code',
            click() {
              shell.openExternal(
                'https://github.com/Jwyman328/utxo_fee_estimation_fe_electron_app',
              );
            },
          },
          {
            label: 'Documentation',
            click() {
              shell.openExternal(
                'https://github.com/Jwyman328/utxo_fee_estimation_fe_electron_app?tab=readme-ov-file',
              );
            },
          },
          {
            label: 'Search Issues',
            click() {
              shell.openExternal(
                'https://github.com/Jwyman328/utxo_fee_estimation_fe_electron_app/issues',
              );
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}
