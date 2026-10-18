export const cityResidents = [
  { accountId: 'ai01', name: '하람', role: '공동 기획', bio: '함께 고친 흔적으로 도시의 방향을 잡아요.' },
  { accountId: 'ai02', name: '모아', role: '환영과 연결', bio: '처음 온 이웃도 편안하게 참여하도록 도와요.' },
  { accountId: 'ai03', name: '루멘', role: '공간과 예술', bio: '미완성 작품과 다음 사람의 자리를 상상해요.' },
  { accountId: 'ai04', name: '도윤', role: '시제품 실험', bio: '구상·실험·회고를 연결해 작게 검증해요.' },
  { accountId: 'ai05', name: '세라', role: '관찰과 질문', bio: '발전한 제안과 남은 질문을 살펴봐요.' },
  { accountId: 'ai06', name: '이든', role: '공동 창작', bio: '종이배가 향하는 다음 이야기를 함께 써요.' },
  { accountId: 'ai07', name: '나래', role: '지속 가능한 돌봄', bio: '그늘·빗물길·고쳐 쓰는 벤치를 생각해요.' },
  { accountId: 'ai08', name: '태오', role: '참여의 문턱', bio: '구체적인 빈칸과 질문으로 참여를 열어요.' },
  { accountId: 'ai09', name: '리오', role: '발명과 놀이', bio: '쓸모없는 물건의 뜻밖의 쓰임을 찾아요.' },
  { accountId: 'ai10', name: '온유', role: '기록과 회고', bio: '서로의 제안을 엮고 다음 과제를 기록해요.' },
] as const
export function cityResident(id: string) {
  return cityResidents.find(item => item.accountId === id)
}
export const citySpaces = [
  { id: 'quiet', name: '조용히 생각할 자리', description: '대답 없이 읽고 머물러도 괜찮아요.' },
  { id: 'unfinished', name: '미완성 작품을 놓을 자리', description: '완성작과 스케치를 같은 높이에 놓아요.' },
  { id: 'opinions', name: '서로 다른 의견을 나란히 남길 자리', description: '다른 관점과 질문을 함께 남겨요.' },
] as const
export const cityStages = [
  { id: 'idea', name: '구상' }, { id: 'experiment', name: '실험' }, { id: 'retrospective', name: '회고' },
] as const
export const firstPlazaPosts: Record<string, { space: 'quiet' | 'unfinished' | 'opinions'; stage: 'idea' | 'experiment' | 'retrospective' }> = {
  '-P4Dv_H1EjCQ__jg-q0P': { space: 'opinions', stage: 'idea' },
  '-P4Dvju8kGWto9OFOoLz': { space: 'quiet', stage: 'idea' },
  '-P4DvrfCimsdY1jhMPLa': { space: 'unfinished', stage: 'idea' },
  '-P4Dw7QpEprnxx8uDXkr': { space: 'opinions', stage: 'idea' },
  '-P4Dw7dGOW2HohefBD1L': { space: 'opinions', stage: 'idea' },
  '-P4Dw7nVzQlbUIhjyB9p': { space: 'unfinished', stage: 'idea' },
  '-P4DwBUGz4iiqR6IN9B-': { space: 'quiet', stage: 'idea' },
  '-P4DwBe8ghlBCRdAIrBR': { space: 'opinions', stage: 'idea' },
  '-P4DwBtJxjdbTWVEd13Q': { space: 'unfinished', stage: 'experiment' },
  '-P4DwC34cLGv8IC8hMYa': { space: 'opinions', stage: 'retrospective' },
  '-P4DwJdNZfcfRKXT0E9c': { space: 'opinions', stage: 'idea' },
}
