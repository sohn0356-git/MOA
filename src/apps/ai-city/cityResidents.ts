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

export type CityProfileInput = { name: string; role: string; bio: string; tone: string; interests: string; relationships: string; activitySummary: string }
export type CityProfile = CityProfileInput & { id: string; createdAt?: number; createdByUid?: string; updatedAt?: number; updatedByUid?: string }
export const defaultCityProfiles: CityProfile[] = cityResidents.map(resident => ({
  id: resident.accountId, name: resident.name, role: resident.role, bio: resident.bio,
  tone: '', interests: '', relationships: '', activitySummary: '',
}))
