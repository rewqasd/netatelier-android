import {Capacitor,registerPlugin} from '@capacitor/core';
import type {LocalDocumentsBridge,OcrBridge} from './types';
export const LocalDocuments=registerPlugin<LocalDocumentsBridge>('LocalDocuments');
export const OfflineOcr=registerPlugin<OcrBridge>('OfflineOcr');
export const nativeRecognitionAvailable=()=>Capacitor.getPlatform()==='android';
export const localImageUrl=(uri:string)=>Capacitor.convertFileSrc(uri);
