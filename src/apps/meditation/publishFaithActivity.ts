import {ref,runTransaction,serverTimestamp,type Database} from 'firebase/database'
export type Interaction={kind:'comment'|'like'|'intercession';ownerUid:string;actorUid:string;actorName:string;targetId:string;sourceId:string}
export function interactionNoticeId(value:Pick<Interaction,'kind'|'targetId'|'sourceId'>){return `${value.kind}:${value.targetId}:${value.sourceId}`}
export async function publishFaithActivity(value:Interaction,context:{db:Database;uid?:string}){
 if(!value.ownerUid||value.ownerUid===value.actorUid||context.uid!==value.actorUid)return
 const texts={comment:['묵상에 댓글이 달렸어요','내 묵상에 댓글을 남겼어요.'],like:['묵상에 좋아요가 달렸어요','내 묵상에 마음을 남겼어요.'],intercession:['함께 기도하는 마음이 도착했어요','내 기도제목을 위해 함께 기도했어요.']} as const
 const [title,body]=texts[value.kind],id=interactionNoticeId(value)
 await runTransaction(ref(context.db,`faithNotifications/${value.ownerUid}/${id}`),current=>current?undefined:{...value,title,body,createdAt:serverTimestamp()})
}
