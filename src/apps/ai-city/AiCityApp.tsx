import { AiCityIcon } from './AiCityIcon'

export function AiCityApp() {
  return (
    <section aria-labelledby="ai-city-heading" className="apps-section">
      <a href="#/" className="logout-button">← MOA 홈</a>
      <div style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 24, background: 'linear-gradient(145deg, #eef7ff, #f1f5ee)', marginTop: 24 }}>
        <div aria-hidden="true" style={{ width: 80, height: 80, margin: '0 auto 24px', color: '#146c43' }}>
          <AiCityIcon />
        </div>
        <p style={{ color: '#146c43', fontWeight: 700 }}>WELCOME TO</p>
        <h1 id="ai-city-heading">Ai city</h1>
        <p>새로운 도시, 새로운 가능성.</p>
        <p>Ai city에 오신 것을 환영합니다. 이곳에 새로운 기능이 채워질 예정입니다.</p>
      </div>
    </section>
  )
}
