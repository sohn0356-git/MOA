import {expect,it} from 'vitest'
import {cleanScriptureQuote,cleanSharedDevotionCaption} from './scriptureText'
it('hides old language prefixes while preserving verse numbers, translations and line breaks',()=>{
 expect(cleanScriptureQuote('17 [한국어] 서로 사랑하라\n[English] Love one another\n\n1:18 [日本語] 互いに愛し合いなさい')).toBe('17 서로 사랑하라\nLove one another\n\n1:18 互いに愛し合いなさい')
})
it('preserves brackets inside the actual text and the writer’s own reflection',()=>{
 expect(cleanScriptureQuote('말씀 속 [English] 표시는 본문의 일부')).toBe('말씀 속 [English] 표시는 본문의 일부')
 const body='묵상\n[English] 내가 직접 쓴 제목'
 expect(cleanSharedDevotionCaption('요한복음\n\n[한국어] 말씀\n[English] The Word\n\n'+body)).toBe('요한복음\n\n말씀\nThe Word\n\n'+body)
 expect(cleanSharedDevotionCaption(body)).toBe(body)
})
