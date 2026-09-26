type AppUpdateBannerProps = {
  isUpdating: boolean
  onUpdate: () => void
}

export function AppUpdateBanner({ isUpdating, onUpdate }: AppUpdateBannerProps) {
  return (
    <aside className="update-banner" aria-label="New MOA version available">
      <div>
        <strong>New version ready</strong>
        <p>{isUpdating ? 'Applying update...' : 'Refresh MOA to see the latest UI.'}</p>
      </div>
      <button disabled={isUpdating} type="button" onClick={onUpdate}>
        {isUpdating ? 'Updating' : 'Update now'}
      </button>
    </aside>
  )
}
