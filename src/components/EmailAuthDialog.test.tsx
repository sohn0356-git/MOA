// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {EmailAuthDialog} from './EmailAuthDialog'
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}})
afterEach(cleanup)
const fill=()=>{fireEvent.change(screen.getByLabelText('이메일',{exact:true}),{target:{value:'person@example.com'}});fireEvent.change(screen.getByLabelText('비밀번호',{exact:true}),{target:{value:' password '}})}
it('validates signup password confirmation before contacting Firebase',async()=>{
 const submit=vi.fn()
 render(<EmailAuthDialog onClose={vi.fn()} onSubmit={submit} error={null}/>)
 fireEvent.click(screen.getByRole('button',{name:'회원가입'}));fill()
 fireEvent.change(screen.getByLabelText('비밀번호 확인'),{target:{value:'different'}})
 fireEvent.submit(screen.getByRole('button',{name:'이메일로 가입하기'}).closest('form')!)
 expect(screen.getByRole('alert')).toHaveTextContent('비밀번호가 서로 다릅니다')
 expect(submit).not.toHaveBeenCalled()
})
it('keeps failed login input for retry and does not close or store the password',async()=>{
 const close=vi.fn(),submit=vi.fn().mockRejectedValue(new Error('invalid'))
 render(<EmailAuthDialog onClose={close} onSubmit={submit} error="이메일 또는 비밀번호가 맞지 않습니다."/>);fill()
 fireEvent.click(screen.getByRole('button',{name:'비밀번호 표시'}))
 expect(screen.getByLabelText('비밀번호',{exact:true})).toHaveAttribute('type','text')
 fireEvent.submit(screen.getByRole('button',{name:'이메일로 로그인'}).closest('form')!)
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('이메일 또는 비밀번호'))
 expect(screen.getByLabelText('비밀번호',{exact:true})).toHaveValue(' password ')
 expect(close).not.toHaveBeenCalled()
})
it('blocks duplicate submission and closing while authentication is pending',async()=>{
 let finish=()=>{};const close=vi.fn(),submit=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve}))
 render(<EmailAuthDialog onClose={close} onSubmit={submit} error={null}/>);fill()
 fireEvent.submit(screen.getByRole('button',{name:'이메일로 로그인'}).closest('form')!)
 expect(screen.getByLabelText('이메일',{exact:true})).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'이메일 로그인 닫기'}));expect(close).not.toHaveBeenCalled()
 expect(submit).toHaveBeenCalledOnce()
 finish();await waitFor(()=>expect(close).toHaveBeenCalledOnce())
})
