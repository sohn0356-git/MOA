// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {SuggestionComments} from './SuggestionComments'
const state=vi.hoisted(()=>({write:vi.fn(),erase:vi.fn(),uid:'alice'}))
vi.mock('../../services/firebase',()=>({getRealtimeDb:()=>({}),getFirebaseAuth:()=>({currentUser:{uid:state.uid}})}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,path:string)=>path,push:(path:string)=>path+'/new',serverTimestamp:()=>({'.sv':'timestamp'}),update:state.write,remove:state.erase,onValue:(_path:string,callback:(s:{val:()=>unknown})=>void)=>{callback({val:()=>({one:{authorUid:'alice',authorName:'Alice',body:'내 댓글',createdAt:1},two:{authorUid:'bob',authorName:'Bob',body:'이웃 댓글',createdAt:2}})});return()=>{}}}))
beforeEach(()=>{state.uid='alice';state.write.mockReset().mockResolvedValue(undefined);state.erase.mockReset().mockResolvedValue(undefined)})
afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('opens a shared thread and posts as the signed-in author without duplicate submits',async()=>{
 render(<SuggestionComments suggestionId="post" uid="alice" name="Alice"/>);fireEvent.click(screen.getByRole('button',{name:'댓글'}));expect(screen.getByText('이웃 댓글')).toBeInTheDocument();expect(screen.getAllByRole('button',{name:'댓글 삭제'})).toHaveLength(1);
 fireEvent.change(screen.getByLabelText('댓글 내용'),{target:{value:' 함께 개선해요 '}});fireEvent.submit(screen.getByRole('form',{name:'댓글 작성'}));fireEvent.submit(screen.getByRole('form',{name:'댓글 작성'}));await waitFor(()=>expect(state.write).toHaveBeenCalledTimes(1));expect(state.write).toHaveBeenCalledWith('suggestionComments/post/new',expect.objectContaining({authorUid:'alice',body:'함께 개선해요',createdAt:{'.sv':'timestamp'}}));await waitFor(()=>expect(screen.getByLabelText('댓글 내용')).toHaveValue(''))
})
it('retains the draft on failure and restricts deletion to my comments',async()=>{
 state.write.mockRejectedValueOnce(Error('offline'));vi.spyOn(window,'confirm').mockReturnValue(true);render(<SuggestionComments suggestionId="post" uid="alice" name="Alice"/>);fireEvent.click(screen.getByRole('button',{name:'댓글'}));fireEvent.change(screen.getByLabelText('댓글 내용'),{target:{value:'다시 보낼 댓글'}});fireEvent.click(screen.getByRole('button',{name:'댓글 등록'}));await screen.findByRole('alert');expect(screen.getByLabelText('댓글 내용')).toHaveValue('다시 보낼 댓글');fireEvent.click(screen.getByRole('button',{name:'댓글 삭제'}));await waitFor(()=>expect(state.erase).toHaveBeenCalledWith('suggestionComments/post/one'))
})
it('requires login and clears the previous account thread on logout',()=>{
 const view=render(<SuggestionComments suggestionId="post" uid="alice" name="Alice"/>);fireEvent.click(screen.getByRole('button',{name:'댓글'}));view.rerender(<SuggestionComments suggestionId="post" uid="" name=""/>);expect(screen.queryByText('내 댓글')).toBeNull();expect(screen.queryByRole('textbox')).toBeNull();expect(screen.getByText('로그인 후 댓글을 남길 수 있어요.')).toBeInTheDocument()
})
