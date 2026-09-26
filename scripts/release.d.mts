export function assertReleaseReady(options:{cwd:string;configPath:string}):{commit:string;config:{keystore:string;alias:string;storePasswordFile:string;keyPasswordFile:string}};
export function assertApkIdentity(input:{badging:string;permissions:string;manifestTree:string},expected:{packageName:string;versionName:string;versionCode:number;minSdk:number}):unknown;
export function verifyArtifact(path:string,sha256:string):void;
