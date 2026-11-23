// Older bilingual quotations included these generated prefixes in verseText.
// Remove only known line-leading language labels; preserve the quotation itself.
export function cleanScriptureQuote(text:string){
 return text.replace(/^([ \t]*(?:\d+(?::\d+)?[.)]?[ \t]+)?)\[(?:한국어|한글|English|영어|日本語|일본어)\][ \t]*/gmi,'$1')
}

export function cleanSharedDevotionCaption(text:string){
 if(/^(?:묵상|오늘의 적용|기도)\r?\n/.test(text))return text
 const body=text.search(/\n\n(?=(?:묵상|오늘의 적용|기도)\r?\n)/)
 return body<0?cleanScriptureQuote(text):cleanScriptureQuote(text.slice(0,body))+text.slice(body)
}
