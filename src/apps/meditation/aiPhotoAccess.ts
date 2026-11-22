import {aiLoginAccounts} from '../../data/aiAccounts'
export function canUploadFaithPhoto(user:{uid:string;email?:string|null}|null|undefined){return !!user&&aiLoginAccounts.some(a=>a.accountId===user.uid)}
