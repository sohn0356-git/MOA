import {beforeEach,expect,it,vi} from 'vitest'
import type {Database} from 'firebase/database'
import {interactionNoticeId,publishFaithActivity,type Interaction} from './publishFaithActivity'
const state=vi.hoisted(()=>({uid:'bob',primaryUid:'primary',existing:null as unknown,payload:null as unknown,node:'',transaction:vi.fn()}))
vi.mock('../../services/faithSession',()=>({getFaithAuth:()=>({currentUser:{uid:state.uid}}),getFaithDb:()=>('faith')}))
vi.mock('../../services/firebase',()=>({getFirebaseAuth:()=>({currentUser:{uid:state.primaryUid}}),getRealtimeDb:()=>('primary')}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,path:string)=>path,serverTimestamp:()=>123,runTransaction:async(node:string,updater:(v:unknown)=>unknown)=>{state.transaction();state.node=node;state.payload=updater(state.existing)}}))
beforeEach(()=>{state.uid='bob';state.existing=null;state.payload=null;state.transaction.mockClear()})
const action:Interaction={kind:'comment',ownerUid:'alice',actorUid:'bob',actorName:'Bob',targetId:'post',sourceId:'comment'}
it('publishes one stable, source-verifiable event after an interaction',async()=>{
 await publishFaithActivity(action,{db:{} as Database,uid:state.uid});expect(state.node).toBe('faithNotifications/alice/comment:post:comment');expect(state.payload).toMatchObject({...action,title:'묵상에 댓글이 달렸어요',body:'내 묵상에 댓글을 남겼어요.',createdAt:123})
})
it('does not overwrite an already delivered event',async()=>{state.existing={readAt:1};await publishFaithActivity(action,{db:{} as Database,uid:state.uid});expect(state.payload).toBeUndefined()})
it('does not send to self or use a stale account identity',async()=>{await publishFaithActivity({...action,ownerUid:'bob'},{db:{} as Database,uid:state.uid});state.uid='eve';await publishFaithActivity(action,{db:{} as Database,uid:state.uid});expect(state.transaction).not.toHaveBeenCalled()})
it('supports the chapel primary identity independently of AI activity identity',async()=>{await publishFaithActivity({...action,kind:'intercession',actorUid:'primary',sourceId:'primary'},{db:{} as Database,uid:state.primaryUid});expect(state.node).toBe('faithNotifications/alice/intercession:post:primary')})
it('uses a different event id for each source comment',()=>{expect(interactionNoticeId(action)).not.toBe(interactionNoticeId({...action,sourceId:'other'}))})
