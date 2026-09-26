import type {DocumentPage,OcrText} from '../domain/model';
export interface DocumentHandle {id:string;mime:'image/png'|'image/jpeg'|'application/pdf';pages:number}
/** Native URIs are transient bridge data, never portable Project paths. */
export interface PageRaster {document:DocumentPage;uri:string}
export type PickResult={cancelled:true}|{cancelled:false;handle:DocumentHandle};
export interface LocalDocumentsBridge {
  pickDocument(options:{requestId:string}):Promise<PickResult>;
  renderPage(options:{requestId:string;id:string;page:number;rotation:number}):Promise<PageRaster>;
  cancel(options:{requestId:string}):Promise<void>;
  assetUri(options:{assetId:string}):Promise<{uri:string}>;
}
export interface OcrBridge {
  recognizeText(options:{requestId:string;assetId:string}):Promise<{text:OcrText[]}>;
  cancel(options:{requestId:string}):Promise<void>;
}
