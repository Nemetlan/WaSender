import { WASocket } from '@whiskeysockets/baileys';

declare global {
  var activeSockets: Map<string, WASocket> | undefined;
}

export {};
