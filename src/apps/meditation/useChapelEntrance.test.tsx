// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {useChapelEntrance} from './useChapelEntrance'
const animations:{resolve:()=>void;cancel:ReturnType<typeof vi.fn>;duration:number}[]=[]
const original=Object.getOwnPropertyDescriptor(Element.prototype,'animate')
function Preview(){const motion=useChapelEntrance();return <section ref={motion.entranceRef} aria-busy={motion.entering}><button onClick={()=>void motion.enter()}>입장</button><output>{motion.entered?'본당':'로비'}</output></section>}
beforeEach(()=>{animations.length=0;Object.defineProperty(Element.prototype,'animate',{configurable:true,value:vi.fn((_frames:unknown,options:{duration:number})=>{let resolve=()=>{},reject=(_error:unknown)=>{};const finished=new Promise<void>((yes,no)=>{resolve=yes;reject=no}),cancel=vi.fn(()=>reject(new DOMException('cancelled','AbortError')));animations.push({resolve,cancel,duration:options.duration});return{finished,cancel}})})})
afterEach(()=>{cleanup();vi.unstubAllGlobals();if(original)Object.defineProperty(Element.prototype,'animate',original);else Reflect.deleteProperty(Element.prototype,'animate')})
it('fades out the lobby before mounting the chapel, fades in, and ignores repeated entry',async()=>{
 render(<Preview/>);fireEvent.click(screen.getByRole('button',{name:'입장'}));fireEvent.click(screen.getByRole('button',{name:'입장'}));expect(animations).toHaveLength(1);expect(screen.getByText('로비')).toBeInTheDocument();expect(animations[0].duration).toBe(320);expect(document.querySelector('.chapel-entry-blackout')).toBeInTheDocument();
 await act(async()=>animations[0].resolve());expect(screen.getByText('본당')).toBeInTheDocument();expect(animations).toHaveLength(2);expect(animations[1].duration).toBe(340);expect(document.querySelector('section')).toHaveAttribute('aria-busy','true');await act(async()=>animations[1].resolve());expect(document.querySelector('section')).toHaveAttribute('aria-busy','false');expect(document.querySelector('.chapel-entry-blackout')).toBeNull()
})
it('skips motion for reduced-motion preferences',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));render(<Preview/>);fireEvent.click(screen.getByRole('button',{name:'입장'}));expect(screen.getByText('본당')).toBeInTheDocument();expect(animations).toHaveLength(0)
})
it('cancels the transition cleanly if the chapel is unmounted',async()=>{
 const view=render(<Preview/>);fireEvent.click(screen.getByRole('button',{name:'입장'}));await act(async()=>view.unmount());expect(animations[0].cancel).toHaveBeenCalledOnce();expect(animations).toHaveLength(1);expect(document.querySelector('.chapel-entry-blackout')).toBeNull()
})
