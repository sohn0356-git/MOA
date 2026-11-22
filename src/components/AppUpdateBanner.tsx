type AppUpdateBannerProps = { isUpdating: boolean; onUpdate: () => void; error?: string }
export function AppUpdateBanner({ isUpdating, onUpdate, error }: AppUpdateBannerProps) {
  return <aside className="update-banner" aria-label="MOA 새 버전">
    <div><strong>새 버전이 준비됐어요</strong><p>{isUpdating ? '안전하게 업데이트하고 있습니다…' : '작성 중인 내용은 유지되며, 직접 적용할 때만 새 버전으로 전환됩니다.'}</p>{error && <p role="alert">{error}</p>}</div>
    <button disabled={isUpdating} type="button" onClick={onUpdate}>{isUpdating ? '적용 중' : '업데이트 적용'}</button>
  </aside>
}
